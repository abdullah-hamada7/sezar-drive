import { http } from './http.service';

export const statsService = {
  getRevenueStats() {
    return http.request('/stats/revenue');
  },
  getActivityStats() {
    return http.request('/stats/activity');
  },
  getDriverWeeklyStats() { return http.request('/stats/my-revenue'); },
  getSummaryStats() { return http.request('/stats/summary'); }
};
