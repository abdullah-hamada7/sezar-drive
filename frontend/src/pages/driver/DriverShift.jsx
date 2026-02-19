import { useState, useEffect, useContext } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../../services/api';
import { useShift } from '../../contexts/ShiftContext';
import FaceCapture from '../../components/FaceCapture';
import QRScanner from '../../components/QRScanner';
import { ClipboardCheck, Play, Square, Loader, ShieldCheck, Camera, QrCode, CheckCircle2 } from 'lucide-react';
import { ToastContext } from '../../contexts/toastContext';
import ConfirmModal from '../../components/common/ConfirmModal';

export default function DriverShift() {
  const { t } = useTranslation();
  const { addToast } = useContext(ToastContext);
  const { activeShift: shift, refreshShift, loading: shiftLoading } = useShift();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [activeStep, setActiveStep] = useState(null); // 'face' | 'qr'
  const [showConfirm, setShowConfirm] = useState(false);
  const [manualQr, setManualQr] = useState('');

  useEffect(() => { 
    loadUser();
  }, []);

  async function loadUser() {
    try {
      const res = await api.getMe();
      setUser(res.data.user);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }

  async function startShift() {
    if (!user?.avatarUrl && !user?.profilePhotoUrl) {
      addToast(t('driver_home.identity_required'), 'warning');
      return;
    }
    setActionLoading(true);
    try {
        const res = await api.createShift();
        await refreshShift();
        // Automatically start with biometric if not verified recently
        const verifiedToday = user.lastBiometricVerifiedAt && (new Date() - new Date(user.lastBiometricVerifiedAt)) < 24 * 60 * 60 * 1000;
        if (!verifiedToday) {
            setActiveStep('face');
        }
    } catch (err) {
        addToast(err.message || t('common.error'), 'error');
    } finally {
        setActionLoading(false);
    }
  }

  async function handleFaceCapture(file) {
    if (!file) return;
    setActionLoading(true);
    try {
      const formData = new FormData();
      formData.append('selfie', file);
      
      const result = await api.verifyShift(shift.id, formData);

      if (result.data.status === 'VERIFIED') {
        addToast(t('common.success'), 'success');
        setActiveStep(null);
        await refreshShift();
      } else if (result.data.status === 'MANUAL_REVIEW') {
        addToast(t('shift.manual_review_alert'), 'info');
        setActiveStep(null);
        await refreshShift();
      } else {
        addToast(t('shift.failed_alert'), 'error');
      }
    } catch (err) {
      addToast(err.message || t('common.error'), 'error');
    } finally {
      setActionLoading(false);
    }
  }

  async function handleQRScan(qrCode) {
    setActionLoading(true);
    try {
      await api.assignSelfVehicle(qrCode);
      addToast(t('common.success'), 'success');
      setActiveStep(null);
      await refreshShift();
    } catch (err) {
      addToast(err.message || t('common.error'), 'error');
    } finally {
      setActionLoading(false);
    }
  }

  async function activateShift() {
    setActionLoading(true);
    try {
      await api.activateShift(shift.id);
      addToast(t('common.success'), 'success');
      await refreshShift();
    } catch (err) { addToast(err.message || t('common.error'), 'error'); }
    finally { setActionLoading(false); }
  }

  async function onConfirmClose() {
    setShowConfirm(false);
    setActionLoading(true);
    try {
      await api.closeShift(shift.id);
      addToast(t('common.success'), 'success');
      await refreshShift();
    } catch (err) { addToast(err.message || t('common.error'), 'error'); }
    finally { setActionLoading(false); }
  }

  if (loading || shiftLoading) return <div className="loading-page"><div className="spinner"></div></div>;

  if (activeStep === 'face') {
    return (
      <div className="page-container">
        <h2 className="page-title">{t('shift.biometric_title')}</h2>
        <div className="card">
          <FaceCapture onCapture={handleFaceCapture} onCancel={() => setActiveStep(null)} />
        </div>
      </div>
    );
  }

  if (activeStep === 'qr') {
    return (
      <div className="page-container">
        <h2 className="page-title">{t('shift.scan_vehicle')}</h2>
        <div className="card">
          <QRScanner onScan={handleQRScan} onCancel={() => setActiveStep(null)} />
          <div className="mt-md" style={{ borderTop: '1px solid var(--color-border)', paddingTop: '1rem' }}>
            <div className="text-sm text-muted" style={{ marginBottom: '0.5rem' }}>{t('driver_home.enter_qr')}</div>
            <div className="flex gap-sm">
              <input
                type="text"
                className="form-input"
                placeholder={t('driver_home.enter_qr')}
                value={manualQr}
                onChange={(e) => setManualQr(e.target.value)}
              />
              <button
                className="btn btn-primary"
                onClick={() => manualQr && handleQRScan(manualQr)}
                disabled={!manualQr || actionLoading}
              >
                {t('driver_home.assign_btn')}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const isVerified = shift?.verificationStatus === 'VERIFIED';
  const hasVehicle = !!shift?.vehicleId || !!shift?.vehicle;

  return (
    <div>
      <h2 className="page-title" style={{ marginBottom: 'var(--space-lg)' }}>{t('shift.management')}</h2>

      {!shift ? (
        <div className="card" style={{ textAlign: 'center', padding: 'var(--space-2xl)' }}>
          <ClipboardCheck size={48} style={{ color: 'var(--color-text-muted)', margin: '0 auto var(--space-md)' }} />
          <h3 style={{ marginBottom: 'var(--space-sm)' }}>{t('shift.no_active')}</h3>
          <p className="text-muted text-sm" style={{ marginBottom: 'var(--space-lg)' }}>
            {t('shift.start_desc')}
          </p>
          <button className="btn btn-primary" onClick={startShift} disabled={actionLoading}>
            {actionLoading ? <Loader size={18} className="spinning" /> : <ShieldCheck size={18} />}
            {t('shift.start_btn')}
          </button>
        </div>
      ) : shift.status === 'PendingVerification' ? (
        <div className="security-gate-container">
           <div className="card glass-card" style={{ marginBottom: 'var(--space-lg)', border: '1px solid rgba(245, 158, 11, 0.3)' }}>
              <div className="flex items-center gap-md mb-lg">
                <div className="stat-icon" style={{ background: 'rgba(245, 158, 11, 0.12)', color: '#f59e0b' }}>
                  <ShieldCheck size={24} />
                </div>
                <div>
                  <h3 style={{ margin: 0 }}>The Gate</h3>
                  <p className="text-sm text-muted">Complete verification to start driving</p>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {/* Step 1: Face */}
                <div 
                  className={`gate-step card ${isVerified ? 'gate-step-done' : ''}`}
                  onClick={() => !isVerified && setActiveStep('face')}
                  style={{ 
                    cursor: isVerified ? 'default' : 'pointer',
                    display: 'flex', alignItems: 'center', gap: '1rem',
                    padding: '1rem', background: isVerified ? 'rgba(34, 197, 94, 0.05)' : 'var(--color-bg-secondary)'
                  }}
                >
                  <div style={{ color: isVerified ? 'var(--color-success)' : 'var(--color-text-muted)' }}>
                    {isVerified ? <CheckCircle2 size={24} /> : <Camera size={24} />}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600 }}>Face Verification</div>
                    <div className="text-xs text-muted">{isVerified ? 'Identity Confirmed' : 'Action Required'}</div>
                  </div>
                  {!isVerified && <Play size={16} className="text-muted mirror-rtl" />}
                </div>

                {/* Step 2: QR */}
                <div 
                  className={`gate-step card ${hasVehicle ? 'gate-step-done' : ''}`}
                  onClick={() => !hasVehicle && setActiveStep('qr')}
                  style={{ 
                    cursor: hasVehicle ? 'default' : 'pointer',
                    display: 'flex', alignItems: 'center', gap: '1rem',
                    padding: '1rem', background: hasVehicle ? 'rgba(34, 197, 94, 0.05)' : 'var(--color-bg-secondary)'
                  }}
                >
                  <div style={{ color: hasVehicle ? 'var(--color-success)' : 'var(--color-text-muted)' }}>
                    {hasVehicle ? <CheckCircle2 size={24} /> : <QrCode size={24} />}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600 }}>Vehicle Check-in</div>
                    <div className="text-xs text-muted">
                        {hasVehicle ? `Assigned: ${shift.vehicle?.plateNumber || 'VH-101'}` : 'Scan Vehicle QR'}
                    </div>
                  </div>
                  {!hasVehicle && <Play size={16} className="text-muted mirror-rtl" />}
                </div>
              </div>

              <div style={{ marginTop: '2rem' }}>
                <button 
                    className="btn btn-primary" 
                    onClick={activateShift} 
                    disabled={!isVerified || !hasVehicle || actionLoading} 
                    style={{ width: '100%', padding: '1rem' }}
                >
                  {actionLoading ? <Loader size={20} className="spinning" /> : <Play size={20} className="mirror-rtl" />}
                  <span style={{ marginLeft: '0.5rem' }}>Activate Shift & Start Driving</span>
                </button>
              </div>
           </div>

           <button className="btn btn-ghost" onClick={() => setShowConfirm(true)} style={{ width: '100%' }}>
              Cancel Shift Request
           </button>
        </div>
      ) : (
        <div className="card">
          <div className="flex items-center gap-md" style={{ marginBottom: 'var(--space-lg)' }}>
            <div className="stat-icon" style={{ 
              background: 'rgba(16, 185, 129, 0.12)', 
              color: '#10b981' 
            }}>
              <ShieldCheck size={24} />
            </div>
            <div>
              <div style={{ fontWeight: 600, fontSize: 'var(--font-size-lg)' }}>
                {t('shift.active')}
              </div>
              <div className="text-sm text-muted">{t('trip.status')}: {t('status.active')}</div>
            </div>
            <span className="badge badge-success" style={{ marginLeft: 'auto' }}>
              {t('status.active')}
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: 'var(--space-lg)' }}>
            <div className="flex justify-between">
              <span className="text-muted text-sm">{t('shift.vehicle')}</span>
              <span className="text-sm">{shift.vehicle?.plateNumber || shift.assignments?.[0]?.vehicle?.plateNumber}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted text-sm">{t('shift.started_at')}</span>
              <span className="text-sm">{shift.startedAt ? new Date(shift.startedAt).toLocaleTimeString() : '—'}</span>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
            <button className="btn btn-danger" onClick={() => setShowConfirm(true)} disabled={actionLoading} style={{ flex: 1 }}>
              {actionLoading ? <Loader size={18} /> : <Square size={18} />}
              {t('shift.end_btn')}
            </button>
          </div>
        </div>
      )}
      <ConfirmModal 
        isOpen={showConfirm}
        onClose={() => setShowConfirm(false)}
        onConfirm={onConfirmClose}
        title={shift?.status === 'Active' ? t('shift.end_btn') : 'Cancel Request'}
        message={shift?.status === 'Active' ? t('shift.close_confirm') : 'Are you sure you want to cancel this shift request?'}
      />
    </div>
  );
}
