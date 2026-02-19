const API_BASE =
  import.meta.env.VITE_API_URL || '/api/v1';

class HttpService {
  constructor() {
    this.accessToken = localStorage.getItem('accessToken');
    this.refreshToken = localStorage.getItem('refreshToken');
  }

  setTokens(access, refresh) {
    this.accessToken = access;
    this.refreshToken = refresh;
    localStorage.setItem('accessToken', access);
    if (refresh) localStorage.setItem('refreshToken', refresh);
  }

  clearTokens() {
    this.accessToken = null;
    this.refreshToken = null;
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
  }

  async request(endpoint, options = {}) {
    const url = `${API_BASE}${endpoint}`;
    const headers = { ...options.headers };

    if (this.accessToken && !options.skipAuth) {
      headers['Authorization'] = `Bearer ${this.accessToken}`;
    }

    if (options.body && !(options.body instanceof FormData)) {
      headers['Content-Type'] = 'application/json';
      options.body = JSON.stringify(options.body);
    }

    let response = await fetch(url, { ...options, headers });

    // Token refresh on 401
    if (response.status === 401 && this.refreshToken && !options._retried) {
      const refreshed = await this.tryRefresh();
      if (refreshed) {
        headers['Authorization'] = `Bearer ${this.accessToken}`;
        response = await fetch(url, { ...options, headers, _retried: true });
      }
    }

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: response.statusText }));
      let message = error.error?.message || error.message || 'Request failed';

      // If there are validation details, append them
      if (error.error?.details && Array.isArray(error.error.details)) {
        const details = error.error.details.map(d => `${d.path}: ${d.msg}`).join(', ');
        message += ` (${details})`;
      }

      const err = new Error(message);
      err.status = response.status;
      err.code = error.error?.code || error.code;
      err.details = error.error?.details || error.details;
      throw err;
    }

    if (response.headers.get('content-type')?.includes('application/json')) {
      const json = await response.json();
      return { data: json };
    }
    return response;
  }

  async tryRefresh() {
    try {
      const res = await fetch(`${API_BASE}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: this.refreshToken }),
      });
      if (!res.ok) return false;
      const data = await res.json();
      this.setTokens(data.accessToken, data.refreshToken);
      return true;
    } catch {
      return false;
    }
  }
}

export const http = new HttpService();
