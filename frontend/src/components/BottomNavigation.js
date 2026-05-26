import React from 'react';
import { createPortal } from 'react-dom';

const fallbackIcons = {
  requests: 'vpn_key',
  'event-logs': 'event_note',
  'user-management': 'groups',
  'reset-requests': 'restart_alt',
  branches: 'account_tree',
  staff: 'badge',
  queue: 'pending_actions',
  'queue-history': 'history',
  secret: 'shield',
  'create-branch': 'add_business',
  'create-staff': 'person_add',
  new: 'confirmation_number',
  tokens: 'receipt_long',
  suggestions: 'tips_and_updates',
  notifications: 'notifications',
  account: 'manage_accounts',
  logo: 'image',
  'industry-settings': 'tune',
  password: 'lock_reset',
  'secret-password': 'admin_panel_settings',
  session: 'devices',
  home: 'home'
};

function BottomNavigation({ items, activeId, onSelect, className = '' }) {
  if (!items?.length) return null;

  const nav = (
    <nav className={`app-bottom-nav ${className}`} aria-label="Page menu">
      {items.map((item) => (
        <button
          type="button"
          key={item.id}
          className={activeId === item.id ? 'bottom-nav-item active' : 'bottom-nav-item'}
          aria-label={item.label}
          aria-current={activeId === item.id ? 'page' : undefined}
          onClick={() => onSelect(item.id)}
        >
          <span className="bottom-nav-label" aria-hidden="true">{item.label}</span>
          <span className="material-icons" aria-hidden="true">{item.icon || fallbackIcons[item.id] || 'radio_button_checked'}</span>
        </button>
      ))}
    </nav>
  );

  return createPortal(nav, document.body);
}

export default BottomNavigation;
