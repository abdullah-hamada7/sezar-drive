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
  const [manualCode, setManualCode] = useState('');
  const [loading] = useState(false);
  const [error, setError] = useState(null);

  const handleManualSubmit = (e) => {
    e.preventDefault();
    if (!manualCode.trim()) return;
    onScan(manualCode.trim());
  };

  return (
    <div className="qr-scanner-container" style={{ textAlign: 'center' }}>
      <div style={{ position: 'relative', borderRadius: 'var(--radius-lg)', overflow: 'hidden', backgroundColor: '#000', marginBottom: 'var(--space-md)', aspectRatio: '1/1' }}>
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
          {/* Scanning line animation could be added here */}
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

      <style>{`
        @keyframes scanLine {
          0% { top: 0; }
          100% { top: 100%; }
        }
      `}</style>
      
      {error && (
        <div className="alert alert-danger" style={{ marginBottom: 'var(--space-md)' }}>
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleManualSubmit} style={{ marginBottom: 'var(--space-md)' }}>
        <div className="form-group" style={{ marginBottom: 'var(--space-sm)' }}>
          <label className="form-label text-sm">{t ? t('shift.manual_qr_label') : 'Or enter Vehicle Code manually:'}</label>
          <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
            <input 
              type="text" 
              className="form-input" 
              placeholder="e.g. VH-101" 
              value={manualCode} 
              onChange={(e) => setManualCode(e.target.value)} 
            />
            <button type="submit" className="btn btn-secondary" disabled={!manualCode.trim() || loading}>
              {loading ? <Loader size={18} className="spinning" /> : <CheckCircle size={18} />}
            </button>
          </div>
        </div>
      </form>

      <div className="flex gap-md justify-center">
        <button className="btn btn-ghost" onClick={onCancel} style={{ width: '100%' }}>
          <X size={18} /> Cancel
        </button>
      </div>
    </div>
  );
}
