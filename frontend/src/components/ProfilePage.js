import React, { useState } from 'react';
import { avatarPresets, getAvatarPreset, getLogoPreset, logoPresets, initialsFor, presetStyle } from '../visualPresets';

function ProfilePage({ user, onUserUpdate }) {
  const [profileForm, setProfileForm] = useState({
    name: user.name || '',
    phone: user.phone || '',
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

  return (
    <div className="dashboard profile-page">
      <div className="dashboard-header">
        <div className="profile-title">
          {profileForm.avatar_url ? (
            <img className="profile-hero-avatar" src={profileForm.avatar_url} alt="" />
          ) : (
            <span className="profile-hero-avatar" style={presetStyle(getAvatarPreset(profileForm.avatar_preset))}>
              {initialsFor(profileForm.name, getAvatarPreset(profileForm.avatar_preset).initials)}
            </span>
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

      <div className="profile-grid">
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
            <label>Phone</label>
            <input value={profileForm.phone} onChange={(event) => setProfileForm({ ...profileForm, phone: event.target.value })} />
          </div>
          <div className="preset-section">
            <label>Default face</label>
            <div className="preset-grid avatar-preset-grid">
              {avatarPresets.map((preset) => (
                <button
                  type="button"
                  className={profileForm.avatar_preset === preset.id ? 'preset-tile active' : 'preset-tile'}
                  onClick={() => setProfileForm({ ...profileForm, avatar_preset: preset.id, avatar_url: '' })}
                  key={preset.id}
                >
                  <span className="preset-circle" style={presetStyle(preset)}>{initialsFor(profileForm.name, preset.initials)}</span>
                  <small>{preset.label}</small>
                </button>
              ))}
            </div>
          </div>
          <div className="form-group">
            <label>Own profile image URL</label>
            <input
              type="url"
              placeholder="https://example.com/photo.jpg"
              value={profileForm.avatar_url}
              onChange={(event) => setProfileForm({ ...profileForm, avatar_url: event.target.value })}
            />
          </div>
          <button type="submit">Save Profile</button>
        </form>

        {['industry_admin', 'main_admin'].includes(user.role) && (
          <form className="control-panel" onSubmit={saveProfile}>
            <h3>App Logo</h3>
            <div className="brand-preview">
              {profileForm.industry_logo_url ? (
                <img className="brand-preview-icon" src={profileForm.industry_logo_url} alt="" />
              ) : (
                <span className="brand-preview-icon" style={presetStyle(getLogoPreset(profileForm.industry_logo_preset))}>
                  {getLogoPreset(profileForm.industry_logo_preset).initials}
                </span>
              )}
              <div>
                <strong>{user.industry_name || 'AI Queue Automation'}</strong>
                <span>Header logo preview</span>
              </div>
            </div>
            <div className="preset-section">
              <label>Default logos</label>
              <div className="preset-grid">
                {logoPresets.map((preset) => (
                  <button
                    type="button"
                    className={profileForm.industry_logo_preset === preset.id ? 'preset-tile active' : 'preset-tile'}
                    onClick={() => setProfileForm({ ...profileForm, industry_logo_preset: preset.id, industry_logo_url: '' })}
                    key={preset.id}
                  >
                    <span className="preset-square" style={presetStyle(preset)}>{preset.initials}</span>
                    <small>{preset.label}</small>
                  </button>
                ))}
              </div>
            </div>
            <div className="form-group">
              <label>Own logo image URL</label>
              <input
                type="url"
                placeholder="https://example.com/logo.png"
                value={profileForm.industry_logo_url}
                onChange={(event) => setProfileForm({ ...profileForm, industry_logo_url: event.target.value })}
              />
            </div>
            <button type="submit">Save Logo</button>
          </form>
        )}

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
          <button type="submit">Update Password</button>
        </form>
      </div>
    </div>
  );
}

export default ProfilePage;
