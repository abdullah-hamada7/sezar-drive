export function buildTrackingWsUrl(token) {
  const apiBase = import.meta.env.VITE_API_URL || '/api/v1';

  // Create a URL object to reliably extract information
  const baseUrl = apiBase.startsWith('http')
    ? new URL(apiBase)
    : new URL(apiBase, window.location.origin);

  const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const wsUrl = `${wsProtocol}//${window.location.host}/ws/tracking?token=${encodeURIComponent(token)}`;

  if (import.meta.env.DEV || window.location.hostname === 'localhost') {
    console.log('[WebSocket] Connecting to:', wsUrl);
    console.log('[WebSocket] Context:', {
      protocol: window.location.protocol,
      host: window.location.host,
      apiBase
    });
  }

  return wsUrl;
}
