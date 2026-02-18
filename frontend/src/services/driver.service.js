import { http } from './http.service';

export const driverService = {
  getDrivers(params = '') {
    return http.request(`/drivers?${params}`);
  },
  getDriver(id) {
    return http.request(`/drivers/${id}`);
  },
  createDriver(data) {
    return http.request('/drivers', { method: 'POST', body: data });
  },
  updateDriver(id, data) {
    return http.request(`/drivers/${id}`, { method: 'PUT', body: data });
  },
  deleteDriver(id) {
    return http.request(`/drivers/${id}`, { method: 'DELETE' });
  },
  updateProfileAvatar(formData) {
    return http.request('/drivers/profile', { method: 'PUT', body: formData });
  }
};
