import React, { useCallback, useEffect, useState } from 'react';

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

  const api = useCallback(async (path, options = {}) => {
    const response = await fetch(`http://localhost:5000${path}`, {
      credentials: 'include',
      headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
      ...options
    });
    if (response.status === 401) onLogout();
    return response.json();
  }, [onLogout]);

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
            {selectedBranch && selectedBranch.user_schema.map(renderField)}
            <button type="submit" disabled={!branchId}>Generate Queue Token</button>
          </form>

          <div className="queue-status-panel">
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
              <tr><th>Token</th><th>Place</th><th>Status</th><th>Provider</th><th>Valid For</th></tr>
            </thead>
            <tbody>
              {tokens.map((token) => (
                <tr key={token.token_id}>
                  <td>{token.token_code}</td>
                  <td>{token.industry_name} / {token.branch_name}</td>
                  <td><span className="badge badge-info">{token.status}</span></td>
                  <td>{token.provider_name || '-'}</td>
                  <td>{Math.ceil(token.seconds_left / 60)} min</td>
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
