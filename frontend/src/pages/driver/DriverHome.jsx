import { useState, useEffect, useContext, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../hooks/useAuth';
import { useShift } from '../../contexts/ShiftContext';
import api from '../../services/api';
import {
  ClipboardCheck, User, DollarSign, RefreshCw, Upload, Camera, Car
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { ToastContext } from '../../contexts/toastContext';
import FaceCapture from '../../components/FaceCapture';

/* ─── Inline Identity Upload Form ─── */
function IdentityUploadForm({ onUpload, user }) {
  const { t } = useTranslation();
  const [files, setFiles] = useState({ photo: null, front: null, back: null });
  /* Removed useEffect for state sync - derived in render instead */
  const [previews, setPreviews] = useState({});

  function handleFile(key, file) {
    if (!file) return;
    setFiles(prev => ({ ...prev, [key]: file }));
    setPreviews(prev => ({ ...prev, [key]: URL.createObjectURL(file) }));
  }


  const allSelected = files.photo && files.front && files.back;

  return (
    <div style={{ marginTop: '0.75rem' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem', marginBottom: '0.75rem' }}>
        {[
          { key: 'photo', label: t('driver_home.selfie_label') },
          { key: 'front', label: t('driver_home.id_front') },
          { key: 'back',  label: t('driver_home.id_back') },
          ].map(({ key, label }) => {
            const hasImage = previews[key] || (
               key === 'photo' ? user?.identityPhotoUrl :
               key === 'front' ? user?.idCardFront :
               user?.idCardBack
            );
            return (
          <label key={key} style={{
            border: '2px dashed var(--color-border)',
            borderRadius: 'var(--radius-md)',
            padding: '0.5rem',
            textAlign: 'center',
            cursor: 'pointer',
            background: hasImage ? 'var(--color-success-bg)' : 'var(--color-bg-secondary)',
            borderColor: hasImage ? 'var(--color-success)' : undefined,
            transition: 'all 0.2s',
          }}>
            <input
              type="file"
              accept="image/*"
              capture={key === 'photo' ? 'user' : undefined}
              style={{ display: 'none' }}
              onChange={e => handleFile(key, e.target.files?.[0])}
            />
            {(() => {
                // Derived display logic
                const local = previews[key];
                const server = key === 'photo' ? user?.identityPhotoUrl 
                             : key === 'front' ? user?.idCardFront 
                             : user?.idCardBack;
                const displaySrc = local || server;
                
                return displaySrc ? (
                  <img src={displaySrc} alt={label} style={{ width: '100%', height: 60, objectFit: 'cover', borderRadius: 4, marginBottom: 4 }} />
                ) : (
                  <Camera size={20} style={{ color: 'var(--color-text-muted)', margin: '0.25rem auto' }} />
                );
            })()}
            <div className="text-xs" style={{ fontWeight: 500 }}>{label}</div>
            <div className="text-xs text-muted">{previews[key] ? t('driver_home.selected') : t('driver_home.tap_select')}</div>
          </label>
            );
          })}
      </div>
      <button
        className="btn btn-primary btn-sm"
        disabled={!allSelected}
        onClick={() => onUpload(files)}
        style={{ width: '100%' }}
      >
        <Upload size={14} /> {t('driver_home.upload_docs')}
      </button>
    </div>
  );
}

export default function DriverHome() {
  const { t } = useTranslation();
  const { user, updateUser } = useAuth();
  const { addToast } = useContext(ToastContext);
  const { activeShift, refreshShift, loading: shiftLoading } = useShift();
  const [refreshing, setRefreshing] = useState(false);
  const [biometricPending, setBiometricPending] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
 
  useEffect(() => {
    const handleIdentityUpdate = (e) => {
      const { status, reason } = e.detail;
      if (status === 'approved') {
        addToast(t('driver_home.identity_approved'), 'success');
      } else {
        addToast(`${t('driver_home.identity_rejected')}: ${reason || ''}`, 'error');
      }
      refreshStatus();
    };

    window.addEventListener('ws:identity_update', handleIdentityUpdate);

    return () => {
      window.removeEventListener('ws:identity_update', handleIdentityUpdate);
    };
  }, [t, addToast, refreshStatus]);

  // Biometric Check Logic
  const needsBiometric = user?.identityPhotoUrl && (!user?.lastBiometricVerifiedAt || (new Date() - new Date(user.lastBiometricVerifiedAt)) > 24 * 60 * 60 * 1000);

  async function handleIdentityUpload(files) {
    const formData = new FormData();
    if (files.photo) formData.append('photo', files.photo);
    if (files.front) formData.append('idCardFront', files.front);
    if (files.back) formData.append('idCardBack', files.back);
    try {
      await api.uploadIdentityPhoto(formData);
      addToast(t('driver_home.upload_success'), 'success');
      refreshStatus();
    } catch (err) {
      addToast(err.message || t('common.error'), 'error');
    }
  }

  async function handleBiometricCapture(file) {
    setIsVerifying(true);
    const formData = new FormData();
    if (file) formData.append('photo', file);
    try {
      const res = await api.verifyFaceMatch(formData);
      if (res.data.status === 'VERIFIED') {
        addToast(t('common.success'), 'success');
        refreshStatus();
        setBiometricPending(false);
      } else {
        addToast(t('shift.failed_alert'), 'error');
      }
    } catch (err) {
      addToast(err.message || t('common.error'), 'error');
    } finally {
      setIsVerifying(false);
    }
  }

  const refreshStatus = useCallback(async () => {
    setRefreshing(true);
    try {
      const res = await api.getMe();
      if (res.data?.user) {
        updateUser(res.data.user);
        if (res.data.accessToken) {
          api.setTokens(res.data.accessToken, undefined);
        }
        addToast(t('driver_home.status_refreshed'), 'success');
      }
    } catch (err) {
      addToast(err.message || t('common.error'), 'error');
    } finally {
      setRefreshing(false);
    }
  }, [t, updateUser, addToast]);

  if (shiftLoading) return <div className="loading-page"><div className="spinner"></div></div>;

  return (
    <div>
      {/* Identity & Biometric Gate Removed - Admin Verification Assumed */}

      <div className="page-header mb-md">
        <h1 className="page-title text-gradient">{t('nav.dashboard')}</h1>
      </div>

      {/* Profile & Avatar */}
      <div className="card glass-card mb-md flex items-center justify-between">
         <div className="flex items-center gap-md">
            <div className="glow-effect" style={{ width: 64, height: 64, borderRadius: 'var(--radius-full)', background: 'var(--color-bg-tertiary)', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid var(--color-primary)', boxShadow: 'var(--shadow-glow)' }}>
                {user?.profilePhotoUrl
                  ? <img src={user.profilePhotoUrl} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : <User size={32} className="text-primary" />}
            </div>
            <div>
                <div className="text-xl font-bold text-gradient leading-tight">{user?.name}</div>
                <div className="text-sm text-muted opacity-80">{user?.email}</div>
                <div className="mt-xs">
                   <span className={`badge ${user?.identityVerified ? 'badge-success' : 'badge-warning'} text-[10px] px-sm py-0`}>
                      {user?.identityVerified ? t('common.status.verified') : t('common.status.pending')}
                   </span>
                </div>
            </div>
         </div>
         <div style={{ position: 'relative' }}>
             <input
                type="file"
                id="avatar-upload"
                style={{ display: 'none' }}
                accept="image/*"
                onChange={async (e) => {
                    if (!e.target.files[0]) return;
                    const formData = new FormData();
                    formData.append('avatar', e.target.files[0]);
                    try {
                        const res = await api.updateProfileAvatar(formData);
                        if (res?.data) {
                          updateUser(res.data);
                        } else if (res) {
                          updateUser(res);
                        } else {
                          refreshStatus();
                        }
                        addToast(t('driver_home.photo_updated'), 'success');
                    } catch (err) {
                        addToast(err.message || t('common.error'), 'error');
                    }
                }}
             />
             <button className="btn btn-secondary btn-sm" onClick={() => document.getElementById('avatar-upload').click()}>
                {t('driver_home.edit_photo')}
             </button>
         </div>
      </div>

      {/* Vehicle Assignment / Active Vehicle */}
      <div className="card mb-md">
         <div className="flex items-center justify-between mb-sm">
             <h3 className="card-title flex items-center gap-sm"><Car size={16}/> {t('driver_home.current_vehicle')}</h3>
         </div>
         {(() => {
             const currentVehicle = activeShift?.vehicle || activeShift?.assignments?.[0]?.vehicle;
             return currentVehicle ? (
                 <div className="p-sm bg-success-soft rounded flex items-center gap-md">
                     <div className="p-xs bg-white rounded-full"><Car size={20} className="text-success" /></div>
                     <div>
                         <div className="font-bold">{currentVehicle.plateNumber}</div>
                         <div className="text-sm">{currentVehicle.model} ({currentVehicle.year})</div>
                     </div>
                 </div>
             ) : (
                 <div>
                     <p className="text-sm text-muted mb-sm">{t('driver_home.scan_qr_desc')}</p>
                     <div className="flex gap-sm">
                         <input 
                            type="text" 
                            className="form-input" 
                            placeholder={t('driver_home.enter_qr')}
                            id="qr-input"
                         />
                         <button 
                            className="btn btn-primary"
                            onClick={async () => {
                                const qr = document.getElementById('qr-input').value;
                                if(!qr) return addToast(t('driver_home.enter_qr'), 'error');
                                setLoading(true);
                                try {
                                    await api.assignSelfVehicle(qr);
                                    addToast(t('common.success'), 'success');
                                    refreshShift(); // Refresh to show vehicle
                                } catch(err) {
                                    addToast(err.message, 'error');
                                } finally {
                                    setLoading(false);
                                }
                            }}
                         >
                            {t('driver_home.assign_btn')}
                         </button>
                     </div>
                 </div>
             );
         })()}
      </div>


      {/* Shift Status */}
      {activeShift && (
        <div className="card mb-md" style={{ borderColor: 'var(--color-success)', background: 'var(--color-success-bg)' }}>
          <div className="flex items-center gap-md">
            <ClipboardCheck size={24} style={{ color: 'var(--color-success)' }} />
            <div>
              <div style={{ fontWeight: 600, color: 'var(--color-success)' }}>{t('shift.active')}</div>
              <div className="text-sm text-muted">{t('shift.vehicle')}: {activeShift.vehicle?.plateNumber || '—'}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
