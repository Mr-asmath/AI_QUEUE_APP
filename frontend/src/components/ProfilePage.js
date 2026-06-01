import React, { useCallback, useEffect, useRef, useState } from 'react';
import { apiPath } from '../config';
import { roleLabelOptions, roleLabelsFor } from '../roleLabels';
import BottomNavigation from './BottomNavigation';

const branchTypes = [
  { value: 'hospital', label: 'Hospital' },
  { value: 'school', label: 'School / College' },
  { value: 'hotel', label: 'Hotel' },
  { value: 'bank', label: 'Bank' },
  { value: 'office', label: 'Office / Company' },
  { value: 'government', label: 'Government Office' },
  { value: 'other', label: 'Other' }
];

const fieldTypes = ['text', 'int', 'float', 'image', 'date', 'select'];

const defaultBranchConfig = {
  service_provider: {
    display_user_details: true,
    display_previous_details: true,
    display_next_details: true,
    display_current_details: true,
    display_suggestion_boxes: true,
    suggestion_boxes: ['Suggestion'],
    display_search_items: true,
    search_items: [
      { name: 'Consultation', price: 300 },
      { name: 'Service Charge', price: 100 }
    ],
    display_cash_price: true,
    display_transactions: true,
    aggregations: ['total', 'average', 'count'],
    ai_suggestion: true
  },
  queue_operator: {
    can_edit_user_details: true,
    can_allocate_provider: true,
    display_user_details: true,
    display_previous_details: true,
    display_suggestions: true
  },
  user: {
    display_previous_suggestions: true,
    display_current_suggestions: true,
    display_current_queue_count: true,
    allow_generate_token: true,
    allow_reject_token: true,
    display_cash_price: true,
    display_transactions: true,
    display_operator_contact: true,
    display_provider_contact: true,
    allow_emergency_queue: true
  },
  industry_settings: {
    token_name_mode: 'default',
    customer_name_slots: 3,
    role_labels: {}
  }
};

const defaultUserSchema = [
  { key: 'name', type: 'text', required: true },
  { key: 'phone', type: 'text', required: true },
  { key: 'need', type: 'text', required: true }
];

const hydrateBranchEditForm = (branch) => {
  if (!branch) return null;
  const config = branch.dashboard_config || {};
  const serviceProvider = { ...defaultBranchConfig.service_provider, ...(config.service_provider || {}) };
  return {
    id: branch.id,
    name: branch.name || '',
    details: branch.details || '',
    branch_type: branch.branch_type || 'hospital',
    other_type_name: branch.other_type_name || '',
    address: branch.address || '',
    area: branch.area || '',
    city: branch.city || '',
    state: branch.state || '',
    pincode: branch.pincode || '',
    latitude: branch.latitude || '',
    longitude: branch.longitude || '',
    dashboard_config: {
      service_provider: {
        ...serviceProvider,
        suggestion_boxes: Array.isArray(serviceProvider.suggestion_boxes) ? serviceProvider.suggestion_boxes : defaultBranchConfig.service_provider.suggestion_boxes,
        search_items: Array.isArray(serviceProvider.search_items) ? serviceProvider.search_items : defaultBranchConfig.service_provider.search_items,
        aggregations: Array.isArray(serviceProvider.aggregations) ? serviceProvider.aggregations : defaultBranchConfig.service_provider.aggregations
      },
      queue_operator: { ...defaultBranchConfig.queue_operator, ...(config.queue_operator || {}) },
      user: { ...defaultBranchConfig.user, ...(config.user || {}) },
      industry_settings: { ...defaultBranchConfig.industry_settings, ...(config.industry_settings || {}) }
    },
    user_schema: branch.user_schema?.length ? branch.user_schema : defaultUserSchema
  };
};

function ProfilePage({ user, onUserUpdate, onLogout, onHome }) {
  const [activeSection, setActiveSection] = useState('account');
  const avatarInputRef = useRef(null);
  const logoInputRef = useRef(null);
  const avatarPickerRef = useRef(null);
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
  const [verification, setVerification] = useState({ channel: '', code: [], devCode: '' });
  const [settingsBranches, setSettingsBranches] = useState([]);
  const [branchEditForm, setBranchEditForm] = useState(null);
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
  const [themeForm, setThemeForm] = useState({
    mode: user.theme?.mode || 'light',
    theme_1: user.theme?.theme_1 || '#14b8a6',
    theme_2: user.theme?.theme_2 || '#2563eb',
    font_color_1: user.theme?.font_color_1 || '#0f172a',
    font_color_2: user.theme?.font_color_2 || '#64748b',
    font_family: user.theme?.font_family || 'Inter, Arial, sans-serif'
  });
  const defaultTheme = {
    mode: 'light',
    theme_1: '#14b8a6',
    theme_2: '#2563eb',
    font_color_1: '#0f172a',
    font_color_2: '#64748b',
    font_family: 'Inter, Arial, sans-serif'
  };

  const codeLength = verification.channel === 'phone' ? 4 : 6;

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
      const branches = data.branches || [];
      setSettingsBranches(branches);
      setBranchEditForm((current) => {
        if (current) {
          const updated = branches.find((branch) => String(branch.id) === String(current.id));
          return updated ? hydrateBranchEditForm(updated) : hydrateBranchEditForm(branches[0]);
        }
        return hydrateBranchEditForm(branches[0]);
      });
      const firstSettings = branches?.[0]?.dashboard_config?.industry_settings || {};
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

  useEffect(() => {
    setProfileForm((current) => ({
      ...current,
      avatar_url: user.avatar_url || current.avatar_url,
      industry_logo_url: user.industry_logo_url || current.industry_logo_url
    }));
    setThemeForm({
      mode: user.theme?.mode || 'light',
      theme_1: user.theme?.theme_1 || '#14b8a6',
      theme_2: user.theme?.theme_2 || '#2563eb',
      font_color_1: user.theme?.font_color_1 || '#0f172a',
      font_color_2: user.theme?.font_color_2 || '#64748b',
      font_family: user.theme?.font_family || 'Inter, Arial, sans-serif'
    });
  }, [user]);

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

  const selectBranchForEdit = (branchId) => {
    const branch = settingsBranches.find((item) => String(item.id) === String(branchId));
    setBranchEditForm(hydrateBranchEditForm(branch));
  };

  const updateBranchEditPincode = (value) => {
    const next = { ...branchEditForm, pincode: value };
    setBranchEditForm(next);
    if (value.trim().length === 6) fillBranchEditLocationFromPincode(next);
  };

  const fillBranchEditLocationFromPincode = async (nextForm) => {
    const pincode = String(nextForm.pincode || '').trim();
    if (pincode.length !== 6) return;
    setMessage('');
    setError('');
    const params = new URLSearchParams({ pincode });
    const data = await api(`/api/maps/geocode?${params.toString()}`);
    if (data.success) {
      setBranchEditForm((current) => ({
        ...current,
        address: data.location.address || current.address,
        area: data.location.area || current.area,
        city: data.location.city || current.city,
        state: data.location.state || current.state,
        pincode: data.location.pincode || current.pincode,
        latitude: data.location.latitude || current.latitude,
        longitude: data.location.longitude || current.longitude
      }));
      setMessage('Branch location filled from pincode.');
    } else {
      setError(data.error || 'Branch pincode lookup failed.');
    }
  };

  const updateBranchConfig = (section, key, value) => {
    setBranchEditForm((current) => ({
      ...current,
      dashboard_config: {
        ...current.dashboard_config,
        [section]: {
          ...current.dashboard_config[section],
          [key]: value
        }
      }
    }));
  };

  const toggleBranchConfig = (section, key) => {
    updateBranchConfig(section, key, !branchEditForm.dashboard_config[section][key]);
  };

  const updateBranchSuggestionBox = (index, value) => {
    const suggestion_boxes = [...branchEditForm.dashboard_config.service_provider.suggestion_boxes];
    suggestion_boxes[index] = value;
    updateBranchConfig('service_provider', 'suggestion_boxes', suggestion_boxes);
  };

  const updateBranchSearchItem = (index, key, value) => {
    const search_items = [...branchEditForm.dashboard_config.service_provider.search_items];
    search_items[index] = { ...search_items[index], [key]: key === 'price' ? Number(value) : value };
    updateBranchConfig('service_provider', 'search_items', search_items);
  };

  const updateBranchUserField = (index, key, value) => {
    const user_schema = [...branchEditForm.user_schema];
    user_schema[index] = { ...user_schema[index], [key]: key === 'required' ? Boolean(value) : value };
    setBranchEditForm({ ...branchEditForm, user_schema });
  };

  const saveBranchSettings = async (event) => {
    event.preventDefault();
    if (!branchEditForm) return;
    setMessage('');
    setError('');
    const payload = {
      ...branchEditForm,
      user_schema: branchEditForm.user_schema.filter((item) => item.key.trim()).map((item) => ({
        ...item,
        key: item.key.trim(),
        required: Boolean(item.required)
      }))
    };
    const data = await api(`/api/industry/branches/${branchEditForm.id}`, {
      method: 'PUT',
      body: JSON.stringify(payload)
    });
    if (data.success) {
      const branches = data.branches || [];
      setSettingsBranches(branches);
      const updated = branches.find((branch) => String(branch.id) === String(branchEditForm.id));
      setBranchEditForm(hydrateBranchEditForm(updated || data.branch));
      setMessage('Branch settings updated.');
    } else {
      setError(data.error || 'Branch settings update failed.');
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

  const imageToDataUrl = (file, maxSize) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(img.width * scale));
        canvas.height = Math.max(1, Math.round(img.height * scale));
        const context = canvas.getContext('2d');
        context.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', 0.82));
      };
      img.onerror = reject;
      img.src = reader.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

  const handleImageUpload = async (event, field, presetField) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const dataUrl = await imageToDataUrl(file, field === 'industry_logo_url' ? 512 : 320);
      setProfileForm((current) => ({
        ...current,
        [field]: dataUrl,
        ...(presetField ? { [presetField]: '' } : {})
      }));
    } catch (err) {
      setError('Image upload failed. Try a smaller image file.');
    }
  };

  const saveTheme = async (event) => {
    event.preventDefault();
    setMessage('');
    setError('');
    const data = await api('/api/theme', {
      method: 'PUT',
      body: JSON.stringify(themeForm)
    });
    if (data.success) {
      onUserUpdate({ ...user, theme: data.theme });
      setMessage('Theme settings updated.');
    } else {
      setError(data.error || 'Theme update failed.');
    }
  };

  const allowMessagingAndSend = async (channel) => {
    setMessage('');
    setError('');
    let activeUser = user;
    if (!user.messaging_consent) {
      const consentData = await api('/api/auth/messaging-consent', {
        method: 'POST',
        body: JSON.stringify({ allow: true })
      });
      if (consentData.success) {
        activeUser = consentData.user;
        onUserUpdate(consentData.user);
      } else {
        setError(consentData.error || 'Messaging permission update failed.');
        return;
      }
    }
    const data = await api('/api/auth/verification/send', {
      method: 'POST',
      body: JSON.stringify({ channel, phone: profileForm.phone })
    });
    if (data.success) {
      setVerification({ channel, code: Array(channel === 'phone' ? 4 : 6).fill(''), devCode: data.dev_code || '' });
      setMessage(`${channel === 'phone' ? 'SMS' : 'Email'} verification code sent.`);
      if (activeUser.id !== user.id) onUserUpdate(activeUser);
    } else {
      setError(data.error || 'Verification code send failed.');
    }
  };

  const updateVerificationCode = (index, value) => {
    const digit = value.replace(/\D/g, '').slice(-1);
    setVerification((current) => {
      const next = [...current.code];
      next[index] = digit;
      if (next.every(Boolean) && next.join('').length === codeLength) {
        window.setTimeout(() => acceptVerificationCode(next.join('')), 120);
      }
      return { ...current, code: next };
    });
    if (digit && index < codeLength - 1) {
      document.querySelector(`[data-profile-otp-index="${index + 1}"]`)?.focus();
    }
  };

  const acceptVerificationCode = async (codeOverride) => {
    const code = codeOverride || verification.code.join('');
    const data = await api('/api/auth/verification/verify', {
      method: 'POST',
      body: JSON.stringify({ channel: verification.channel, code })
    });
    if (data.success) {
      onUserUpdate(data.user);
      setVerification({ channel: '', code: [], devCode: '' });
      setMessage(`${verification.channel === 'phone' ? 'Phone' : 'Email'} verified.`);
    } else {
      setError(data.error || 'Verification failed.');
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

  const openAccountImageEditor = () => {
    setActiveSection('account');
    window.setTimeout(() => {
      avatarPickerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 80);
  };

  const profileSections = [
    { id: 'home', label: 'Home' },
    { id: 'account', label: 'Account Details' },
    { id: 'password', label: 'Change Password' },
    ...(user.role === 'industry_admin' || user.role === 'main_admin' ? [{ id: 'logo', label: 'App Logo' }] : []),
    ...(user.role === 'industry_admin' || user.role === 'main_admin' ? [{ id: 'theme', label: 'Theme' }] : []),
    ...(user.role === 'industry_admin' ? [{ id: 'industry-settings', label: 'Industry Settings' }] : []),
    ...(user.role === 'main_admin' ? [{ id: 'secret-password', label: 'Secret Password' }] : []),
    { id: 'session', label: 'Account Session' }
  ];

  return (
    <div className="dashboard profile-page">
      <div className="dashboard-header">
        <div className="profile-title">
          <button type="button" className="profile-hero-button" onClick={openAccountImageEditor} aria-label="Open profile image editor">
            {profileForm.avatar_url ? (
              <img className="profile-hero-avatar" src={profileForm.avatar_url} alt="" />
            ) : (
              <span className="profile-hero-avatar upload-placeholder">Image</span>
            )}
          </button>
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

      <BottomNavigation
        items={profileSections}
        activeId={activeSection}
        onSelect={(sectionId) => {
          if (sectionId === 'home') {
            onHome?.();
            return;
          }
          setActiveSection(sectionId);
        }}
        className="profile-bottom-nav"
      />

      <div className="profile-shell">
        <div className="profile-section-view">
        {activeSection === 'account' && (
          <form className="control-panel" onSubmit={saveProfile}>
          <h3>Account Details</h3>
          <div className="form-group profile-image-field" ref={avatarPickerRef}>
            <label>Profile image</label>
            <div className="image-upload-center">
              <button type="button" className="image-picker avatar-picker" onClick={() => avatarInputRef.current?.click()} aria-label="Change profile image">
                {profileForm.avatar_url ? (
                  <img src={profileForm.avatar_url} alt="" />
                ) : (
                  <span>{(profileForm.name || user.name || 'U').slice(0, 2).toUpperCase()}</span>
                )}
                <span className="camera-badge material-icons" aria-hidden="true">photo_camera</span>
              </button>
              <input
                ref={avatarInputRef}
                className="visually-hidden-file"
                type="file"
                accept="image/*"
                onChange={(event) => handleImageUpload(event, 'avatar_url', 'avatar_preset')}
              />
            </div>
          </div>
          <div className="form-group">
            <label>Name</label>
            <input value={profileForm.name} onChange={(event) => setProfileForm({ ...profileForm, name: event.target.value })} required />
          </div>
          <div className="form-group">
            <label>Email</label>
            <div className="verified-input-row">
              <input value={user.email} disabled />
              <span className={user.email_verified ? 'verify-dot verified' : 'verify-dot'}>{user.email_verified ? '✓' : ''}</span>
              {!user.email_verified && <button type="button" className="secondary-btn verify-inline-btn" onClick={() => allowMessagingAndSend('email')}>Verify</button>}
            </div>
          </div>
          <div className="form-group">
            <label>6-digit user ID</label>
            <input value={user.user_code || 'Pending'} disabled />
          </div>
          <div className="form-group">
            <label>Phone</label>
            <div className="verified-input-row">
              <input value={profileForm.phone} onChange={(event) => setProfileForm({ ...profileForm, phone: event.target.value })} />
              <span className={user.phone_verified && profileForm.phone === user.phone ? 'verify-dot verified' : 'verify-dot'}>{user.phone_verified && profileForm.phone === user.phone ? '✓' : ''}</span>
              {!(user.phone_verified && profileForm.phone === user.phone) && <button type="button" className="secondary-btn verify-inline-btn" onClick={() => allowMessagingAndSend('phone')}>Verify</button>}
            </div>
          </div>
          {verification.channel && (
            <div className="verification-panel compact-verification">
              <h4>{verification.channel === 'phone' ? 'Phone' : 'Email'} verification</h4>
              {verification.devCode && <div className="info-message">Development code: {verification.devCode}</div>}
              <div className="otp-box-row">
                {verification.code.map((digit, index) => (
                  <input
                    key={index}
                    data-profile-otp-index={index}
                    inputMode="numeric"
                    maxLength="1"
                    value={digit}
                    onChange={(event) => updateVerificationCode(index, event.target.value)}
                  />
                ))}
                <button type="button" onClick={acceptVerificationCode} disabled={verification.code.join('').length !== codeLength}>Accept</button>
              </div>
            </div>
          )}
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
          <button type="submit">Save Profile</button>
        </form>
        )}

        {activeSection === 'logo' && ['industry_admin', 'main_admin'].includes(user.role) && (
          <form className="control-panel" onSubmit={saveProfile}>
            <h3>App Logo</h3>
            <div className="brand-preview">
              <button type="button" className="image-picker logo-picker" onClick={() => logoInputRef.current?.click()} aria-label="Change project logo">
                {profileForm.industry_logo_url ? (
                  <img src={profileForm.industry_logo_url} alt="" />
                ) : (
                  <span>Logo</span>
                )}
                <span className="camera-badge material-icons" aria-hidden="true">photo_camera</span>
              </button>
              <div>
                <strong>{user.industry_name || 'AI Queue Automation'}</strong>
                <span>Header logo preview</span>
              </div>
            </div>
            <input
              ref={logoInputRef}
              className="visually-hidden-file"
              type="file"
              accept="image/*"
              onChange={(event) => handleImageUpload(event, 'industry_logo_url', 'industry_logo_preset')}
            />
            <button type="submit">Save Logo</button>
          </form>
        )}

        {activeSection === 'theme' && ['industry_admin', 'main_admin'].includes(user.role) && (
          <form className="control-panel theme-panel" onSubmit={saveTheme}>
            <h3>Theme</h3>
            <p className="muted-text">
              {user.role === 'main_admin'
                ? 'Main admin theme applies across the app.'
                : 'Industry admin theme applies to this industry and its branches.'}
            </p>
            <div className="checkbox-section">
              <h4>Screen mode</h4>
              <div className="radio-group">
                <label><input type="radio" checked={themeForm.mode === 'light'} onChange={() => setThemeForm({ ...themeForm, mode: 'light' })} /> Light</label>
                <label><input type="radio" checked={themeForm.mode === 'dark'} onChange={() => setThemeForm({ ...themeForm, mode: 'dark' })} /> Dark</label>
              </div>
            </div>
            <div className="theme-grid">
              <label>Theme 1<input type="color" value={themeForm.theme_1} onChange={(event) => setThemeForm({ ...themeForm, theme_1: event.target.value })} /></label>
              <label>Theme 2<input type="color" value={themeForm.theme_2} onChange={(event) => setThemeForm({ ...themeForm, theme_2: event.target.value })} /></label>
              <label>Font color 1<input type="color" value={themeForm.font_color_1} onChange={(event) => setThemeForm({ ...themeForm, font_color_1: event.target.value })} /></label>
              <label>Font color 2<input type="color" value={themeForm.font_color_2} onChange={(event) => setThemeForm({ ...themeForm, font_color_2: event.target.value })} /></label>
            </div>
            <div className="form-group">
              <label>Font style</label>
              <select value={themeForm.font_family} onChange={(event) => setThemeForm({ ...themeForm, font_family: event.target.value })}>
                <option value="Inter, Arial, sans-serif">Inter</option>
                <option value="Arial, sans-serif">Arial</option>
                <option value="Georgia, serif">Georgia</option>
                <option value="'Trebuchet MS', sans-serif">Trebuchet MS</option>
                <option value="'Courier New', monospace">Courier New</option>
              </select>
            </div>
            <div className="theme-preview" style={{
              background: `linear-gradient(135deg, ${themeForm.theme_1}, ${themeForm.theme_2})`,
              color: themeForm.font_color_1,
              fontFamily: themeForm.font_family
            }}>
              <strong>AI Queue Automation</strong>
              <span style={{ color: themeForm.font_color_2 }}>Theme preview</span>
            </div>
            <div className="form-actions">
              <button type="button" className="secondary-btn" onClick={() => setThemeForm(defaultTheme)}>Default Color</button>
              <button type="submit">Save Theme</button>
            </div>
          </form>
        )}

        {activeSection === 'industry-settings' && user.role === 'industry_admin' && (
          <>
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
          {branchEditForm && (
            <form className="control-panel" onSubmit={saveBranchSettings}>
              <h3>Existing Branch Settings</h3>
              <div className="form-group">
                <label>Select branch to edit</label>
                <select value={branchEditForm.id} onChange={(event) => selectBranchForEdit(event.target.value)}>
                  {settingsBranches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}
                </select>
              </div>

              <div className="form-group">
                <label>Branch name</label>
                <input value={branchEditForm.name} onChange={(event) => setBranchEditForm({ ...branchEditForm, name: event.target.value })} required />
              </div>
              <div className="form-group">
                <label>Branch details</label>
                <textarea value={branchEditForm.details} onChange={(event) => setBranchEditForm({ ...branchEditForm, details: event.target.value })} />
              </div>
              <div className="inline-row field-row">
                <div className="form-group">
                  <label>Branch type</label>
                  <select value={branchEditForm.branch_type} onChange={(event) => setBranchEditForm({ ...branchEditForm, branch_type: event.target.value })}>
                    {branchTypes.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}
                  </select>
                </div>
                {branchEditForm.branch_type === 'other' && (
                  <div className="form-group">
                    <label>Other type name</label>
                    <input value={branchEditForm.other_type_name} onChange={(event) => setBranchEditForm({ ...branchEditForm, other_type_name: event.target.value })} required />
                  </div>
                )}
              </div>

              <div className="mini-builder">
                <h4>Branch map location</h4>
                <div className="inline-row field-row">
                  <input placeholder="Area" value={branchEditForm.area} onChange={(event) => setBranchEditForm({ ...branchEditForm, area: event.target.value })} />
                  <input placeholder="City" value={branchEditForm.city} onChange={(event) => setBranchEditForm({ ...branchEditForm, city: event.target.value })} />
                  <input placeholder="State" value={branchEditForm.state} onChange={(event) => setBranchEditForm({ ...branchEditForm, state: event.target.value })} />
                  <input placeholder="Pincode" value={branchEditForm.pincode} onChange={(event) => updateBranchEditPincode(event.target.value)} />
                </div>
                <div className="inline-row">
                  <input placeholder="Latitude" value={branchEditForm.latitude} onChange={(event) => setBranchEditForm({ ...branchEditForm, latitude: event.target.value })} />
                  <input placeholder="Longitude" value={branchEditForm.longitude} onChange={(event) => setBranchEditForm({ ...branchEditForm, longitude: event.target.value })} />
                </div>
              </div>

              <div className="checkbox-section">
                <h4>{roleLabels.service_provider} dashboard controls</h4>
                {[
                  ['display_user_details', 'Display user details'],
                  ['display_previous_details', 'Display previous user details'],
                  ['display_next_details', 'Display next details'],
                  ['display_current_details', 'Display current user details'],
                  ['display_suggestion_boxes', 'Display suggestion text boxes'],
                  ['display_search_items', 'Display checkbox items'],
                  ['display_cash_price', 'Display cash price totals'],
                  ['display_transactions', 'Display transactions'],
                  ['ai_suggestion', 'Display AI suggestion button']
                ].map(([key, label]) => (
                  <label className="inline-check" key={key}>
                    <input type="checkbox" checked={Boolean(branchEditForm.dashboard_config.service_provider[key])} onChange={() => toggleBranchConfig('service_provider', key)} />
                    {label}
                  </label>
                ))}
              </div>

              <div className="mini-builder">
                <h4>Suggestion boxes</h4>
                {branchEditForm.dashboard_config.service_provider.suggestion_boxes.map((title, index) => (
                  <div className="inline-row" key={`profile-suggestion-${index}`}>
                    <input value={title} onChange={(event) => updateBranchSuggestionBox(index, event.target.value)} placeholder="Suggestion title" />
                    <button type="button" className="danger-btn" onClick={() => updateBranchConfig('service_provider', 'suggestion_boxes', branchEditForm.dashboard_config.service_provider.suggestion_boxes.filter((_, itemIndex) => itemIndex !== index))}>Remove</button>
                  </div>
                ))}
                <button type="button" onClick={() => updateBranchConfig('service_provider', 'suggestion_boxes', [...branchEditForm.dashboard_config.service_provider.suggestion_boxes, `Suggestion ${branchEditForm.dashboard_config.service_provider.suggestion_boxes.length + 1}`])}>Add Suggestion Box</button>
              </div>

              <div className="mini-builder">
                <h4>Checkbox items, values, and prices</h4>
                {branchEditForm.dashboard_config.service_provider.search_items.map((item, index) => (
                  <div className="inline-row" key={`profile-item-${index}`}>
                    <input value={item.name} onChange={(event) => updateBranchSearchItem(index, 'name', event.target.value)} placeholder="Item name" />
                    <input type="number" value={item.price} onChange={(event) => updateBranchSearchItem(index, 'price', event.target.value)} placeholder="Price" />
                    <button type="button" className="danger-btn" onClick={() => updateBranchConfig('service_provider', 'search_items', branchEditForm.dashboard_config.service_provider.search_items.filter((_, itemIndex) => itemIndex !== index))}>Remove</button>
                  </div>
                ))}
                <button type="button" onClick={() => updateBranchConfig('service_provider', 'search_items', [...branchEditForm.dashboard_config.service_provider.search_items, { name: '', price: 0 }])}>Add Checkbox Item</button>
              </div>

              <div className="checkbox-section">
                <h4>{roleLabels.queue_operator} dashboard controls</h4>
                {[
                  ['can_edit_user_details', 'Can edit user details'],
                  ['can_allocate_provider', `Can allocate ${roleLabels.service_provider}`],
                  ['display_user_details', 'Display user details'],
                  ['display_previous_details', 'Display previous users'],
                  ['display_suggestions', 'Display suggestions']
                ].map(([key, label]) => (
                  <label className="inline-check" key={key}>
                    <input type="checkbox" checked={Boolean(branchEditForm.dashboard_config.queue_operator[key])} onChange={() => toggleBranchConfig('queue_operator', key)} />
                    {label}
                  </label>
                ))}
              </div>

              <div className="checkbox-section">
                <h4>User site controls</h4>
                {[
                  ['display_previous_suggestions', 'Display previous suggestions'],
                  ['display_current_suggestions', 'Display current suggestions'],
                  ['display_current_queue_count', 'Display current queue count'],
                  ['allow_generate_token', 'Allow generate queue token'],
                  ['allow_reject_token', 'Allow reject queue token'],
                  ['display_cash_price', 'Display cash price'],
                  ['display_transactions', 'Display transactions'],
                  ['display_operator_contact', 'Display operator contact'],
                  ['display_provider_contact', `Display ${roleLabels.service_provider} contact`],
                  ['allow_emergency_queue', 'Allow emergency requests']
                ].map(([key, label]) => (
                  <label className="inline-check" key={key}>
                    <input type="checkbox" checked={Boolean(branchEditForm.dashboard_config.user[key])} onChange={() => toggleBranchConfig('user', key)} />
                    {label}
                  </label>
                ))}
              </div>

              <div className="mini-builder">
                <h4>User form inputs</h4>
                {branchEditForm.user_schema.map((field, index) => (
                  <div className="inline-row field-row" key={`profile-field-${index}`}>
                    <input value={field.key} onChange={(event) => updateBranchUserField(index, 'key', event.target.value)} placeholder="Input name" />
                    <select value={field.type} onChange={(event) => updateBranchUserField(index, 'type', event.target.value)}>
                      {fieldTypes.map((type) => <option key={type} value={type}>{type}</option>)}
                    </select>
                    <label className="inline-check">
                      <input type="checkbox" checked={Boolean(field.required)} onChange={(event) => updateBranchUserField(index, 'required', event.target.checked)} />
                      Required
                    </label>
                    <button type="button" className="danger-btn" onClick={() => setBranchEditForm({ ...branchEditForm, user_schema: branchEditForm.user_schema.filter((_, itemIndex) => itemIndex !== index) })}>Remove</button>
                  </div>
                ))}
                <button type="button" onClick={() => setBranchEditForm({ ...branchEditForm, user_schema: [...branchEditForm.user_schema, { key: '', type: 'text', required: true }] })}>Add User Input</button>
              </div>

              <button type="submit">Save Branch Settings</button>
            </form>
          )}
          {!branchEditForm && (
            <section className="control-panel">
              <h3>Existing Branch Settings</h3>
              <p className="muted-text">Create a branch first, then edit its name, values, attributes, and input fields here.</p>
            </section>
          )}
          </>
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
