import React, { useCallback, useEffect, useState } from 'react';
import { apiPath } from '../config';
import { ExportMenu } from '../exportUtils';
import { roleLabelsFor } from '../roleLabels';
import BottomNavigation from './BottomNavigation';

function UserDashboard({ user, onLogout }) {
  const [catalog, setCatalog] = useState({ industries: [], branches: [] });
  const [branchId, setBranchId] = useState('');
  const [details, setDetails] = useState({});
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
  const selectedBranchEmergencyEnabled = selectedBranch?.dashboard_config?.user?.allow_emergency_queue !== false;
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

  const submitToken = async (event) => {
    event.preventDefault();
    setMessage('');
    const data = await api('/api/token', {
      method: 'POST',
      body: JSON.stringify({ branch_id: branchId, details })
    });
    if (data.success) {
      setMessage(`Token generated: ${data.token.token_code}. It is valid until ${new Date(data.token.expires_at).toLocaleTimeString()}.`);
      setDetails({});
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

  const emergencyToken = async (tokenId, action) => {
    const data = await api(`/api/user/tokens/${tokenId}/emergency`, {
      method: 'POST',
      body: JSON.stringify({ action })
    });
    if (data.success) {
      setMessage(action === 'request' ? `${data.token.token_code} emergency request sent.` : `${data.token.token_code} emergency request cancelled.`);
      refresh();
    } else {
      setMessage(data.error || 'Emergency update failed.');
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

  const tokenExportColumns = [
    { label: 'Token', value: 'token_code' },
    { label: 'Name', value: (item) => item.display_name || item.user_name },
    { label: 'Place', value: (item) => `${item.industry_name} / ${item.branch_name}` },
    { label: 'Status', value: 'status' },
    { label: 'Emergency', value: (item) => item.emergency_accepted ? 'Accepted' : item.emergency_requested ? 'Requested' : 'No' },
    { label: roleLabels.service_provider, value: (item) => item.provider_name || '-' },
    { label: 'Valid minutes', value: (item) => Math.ceil(item.seconds_left / 60) },
  ];
  const suggestionExportColumns = [
    { label: 'Token', value: 'token_code' },
    { label: 'Suggestion', value: 'suggestion_text' },
    { label: 'Provider', value: 'provider_name' },
    { label: 'Total', value: (item) => item.aggregates?.total || 0 },
    { label: 'Average', value: (item) => item.aggregates?.average || 0 },
    { label: 'Count', value: (item) => item.aggregates?.count || 0 },
  ];
  const notificationExportColumns = [
    { label: 'Message', value: 'message' },
    { label: 'Type', value: 'type' },
    { label: 'Read', value: (item) => item.is_read ? 'Yes' : 'No' },
    { label: 'Time', value: (item) => new Date(item.created_at).toLocaleString() },
  ];
  const userTabs = [
    { id: 'new', label: 'Generate Token' },
    { id: 'tokens', label: 'My Tokens' },
    { id: 'suggestions', label: 'Suggestions' },
    { id: 'notifications', label: 'Notifications' }
  ];

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
      {queueStatus?.queue_paused && (
        <div className="warning-message">
          Queue paused: {queueStatus.queue_pause_reason || 'Paused by staff'}. Your order stays the same and will continue after resume.
        </div>
      )}
      {sessionExpired && (
        <div className="error-message">
          Session expired or backend is not connected. Please sign in again.
          <button className="link-button" onClick={onLogout}>Back to login</button>
        </div>
      )}

      <BottomNavigation items={userTabs} activeId={activeTab} onSelect={setActiveTab} />

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
            {selectedBranch && !selectedBranchEmergencyEnabled && (
              <div className="info-message">Emergency requests are off for this branch.</div>
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
        <div className="data-container">
          <div className="data-container-header">
            <div>
              <h3>My Tokens</h3>
              <p>Active, cancelled, emergency, and completed token records.</p>
            </div>
            <ExportMenu title="My Tokens" filename="my-tokens" columns={tokenExportColumns} rows={tokens} />
          </div>
          <div className="table-responsive">
            <table className="data-table">
            <thead>
              <tr><th>Token</th><th>Name</th><th>Place</th><th>Status</th><th>Emergency</th><th>{roleLabels.service_provider}</th><th>Valid For</th><th>Action</th></tr>
            </thead>
            <tbody>
              {tokens.map((token) => (
                <tr key={token.token_id}>
                  <td>{token.token_code}</td>
                  <td>{token.display_name || token.user_name}</td>
                  <td>{token.industry_name} / {token.branch_name}</td>
                  <td><span className="badge badge-info">{token.status}</span></td>
                  <td>
                    {token.emergency_accepted ? <span className="badge badge-danger">Accepted</span> : token.emergency_requested ? <span className="badge badge-warning">Requested</span> : '-'}
                  </td>
                  <td>{token.provider_name || '-'}</td>
                  <td>{Math.ceil(token.seconds_left / 60)} min</td>
                  <td>
                    {['requested', 'verified', 'customer_in', 'allocated'].includes(token.status) ? (
                      <div className="button-row">
                        {token.branch_config?.user?.allow_emergency_queue !== false && ['requested', 'verified'].includes(token.status) && !token.emergency_requested && (
                          <button type="button" className="warning-btn" onClick={() => emergencyToken(token.token_id, 'request')}>Emergency</button>
                        )}
                        {token.branch_config?.user?.allow_emergency_queue !== false && ['requested', 'verified'].includes(token.status) && token.emergency_requested && (
                          <button type="button" className="secondary-btn" onClick={() => emergencyToken(token.token_id, 'cancel')}>Cancel Emergency</button>
                        )}
                        <button className="danger-btn" onClick={() => cancelToken(token.token_id)}>Cancel Token</button>
                      </div>
                    ) : token.status === 'cancelled' ? (
                      <span className="cancelled-note">Token is cancelled</span>
                    ) : '-'}
                  </td>
                </tr>
              ))}
            </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'suggestions' && (
        <div className="data-container">
          <div className="data-container-header">
            <div>
              <h3>Suggestions</h3>
              <p>Completed service suggestions and selected-item analysis.</p>
            </div>
            <ExportMenu title="Suggestions" filename="suggestions" columns={suggestionExportColumns} rows={suggestions} />
          </div>
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
        </div>
      )}

      {activeTab === 'notifications' && (
        <div className="data-container">
          <div className="data-container-header">
            <div>
              <h3>Notifications</h3>
              <p>Queue updates, cancellation notices, and service messages.</p>
            </div>
            <ExportMenu title="Notifications" filename="notifications" columns={notificationExportColumns} rows={notifications} />
          </div>
          <div className="notifications-list">
            {notifications.map((item) => (
              <div className={`notification-card ${!item.is_read ? 'unread' : ''}`} key={item.id}>
                <div className="notification-message">{item.message}</div>
                <div className="notification-time">{new Date(item.created_at).toLocaleString()}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default UserDashboard;
