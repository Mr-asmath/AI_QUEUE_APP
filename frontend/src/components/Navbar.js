import React, { useState } from 'react';
import { getAvatarPreset, getLogoPreset, initialsFor, presetStyle } from '../visualPresets';

function Navbar({ user, onNavigate }) {
  const [menuOpen, setMenuOpen] = useState(false);
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

  const navigate = (view) => {
    setMenuOpen(false);
    onNavigate(view);
  };

  return (
    <nav className="navbar">
      <button className="nav-brand nav-home" onClick={() => navigate('dashboard')} aria-label="Go to dashboard">
        {user.industry_logo_url ? (
          <img className="brand-icon brand-image" src={user.industry_logo_url} alt="" />
        ) : (
          <span className="brand-icon" style={presetStyle(logoPreset)}>{logoPreset.initials}</span>
        )}
        <span className="brand-name">{user.industry_name || 'AI Queue Automation'}</span>
      </button>

      <div className="nav-dropdown">
        <button
          type="button"
          className="nav-dropdown-toggle"
          onClick={() => setMenuOpen((current) => !current)}
          aria-expanded={menuOpen}
          aria-label="Open menu"
        >
          Menu <span aria-hidden="true">v</span>
        </button>
        {menuOpen && (
          <div className="nav-dropdown-menu">
            <button type="button" onClick={() => navigate('dashboard')}>Home</button>
            <button type="button" onClick={() => navigate('profile')}>Project Page</button>
          </div>
        )}
      </div>

      <div className="nav-user">
        <span className="user-role">{roleLabel}</span>
        <button className="profile-chip" onClick={() => navigate('profile')} aria-label="Open profile">
          {user.avatar_url ? (
            <img className="profile-avatar" src={user.avatar_url} alt="" />
          ) : (
            <span className="profile-avatar" style={presetStyle(avatarPreset)}>
              {initialsFor(user.name, avatarPreset.initials)}
            </span>
          )}
          <span className="user-name">{user.name}</span>
        </button>
      </div>
    </nav>
  );
}

export default Navbar;
