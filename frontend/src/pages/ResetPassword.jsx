import { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api from '../services/api';
import LanguageSwitcher from '../components/LanguageSwitcher';
import { Car, Lock, Key, AlertCircle, CheckCircle } from 'lucide-react';
import './Login.css';

export default function ResetPasswordPage() {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [validating, setValidating] = useState(true);
  const [isValid, setIsValid] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const getErrorMessage = useCallback((err) => {
    if (err.code === 'INVALID_RESET_TOKEN') return t('auth.invalid_token');
    if (err.code === 'VALIDATION_ERROR') return err.message; // Custom message usually localized in backend or generic enough
    return err.message || t('common.error');
  }, [t]);

  useEffect(() => {
    if (!token) {
      setValidating(false);
      setIsValid(false);
      return;
    }

    const verifyToken = async () => {
      try {
        await api.verifyResetToken(token);
        setIsValid(true);
      } catch (err) {
        setIsValid(false);
        setError(getErrorMessage(err));
      } finally {
        setValidating(false);
      }
    };

    verifyToken();
  }, [token, getErrorMessage]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      return setError(t('auth.passwords_dont_match'));
    }
    
    setError('');
    setLoading(true);
    try {
      await api.resetPassword(token, newPassword);
      setSuccess(true);
      setTimeout(() => navigate('/login'), 3000);
    } catch (err) {
      setError(getErrorMessage(err));
      setLoading(false);
    }
  };

  if (validating) {
    return (
      <div className="login-page">
        <div className="login-card" style={{ textAlign: 'center' }}>
          <div className="spinner" style={{ margin: '2rem auto' }}></div>
          <p>{t('common.loading')}</p>
        </div>
      </div>
    );
  }

  if (!isValid && !success) {
    return (
      <div className="login-page">
        <div className="login-card" style={{ textAlign: 'center' }}>
          <div className="login-header">
            <div className="login-logo" style={{ background: 'var(--error-bg)', color: 'var(--error-text)' }}>
              <AlertCircle size={28} />
            </div>
            <h1 className="login-title">{t('auth.invalid_token')}</h1>
            <p className="login-subtitle">{t('auth.forgot_password_desc')}</p>
          </div>
          <button className="btn btn-primary" onClick={() => navigate('/login')} style={{ marginTop: '2rem' }}>
            {t('auth.back_to_login')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="login-page">
      <div style={{ position: 'absolute', top: '1rem', right: '1rem', zIndex: 10 }}>
        <LanguageSwitcher style={{ background: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(4px)' }} />
      </div>
      <div className="login-bg">
        <div className="login-bg-shape shape-1"></div>
        <div className="login-bg-shape shape-2"></div>
      </div>
      <div className="login-card glass-card">
        <div className="login-header">
          <div className="login-logo glow-effect">
            <Car size={32} />
          </div>
          <h1 className="login-title text-gradient">{t('common.brand')}</h1>
          <p className="login-subtitle">
            {success ? t('auth.reset_success') : t('auth.reset_password_title')}
          </p>
        </div>

        {success ? (
          <div className="alert alert-success" style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '2rem' }}>
            <CheckCircle size={24} />
            <span>{t('auth.reset_success')}</span>
          </div>
        ) : (
          <>
            {error && <div className="alert alert-error">{error}</div>}

            <form onSubmit={handleSubmit} className="login-form">
              <div className="form-group">
                <label className="form-label">{t('auth.new_password')}</label>
                <div className="password-field">
                  <input
                    type="password"
                    className="form-input"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    minLength={8}
                    autoFocus
                  />
                  <Lock size={16} style={{ position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)', opacity: 0.5 }} />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">{t('auth.confirm_password')}</label>
                <div className="password-field">
                  <input
                    type="password"
                    className="form-input"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    minLength={8}
                  />
                  <Key size={16} style={{ position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)', opacity: 0.5 }} />
                </div>
              </div>

              <button type="submit" className="btn btn-primary login-btn" disabled={loading}>
                {loading ? <span className="spinner"></span> : t('auth.reset_btn')}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
