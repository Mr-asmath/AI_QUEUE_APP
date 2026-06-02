import React, { useMemo, useState } from 'react';
import { buildTvDisplayUrl, createTvPayload, fetchTvDisplayData, sendWifiQueuePayload } from '../services/tvCast.service';

const cards = [
  { id: 'hdmi', title: 'HDMI Display', icon: 'desktop_windows' },
  { id: 'url', title: 'Website URL Display', icon: 'language' },
  { id: 'wireless', title: 'Bluetooth / WiFi Display', icon: 'settings_input_antenna' }
];

function TvCastSettings({ user }) {
  const branchId = user.branch_id || user.branch?.id || 1;
  const [counterId, setCounterId] = useState(user.user_code || '01');
  const [status, setStatus] = useState({ hdmi: 'Ready', url: 'Ready', wireless: 'Disconnected' });
  const [lastSync, setLastSync] = useState({});
  const [modalOpen, setModalOpen] = useState(false);
  const [deviceName, setDeviceName] = useState('');
  const [wifiEndpoint, setWifiEndpoint] = useState('');
  const [signal, setSignal] = useState('--');
  const [lastToken, setLastToken] = useState('--');
  const [autoSync, setAutoSync] = useState(true);
  const displayUrl = useMemo(() => buildTvDisplayUrl(branchId, counterId), [branchId, counterId]);
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(displayUrl)}`;

  const markSync = (key) => setLastSync((current) => ({ ...current, [key]: new Date().toLocaleTimeString() }));

  const openDisplay = () => {
    window.open(displayUrl, '_blank', 'noopener,noreferrer');
    setStatus((current) => ({ ...current, hdmi: 'Opened' }));
    markSync('hdmi');
  };

  const copyUrl = async () => {
    await navigator.clipboard?.writeText(displayUrl);
    setStatus((current) => ({ ...current, url: 'Copied' }));
    markSync('url');
  };

  const regenerate = () => {
    setCounterId(`${user.user_code || '01'}-${Date.now().toString().slice(-4)}`);
    setStatus((current) => ({ ...current, url: 'Regenerated' }));
    markSync('url');
  };

  const scanBluetooth = async () => {
    if (!navigator.bluetooth) {
      setStatus((current) => ({ ...current, wireless: 'Bluetooth unsupported' }));
      return;
    }
    try {
      const device = await navigator.bluetooth.requestDevice({ acceptAllDevices: true, optionalServices: ['battery_service'] });
      setDeviceName(device.name || 'Bluetooth Display');
      setStatus((current) => ({ ...current, wireless: 'Connected' }));
      setSignal('Bluetooth ready');
      markSync('wireless');
    } catch (error) {
      setStatus((current) => ({ ...current, wireless: 'Scan cancelled' }));
    }
  };

  const sendTestToken = async () => {
    const data = await fetchTvDisplayData(branchId, counterId);
    const payload = createTvPayload(data.display || {});
    setLastToken(payload.currentToken);
    if (wifiEndpoint) {
      await sendWifiQueuePayload(wifiEndpoint, payload).catch(() => false);
    }
    setStatus((current) => ({ ...current, wireless: wifiEndpoint ? 'Payload sent' : 'Test payload ready' }));
    markSync('wireless');
  };

  const disconnect = (key) => {
    setStatus((current) => ({ ...current, [key]: 'Disconnected' }));
    if (key === 'wireless') {
      setDeviceName('');
      setSignal('--');
    }
  };

  return (
    <section className="tv-cast-settings">
      <div className="section-heading">
        <div>
          <h3>TV Cast Settings</h3>
          <p>Display live queue status on HDMI TVs, smart TV browsers, or local display hardware.</p>
        </div>
        <label className="counter-field">
          Counter
          <input value={counterId} onChange={(event) => setCounterId(event.target.value)} />
        </label>
      </div>

      <div className="tv-cast-grid">
        {cards.map((card) => (
          <article className="tv-cast-card" key={card.id}>
            <span className="material-icons tv-cast-icon" aria-hidden="true">{card.icon}</span>
            <h4>{card.title}</h4>
            <dl>
              <dt>Status</dt><dd>{status[card.id]}</dd>
              <dt>Device</dt><dd>{card.id === 'wireless' ? (deviceName || 'No device') : card.id === 'hdmi' ? 'Connected TV / Monitor' : 'Smart browser URL'}</dd>
              <dt>Last sync</dt><dd>{lastSync[card.id] || 'Not synced'}</dd>
            </dl>
            <div className="button-row">
              {card.id === 'hdmi' && <button type="button" onClick={openDisplay}>Open HDMI Display Mode</button>}
              {card.id === 'url' && <button type="button" onClick={copyUrl}>Copy Display URL</button>}
              {card.id === 'wireless' && <button type="button" onClick={() => setModalOpen(true)}>Bluetooth / WiFi Connect</button>}
              <button type="button" className="secondary-btn" onClick={() => disconnect(card.id)}>Disconnect</button>
              <button type="button" className="secondary-btn" onClick={() => card.id === 'url' ? regenerate() : markSync(card.id)}>Settings</button>
            </div>
            {card.id === 'url' && (
              <div className="display-url-box">
                <code>{displayUrl}</code>
                <button type="button" className="secondary-btn" onClick={() => window.open(displayUrl, '_blank', 'noopener,noreferrer')}>Open Display URL</button>
                <img src={qrUrl} alt="TV display QR code" />
              </div>
            )}
          </article>
        ))}
      </div>

      {modalOpen && (
        <div className="terms-modal-overlay" role="presentation" onClick={() => setModalOpen(false)}>
          <div className="terms-modal tv-connect-modal" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
            <button type="button" className="terms-modal-close" aria-label="Close" onClick={() => setModalOpen(false)}>x</button>
            <h3>Bluetooth / WiFi Display</h3>
            {!navigator.bluetooth && (
              <div className="warning-message">Bluetooth display connection is not supported on this device. Please use HDMI Display Mode or Website URL Display.</div>
            )}
            <div className="form-group">
              <label>WiFi / local receiver endpoint</label>
              <input placeholder="http://192.168.1.50/queue" value={wifiEndpoint} onChange={(event) => setWifiEndpoint(event.target.value)} />
            </div>
            <div className="tv-device-grid">
              <span>Connection Status</span><strong>{status.wireless}</strong>
              <span>Device Name</span><strong>{deviceName || 'No device connected'}</strong>
              <span>Signal Strength</span><strong>{signal}</strong>
              <span>Last Synced Token</span><strong>{lastToken}</strong>
            </div>
            <label className="inline-check">
              <input type="checkbox" checked={autoSync} onChange={(event) => setAutoSync(event.target.checked)} />
              Auto Sync
            </label>
            <div className="button-row">
              <button type="button" onClick={scanBluetooth}>Scan Devices</button>
              <button type="button" onClick={sendTestToken}>Send Test Token</button>
              <button type="button" className="secondary-btn" onClick={() => setStatus((current) => ({ ...current, wireless: 'Reconnecting' }))}>Reconnect</button>
              <button type="button" className="danger-btn" onClick={() => disconnect('wireless')}>Disconnect Device</button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

export default TvCastSettings;
