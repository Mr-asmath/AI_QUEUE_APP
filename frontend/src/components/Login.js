import React, { useState } from 'react';
import { apiPath } from '../config';
import AlertMessage from './AlertMessage';

function Login({ onLogin, onSwitchToRegister }) {
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [forgotEmail, setForgotEmail] = useState('');
  const [showForgot, setShowForgot] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');

    try {
      const response = await fetch(apiPath('/api/auth/login'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(formData)
      });
      const data = await response.json();
      if (data.success) onLogin(data.user);
      else setError(data.error || 'Login failed');
    } catch (err) {
      setError('Backend is not reachable.');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');

    try {
      const response = await fetch(apiPath('/api/auth/forgot-password'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: forgotEmail })
      });
      const data = await response.json();
      if (data.success) {
        setMessage(data.reset_url ? `Reset link created: ${data.reset_url}` : 'Password reset link sent to your email.');
        setShowForgot(false);
        setForgotEmail('');
      } else {
        setError(data.error || 'Password reset request failed');
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
        <h2>AI Queue Automation</h2>
        <p className="auth-subtitle">Sign in to manage industries, branches, queues, or service work.</p>

        <AlertMessage type="error">{error}</AlertMessage>
        <AlertMessage type="success">{message}</AlertMessage>

        {!showForgot ? (
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Email Address</label>
            <input
              type="email"
              value={formData.email}
              onChange={(event) => setFormData({ ...formData, email: event.target.value })}
              required
            />
          </div>
          <div className="form-group">
            <label>Password</label>
            <input
              type="password"
              value={formData.password}
              onChange={(event) => setFormData({ ...formData, password: event.target.value })}
              required
            />
          </div>
          <button type="submit" disabled={loading}>{loading ? 'Signing in...' : 'Sign In'}</button>
        </form>
        ) : (
        <form onSubmit={handleForgotPassword}>
          <div className="form-group">
            <label>Email Address</label>
            <input
              type="email"
              value={forgotEmail}
              onChange={(event) => setForgotEmail(event.target.value)}
              required
            />
          </div>
          <button type="submit" disabled={loading}>{loading ? 'Sending...' : 'Send Reset Request'}</button>
        </form>
        )}

        <p className="auth-switch">
          {showForgot ? (
            <button className="link-button" onClick={() => setShowForgot(false)}>Back to sign in</button>
          ) : (
            <button className="link-button" onClick={() => setShowForgot(true)}>Forgot password?</button>
          )}
        </p>

        <p className="auth-switch">
          Need industry access or a user account?{' '}
          <button className="link-button" onClick={onSwitchToRegister}>Open request form</button>
        </p>

        <div className="demo-credentials">
          <h4>Demo Accounts</h4>
          <p>Main admin: admin@queue.com / admin123</p>
          <p>Industry admin: industry@queue.com / demo123</p>
          <p>Operator: operator@queue.com / demo123</p>
          <p>Doctor: provider@queue.com / demo123</p>
        </div>
      </div>
    </div>
  );
}

export default Login;
