const { notifyAdmins, notifyDriver } = require('../tracking/tracking.ws');

/**
 * ShiftNotifier
 * Encapsulates real-time notifications for shift events.
 */
class ShiftNotifier {
  static onShiftStarted(driverName, shiftId) {
    notifyAdmins(
      'shift_started', 
      'New Shift Started', 
      `Driver ${driverName} has started a new shift and is pending verification.`, 
      { shiftId }
    );
  }

  static onShiftActivated(shiftId, driverId, vehicleId) {
    notifyAdmins(
      'shift_activated', 
      'Shift Activated', 
      'Driver shift has been activated and is now live.', 
      { shiftId, driverId, vehicleId }
    );
    notifyDriver(driverId, {
      type: 'shift_activated',
      shiftId,
      vehicleId
    });
  }

  static onShiftAdminClosed(driverId, reason) {
    notifyDriver(driverId, {
      type: 'shift_closed',
      reason,
      closedBy: 'admin'
    });
  }
}

module.exports = ShiftNotifier;
