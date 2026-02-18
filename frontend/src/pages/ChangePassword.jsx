import { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import api from '../services/api';
import { Lock, Eye, EyeOff, CheckCircle } from 'lucide-react';

export default function ChangePasswordPage() {
  const { user, updateUser } = useAuth();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    setLoading(true);
    try {
      const res = await api.changePassword({ currentPassword, newPassword });
      const { user: updatedUser, accessToken, refreshToken } = res.data;
      
      if (accessToken) {
        api.setTokens(accessToken, refreshToken);
        updateUser(updatedUser);
      } else {
        updateUser({ ...user, mustChangePassword: false });
      }
      
      setSuccess(true);
      setTimeout(() => {
        const role = updatedUser?.role || user?.role;
        if (role === 'admin') {
          window.location.href = '/admin';
        } else {
          window.location.href = '/driver';
        }
      }, 1500);
    } catch (err) {
      setError(err.message || 'Failed to change password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-bg">
        <div className="login-bg-shape shape-1"></div>
        <div className="login-bg-shape shape-2"></div>
      </div>
      <div className="login-card" style={{ maxWidth: '460px' }}>
        <div className="login-header">
          <div className="login-logo">
            <Lock size={28} />
          </div>
          <h1 className="login-title">Change Password</h1>
          <p className="login-subtitle">
            {user?.mustChangePassword
              ? 'You must change your temporary password before continuing'
              : 'Update your account password'}
          </p>
        </div>

        {success ? (
          <div className="alert alert-success">
            <CheckCircle size={18} />
            Password changed successfully! Redirecting...
          </div>
        ) : (
          <>
            {error && <div className="alert alert-error">{error}</div>}

            <form onSubmit={handleSubmit} className="login-form">
              <div className="form-group">
                <label className="form-label">Current Password</label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="currentPassword"
                  className="form-input"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">New Password</label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="newPassword"
                  className="form-input"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  minLength={8}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Confirm New Password</label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="confirmPassword"
                  className="form-input"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
              </div>

              <label className="flex items-center gap-sm text-sm text-muted" style={{ cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={showPassword}
                  onChange={() => setShowPassword(!showPassword)}
                />
                Show passwords
              </label>

              <button type="submit" className="btn btn-primary login-btn" disabled={loading}>
                {loading ? <span className="spinner"></span> : <Lock size={18} />}
                {loading ? 'Changing...' : 'Change Password'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
