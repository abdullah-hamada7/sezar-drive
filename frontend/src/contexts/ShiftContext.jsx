import { createContext, useState, useEffect, useCallback, useContext } from 'react';
import api from '../services/api';
import { useAuth } from '../hooks/useAuth';

const ShiftContext = createContext();

export function ShiftProvider({ children }) {
  const { isAuthenticated, isDriver } = useAuth();
  const [activeShift, setActiveShift] = useState(null);
  const [loading, setLoading] = useState(true);

  const refreshShift = useCallback(async () => {
    if (!isAuthenticated || !isDriver) {
      setLoading(false);
      return;
    }
    try {
      const res = await api.getActiveShift();
      setActiveShift(res.data.shift);
    } catch {
      setActiveShift(null);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, isDriver]);

  useEffect(() => {
    if (!isAuthenticated || !isDriver) return;

    refreshShift();

    // Listen for shift-related WebSocket events
    const handleShiftUpdate = () => refreshShift();
    const handleShiftClosed = () => setActiveShift(null);

    window.addEventListener('ws:shift_started', handleShiftUpdate);
    window.addEventListener('ws:shift_activated', handleShiftUpdate);
    window.addEventListener('ws:shift_closed', handleShiftClosed);
    window.addEventListener('ws:trip_assigned', handleShiftUpdate); // Refresh to show assignment

    return () => {
      window.removeEventListener('ws:shift_started', handleShiftUpdate);
      window.removeEventListener('ws:shift_activated', handleShiftUpdate);
      window.removeEventListener('ws:shift_closed', handleShiftClosed);
      window.removeEventListener('ws:trip_assigned', handleShiftUpdate);
    };
  }, [refreshShift, isAuthenticated, isDriver]);

  return (
    <ShiftContext.Provider value={{ activeShift, loading, refreshShift, setActiveShift }}>
      {children}
    </ShiftContext.Provider>
  );
}

export function useShift() {
  const context = useContext(ShiftContext);
  if (!context) {
    throw new Error('useShift must be used within a ShiftProvider');
  }
  return context;
}
