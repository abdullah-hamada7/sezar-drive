import { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import Webcam from 'react-webcam';
import { Camera, CheckCircle, AlertCircle, X, Loader } from 'lucide-react';

const videoConstraints = {
  width: 1280,
  height: 720,
  facingMode: "environment" // Use back camera
};

export default function QRScanner({ onScan, onCancel }) {
  const { t } = useTranslation();
  const webcamRef = useRef(null);
  const [scanMode, setScanMode] = useState('camera'); // 'camera' | 'manual'
  const [manualCode, setManualCode] = useState('');
  const [loading] = useState(false);
  const [error, setError] = useState(null);

  const handleManualSubmit = (e) => {
    e.preventDefault();
    if (!manualCode.trim()) return;
    onScan(manualCode.trim());
  };

  return (
    <div className="qr-scanner-wrapper" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Mode Toggle */}
      <div className="segmented-control" style={{ 
        display: 'flex', 
        background: 'var(--color-bg-secondary)', 
        borderRadius: 'var(--radius-md)', 
        padding: '2px',
        border: '1px solid var(--color-border)'
      }}>
        <button 
          className={`flex-1 btn-sm ${scanMode === 'camera' ? 'btn-primary' : 'btn-ghost'}`}
          onClick={() => setScanMode('camera')}
          style={{ borderRadius: 'calc(var(--radius-md) - 2px)', padding: '0.6rem' }}
        >
          <Camera size={16} />
          <span style={{ marginLeft: '0.5rem' }}>{t ? t('shift.scan_vehicle') : 'Scan Camera'}</span>
        </button>
        <button 
          className={`flex-1 btn-sm ${scanMode === 'manual' ? 'btn-primary' : 'btn-ghost'}`}
          onClick={() => setScanMode('manual')}
          style={{ borderRadius: 'calc(var(--radius-md) - 2px)', padding: '0.6rem' }}
        >
          <QrCode size={16} />
          <span style={{ marginLeft: '0.5rem' }}>{t ? t('shift.manual_qr_label') : 'Type Manually'}</span>
        </button>
      </div>

      <div className="qr-scanner-content">
        {scanMode === 'camera' ? (
          <div className="camera-view" style={{ position: 'relative', borderRadius: 'var(--radius-lg)', overflow: 'hidden', backgroundColor: '#000', aspectRatio: '1/1' }}>
            <Webcam
              audio={false}
              ref={webcamRef}
              screenshotFormat="image/jpeg"
              videoConstraints={videoConstraints}
              onUserMediaError={() => setError("Camera access denied.")}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
            {/* QR Scanner Frame Overlay */}
            <div style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              width: '70%',
              height: '70%',
              border: '2px solid rgba(255,255,255,0.7)',
              borderRadius: 'var(--radius-lg)',
              pointerEvents: 'none',
              boxShadow: '0 0 0 1000px rgba(0,0,0,0.5)'
            }}>
              <div style={{
                position: 'absolute',
                top: '0',
                left: '0',
                width: '100%',
                height: '2px',
                background: 'var(--color-primary)',
                boxShadow: '0 0 8px var(--color-primary)',
                animation: 'scanLine 2s linear infinite'
              }}></div>
            </div>
          </div>
        ) : (
          <div className="manual-entry-view card" style={{ padding: 'var(--space-xl)', background: 'var(--color-bg-secondary)' }}>
            <form onSubmit={handleManualSubmit}>
              <div className="form-group" style={{ marginBottom: 'var(--space-lg)' }}>
                <label className="form-label">{t ? t('shift.manual_qr_label') : 'Enter Vehicle Code:'}</label>
                <input 
                  type="text" 
                  className="form-input" 
                  placeholder="e.g. VH-101" 
                  value={manualCode} 
                  autoFocus
                  onChange={(e) => setManualCode(e.target.value)} 
                  style={{ fontSize: '1.2rem', padding: '1rem', textAlign: 'center', letterSpacing: '2px' }}
                />
              </div>
              <button 
                type="submit" 
                className="btn btn-primary" 
                disabled={!manualCode.trim() || loading}
                style={{ width: '100%', padding: '1rem' }}
              >
                {loading ? <Loader size={20} className="spinning" /> : <CheckCircle size={20} />}
                <span style={{ marginLeft: '0.5rem' }}>Confirm Assignment</span>
              </button>
            </form>
          </div>
        )}
      </div>

      <style>{`
        @keyframes scanLine {
          0% { top: 0; }
          100% { top: 100%; }
        }
      `}</style>
      
      {error && (
        <div className="alert alert-danger">
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      <button className="btn btn-ghost" onClick={onCancel} style={{ width: '100%' }}>
        <X size={18} /> {t('common.cancel')}
      </button>
    </div>
  );
}
