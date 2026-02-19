import { useEffect, useRef, useCallback } from 'react';
import { useAuth } from './useAuth';
import api from '../services/api';

export function useDriverTracking() {
  const { user } = useAuth();
  const wsRef = useRef(null);
  const watchIdRef = useRef(null);
  const lastUpdateRef = useRef(0);

  const connectWebSocket = useCallback(() => {
    const token = localStorage.getItem('accessToken');
    if (!token) return;

    const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
    const ws = new WebSocket(`${protocol}://${window.location.host}/ws/tracking?token=${token}`);

    ws.onopen = () => {
      console.log('Driver tracking connected');
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type) {
          // Dispatch a specific event for this message type
          window.dispatchEvent(new CustomEvent(`ws:${data.type}`, { detail: data }));
          // Dispatch a generic update event
          window.dispatchEvent(new CustomEvent('ws:update', { detail: data }));
        }
      } catch (err) {
        console.error('WS parse error:', err);
      }
    };

    ws.onclose = () => {
      console.log('Driver tracking disconnected');
    };

    wsRef.current = ws;
  }, []);

  const startGeolocation = useCallback((shiftId, tripId) => {
    if (watchIdRef.current !== null) return; // Already watching

    if (!navigator.geolocation) {
      console.error('Geolocation not supported');
      return;
    }

    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        const now = Date.now();
        if (now - lastUpdateRef.current < 10000) return;

        lastUpdateRef.current = now;

        const payload = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          speed: position.coords.speed,
          heading: position.coords.heading,
          accuracy: position.coords.accuracy,
          recordedAt: new Date().toISOString(),
        };

        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
          wsRef.current.send(JSON.stringify({
            type: 'location_update',
            shiftId,
            tripId,
            payload
          }));
        }
      },
      (error) => console.error('GPS Error:', error),
      { enableHighAccuracy: true, maximumAge: 10000, timeout: 5000 }
    );
  }, []);

  const stopTracking = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (user?.role !== 'driver') return;

    let checkInterval;

    const startTracking = async () => {
      try {
        const res = await api.getActiveShift();
        const shift = res.data.shift;

        if (shift && (shift.status === 'Active' || shift.status === 'InTrip')) {
          if (!wsRef.current || wsRef.current.readyState === WebSocket.CLOSED) {
            connectWebSocket();
          }
          startGeolocation(shift.id, shift.currentTripId);
        } else {
          stopTracking();
        }
      } catch {
        stopTracking();
      }
    };

    startTracking();
    checkInterval = setInterval(startTracking, 30000);

    return () => {
      clearInterval(checkInterval);
      stopTracking();
    };
  }, [user?.role]); // Only re-run if role changes
}
