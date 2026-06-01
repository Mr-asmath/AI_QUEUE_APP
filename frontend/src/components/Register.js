import React, { useEffect, useState } from 'react';
import { apiPath } from '../config';

function Register({ onRegister, onSwitchToLogin }) {
  const [mode, setMode] = useState('user');
  const [userForm, setUserForm] = useState({ name: '', email: '', phone: '', password: '' });
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [messagingConsent, setMessagingConsent] = useState(false);
  const [termsOpen, setTermsOpen] = useState(false);
  const [termsText, setTermsText] = useState('Loading terms and conditions...');
  const [registrationStep, setRegistrationStep] = useState('form');
  const [phoneEditable, setPhoneEditable] = useState(false);
  const [phoneDraft, setPhoneDraft] = useState('');
  const [phoneOtp, setPhoneOtp] = useState(['', '', '', '']);
  const [devPhoneCode, setDevPhoneCode] = useState('');
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
        body: JSON.stringify({ ...userForm, terms_accepted: termsAccepted, messaging_consent: messagingConsent })
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
      if (loginData.success) {
        setPhoneDraft(loginData.user.phone || userForm.phone || '');
        setRegistrationStep('phone-confirm');
        setMessage('Account created. Confirm your phone number before opening the dashboard.');
      }
    } catch (err) {
      setError('Backend is not reachable.');
    } finally {
      setLoading(false);
    }
  };

  const sendPhoneOtp = async () => {
    setLoading(true);
    setError('');
    setMessage('');
    setDevPhoneCode('');
    try {
      const response = await fetch(apiPath('/api/auth/verification/send'), {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channel: 'phone', phone: phoneDraft })
      });
      const data = await response.json();
      if (data.success) {
        setPhoneEditable(false);
        setRegistrationStep('phone-verify');
        setMessage('Verification code sent to your phone number.');
        if (data.dev_code) setDevPhoneCode(data.dev_code);
      } else {
        setError(data.error || 'Could not send phone verification code.');
      }
    } catch (err) {
      setError('Backend is not reachable.');
    } finally {
      setLoading(false);
    }
  };

  const verifyPhoneOtp = async (codeOverride) => {
    const code = codeOverride || phoneOtp.join('');
    setLoading(true);
    setError('');
    try {
      const response = await fetch(apiPath('/api/auth/verification/verify'), {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channel: 'phone', code })
      });
      const data = await response.json();
      if (data.success) {
        onRegister(data.user);
      } else {
        setError(data.error || 'Phone verification failed.');
      }
    } catch (err) {
      setError('Backend is not reachable.');
    } finally {
      setLoading(false);
    }
  };

  const updateOtpBox = (index, value, setter, length) => {
    const digit = value.replace(/\D/g, '').slice(-1);
    setter((current) => {
      const next = [...current];
      next[index] = digit;
      if (next.every(Boolean) && next.join('').length === length) {
        window.setTimeout(() => verifyPhoneOtp(next.join('')), 120);
      }
      return next;
    });
    if (digit && index < length - 1) {
      const nextInput = document.querySelector(`[data-phone-otp-index="${index + 1}"]`);
      nextInput?.focus();
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

        {mode === 'user' && registrationStep === 'form' ? (
          <form onSubmit={registerUser}>
            {['name', 'email', 'phone', 'password'].map((field) => (
              <div className="form-group" key={field}>
                <label>{field.replace('_', ' ')}</label>
                <input
                  type={field === 'password' ? 'password' : field === 'email' ? 'email' : 'text'}
                  value={userForm[field]}
                  onChange={(event) => setUserForm({ ...userForm, [field]: event.target.value })}
                  required
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
            <label className="terms-check">
              <input
                type="checkbox"
                checked={messagingConsent}
                onChange={(event) => setMessagingConsent(event.target.checked)}
              />
              <span>I allow this app to send verification SMS and email codes to my phone/email.</span>
            </label>
            <button type="submit" disabled={loading || !termsAccepted || !messagingConsent}>{loading ? 'Creating...' : 'Create User Account'}</button>
          </form>
        ) : mode === 'user' && registrationStep === 'phone-confirm' ? (
          <section className="verification-panel">
            <h3>Confirm phone number</h3>
            <p className="muted-text">We will send a private 4-digit verification code to this number.</p>
            <div className="verify-target-row">
              <input value={phoneDraft} disabled={!phoneEditable} onChange={(event) => setPhoneDraft(event.target.value)} />
              <button type="button" className="secondary-btn" onClick={() => setPhoneEditable(true)}>Edit</button>
              <button type="button" onClick={sendPhoneOtp} disabled={loading || !phoneDraft.trim()}>{loading ? 'Sending...' : 'Send'}</button>
            </div>
          </section>
        ) : mode === 'user' && registrationStep === 'phone-verify' ? (
          <section className="verification-panel">
            <h3>Phone verification</h3>
            <p className="muted-text">Enter the 4-digit code sent to {phoneDraft}.</p>
            {devPhoneCode && <div className="info-message">Development code: {devPhoneCode}</div>}
            <div className="otp-box-row">
              {phoneOtp.map((digit, index) => (
                <input
                  key={index}
                  data-phone-otp-index={index}
                  inputMode="numeric"
                  maxLength="1"
                  value={digit}
                  onChange={(event) => updateOtpBox(index, event.target.value, setPhoneOtp, 4)}
                />
              ))}
              <button type="button" onClick={verifyPhoneOtp} disabled={loading || phoneOtp.join('').length !== 4}>Accept</button>
            </div>
            <button type="button" className="secondary-btn" onClick={() => setRegistrationStep('phone-confirm')}>Change phone</button>
          </section>
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
