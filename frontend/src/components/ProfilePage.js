import React, { useState } from 'react';

function ProfilePage({ user, onUserUpdate, onLogout }) {
  const [activeSection, setActiveSection] = useState('account');
  const [profileForm, setProfileForm] = useState({
    name: user.name || '',
    phone: user.phone || '',
    address: user.address || '',
    designation: user.designation || '',
    emergency_contact: user.emergency_contact || '',
    personal_details: user.personal_details || '',
    avatar_preset: user.avatar_preset || 'face-1',
    avatar_url: user.avatar_url || '',
    industry_logo_preset: user.industry_logo_preset || 'logo-1',
    industry_logo_url: user.industry_logo_url || ''
  });
  const [passwordForm, setPasswordForm] = useState({
    current_password: '',
    new_password: ''
  });
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const api = async (path, options = {}) => {
    const response = await fetch(`http://localhost:5000${path}`, {
      credentials: 'include',
      headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
      ...options
    });
    return response.json();
  };

  const saveProfile = async (event) => {
    event.preventDefault();
    setMessage('');
    setError('');
    const data = await api('/api/profile', {
      method: 'PUT',
      body: JSON.stringify(profileForm)
    });
    if (data.success) {
      onUserUpdate(data.user);
      setMessage('Profile updated.');
    } else {
      setError(data.error || 'Profile update failed.');
    }
  };

  const handleImageUpload = (event, field, presetField) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setProfileForm((current) => ({
        ...current,
        [field]: reader.result,
        ...(presetField ? { [presetField]: '' } : {})
      }));
    };
    reader.readAsDataURL(file);
  };

  const changePassword = async (event) => {
    event.preventDefault();
    setMessage('');
    setError('');
    const data = await api('/api/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify(passwordForm)
    });
    if (data.success) {
      setMessage('Password changed successfully.');
      setPasswordForm({ current_password: '', new_password: '' });
    } else {
      setError(data.error || 'Password change failed.');
    }
  };

  const requestDefaultPassword = async () => {
    setMessage('');
    setError('');
    const data = await api('/api/auth/request-default-password', { method: 'POST' });
    if (data.success) {
      setMessage(data.message || 'Password reset request sent to admin.');
    } else {
      setError(data.error || 'Password reset request failed.');
    }
  };

  const profileSections = [
    { id: 'account', label: 'Account Details' },
    ...(user.role === 'industry_admin' || user.role === 'main_admin' ? [{ id: 'logo', label: 'App Logo' }] : []),
    { id: 'password', label: 'Change Password' },
    { id: 'session', label: 'Account Session' }
  ];

  return (
    <div className="dashboard profile-page">
      <div className="dashboard-header">
        <div className="profile-title">
          {profileForm.avatar_url ? (
            <img className="profile-hero-avatar" src={profileForm.avatar_url} alt="" />
          ) : (
            <span className="profile-hero-avatar upload-placeholder">Image</span>
          )}
          <div>
          <h1>Your Profile</h1>
          <p className="user-email">{user.email}</p>
          </div>
        </div>
        <div className="stats-summary">
          <span className="stat">{user.role.replace('_', ' ')}</span>
        </div>
      </div>

      {error && <div className="error-message">{error}</div>}
      {message && <div className="success-message">{message}</div>}

      <div className="profile-shell">
        <aside className="profile-side-nav">
          {profileSections.map((section) => (
            <button
              type="button"
              key={section.id}
              className={activeSection === section.id ? 'active' : ''}
              onClick={() => setActiveSection(section.id)}
            >
              {section.label}
            </button>
          ))}
        </aside>

        <div className="profile-section-view">
        {activeSection === 'account' && (
          <form className="control-panel" onSubmit={saveProfile}>
          <h3>Account Details</h3>
          <div className="form-group">
            <label>Name</label>
            <input value={profileForm.name} onChange={(event) => setProfileForm({ ...profileForm, name: event.target.value })} required />
          </div>
          <div className="form-group">
            <label>Email</label>
            <input value={user.email} disabled />
          </div>
          <div className="form-group">
            <label>6-digit user ID</label>
            <input value={user.user_code || 'Pending'} disabled />
          </div>
          <div className="form-group">
            <label>Phone</label>
            <input value={profileForm.phone} onChange={(event) => setProfileForm({ ...profileForm, phone: event.target.value })} />
          </div>
          <div className="form-group">
            <label>Address</label>
            <textarea value={profileForm.address} onChange={(event) => setProfileForm({ ...profileForm, address: event.target.value })} />
          </div>
          <div className="form-group">
            <label>Designation</label>
            <input value={profileForm.designation} onChange={(event) => setProfileForm({ ...profileForm, designation: event.target.value })} />
          </div>
          <div className="form-group">
            <label>Emergency contact</label>
            <input value={profileForm.emergency_contact} onChange={(event) => setProfileForm({ ...profileForm, emergency_contact: event.target.value })} />
          </div>
          <div className="form-group">
            <label>More personal details</label>
            <textarea value={profileForm.personal_details} onChange={(event) => setProfileForm({ ...profileForm, personal_details: event.target.value })} />
          </div>
          <div className="form-group">
            <label>Upload profile image</label>
            <input
              type="file"
              accept="image/*"
              onChange={(event) => handleImageUpload(event, 'avatar_url', 'avatar_preset')}
            />
          </div>
          <button type="submit">Save Profile</button>
        </form>
        )}

        {activeSection === 'logo' && ['industry_admin', 'main_admin'].includes(user.role) && (
          <form className="control-panel" onSubmit={saveProfile}>
            <h3>App Logo</h3>
            <div className="brand-preview">
              {profileForm.industry_logo_url ? (
                <img className="brand-preview-icon" src={profileForm.industry_logo_url} alt="" />
              ) : (
                <span className="brand-preview-icon upload-placeholder">Logo</span>
              )}
              <div>
                <strong>{user.industry_name || 'AI Queue Automation'}</strong>
                <span>Header logo preview</span>
              </div>
            </div>
            <div className="form-group">
              <label>Upload project logo</label>
              <input
                type="file"
                accept="image/*"
                onChange={(event) => handleImageUpload(event, 'industry_logo_url', 'industry_logo_preset')}
              />
            </div>
            <button type="submit">Save Logo</button>
          </form>
        )}

        {activeSection === 'password' && (
        <form className="control-panel" onSubmit={changePassword}>
          <h3>Change Password</h3>
          <div className="form-group">
            <label>Current password</label>
            <input
              type="password"
              value={passwordForm.current_password}
              onChange={(event) => setPasswordForm({ ...passwordForm, current_password: event.target.value })}
              required
            />
          </div>
          <div className="form-group">
            <label>New password</label>
            <input
              type="password"
              value={passwordForm.new_password}
              onChange={(event) => setPasswordForm({ ...passwordForm, new_password: event.target.value })}
              minLength="6"
              required
            />
          </div>
          <div className="form-actions">
            <button type="button" className="secondary-btn" onClick={requestDefaultPassword}>Forgot Password</button>
            <button type="submit">Update Password</button>
          </div>
        </form>
        )}

        {activeSection === 'session' && (
        <section className="control-panel">
          <h3>Account Session</h3>
          <p className="muted-text">Sign out from this project dashboard.</p>
          <button type="button" className="logout-btn profile-logout" onClick={onLogout}>Logout</button>
        </section>
        )}
        </div>
      </div>
    </div>
  );
}

export default ProfilePage;
