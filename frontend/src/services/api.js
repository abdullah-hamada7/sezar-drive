import { http } from './http.service';
import { authService } from './auth.service';
import { driverService } from './driver.service';
import { vehicleService } from './vehicle.service';
import { shiftService } from './shift.service';
import { tripService } from './trip.service';
import { inspectionService } from './inspection.service';
import { expenseService } from './expense.service';
import { damageService } from './damage.service';
import { trackingService } from './tracking.service';
import { reportService } from './report.service';
import { auditService } from './audit.service';
import { statsService } from './stats.service';
import { verificationService } from './verification.service';

// Legacy API object for backward compatibility
const api = {
  ...http, // expose http methods like setTokens
  setTokens: http.setTokens.bind(http),
  clearTokens: http.clearTokens.bind(http),
  
  // Auth
  login: authService.login,
  verifyDevice: authService.verifyDevice,
  changePassword: authService.changePassword,
  uploadIdentityPhoto: authService.uploadIdentityPhoto,
  uploadIdentity: authService.uploadIdentityPhoto, // alias
  verifyIdentity: authService.verifyIdentity,
  getMe: authService.getMe,
  updatePreferences: authService.updatePreferences,
  updateProfileAvatar: driverService.updateProfileAvatar, // Moved to driver service logically but exposed here
  getPendingVerifications: authService.getPendingVerifications,
  reviewIdentity: authService.reviewIdentity,
  verifyShift: shiftService.verifyShift,
  verifyFaceMatch: shiftService.verifyFaceMatch,
  forgotPassword: authService.forgotPassword,
  verifyResetToken: authService.verifyResetToken,
  resetPassword: authService.resetPassword,
  requestRescue: authService.requestRescue,
  verifyRescueCode: authService.verifyRescueCode,
  generateRescueCode: authService.generateRescueCode,
  getPendingRescueRequests: authService.getPendingRescueRequests,
  getPendingShiftVerifications: verificationService.getPendingShiftVerifications,
  reviewShiftVerification: verificationService.reviewShiftVerification,

  // Drivers
  getDrivers: driverService.getDrivers,
  getDriver: driverService.getDriver,
  createDriver: driverService.createDriver,
  updateDriver: driverService.updateDriver,
  deleteDriver: driverService.deleteDriver,

  // Vehicles
  getVehicles: vehicleService.getVehicles,
  getVehicle: vehicleService.getVehicle,
  createVehicle: vehicleService.createVehicle,
  updateVehicle: vehicleService.updateVehicle,
  assignVehicle: vehicleService.assignVehicle,
  assignSelfVehicle: vehicleService.assignSelfVehicle,
  releaseVehicle: vehicleService.releaseVehicle,
  updateVehicleStatus: vehicleService.updateVehicleStatus,
  deleteVehicle: vehicleService.deleteVehicle,

  // Shifts
  getShifts: shiftService.getShifts,
  getActiveShift: shiftService.getActiveShift,
  createShift: shiftService.createShift,
  activateShift: shiftService.activateShift,
  closeShift: shiftService.closeShift,
  adminCloseShift: shiftService.adminCloseShift,

  // Trips
  getTrips: tripService.getTrips,
  getTrip: tripService.getTrip,
  assignTrip: tripService.assignTrip,
  startTrip: tripService.startTrip,
  completeTrip: tripService.completeTrip,
  cancelTrip: tripService.cancelTrip,

  // Inspections
  getInspections: inspectionService.getInspections,
  createInspection: inspectionService.createInspection,
  uploadInspectionPhoto: inspectionService.uploadInspectionPhoto,
  completeInspection: inspectionService.completeInspection,

  // Expenses
  getExpenses: expenseService.getExpenses,
  createExpense: expenseService.createExpense,
  uploadReceipt: expenseService.uploadReceipt,
  reviewExpense: expenseService.reviewExpense,
  getExpenseCategories: expenseService.getExpenseCategories,

  // Damage
  getDamageReports: damageService.getDamageReports,
  createDamageReport: damageService.createDamageReport,
  uploadDamagePhoto: damageService.uploadDamagePhoto,
  reviewDamageReport: damageService.reviewDamageReport,

  // Tracking
  getActiveDrivers: trackingService.getActiveDrivers,
  getLocationHistory: trackingService.getLocationHistory,

  // Reports
  getRevenueReport: reportService.getRevenueReport,
  downloadReportPDF: reportService.downloadReportPDF,
  downloadReportExcel: reportService.downloadReportExcel,

  // Audit
  getAuditLogs: auditService.getAuditLogs,

  // Stats
  getRevenueStats: statsService.getRevenueStats,
  getActivityStats: statsService.getActivityStats,
  getDriverWeeklyStats: statsService.getDriverWeeklyStats,
  getSummaryStats: statsService.getSummaryStats,
};

export default api;
