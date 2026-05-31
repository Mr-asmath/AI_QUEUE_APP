import React, { useEffect, useState } from 'react';
import { apiPath } from '../config';

function Register({ onRegister, onSwitchToLogin }) {
  const [mode, setMode] = useState('user');
  const [userForm, setUserForm] = useState({ name: '', email: '', phone: '', password: '' });
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [termsOpen, setTermsOpen] = useState(false);
  const [termsText, setTermsText] = useState('Loading terms and conditions...');
  const [requestForm, setRequestForm] = useState({
    admin_name: '',
    admin_email: '',
    admin_phone: '',
    industry_name: '',
    industry_type: 'hospital',
    other_type_name: '',
    details: ''
  });
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let active = true;
    const loadTerms = async () => {
      try {
        const response = await fetch(apiPath('/api/security/terms'));
        const data = await response.json();
        if (active && data.success) {
          setTermsText(data.terms || 'Terms and conditions are available.');
        }
      } catch (err) {
        if (active) setTermsText('Terms and conditions could not be loaded right now.');
      }
    };
    loadTerms();
    return () => {
      active = false;
    };
  }, []);

  const registerUser = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError('');
    try {
      const response = await fetch(apiPath('/api/auth/register'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...userForm, terms_accepted: termsAccepted })
      });
      const data = await response.json();
      if (!data.success) {
        setError(data.error || 'Registration failed');
        return;
      }

      const loginResponse = await fetch(apiPath('/api/auth/login'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email: userForm.email, password: userForm.password })
      });
      const loginData = await loginResponse.json();
      if (loginData.success) onRegister(loginData.user);
    } catch (err) {
      setError('Backend is not reachable.');
    } finally {
      setLoading(false);
    }
  };

  const sendAccessRequest = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');
    try {
      const response = await fetch(apiPath('/api/access-requests'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestForm)
      });
      const data = await response.json();
      if (data.success) {
        setMessage('Access request sent to the main admin. Approval details will appear in the admin outbox.');
      } else {
        setError(data.error || 'Request failed');
      }
    } catch (err) {
      setError('Backend is not reachable.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card wide-card">
        <h2>Access Request</h2>
        <div className="segmented">
          <button className={mode === 'user' ? 'active' : ''} onClick={() => setMode('user')}>User account</button>
          <button className={mode === 'industry' ? 'active' : ''} onClick={() => setMode('industry')}>Industry admin request</button>
        </div>

        {error && <div className="error-message">{error}</div>}
        {message && <div className="success-message">{message}</div>}

        {mode === 'user' ? (
          <form onSubmit={registerUser}>
            {['name', 'email', 'phone', 'password'].map((field) => (
              <div className="form-group" key={field}>
                <label>{field.replace('_', ' ')}</label>
                <input
                  type={field === 'password' ? 'password' : field === 'email' ? 'email' : 'text'}
                  value={userForm[field]}
                  onChange={(event) => setUserForm({ ...userForm, [field]: event.target.value })}
                  required={field !== 'phone'}
                />
              </div>
            ))}
            <label className="terms-check">
              <input
                type="checkbox"
                checked={termsAccepted}
                onChange={(event) => setTermsAccepted(event.target.checked)}
              />
              <span>
                I accept the{' '}
                <button type="button" className="terms-link" onClick={() => setTermsOpen(true)}>
                  terms and conditions
                </button>
                and data security policy.
              </span>
            </label>
            <button type="submit" disabled={loading || !termsAccepted}>{loading ? 'Creating...' : 'Create User Account'}</button>
          </form>
        ) : (
          <form onSubmit={sendAccessRequest}>
            <div className="form-grid two">
              {['admin_name', 'admin_email', 'admin_phone', 'industry_name'].map((field) => (
                <div className="form-group" key={field}>
                  <label>{field.replaceAll('_', ' ')}</label>
                  <input
                    type={field.includes('email') ? 'email' : 'text'}
                    value={requestForm[field]}
                    onChange={(event) => setRequestForm({ ...requestForm, [field]: event.target.value })}
                    required={field !== 'admin_phone'}
                  />
                </div>
              ))}
            </div>
            <div className="form-group">
              <label>Industry type</label>
              <select
                value={requestForm.industry_type}
                onChange={(event) => setRequestForm({ ...requestForm, industry_type: event.target.value })}
              >
                <option value="hospital">Hospital</option>
                <option value="school">School</option>
                <option value="bank">Bank</option>
                <option value="hotel">Hotel</option>
                <option value="office">Office / Company</option>
                <option value="government">Government Office</option>
                <option value="other">Other</option>
              </select>
            </div>
            {requestForm.industry_type === 'other' && (
              <div className="form-group">
                <label>Other type name</label>
                <input value={requestForm.other_type_name} onChange={(event) => setRequestForm({ ...requestForm, other_type_name: event.target.value })} required />
              </div>
            )}
            <div className="form-group">
              <label>Industry details</label>
              <textarea rows="4" value={requestForm.details} onChange={(event) => setRequestForm({ ...requestForm, details: event.target.value })} />
            </div>
            <button type="submit" disabled={loading}>{loading ? 'Sending...' : 'Send Request'}</button>
          </form>
        )}

        <p className="auth-switch">
          Already approved? <button className="link-button" onClick={onSwitchToLogin}>Back to login</button>
        </p>
      </div>

      {termsOpen && (
        <div className="terms-modal-overlay" role="presentation" onClick={() => setTermsOpen(false)}>
          <div className="terms-modal" role="dialog" aria-modal="true" aria-labelledby="terms-modal-title" onClick={(event) => event.stopPropagation()}>
            <button type="button" className="terms-modal-close" aria-label="Close terms and conditions" onClick={() => setTermsOpen(false)}>
              x
            </button>
            <h3 id="terms-modal-title">Terms and Conditions</h3>
            <div className="terms-modal-body">
              {termsText}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Register;
