import React, { useCallback, useEffect, useState } from 'react';
import { apiPath } from '../config';
import { roleLabelsFor } from '../roleLabels';

function UserDashboard({ user, onLogout }) {
  const [catalog, setCatalog] = useState({ industries: [], branches: [] });
  const [branchId, setBranchId] = useState('');
  const [details, setDetails] = useState({});
  const [nameMode, setNameMode] = useState('default');
  const [customerNames, setCustomerNames] = useState(['', '', '']);
  const [tokens, setTokens] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [queueStatus, setQueueStatus] = useState(null);
  const [activeTab, setActiveTab] = useState('new');
  const [message, setMessage] = useState('');
  const [sessionExpired, setSessionExpired] = useState(false);
  const [mapEnabled, setMapEnabled] = useState(true);
  const [routeEnabled, setRouteEnabled] = useState(false);
  const [userLocation, setUserLocation] = useState(null);

  const api = useCallback(async (path, options = {}) => {
    const response = await fetch(apiPath(path), {
      credentials: 'include',
      headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
      ...options
    });
    const data = await response.json();
    if (response.status === 401) {
      setSessionExpired(true);
      return { success: false, error: data.error || 'Session expired. Please sign in again.' };
    }
    return data;
  }, []);

  const refresh = useCallback(async () => {
    const catalogData = await api('/api/catalog');
    if (catalogData.success) setCatalog(catalogData);
    const tokenData = await api('/api/user/my-tokens');
    if (tokenData.success) setTokens(tokenData.tokens);
    const suggestionData = await api('/api/user/my-suggestions');
    if (suggestionData.success) setSuggestions(suggestionData.suggestions);
    const notificationData = await api('/api/user/notifications');
    if (notificationData.success) setNotifications(notificationData.notifications);
    const statusData = await api(`/api/queue/status${branchId ? `?branch_id=${branchId}` : ''}`);
    if (statusData.success) setQueueStatus(statusData);
  }, [api, branchId]);

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 5000);
    return () => clearInterval(interval);
  }, [refresh]);

  const selectedBranch = catalog.branches.find((branch) => String(branch.id) === String(branchId));
  const formatBranchAddress = (branch = {}) => {
    const parts = [branch.area, branch.city, branch.state, branch.pincode].filter(Boolean);
    return parts.length ? parts.join(', ') : branch.address;
  };
  const branchNameSettings = selectedBranch?.dashboard_config?.industry_settings || {};
  const roleLabels = roleLabelsFor(selectedBranch?.branch_type || user.industry_type, branchNameSettings.role_labels || {});
  const mappedBranches = catalog.branches.filter((branch) => branch.latitude && branch.longitude);
  const mapCenter = selectedBranch?.latitude && selectedBranch?.longitude
    ? { latitude: selectedBranch.latitude, longitude: selectedBranch.longitude }
    : mappedBranches[0]
      ? { latitude: mappedBranches[0].latitude, longitude: mappedBranches[0].longitude }
      : { latitude: 20.5937, longitude: 78.9629 };
  const mapSrc = `https://www.openstreetmap.org/export/embed.html?bbox=${mapCenter.longitude - 0.04}%2C${mapCenter.latitude - 0.03}%2C${mapCenter.longitude + 0.04}%2C${mapCenter.latitude + 0.03}&layer=mapnik&marker=${mapCenter.latitude}%2C${mapCenter.longitude}`;
  const googleDirectionsUrl = selectedBranch?.latitude && selectedBranch?.longitude
    ? `https://www.google.com/maps/dir/?api=1&destination=${selectedBranch.latitude},${selectedBranch.longitude}${userLocation ? `&origin=${userLocation.latitude},${userLocation.longitude}` : ''}`
    : '';

  const distanceKm = userLocation && selectedBranch?.latitude && selectedBranch?.longitude
    ? (() => {
      const toRad = (value) => (Number(value) * Math.PI) / 180;
      const earthKm = 6371;
      const dLat = toRad(selectedBranch.latitude - userLocation.latitude);
      const dLon = toRad(selectedBranch.longitude - userLocation.longitude);
      const lat1 = toRad(userLocation.latitude);
      const lat2 = toRad(selectedBranch.latitude);
      const a = Math.sin(dLat / 2) ** 2 + Math.sin(dLon / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
      return earthKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    })()
    : null;
  const estimatedMinutes = distanceKm ? Math.max(1, Math.round((distanceKm / 25) * 60)) : null;
  const reachTime = estimatedMinutes ? new Date(Date.now() + estimatedMinutes * 60000).toLocaleTimeString() : null;

  useEffect(() => {
    if (selectedBranch) {
      setNameMode(branchNameSettings.token_name_mode === 'customer' ? 'customer' : 'default');
    }
  }, [selectedBranch, branchNameSettings.token_name_mode]);

  const submitToken = async (event) => {
    event.preventDefault();
    setMessage('');
    const data = await api('/api/token', {
      method: 'POST',
      body: JSON.stringify({ branch_id: branchId, details, name_mode: nameMode, customer_names: customerNames })
    });
    if (data.success) {
      setMessage(`Token generated: ${data.token.token_code}. It is valid until ${new Date(data.token.expires_at).toLocaleTimeString()}.`);
      setDetails({});
      setCustomerNames(['', '', '']);
      refresh();
    } else {
      setMessage(data.error || 'Token generation failed.');
    }
  };

  const cancelToken = async (tokenId) => {
    const data = await api(`/api/user/tokens/${tokenId}/cancel`, { method: 'POST' });
    if (data.success) {
      setMessage(`${data.token.token_code} is cancelled.`);
      refresh();
    } else {
      setMessage(data.error || 'Token cancellation failed.');
    }
  };

  const useCurrentLocation = () => {
    if (!navigator.geolocation) {
      setMessage('Location is not supported in this browser.');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude
        });
        setRouteEnabled(true);
      },
      () => setMessage('Location permission denied or unavailable.')
    );
  };

  const selectMapBranch = (branch) => {
    setBranchId(String(branch.id));
    setActiveTab('new');
  };

  const renderField = (field) => (
    <div className="form-group" key={field.key}>
      <label>{field.key}</label>
      {field.type === 'select' ? (
        <select value={details[field.key] || ''} onChange={(event) => setDetails({ ...details, [field.key]: event.target.value })} required={field.required}>
          <option value="">Select</option>
          {(field.values || []).map((value) => <option key={value} value={value}>{value}</option>)}
        </select>
      ) : (
        <input
          type={field.type === 'int' || field.type === 'float' ? 'number' : field.type === 'image' ? 'url' : 'text'}
          value={details[field.key] || ''}
          onChange={(event) => setDetails({ ...details, [field.key]: event.target.value })}
          required={field.required}
        />
      )}
    </div>
  );

  return (
    <div className="dashboard user-dashboard">
      <div className="dashboard-header">
        <div>
          <h1>Queue Entry</h1>
          <p className="user-email">{user.name} - {user.email}</p>
          <p className="user-email">User ID: {user.user_code || 'Pending'}</p>
        </div>
        <div className="stats-summary">
          <span className="stat">Waiting: {queueStatus?.waiting_count || 0}</span>
          <span className="stat">Estimated: {queueStatus?.estimated_waiting_time || 0} min</span>
        </div>
      </div>

      {message && <div className="success-message">{message}</div>}
      {sessionExpired && (
        <div className="error-message">
          Session expired or backend is not connected. Please sign in again.
          <button className="link-button" onClick={onLogout}>Back to login</button>
        </div>
      )}

      <div className="dashboard-tabs">
        <button className={activeTab === 'new' ? 'active' : ''} onClick={() => setActiveTab('new')}>Generate Token</button>
        <button className={activeTab === 'tokens' ? 'active' : ''} onClick={() => setActiveTab('tokens')}>My Tokens</button>
        <button className={activeTab === 'suggestions' ? 'active' : ''} onClick={() => setActiveTab('suggestions')}>Suggestions</button>
        <button className={activeTab === 'notifications' ? 'active' : ''} onClick={() => setActiveTab('notifications')}>Notifications</button>
      </div>

      {activeTab === 'new' && (
        <div className="split-layout">
          <form className="control-panel" onSubmit={submitToken}>
            <h3>Select Place</h3>
            <div className="form-group">
              <label>Industry and branch</label>
              <select value={branchId} onChange={(event) => setBranchId(event.target.value)} required>
                <option value="">Select place</option>
                {catalog.branches.map((branch) => (
                  <option key={branch.id} value={branch.id}>{branch.industry_name} - {branch.name}</option>
                ))}
              </select>
            </div>
            {selectedBranch && (
              <div className="checkbox-section">
                <h4>Token name</h4>
                <div className="radio-group">
                  <label>
                    <input
                      type="radio"
                      name="token-name-mode"
                      checked={nameMode === 'default'}
                      onChange={() => setNameMode('default')}
                    />
                    Default name
                  </label>
                  <label>
                    <input
                      type="radio"
                      name="token-name-mode"
                      checked={nameMode === 'customer'}
                      onChange={() => setNameMode('customer')}
                    />
                    Customer name
                  </label>
                </div>
                {nameMode === 'customer' && (
                  <div className="customer-name-grid">
                    {customerNames.slice(0, branchNameSettings.customer_name_slots || 3).map((value, index) => (
                      <input
                        key={`customer-name-${index}`}
                        value={value}
                        onChange={(event) => {
                          const next = [...customerNames];
                          next[index] = event.target.value;
                          setCustomerNames(next);
                        }}
                        placeholder={`Customer name ${index + 1}`}
                        required={index === 0}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}
            {selectedBranch && selectedBranch.user_schema.map(renderField)}
            <button type="submit" disabled={!branchId}>Generate Queue Token</button>
          </form>

          <div className="queue-status-panel">
            <div className="branch-map-panel">
              <div className="map-toolbar">
                <button type="button" className="secondary-btn" onClick={() => setMapEnabled((current) => !current)}>
                  {mapEnabled ? 'Map Off' : 'Map On'}
                </button>
                <button type="button" className="secondary-btn" onClick={useCurrentLocation}>Use My Location</button>
                <button type="button" className="secondary-btn" onClick={() => setRouteEnabled((current) => !current)}>
                  {routeEnabled ? 'Hide Travel Path' : 'Show Travel Path'}
                </button>
              </div>
              {mapEnabled && (
                <>
                  <iframe
                    className="branch-map-frame"
                    title="Branch map"
                    src={mapSrc}
                    loading="lazy"
                  />
                  <div className="branch-marker-list">
                    {mappedBranches.map((branch) => (
                      <button
                        type="button"
                        key={branch.id}
                        className={String(branch.id) === String(branchId) ? 'branch-marker-card active' : 'branch-marker-card'}
                        onClick={() => selectMapBranch(branch)}
                      >
                        <span className="branch-logo-pin">{branch.logo_preset?.slice(0, 2).toUpperCase() || 'BR'}</span>
                        <span>
                          <strong>{branch.industry_name} - {branch.name}</strong>
                          <small>{formatBranchAddress(branch) || 'Open details'}</small>
                        </span>
                      </button>
                    ))}
                  </div>
                  {selectedBranch && (
                    <div className="map-detail-panel">
                      <strong>{selectedBranch.name}</strong>
                      <p>{formatBranchAddress(selectedBranch) || 'No address saved.'}</p>
                      <div className="map-detail-actions">
                        {googleDirectionsUrl && (
                          <a href={googleDirectionsUrl} target="_blank" rel="noreferrer">Open Google Map</a>
                        )}
                        {routeEnabled && selectedBranch.latitude && selectedBranch.longitude && (
                          <span>
                            {distanceKm ? `${distanceKm.toFixed(1)} km` : 'Location needed'}
                            {estimatedMinutes ? `, about ${estimatedMinutes} min, reach by ${reachTime}` : ''}
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
            <div className="current-token-large">
              <h3>Now Serving</h3>
              <div className="token-number">#{queueStatus?.current_token || '---'}</div>
            </div>
            <div className="queue-stats">
              <div className="stat-card"><label>Waiting</label><span className="stat-value">{queueStatus?.waiting_count || 0}</span></div>
              <div className="stat-card"><label>Last Token</label><span className="stat-value">#{queueStatus?.last_token || 0}</span></div>
              <div className="stat-card"><label>ETA</label><span className="stat-value">{queueStatus?.estimated_waiting_time || 0}m</span></div>
            </div>
            <div className="grid-list">
              {(queueStatus?.next_tokens || []).map((token) => (
                <div className="record-card compact" key={token.token_id}>
                  <strong>{token.token_code}</strong>
                  <span>{token.status}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'tokens' && (
        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr><th>Token</th><th>Name</th><th>Place</th><th>Status</th><th>{roleLabels.service_provider}</th><th>Valid For</th><th>Action</th></tr>
            </thead>
            <tbody>
              {tokens.map((token) => (
                <tr key={token.token_id}>
                  <td>{token.token_code}</td>
                  <td>{token.display_name || token.user_name}</td>
                  <td>{token.industry_name} / {token.branch_name}</td>
                  <td><span className="badge badge-info">{token.status}</span></td>
                  <td>{token.provider_name || '-'}</td>
                  <td>{Math.ceil(token.seconds_left / 60)} min</td>
                  <td>
                    {['requested', 'verified', 'customer_in', 'allocated'].includes(token.status) ? (
                      <button className="danger-btn" onClick={() => cancelToken(token.token_id)}>Cancel</button>
                    ) : token.status === 'cancelled' ? (
                      <span className="cancelled-note">Token is cancelled</span>
                    ) : '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'suggestions' && (
        <div className="grid-list">
          {suggestions.map((item) => (
            <div className="record-card" key={item.id}>
              <div className="record-title">{item.token_code}</div>
              <p>{item.suggestion_text}</p>
              <p>Total: {item.aggregates.total} | Average: {item.aggregates.average} | Count: {item.aggregates.count}</p>
              <small>{item.provider_name}</small>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'notifications' && (
        <div className="notifications-list">
          {notifications.map((item) => (
            <div className={`notification-card ${!item.is_read ? 'unread' : ''}`} key={item.id}>
              <div className="notification-message">{item.message}</div>
              <div className="notification-time">{new Date(item.created_at).toLocaleString()}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default UserDashboard;
