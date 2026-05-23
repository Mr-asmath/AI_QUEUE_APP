import React, { useCallback, useEffect, useState } from 'react';

const branchTypes = [
  { value: 'hospital', label: 'Hospital' },
  { value: 'school', label: 'School' },
  { value: 'hotel', label: 'Hotel' },
  { value: 'bank', label: 'Bank' },
  { value: 'other', label: 'Other' }
];

const fieldTypes = ['text', 'int', 'float', 'image', 'date', 'select'];
const aggregationOptions = ['total', 'average', 'count', 'min', 'max'];

const emptyBranch = {
  name: '',
  details: '',
  branch_type: 'hospital',
  other_type_name: '',
  dashboard_config: {
    service_provider: {
      display_user_details: true,
      display_previous_details: true,
      display_next_details: true,
      display_current_details: true,
      display_suggestion_boxes: true,
      suggestion_boxes: ['Suggestion'],
      display_search_items: true,
      search_items: [
        { name: 'Consultation', price: 300 },
        { name: 'Service Charge', price: 100 }
      ],
      display_cash_price: true,
      display_transactions: true,
      aggregations: ['total', 'average', 'count'],
      ai_suggestion: true
    },
    queue_operator: {
      can_edit_user_details: true,
      can_allocate_provider: true,
      display_user_details: true,
      display_previous_details: true,
      display_suggestions: true
    },
    user: {
      display_previous_suggestions: true,
      display_current_suggestions: true,
      display_current_queue_count: true,
      allow_generate_token: true,
      allow_reject_token: true,
      display_cash_price: true,
      display_transactions: true,
      display_operator_contact: true,
      display_provider_contact: true
    }
  },
  user_schema: [
    { key: 'name', type: 'text', required: true },
    { key: 'phone', type: 'text', required: true },
    { key: 'need', type: 'text', required: true }
  ]
};

function AdminDashboard({ user }) {
  const [activeTab, setActiveTab] = useState(user.role === 'main_admin' ? 'requests' : 'branches');
  const [requests, setRequests] = useState([]);
  const [branches, setBranches] = useState([]);
  const [staff, setStaff] = useState([]);
  const [queue, setQueue] = useState([]);
  const [providers, setProviders] = useState([]);
  const [branchForm, setBranchForm] = useState(emptyBranch);
  const [staffForm, setStaffForm] = useState({ name: '', email: '', phone: '', role: 'queue_operator', branch_id: '' });
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
    if (user.role === 'main_admin') {
      const data = await api('/api/admin/access-requests');
      if (data.success) setRequests(data.requests);
    }
    if (user.role === 'industry_admin') {
      const branchData = await api('/api/industry/branches');
      const staffData = await api('/api/industry/staff');
      if (branchData.success) setBranches(branchData.branches);
      if (staffData.success) setStaff(staffData.staff);
    }
    if (['queue_operator', 'industry_admin', 'main_admin'].includes(user.role)) {
      const queueData = await api('/api/operator/queue');
      if (queueData.success) {
        setQueue(queueData.tokens);
        setProviders(queueData.providers || []);
      }
    }
  }, [api, user.role]);

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 5000);
    return () => clearInterval(interval);
  }, [refresh]);

  const decide = async (id, decision) => {
    const data = await api(`/api/admin/access-requests/${id}/decision`, {
      method: 'POST',
      body: JSON.stringify({
        decision,
        message: decision === 'approve' ? 'Your industry account is approved.' : 'Your access request is rejected.'
      })
    });
    if (data.success) {
      setMessage(decision === 'approve' ? `Approved. Password: ${data.request.generated_password}` : 'Request rejected.');
      refresh();
    }
  };

  const createBranch = async (event) => {
    event.preventDefault();
    const payload = {
      ...branchForm,
      dashboard_config: branchForm.dashboard_config,
      user_schema: branchForm.user_schema.filter((item) => item.key.trim()).map((item) => ({
        ...item,
        key: item.key.trim(),
        required: Boolean(item.required)
      }))
    };
    const data = await api('/api/industry/branches', { method: 'POST', body: JSON.stringify(payload) });
    if (data.success) {
      setMessage('Branch created with dashboard configuration.');
      setBranchForm(emptyBranch);
      refresh();
    }
  };

  const createStaff = async (event) => {
    event.preventDefault();
    const data = await api('/api/industry/staff', { method: 'POST', body: JSON.stringify(staffForm) });
    if (data.success) {
      setMessage(`Staff created. Password: ${data.staff.generated_password}`);
      setStaffForm({ name: '', email: '', phone: '', role: 'queue_operator', branch_id: '' });
      refresh();
    }
  };

  const tokenAction = async (tokenId, action, providerId) => {
    const data = await api(`/api/operator/tokens/${tokenId}/action`, {
      method: 'POST',
      body: JSON.stringify({ action, provider_id: providerId })
    });
    if (data.success) refresh();
    else setMessage(data.error || 'Action failed');
  };

  const toggleServiceProviderOption = (key) => {
    setBranchForm({
      ...branchForm,
      dashboard_config: {
        ...branchForm.dashboard_config,
        service_provider: {
          ...branchForm.dashboard_config.service_provider,
          [key]: !branchForm.dashboard_config.service_provider[key]
        }
      }
    });
  };

  const toggleOperatorOption = (key) => {
    setBranchForm({
      ...branchForm,
      dashboard_config: {
        ...branchForm.dashboard_config,
        queue_operator: {
          ...branchForm.dashboard_config.queue_operator,
          [key]: !branchForm.dashboard_config.queue_operator[key]
        }
      }
    });
  };

  const toggleUserOption = (key) => {
    setBranchForm({
      ...branchForm,
      dashboard_config: {
        ...branchForm.dashboard_config,
        user: {
          ...branchForm.dashboard_config.user,
          [key]: !branchForm.dashboard_config.user[key]
        }
      }
    });
  };

  const toggleAggregation = (name) => {
    const current = branchForm.dashboard_config.service_provider.aggregations;
    const next = current.includes(name) ? current.filter((item) => item !== name) : [...current, name];
    setBranchForm({
      ...branchForm,
      dashboard_config: {
        ...branchForm.dashboard_config,
        service_provider: {
          ...branchForm.dashboard_config.service_provider,
          aggregations: next
        }
      }
    });
  };

  const updateSuggestionBox = (index, value) => {
    const suggestion_boxes = [...branchForm.dashboard_config.service_provider.suggestion_boxes];
    suggestion_boxes[index] = value;
    setBranchForm({
      ...branchForm,
      dashboard_config: {
        ...branchForm.dashboard_config,
        service_provider: { ...branchForm.dashboard_config.service_provider, suggestion_boxes }
      }
    });
  };

  const updateSearchItem = (index, key, value) => {
    const search_items = [...branchForm.dashboard_config.service_provider.search_items];
    search_items[index] = { ...search_items[index], [key]: key === 'price' ? Number(value) : value };
    setBranchForm({
      ...branchForm,
      dashboard_config: {
        ...branchForm.dashboard_config,
        service_provider: { ...branchForm.dashboard_config.service_provider, search_items }
      }
    });
  };

  const updateUserField = (index, key, value) => {
    const user_schema = [...branchForm.user_schema];
    user_schema[index] = { ...user_schema[index], [key]: key === 'required' ? Boolean(value) : value };
    setBranchForm({ ...branchForm, user_schema });
  };

  return (
    <div className="dashboard admin-dashboard">
      <div className="dashboard-header">
        <div>
          <h1>{user.role === 'main_admin' ? 'Application Admin' : user.role === 'industry_admin' ? 'Industry Admin' : 'Queue Operator'}</h1>
          <p className="user-email">{user.industry_name || 'All industries'}</p>
        </div>
        <div className="stats-summary">
          <span className="stat">Queue: {queue.length}</span>
          <span className="stat">Branches: {branches.length}</span>
          <span className="stat">Staff: {staff.length}</span>
        </div>
      </div>

      {message && <div className="success-message">{message}</div>}

      <div className="dashboard-tabs">
        {user.role === 'main_admin' && <button className={activeTab === 'requests' ? 'active' : ''} onClick={() => setActiveTab('requests')}>Access Requests</button>}
        {user.role === 'industry_admin' && <button className={activeTab === 'branches' ? 'active' : ''} onClick={() => setActiveTab('branches')}>Branches</button>}
        {user.role === 'industry_admin' && <button className={activeTab === 'staff' ? 'active' : ''} onClick={() => setActiveTab('staff')}>Staff</button>}
        <button className={activeTab === 'queue' ? 'active' : ''} onClick={() => setActiveTab('queue')}>Queue Control</button>
      </div>

      {activeTab === 'requests' && (
        <div className="grid-list">
          {requests.map((item) => (
            <div className="record-card" key={item.id}>
              <div className="record-title">{item.industry_name}</div>
              <p>{item.industry_type}{item.other_type_name ? ` / ${item.other_type_name}` : ''}</p>
              <p>{item.admin_name} - {item.admin_email}</p>
              <p>{item.details}</p>
              <span className={`badge ${item.status === 'pending' ? 'badge-warning' : item.status === 'approved' ? 'badge-success' : 'badge-danger'}`}>{item.status}</span>
              {item.status === 'pending' && (
                <div className="button-row">
                  <button onClick={() => decide(item.id, 'approve')}>Approve</button>
                  <button className="danger-btn" onClick={() => decide(item.id, 'reject')}>Reject</button>
                </div>
              )}
              {item.generated_password && <code>Default password: {item.generated_password}</code>}
            </div>
          ))}
        </div>
      )}

      {activeTab === 'branches' && (
        <div className="split-layout">
          <form className="control-panel" onSubmit={createBranch}>
            <h3>Create Branch</h3>
            <input placeholder="Branch name" value={branchForm.name} onChange={(event) => setBranchForm({ ...branchForm, name: event.target.value })} required />
            <textarea placeholder="Details" value={branchForm.details} onChange={(event) => setBranchForm({ ...branchForm, details: event.target.value })} />
            <div className="checkbox-section">
              <h4>Branch type</h4>
              <div className="checkbox-grid">
                {branchTypes.map((type) => (
                  <label key={type.value}>
                    <input
                      type="checkbox"
                      checked={branchForm.branch_type === type.value}
                      onChange={() => setBranchForm({ ...branchForm, branch_type: type.value })}
                    />
                    {type.label}
                  </label>
                ))}
              </div>
            </div>
            {branchForm.branch_type === 'other' && (
              <input placeholder="Other type name" value={branchForm.other_type_name} onChange={(event) => setBranchForm({ ...branchForm, other_type_name: event.target.value })} required />
            )}

            <div className="checkbox-section">
              <h4>Service provider dashboard</h4>
              <div className="checkbox-grid">
                {[
                  ['display_user_details', 'Display user details'],
                  ['display_previous_details', 'Display previous user details'],
                  ['display_next_details', 'Display next details'],
                  ['display_current_details', 'Display current user details'],
                  ['display_suggestion_boxes', 'Display suggestion text boxes'],
                  ['display_search_items', 'Display searchable checkbox items'],
                  ['display_cash_price', 'Display cash price totals'],
                  ['display_transactions', 'Display transactions'],
                  ['ai_suggestion', 'Display AI suggestion button']
                ].map(([key, label]) => (
                  <label key={key}>
                    <input type="checkbox" checked={branchForm.dashboard_config.service_provider[key]} onChange={() => toggleServiceProviderOption(key)} />
                    {label}
                  </label>
                ))}
              </div>
            </div>

            <div className="mini-builder">
              <h4>Suggestion boxes</h4>
              {branchForm.dashboard_config.service_provider.suggestion_boxes.map((title, index) => (
                <div className="inline-row" key={`suggestion-${index}`}>
                  <input value={title} onChange={(event) => updateSuggestionBox(index, event.target.value)} placeholder="Suggestion title" />
                  <button type="button" className="danger-btn" onClick={() => {
                    const suggestion_boxes = branchForm.dashboard_config.service_provider.suggestion_boxes.filter((_, itemIndex) => itemIndex !== index);
                    setBranchForm({ ...branchForm, dashboard_config: { ...branchForm.dashboard_config, service_provider: { ...branchForm.dashboard_config.service_provider, suggestion_boxes } } });
                  }}>Remove</button>
                </div>
              ))}
              <button type="button" onClick={() => {
                const suggestion_boxes = [...branchForm.dashboard_config.service_provider.suggestion_boxes, `Suggestion ${branchForm.dashboard_config.service_provider.suggestion_boxes.length + 1}`];
                setBranchForm({ ...branchForm, dashboard_config: { ...branchForm.dashboard_config, service_provider: { ...branchForm.dashboard_config.service_provider, suggestion_boxes } } });
              }}>Add Suggestion Box</button>
            </div>

            <div className="mini-builder">
              <h4>Checkbox items and price</h4>
              {branchForm.dashboard_config.service_provider.search_items.map((item, index) => (
                <div className="inline-row" key={`item-${index}`}>
                  <input value={item.name} onChange={(event) => updateSearchItem(index, 'name', event.target.value)} placeholder="Item name" />
                  <input type="number" value={item.price} onChange={(event) => updateSearchItem(index, 'price', event.target.value)} placeholder="Price" />
                  <button type="button" className="danger-btn" onClick={() => {
                    const search_items = branchForm.dashboard_config.service_provider.search_items.filter((_, itemIndex) => itemIndex !== index);
                    setBranchForm({ ...branchForm, dashboard_config: { ...branchForm.dashboard_config, service_provider: { ...branchForm.dashboard_config.service_provider, search_items } } });
                  }}>Remove</button>
                </div>
              ))}
              <button type="button" onClick={() => {
                const search_items = [...branchForm.dashboard_config.service_provider.search_items, { name: '', price: 0 }];
                setBranchForm({ ...branchForm, dashboard_config: { ...branchForm.dashboard_config, service_provider: { ...branchForm.dashboard_config.service_provider, search_items } } });
              }}>Add Checkbox Item</button>
            </div>

            <div className="checkbox-section">
              <h4>Aggregations</h4>
              <div className="checkbox-grid">
                {aggregationOptions.map((name) => (
                  <label key={name}>
                    <input type="checkbox" checked={branchForm.dashboard_config.service_provider.aggregations.includes(name)} onChange={() => toggleAggregation(name)} />
                    {name}
                  </label>
                ))}
              </div>
            </div>

            <div className="checkbox-section">
              <h4>Queue operator dashboard</h4>
              <div className="checkbox-grid">
                {[
                  ['can_edit_user_details', 'Can edit user details'],
                  ['can_allocate_provider', 'Can allocate service provider'],
                  ['display_user_details', 'Display user details'],
                  ['display_previous_details', 'Display previous users'],
                  ['display_suggestions', 'Display suggestions']
                ].map(([key, label]) => (
                  <label key={key}>
                    <input type="checkbox" checked={branchForm.dashboard_config.queue_operator[key]} onChange={() => toggleOperatorOption(key)} />
                    {label}
                  </label>
                ))}
              </div>
            </div>

            <div className="checkbox-section">
              <h4>User site options</h4>
              <div className="checkbox-grid">
                {[
                  ['display_previous_suggestions', 'Display previous suggestions'],
                  ['display_current_suggestions', 'Display current suggestions'],
                  ['display_current_queue_count', 'Display current queue count'],
                  ['allow_generate_token', 'Allow generate queue token'],
                  ['allow_reject_token', 'Allow reject queue token'],
                  ['display_cash_price', 'Display cash price'],
                  ['display_transactions', 'Display transactions'],
                  ['display_operator_contact', 'Display operator contact'],
                  ['display_provider_contact', 'Display provider contact']
                ].map(([key, label]) => (
                  <label key={key}>
                    <input type="checkbox" checked={branchForm.dashboard_config.user[key]} onChange={() => toggleUserOption(key)} />
                    {label}
                  </label>
                ))}
              </div>
            </div>

            <div className="mini-builder">
              <h4>User form fields</h4>
              {branchForm.user_schema.map((field, index) => (
                <div className="inline-row field-row" key={`field-${index}`}>
                  <input value={field.key} onChange={(event) => updateUserField(index, 'key', event.target.value)} placeholder="Field name" />
                  <select value={field.type} onChange={(event) => updateUserField(index, 'type', event.target.value)}>
                    {fieldTypes.map((type) => <option key={type} value={type}>{type}</option>)}
                  </select>
                  <label className="inline-check">
                    <input type="checkbox" checked={field.required} onChange={(event) => updateUserField(index, 'required', event.target.checked)} />
                    Required
                  </label>
                  <button type="button" className="danger-btn" onClick={() => setBranchForm({ ...branchForm, user_schema: branchForm.user_schema.filter((_, itemIndex) => itemIndex !== index) })}>Remove</button>
                </div>
              ))}
              <button type="button" onClick={() => setBranchForm({ ...branchForm, user_schema: [...branchForm.user_schema, { key: '', type: 'text', required: true }] })}>Add User Field</button>
            </div>

            <button type="submit">Create Branch</button>
          </form>
          <div className="grid-list">
            {branches.map((branch) => (
              <div className="record-card" key={branch.id}>
                <div className="record-title">{branch.name}</div>
                <p>{branch.branch_type}</p>
                <p>{branch.details}</p>
                <small>{branch.user_schema.map((field) => `${field.key}:${field.type}`).join(', ')}</small>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'staff' && (
        <div className="split-layout">
          <form className="control-panel" onSubmit={createStaff}>
            <h3>Create Queue Manager or Provider</h3>
            <input placeholder="Name" value={staffForm.name} onChange={(event) => setStaffForm({ ...staffForm, name: event.target.value })} required />
            <input placeholder="Email" type="email" value={staffForm.email} onChange={(event) => setStaffForm({ ...staffForm, email: event.target.value })} required />
            <input placeholder="Phone" value={staffForm.phone} onChange={(event) => setStaffForm({ ...staffForm, phone: event.target.value })} />
            <select value={staffForm.role} onChange={(event) => setStaffForm({ ...staffForm, role: event.target.value })}>
              <option value="queue_operator">Queue Operator</option>
              <option value="service_provider">Service Provider</option>
            </select>
            <select value={staffForm.branch_id} onChange={(event) => setStaffForm({ ...staffForm, branch_id: event.target.value })} required>
              <option value="">Select branch</option>
              {branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}
            </select>
            <button type="submit">Create Staff</button>
          </form>
          <div className="grid-list">
            {staff.map((item) => (
              <div className="record-card" key={item.id}>
                <div className="record-title">{item.name}</div>
                <p>{item.role}</p>
                <p>{item.email}</p>
                <p>{item.branch_name}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'queue' && (
        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>Token</th>
                <th>User</th>
                <th>Branch</th>
                <th>Status</th>
                <th>AI Suggestion</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {queue.map((token) => (
                <tr key={token.token_id}>
                  <td><strong>{token.token_code}</strong></td>
                  <td>{token.user_name}<br /><small>{token.user_email}</small></td>
                  <td>{token.branch_name}</td>
                  <td><span className="badge badge-info">{token.status}</span></td>
                  <td>{token.ai_suggestion}</td>
                  <td>
                    <div className="button-row">
                      <button onClick={() => tokenAction(token.token_id, 'verify')}>Verify</button>
                      <button onClick={() => tokenAction(token.token_id, 'customer_in')}>Customer In</button>
                      <select onChange={(event) => event.target.value && tokenAction(token.token_id, 'allocate', event.target.value)} defaultValue="">
                        <option value="">Allocate</option>
                        {providers.map((provider) => <option key={provider.id} value={provider.id}>{provider.name}</option>)}
                      </select>
                      <button className="danger-btn" onClick={() => tokenAction(token.token_id, 'reject')}>Reject</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default AdminDashboard;
