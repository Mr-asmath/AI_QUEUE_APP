import React, { useState } from 'react';

function ResetPassword({ token, onBackToLogin }) {
  const [formData, setFormData] = useState({ new_password: '', confirm_password: '' });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setMessage('');
    setError('');

    try {
      const response = await fetch(`http://localhost:5000/api/auth/reset-password/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      const data = await response.json();
      if (data.success) {
        setMessage(data.message || 'Password updated. You can sign in now.');
        setFormData({ new_password: '', confirm_password: '' });
        window.history.replaceState({}, '', '/');
      } else {
        setError(data.error || 'Password reset failed');
      }
    } catch (err) {
      setError('Backend is not reachable.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h2>Set New Password</h2>
        <p className="auth-subtitle">Enter and confirm your new password.</p>

        {error && <div className="error-message">{error}</div>}
        {message && <div className="success-message">{message}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>New password</label>
            <input
              type="password"
              value={formData.new_password}
              onChange={(event) => setFormData({ ...formData, new_password: event.target.value })}
              minLength="6"
              required
            />
          </div>
          <div className="form-group">
            <label>Confirm password</label>
            <input
              type="password"
              value={formData.confirm_password}
              onChange={(event) => setFormData({ ...formData, confirm_password: event.target.value })}
              minLength="6"
              required
            />
          </div>
          <button type="submit" disabled={loading}>{loading ? 'Updating...' : 'Update Password'}</button>
        </form>

        <p className="auth-switch">
          <button className="link-button" onClick={onBackToLogin}>Back to sign in</button>
        </p>
      </div>
    </div>
  );
}

export default ResetPassword;
