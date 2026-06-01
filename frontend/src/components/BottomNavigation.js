import React, { useRef, useState } from 'react';
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
  theme: 'palette',
  'industry-settings': 'tune',
  password: 'lock_reset',
  'secret-password': 'admin_panel_settings',
  session: 'devices',
  home: 'home'
};

function BottomNavigation({ items, activeId, onSelect, className = '' }) {
  const [tooltip, setTooltip] = useState(null);
  const tooltipTimer = useRef(null);
  if (!items?.length) return null;

  const showTooltip = (event, label, hold = false) => {
    const rect = event.currentTarget.getBoundingClientRect();
    setTooltip({
      label,
      left: rect.left + rect.width / 2,
      top: rect.top - 10
    });
    if (tooltipTimer.current) clearTimeout(tooltipTimer.current);
    if (hold) {
      tooltipTimer.current = setTimeout(() => setTooltip(null), 2000);
    }
  };

  const hideTooltip = () => {
    if (tooltipTimer.current) clearTimeout(tooltipTimer.current);
    setTooltip(null);
  };

  const nav = (
    <>
      <nav className={`app-bottom-nav ${className}`} aria-label="Page menu">
        {items.map((item) => (
          <button
            type="button"
            key={item.id}
            className={activeId === item.id ? 'bottom-nav-item active' : 'bottom-nav-item'}
            aria-label={item.label}
            aria-current={activeId === item.id ? 'page' : undefined}
            data-label={item.label}
            onMouseEnter={(event) => showTooltip(event, item.label)}
            onMouseLeave={hideTooltip}
            onFocus={(event) => showTooltip(event, item.label)}
            onBlur={hideTooltip}
            onClick={(event) => {
              showTooltip(event, item.label, true);
              onSelect(item.id);
            }}
          >
            <span className="material-icons" aria-hidden="true">{item.icon || fallbackIcons[item.id] || 'radio_button_checked'}</span>
          </button>
        ))}
      </nav>
      {tooltip && (
        <div
          className="bottom-nav-tooltip"
          style={{ left: `${tooltip.left}px`, top: `${tooltip.top}px` }}
        >
          {tooltip.label}
        </div>
      )}
    </>
  );

  return createPortal(nav, document.body);
}

export default BottomNavigation;
