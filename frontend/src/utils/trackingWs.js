export function buildTrackingWsUrl(token) {
  const apiBase = import.meta.env.VITE_API_URL || '/api/v1';
  const baseUrl = apiBase.startsWith('http')
    ? new URL(apiBase)
    : new URL(apiBase, window.location.origin);
  const wsProtocol = baseUrl.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${wsProtocol}//${baseUrl.host}/ws/tracking?token=${encodeURIComponent(token)}`;
}
