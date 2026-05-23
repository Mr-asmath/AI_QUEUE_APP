import React from 'react';
import { getAvatarPreset, getLogoPreset, initialsFor, presetStyle } from '../visualPresets';

function Navbar({ user, activeView, onNavigate, onLogout }) {
  const roleLabel = {
    main_admin: 'Main Admin',
    industry_admin: 'Industry Admin',
    queue_operator: 'Queue Operator',
    service_provider: 'Service Provider',
    doctor: 'Service Provider',
    user: 'User'
  }[user.role] || user.role;
  const avatarPreset = getAvatarPreset(user.avatar_preset);
  const logoPreset = getLogoPreset(user.industry_logo_preset);

  return (
    <nav className="navbar">
      <div className="nav-brand">
        {user.industry_logo_url ? (
          <img className="brand-icon brand-image" src={user.industry_logo_url} alt="" />
        ) : (
          <span className="brand-icon" style={presetStyle(logoPreset)}>{logoPreset.initials}</span>
        )}
        <span className="brand-name">{user.industry_name || 'AI Queue Automation'}</span>
      </div>

      <div className="nav-menu">
        <button className={activeView === 'dashboard' ? 'active' : ''} onClick={() => onNavigate('dashboard')}>Apps</button>
        <button className={activeView === 'profile' ? 'active' : ''} onClick={() => onNavigate('profile')}>Your Profile</button>
      </div>

      <div className="nav-user">
        <span className="user-role">{roleLabel}</span>
        <button className="profile-chip" onClick={() => onNavigate('profile')} aria-label="Open profile">
          {user.avatar_url ? (
            <img className="profile-avatar" src={user.avatar_url} alt="" />
          ) : (
            <span className="profile-avatar" style={presetStyle(avatarPreset)}>
              {initialsFor(user.name, avatarPreset.initials)}
            </span>
          )}
          <span className="user-name">{user.name}</span>
        </button>
        <button onClick={onLogout} className="logout-btn">Logout</button>
      </div>
    </nav>
  );
}

export default Navbar;
