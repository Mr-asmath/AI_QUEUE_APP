import { X } from "lucide-react";

export default function SettingsPanel({ settings, onChange, onClose }) {
  return (
    <aside className="settings-panel" aria-label="Assistant settings">
      <div className="settings-title">
        <h3>Settings</h3>
        <button className="icon-button" type="button" aria-label="Close settings" onClick={onClose}>
          <X size={17} />
        </button>
      </div>

      <label className="toggle-row">
        <span>Read responses aloud</span>
        <input
          type="checkbox"
          checked={settings.ttsEnabled}
          onChange={(event) => onChange((current) => ({ ...current, ttsEnabled: event.target.checked }))}
        />
      </label>

      <label className="toggle-row">
        <span>Dark mode</span>
        <input
          type="checkbox"
          checked={settings.darkMode}
          onChange={(event) => onChange((current) => ({ ...current, darkMode: event.target.checked }))}
        />
      </label>
    </aside>
  );
}
