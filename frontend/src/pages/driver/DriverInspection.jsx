import { useState, useRef, useContext } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../../services/api';
import { Camera, CheckCircle, Upload, ChevronRight, AlertCircle } from 'lucide-react';
import { ToastContext } from '../../contexts/toastContext';
import { useShift } from '../../contexts/ShiftContext';

const DIRECTIONS = ['front', 'back', 'left', 'right'];
const CHECKLIST_KEYS = ['tires', 'lights', 'brakes', 'mirrors', 'fluids', 'seatbelts', 'horn', 'wipers'];

export default function DriverInspection() {
  const { t } = useTranslation();
  const { addToast } = useContext(ToastContext);
  const { activeShift: shift } = useShift();
  const [step, setStep] = useState('checklist'); // checklist | photos | review | done
  const [checks, setChecks] = useState({});
  const [notes, setNotes] = useState('');
  const [photos, setPhotos] = useState({});
  const [inspectionId, setInspectionId] = useState(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const fileRef = useRef(null);
  const [currentDirection, setCurrentDirection] = useState(null);

  function toggleCheck(key) {
    setChecks(prev => ({ ...prev, [key]: !prev[key] }));
  }

  async function submitChecklist() {
    if (!shift) {
      addToast(t('inspection.no_shift_title'), 'error');
      return;
    }
    const vehicleId = shift.vehicleId
      || shift.vehicle?.id
      || shift.assignments?.[0]?.vehicleId
      || shift.assignments?.[0]?.vehicle?.id;
    if (!vehicleId) {
      addToast(t('errors.NO_VEHICLE_ASSIGNED'), 'error');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const type = 'full';
      const res = await api.createInspection({
        shiftId: shift.id,
        vehicleId,
        type,
        notes
      });
      setInspectionId(res.data.id);
      setStep('photos');
    } catch (err) {
      setError(err.message || t('common.error'));
      // Handled by HttpService
    }
    finally { setLoading(false); }
  }

  function triggerPhotoCapture(direction) {
    setCurrentDirection(direction);
    fileRef.current?.click();
  }

  async function handlePhotoUpload(e) {
    const file = e.target.files?.[0];
    if (!file || !currentDirection || !inspectionId) return;

    setError('');
    const formData = new FormData();
    formData.append('photo', file);
    formData.append('direction', currentDirection);

    try {
      await api.uploadInspectionPhoto(inspectionId, currentDirection, formData);
      setPhotos(prev => ({ ...prev, [currentDirection]: URL.createObjectURL(file) }));
    } catch (err) {
      setError(err.message || t('common.error'));
      // Handled by HttpService
    }

    e.target.value = '';
  }

  async function completeInspection() {
    if (Object.keys(photos).length < 4) {
      addToast(t('inspection.photos_missing_error') || 'Please take photos of all 4 sides before completing.', 'error');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await api.completeInspection(inspectionId, { checklistData: { checks, notes } });
      setStep('done');
    } catch (err) {
      setError(err.message || t('common.error'));
      // Handled by HttpService
    }
    finally { setLoading(false); }
  }

  if (!shift) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: 'var(--space-2xl)' }}>
        <AlertCircle size={56} style={{ color: 'var(--color-warning)', margin: '0 auto var(--space-md)' }} />
        <h2 style={{ marginBottom: 'var(--space-sm)' }}>{t('inspection.no_shift_title')}</h2>
        <p className="text-muted" style={{ marginBottom: 'var(--space-md)' }}>{t('inspection.no_shift_desc')}</p>
        <a href="/driver/shift" className="btn btn-primary">{t('inspection.go_shifts')}</a>
      </div>
    );
  }

  if (step === 'done') {
    return (
      <div className="card" style={{ textAlign: 'center', padding: 'var(--space-2xl)' }}>
        <CheckCircle size={56} style={{ color: 'var(--color-success)', margin: '0 auto var(--space-md)' }} />
        <h2 style={{ marginBottom: 'var(--space-sm)' }}>{t('inspection.done_title')}</h2>
        <p className="text-muted">{t('inspection.done_desc')}</p>
      </div>
    );
  }

  return (
    <div>
      <h2 className="page-title" style={{ marginBottom: 'var(--space-lg)' }}>{t('inspection.title')}</h2>
      <input type="file" ref={fileRef} accept="image/*" capture="environment" onChange={handlePhotoUpload} style={{ display: 'none' }} />

      {error && <div className="alert alert-error">{error}</div>}

      <div style={{ display: 'flex', gap: '0.25rem', marginBottom: 'var(--space-lg)' }}>
        {['checklist', 'photos', 'review'].map((s, i) => (
          <div key={s} style={{
            flex: 1, height: '4px', borderRadius: '2px',
            background: ['checklist', 'photos', 'review'].indexOf(step) >= i ? 'var(--color-primary)' : 'var(--color-bg-tertiary)',
            transition: 'background var(--transition-base)'
          }} />
        ))}
      </div>

      {step === 'checklist' && (
        <div>
          <p className="text-muted text-sm mb-md">{t('inspection.checklist_desc')}</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: 'var(--space-lg)' }}>
            {CHECKLIST_KEYS.map(key => (
              <div
                key={key}
                className="card"
                onClick={() => toggleCheck(key)}
                style={{
                  padding: 'var(--space-md)',
                  cursor: 'pointer',
                  borderColor: checks[key] ? 'var(--color-success)' : undefined,
                  background: checks[key] ? 'var(--color-success-bg)' : undefined,
                }}
              >
                <div className="flex items-center gap-sm">
                  <div style={{
                    width: '22px', height: '22px', borderRadius: '6px',
                    border: `2px solid ${checks[key] ? 'var(--color-success)' : 'var(--color-border-light)'}`,
                    background: checks[key] ? 'var(--color-success)' : 'transparent',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    transition: 'all var(--transition-fast)', flexShrink: 0
                  }}>
                    {checks[key] && <CheckCircle size={14} style={{ color: 'white' }} />}
                  </div>
                  <span className="text-sm">{t(`inspection.checklist.${key}`)}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="form-group">
            <label className="form-label">{t('inspection.notes_label')}</label>
            <textarea className="form-textarea" value={notes} onChange={e => setNotes(e.target.value)} placeholder={t('inspection.notes_placeholder')} />
          </div>

          <button className="btn btn-primary" onClick={submitChecklist} disabled={loading} style={{ width: '100%' }}>
            {loading ? <span className="spinner"></span> : <ChevronRight size={18} className="mirror-rtl" />}
            {t('inspection.continue_photos')}
          </button>
        </div>
      )}

      {step === 'photos' && (
        <div>
          <p className="text-muted text-sm mb-md">{t('inspection.photos_desc')}</p>
          <div className="grid grid-2" style={{ gap: 'var(--space-md)', marginBottom: 'var(--space-lg)' }}>
            {DIRECTIONS.map(dir => (
              <div
                key={dir}
                className="card"
                onClick={() => triggerPhotoCapture(dir)}
                style={{ textAlign: 'center', padding: 'var(--space-md)', cursor: 'pointer', borderColor: photos[dir] ? 'var(--color-success)' : undefined }}
              >
                {photos[dir] ? (
                  <img src={photos[dir]} alt={dir} style={{ width: '100%', height: '100px', objectFit: 'cover', borderRadius: 'var(--radius-md)', marginBottom: 'var(--space-sm)' }} />
                ) : (
                  <Camera size={32} style={{ color: 'var(--color-text-muted)', margin: '0 auto var(--space-sm)' }} />
                )}
                <div className="text-sm" style={{ fontWeight: 500 }}>{t(`inspection.directions.${dir}`)}</div>
                <div className="text-sm text-muted">{photos[dir] ? t('inspection.captured') : t('inspection.tap_capture')}</div>
              </div>
            ))}
          </div>

          <button 
            className="btn btn-primary" 
            onClick={() => setStep('review')} 
            disabled={Object.keys(photos).length < 4}
            style={{ width: '100%' }}
          >
            <ChevronRight size={18} className="mirror-rtl" /> {t('inspection.review_complete')}
          </button>
        </div>
      )}

      {step === 'review' && (
        <div>
          <div className="card" style={{ marginBottom: 'var(--space-lg)' }}>
            <h3 className="card-title" style={{ marginBottom: 'var(--space-md)' }}>{t('inspection.summary_title')}</h3>
            {CHECKLIST_KEYS.map(key => (
              <div key={key} className="flex items-center justify-between" style={{ padding: '0.375rem 0' }}>
                <span className="text-sm">{t(`inspection.checklist.${key}`)}</span>
                <span className={`badge ${checks[key] ? 'badge-success' : 'badge-danger'}`}>
                  {checks[key] ? t('inspection.pass') : t('inspection.fail')}
                </span>
              </div>
            ))}
            {notes && (
              <div style={{ marginTop: 'var(--space-md)', paddingTop: 'var(--space-md)', borderTop: '1px solid var(--color-border)' }}>
                <span className="text-muted text-sm">{t('inspection.notes_label')}:</span>
                <p className="text-sm mt-sm">{notes}</p>
              </div>
            )}
          </div>

          <div className="card" style={{ marginBottom: 'var(--space-lg)' }}>
            <h3 className="card-title" style={{ marginBottom: 'var(--space-md)' }}>{t('inspection.photos')}</h3>
            <div className="flex items-center justify-between" style={{ flexWrap: 'wrap', gap: '0.5rem' }}>
              {DIRECTIONS.map(dir => (
                <div key={dir} className="text-sm">
                  <span>{t(`inspection.directions.${dir}`)}:</span>{' '}
                  <span className={photos[dir] ? 'badge badge-success' : 'badge badge-warning'}>
                    {photos[dir] ? t('inspection.uploaded') : t('inspection.missing')}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {CHECKLIST_KEYS.some(key => !checks[key]) && (
            <div className="alert alert-info mb-md">
              <AlertCircle size={16} />
              {t('inspection.flag_alert')}
            </div>
          )}

          <button className="btn btn-success" onClick={completeInspection} disabled={loading} style={{ width: '100%' }}>
            {loading ? <span className="spinner"></span> : <CheckCircle size={18} />}
            {t('inspection.submit')}
          </button>
        </div>
      )}
    </div>
  );
}
