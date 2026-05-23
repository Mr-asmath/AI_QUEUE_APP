import React, { useCallback, useEffect, useState } from 'react';

function DoctorDashboard({ user }) {
  const [tokens, setTokens] = useState([]);
  const [selectedItems, setSelectedItems] = useState({});
  const [suggestionText, setSuggestionText] = useState({});
  const [message, setMessage] = useState('');

  const api = useCallback(async (path, options = {}) => {
    const response = await fetch(`http://localhost:5000${path}`, {
      credentials: 'include',
      headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
      ...options
    });
    return response.json();
  }, []);

  const refresh = useCallback(async () => {
    const data = await api('/api/provider/tokens');
    if (data.success) setTokens(data.tokens);
  }, [api]);

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 5000);
    return () => clearInterval(interval);
  }, [refresh]);

  const askAi = async (tokenId) => {
    const data = await api(`/api/provider/tokens/${tokenId}/ai-suggestion`, { method: 'POST' });
    if (data.success) {
      setSuggestionText({ ...suggestionText, [tokenId]: data.suggestion });
      refresh();
    }
  };

  const toggleItem = (tokenId, item) => {
    const current = selectedItems[tokenId] || [];
    const exists = current.some((entry) => entry.name === item.name);
    setSelectedItems({
      ...selectedItems,
      [tokenId]: exists ? current.filter((entry) => entry.name !== item.name) : [...current, item]
    });
  };

  const complete = async (tokenId) => {
    const data = await api(`/api/provider/tokens/${tokenId}/suggestion`, {
      method: 'POST',
      body: JSON.stringify({
        suggestion_text: suggestionText[tokenId],
        selected_items: selectedItems[tokenId] || []
      })
    });
    if (data.success) {
      setMessage(`Completed with total ${data.suggestion.aggregates.total}.`);
      refresh();
    }
  };

  const itemOptions = (token) => {
    const configured = token.branch_config?.service_provider?.search_items;
    return configured && configured.length
      ? configured
      : [
        { name: 'Consultation', price: 300 },
        { name: 'Service Charge', price: 100 },
        { name: 'Follow Up', price: 0 }
      ];
  };

  return (
    <div className="dashboard doctor-dashboard">
      <div className="dashboard-header">
        <div>
          <h1>Service Provider Dashboard</h1>
          <p className="user-email">{user.name} - {user.industry_name || 'Provider'}</p>
        </div>
        <div className="stats-summary">
          <span className="stat">Active: {tokens.length}</span>
        </div>
      </div>

      {message && <div className="success-message">{message}</div>}

      <div className="patient-grid">
        {tokens.map((token) => {
          const checked = selectedItems[token.token_id] || [];
          const prices = checked.map((item) => Number(item.price || 0));
          const total = prices.reduce((sum, price) => sum + price, 0);
          const average = prices.length ? total / prices.length : 0;
          return (
            <div className="patient-card current" key={token.token_id}>
              <div className="patient-header">
                <span className="token-badge">{token.token_code}</span>
                <h4>{token.user_name}</h4>
              </div>
              <p>{token.branch_name}</p>
              <div className="details-list">
                {Object.entries(token.details || {}).map(([key, value]) => (
                  <span key={key}><strong>{key}:</strong> {String(value)}</span>
                ))}
              </div>

              <button onClick={() => askAi(token.token_id)}>Ask AI Suggestion</button>
              <textarea
                rows="4"
                value={suggestionText[token.token_id] || token.ai_suggestion || ''}
                onChange={(event) => setSuggestionText({ ...suggestionText, [token.token_id]: event.target.value })}
                placeholder="Suggestion, next step, prescription, note, or service instruction"
              />

              <div className="checkbox-list">
                {itemOptions(token).map((item) => (
                  <label key={item.name}>
                    <input
                      type="checkbox"
                      checked={checked.some((entry) => entry.name === item.name)}
                      onChange={() => toggleItem(token.token_id, item)}
                    />
                    {item.name} ({item.price})
                  </label>
                ))}
              </div>

              <div className="aggregation-bar">
                <span>Total: {total}</span>
                <span>Average: {average.toFixed(2)}</span>
                <span>Count: {checked.length}</span>
              </div>

              <button className="complete-btn" onClick={() => complete(token.token_id)}>Complete Service</button>
            </div>
          );
        })}
        {tokens.length === 0 && <p className="no-patients">No active tokens for service.</p>}
      </div>
    </div>
  );
}

export default DoctorDashboard;
