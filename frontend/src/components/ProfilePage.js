import React, { useCallback, useEffect, useState } from 'react';
import { apiPath } from '../config';
import { roleLabelOptions, roleLabelsFor } from '../roleLabels';

function ProfilePage({ user, onUserUpdate, onLogout }) {
  const [activeSection, setActiveSection] = useState('account');
  const [profileForm, setProfileForm] = useState({
    name: user.name || '',
    phone: user.phone || '',
    address: user.address || '',
    area: user.area || '',
    city: user.city || '',
    state: user.state || '',
    pincode: user.pincode || '',
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
  const [secretPasswordForm, setSecretPasswordForm] = useState({
    current_secret_password: '',
    new_secret_password: ''
  });
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [settingsBranches, setSettingsBranches] = useState([]);
  const currentRoleOptions = roleLabelOptions(user.industry_type);
  const roleLabels = roleLabelsFor(user.industry_type);
  const [settingsForm, setSettingsForm] = useState({
    branch_id: '',
    token_name_mode: 'default',
    customer_name_slots: 3,
    role_labels: {
      industry_admin: currentRoleOptions.industry_admin[0],
      queue_operator: currentRoleOptions.queue_operator[0],
      service_provider: currentRoleOptions.service_provider[0]
    }
  });

  const api = useCallback(async (path, options = {}) => {
    const response = await fetch(apiPath(path), {
      credentials: 'include',
      headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
      ...options
    });
    return response.json();
  }, []);

  const fillProfileLocationFromPincode = async (nextForm) => {
    const pincode = String(nextForm.pincode || '').trim();
    if (pincode.length !== 6) return;
    setMessage('');
    setError('');
    const params = new URLSearchParams({ pincode });
    const data = await api(`/api/maps/geocode?${params.toString()}`);
    if (data.success) {
      setProfileForm((current) => ({
        ...current,
        address: data.location.address || current.address,
        area: data.location.area || current.area,
        city: data.location.city || current.city,
        state: data.location.state || current.state,
        pincode: data.location.pincode || current.pincode
      }));
      setMessage('Location filled from pincode.');
    } else {
      setError(data.error || 'Pincode lookup failed.');
    }
  };

  const updateProfilePincode = (value) => {
    const next = { ...profileForm, pincode: value };
    setProfileForm(next);
    if (value.trim().length === 6) fillProfileLocationFromPincode(next);
  };

  const loadIndustrySettings = useCallback(async () => {
    if (user.role !== 'industry_admin') return;
    const data = await api('/api/industry/settings');
    if (data.success) {
      setSettingsBranches(data.branches || []);
      const firstSettings = data.branches?.[0]?.dashboard_config?.industry_settings || {};
      setSettingsForm((current) => ({
        ...current,
        token_name_mode: firstSettings.token_name_mode || current.token_name_mode,
        customer_name_slots: firstSettings.customer_name_slots || current.customer_name_slots,
        role_labels: {
          ...current.role_labels,
          ...(firstSettings.role_labels || {})
        }
      }));
    }
  }, [api, user.role]);

  useEffect(() => {
    loadIndustrySettings();
  }, [loadIndustrySettings]);

  const saveIndustrySettings = async (event) => {
    event.preventDefault();
    setMessage('');
    setError('');
    const data = await api('/api/industry/settings', {
      method: 'PUT',
      body: JSON.stringify({
        branch_id: settingsForm.branch_id || null,
        industry_settings: {
          token_name_mode: settingsForm.token_name_mode,
          customer_name_slots: settingsForm.customer_name_slots,
          role_labels: settingsForm.role_labels
        }
      })
    });
    if (data.success) {
      setSettingsBranches(data.branches || []);
      setMessage('Industry settings updated.');
    } else {
      setError(data.error || 'Industry settings update failed.');
    }
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

  const changeSecretPassword = async (event) => {
    event.preventDefault();
    setMessage('');
    setError('');
    const data = await api('/api/admin/secret/password', {
      method: 'PUT',
      body: JSON.stringify(secretPasswordForm)
    });
    if (data.success) {
      setSecretPasswordForm({ current_secret_password: '', new_secret_password: '' });
      setMessage('Secret password updated.');
    } else {
      setError(data.error || 'Secret password update failed.');
    }
  };

  const profileSections = [
    { id: 'account', label: 'Account Details' },
    ...(user.role === 'industry_admin' || user.role === 'main_admin' ? [{ id: 'logo', label: 'App Logo' }] : []),
    ...(user.role === 'industry_admin' ? [{ id: 'industry-settings', label: 'Industry Settings' }] : []),
    { id: 'password', label: 'Change Password' },
    ...(user.role === 'main_admin' ? [{ id: 'secret-password', label: 'Secret Password' }] : []),
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
            <label>Area</label>
            <input value={profileForm.area} onChange={(event) => setProfileForm({ ...profileForm, area: event.target.value })} />
          </div>
          <div className="inline-row field-row">
            <div className="form-group">
              <label>City</label>
              <input value={profileForm.city} onChange={(event) => setProfileForm({ ...profileForm, city: event.target.value })} />
            </div>
            <div className="form-group">
              <label>State</label>
              <input value={profileForm.state} onChange={(event) => setProfileForm({ ...profileForm, state: event.target.value })} />
            </div>
            <div className="form-group">
              <label>Pincode</label>
              <input value={profileForm.pincode} onChange={(event) => updateProfilePincode(event.target.value)} />
            </div>
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

        {activeSection === 'industry-settings' && user.role === 'industry_admin' && (
          <form className="control-panel" onSubmit={saveIndustrySettings}>
            <h3>Industry Settings</h3>
            <div className="form-group">
              <label>Apply to</label>
              <select
                value={settingsForm.branch_id}
                onChange={(event) => setSettingsForm({ ...settingsForm, branch_id: event.target.value })}
              >
                <option value="">All branches</option>
                {settingsBranches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}
              </select>
            </div>

            <div className="checkbox-section">
              <h4>Token name mode</h4>
              <div className="radio-group">
                <label>
                  <input
                    type="radio"
                    checked={settingsForm.token_name_mode === 'default'}
                    onChange={() => setSettingsForm({ ...settingsForm, token_name_mode: 'default' })}
                  />
                  Default name
                </label>
                <label>
                  <input
                    type="radio"
                    checked={settingsForm.token_name_mode === 'customer'}
                    onChange={() => setSettingsForm({ ...settingsForm, token_name_mode: 'customer' })}
                  />
                  Customer name
                </label>
              </div>
            </div>

            <div className="form-group">
              <label>Customer name inputs</label>
              <select
                value={settingsForm.customer_name_slots}
                onChange={(event) => setSettingsForm({ ...settingsForm, customer_name_slots: Number(event.target.value) })}
              >
                <option value={1}>1 customer</option>
                <option value={2}>2 customers</option>
                <option value={3}>3 customers</option>
              </select>
            </div>

            <div className="checkbox-section">
              <h4>Display names for this industry</h4>
              <div className="form-group">
                <label>{roleLabels.industry_admin} role name</label>
                <select
                  value={settingsForm.role_labels.industry_admin}
                  onChange={(event) => setSettingsForm({
                    ...settingsForm,
                    role_labels: { ...settingsForm.role_labels, industry_admin: event.target.value }
                  })}
                >
                  {currentRoleOptions.industry_admin.map((label) => <option key={label} value={label}>{label}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>{roleLabels.queue_operator} role name</label>
                <select
                  value={settingsForm.role_labels.queue_operator}
                  onChange={(event) => setSettingsForm({
                    ...settingsForm,
                    role_labels: { ...settingsForm.role_labels, queue_operator: event.target.value }
                  })}
                >
                  {currentRoleOptions.queue_operator.map((label) => <option key={label} value={label}>{label}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>{roleLabels.service_provider} role name</label>
                <select
                  value={settingsForm.role_labels.service_provider}
                  onChange={(event) => setSettingsForm({
                    ...settingsForm,
                    role_labels: { ...settingsForm.role_labels, service_provider: event.target.value }
                  })}
                >
                  {currentRoleOptions.service_provider.map((label) => <option key={label} value={label}>{label}</option>)}
                </select>
              </div>
            </div>

            <button type="submit">Save Industry Settings</button>
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

        {activeSection === 'secret-password' && user.role === 'main_admin' && (
          <form className="control-panel" onSubmit={changeSecretPassword}>
            <h3>Secret Password</h3>
            <p className="muted-text">This password unlocks the top-side Secret security section. Default is 1234 until changed.</p>
            <div className="form-group">
              <label>Current secret password</label>
              <input
                type="password"
                value={secretPasswordForm.current_secret_password}
                onChange={(event) => setSecretPasswordForm({ ...secretPasswordForm, current_secret_password: event.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label>New secret password</label>
              <input
                type="password"
                value={secretPasswordForm.new_secret_password}
                onChange={(event) => setSecretPasswordForm({ ...secretPasswordForm, new_secret_password: event.target.value })}
                minLength="4"
                required
              />
            </div>
            <button type="submit">Update Secret Password</button>
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
