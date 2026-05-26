import React, { useCallback, useEffect, useState } from 'react';
import { getLogoPreset, presetStyle } from '../visualPresets';
import { apiPath } from '../config';
import { ExportMenu } from '../exportUtils';
import { roleLabelsFor } from '../roleLabels';
import BottomNavigation from './BottomNavigation';

const branchTypes = [
  { value: 'hospital', label: 'Hospital' },
  { value: 'school', label: 'School / College' },
  { value: 'hotel', label: 'Hotel' },
  { value: 'bank', label: 'Bank' },
  { value: 'office', label: 'Office / Company' },
  { value: 'government', label: 'Government Office' },
  { value: 'other', label: 'Other' }
];

const fieldTypes = ['text', 'int', 'float', 'image', 'date', 'select'];
const aggregationOptions = [
  { value: 'total', label: 'Total amount', description: 'Adds all selected item prices.' },
  { value: 'average', label: 'Average amount', description: 'Shows the average price of selected items.' },
  { value: 'count', label: 'Selected item count', description: 'Counts how many checkbox items were selected.' },
  { value: 'min', label: 'Lowest amount', description: 'Shows the smallest selected item price.' },
  { value: 'max', label: 'Highest amount', description: 'Shows the largest selected item price.' }
];

const emptyBranch = {
  name: '',
  details: '',
  branch_type: 'hospital',
  other_type_name: '',
  address: '',
  area: '',
  city: '',
  state: '',
  pincode: '',
  latitude: '',
  longitude: '',
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
      display_provider_contact: true,
      allow_emergency_queue: true
    },
    industry_settings: {
      token_name_mode: 'default',
      customer_name_slots: 3
    }
  },
  user_schema: [
    { key: 'name', type: 'text', required: true },
    { key: 'phone', type: 'text', required: true },
    { key: 'need', type: 'text', required: true }
  ]
};

function AdminDashboard({ user, onHome }) {
  const initialTab = user.role === 'main_admin' ? 'requests' : user.role === 'industry_admin' ? 'branches' : 'queue';
  const [activeTab, setActiveTab] = useState(initialTab);
  const [requests, setRequests] = useState([]);
  const [resetRequests, setResetRequests] = useState([]);
  const [userDirectory, setUserDirectory] = useState({ users: [], grouped: {}, industries: [], branches: [], summary: null });
  const [activeUserType, setActiveUserType] = useState('all');
  const [managementView, setManagementView] = useState('users');
  const [adminEdit, setAdminEdit] = useState(null);
  const [userSearch, setUserSearch] = useState('');
  const [branches, setBranches] = useState([]);
  const [staff, setStaff] = useState([]);
  const [queue, setQueue] = useState([]);
  const [queueHistory, setQueueHistory] = useState([]);
  const [providers, setProviders] = useState([]);
  const [eventLogs, setEventLogs] = useState([]);
  const [secretDevices, setSecretDevices] = useState([]);
  const [secretUserLogs, setSecretUserLogs] = useState([]);
  const [securityInfo, setSecurityInfo] = useState(null);
  const [secretPassword, setSecretPassword] = useState('');
  const [showSecretLock, setShowSecretLock] = useState(false);
  const [historyFilters, setHistoryFilters] = useState({ q: '', date_from: '', date_to: '' });
  const [branchForm, setBranchForm] = useState(emptyBranch);
  const [roleLabelConfig, setRoleLabelConfig] = useState({});
  const [staffForm, setStaffForm] = useState({
    name: '',
    email: '',
    phone: '',
    role: 'queue_operator',
    branch_id: '',
    address: '',
    area: '',
    city: '',
    state: '',
    pincode: '',
    designation: '',
    emergency_contact: '',
    personal_details: ''
  });
  const [message, setMessage] = useState('');
  const roleLabels = roleLabelsFor(user.industry_type, roleLabelConfig);
  const formatAddressParts = (item = {}) => {
    const parts = [item.area, item.city, item.state, item.pincode].filter(Boolean);
    return parts.length ? parts.join(', ') : item.address;
  };
  const fillLocationFromPincode = async (form, setForm, label = 'Location') => {
    const pincode = String(form.pincode || '').trim();
    if (pincode.length !== 6) return;
    const params = new URLSearchParams({ pincode });
    const data = await api(`/api/maps/geocode?${params.toString()}`);
    if (data.success) {
      setForm((current) => ({
        ...current,
        address: data.location.address || current.address,
        area: data.location.area || current.area,
        city: data.location.city || current.city,
        state: data.location.state || current.state,
        pincode: data.location.pincode || current.pincode,
        ...(Object.prototype.hasOwnProperty.call(current, 'latitude') ? { latitude: data.location.latitude || current.latitude } : {}),
        ...(Object.prototype.hasOwnProperty.call(current, 'longitude') ? { longitude: data.location.longitude || current.longitude } : {})
      }));
      setMessage(`${label} filled from pincode.`);
    } else {
      setMessage(data.error || 'Pincode lookup failed.');
    }
  };
  const userTypeTabs = [
    { id: 'all', label: 'All Users' },
    { id: 'main_admin', label: 'Main Admins' },
    { id: 'industry_admin', label: `${roleLabels.industry_admin}s` },
    { id: 'queue_operator', label: roleLabels.queue_operator },
    { id: 'service_provider', label: `${roleLabels.service_provider}s` },
    { id: 'user', label: 'Users' }
  ];

  const api = useCallback(async (path, options = {}) => {
    const response = await fetch(apiPath(path), {
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
      const logData = await api('/api/admin/event-logs');
      if (logData.success) setEventLogs(logData.logs || []);
    }
    if (['main_admin', 'industry_admin'].includes(user.role)) {
      const directoryData = await api('/api/admin/users/directory');
      if (directoryData.success) {
        setUserDirectory({
          users: directoryData.users || [],
          grouped: directoryData.grouped || {},
          industries: directoryData.industries || [],
          branches: directoryData.branches || [],
          summary: directoryData.summary || null
        });
      }
    }
    if (['main_admin', 'industry_admin'].includes(user.role)) {
      const resetData = await api('/api/admin/password-reset-requests');
      if (resetData.success) setResetRequests(resetData.requests);
    }
    if (user.role === 'industry_admin') {
      const branchData = await api('/api/industry/branches');
      const staffData = await api('/api/industry/staff');
      if (branchData.success) {
        setBranches(branchData.branches);
        setRoleLabelConfig(branchData.branches?.[0]?.dashboard_config?.industry_settings?.role_labels || {});
      }
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

  const decideReset = async (id, decision) => {
    const data = await api(`/api/admin/password-reset-requests/${id}/decision`, {
      method: 'POST',
      body: JSON.stringify({
        decision,
        message: decision === 'approve' ? 'Default password generated and emailed.' : 'Password reset request rejected.'
      })
    });
    if (data.success) {
      setMessage(decision === 'approve' ? `Default password created: ${data.request.generated_password}` : 'Reset request rejected.');
      refresh();
    } else {
      setMessage(data.error || 'Reset request failed.');
    }
  };

  const startAdminEdit = (type, item) => {
    setMessage('');
    setAdminEdit({ type, values: { ...item } });
  };

  const updateAdminEdit = (key, value) => {
    setAdminEdit((current) => ({
      ...current,
      values: { ...current.values, [key]: value }
    }));
  };

  const saveAdminEdit = async (event) => {
    event.preventDefault();
    if (!adminEdit) return;
    const endpoint = adminEdit.type === 'user'
      ? `/api/admin/users/${adminEdit.values.id}`
      : adminEdit.type === 'industry'
        ? `/api/admin/industries/${adminEdit.values.id}`
        : `/api/admin/branches/${adminEdit.values.id}`;
    const data = await api(endpoint, {
      method: 'PUT',
      body: JSON.stringify(adminEdit.values)
    });
    if (data.success) {
      setMessage(`${adminEdit.type} updated.`);
      setAdminEdit(null);
      refresh();
    } else {
      setMessage(data.error || 'Update failed.');
    }
  };

  const deleteAdminItem = async (type, item) => {
    const label = item.name || item.email || item.branch_name || type;
    if (!window.confirm(`Delete ${label}? This cannot be undone.`)) return;
    const endpoint = type === 'user'
      ? `/api/admin/users/${item.id}`
      : type === 'industry'
        ? `/api/admin/industries/${item.id}`
        : `/api/admin/branches/${item.id}`;
    const data = await api(endpoint, { method: 'DELETE' });
    if (data.success) {
      setMessage(`${type} deleted.`);
      if (adminEdit?.type === type && adminEdit.values.id === item.id) setAdminEdit(null);
      refresh();
    } else {
      setMessage(data.error || 'Delete failed.');
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
      setActiveTab('branches');
      refresh();
    }
  };

  const createStaff = async (event) => {
    event.preventDefault();
    const data = await api('/api/industry/staff', { method: 'POST', body: JSON.stringify(staffForm) });
    if (data.success) {
      setMessage(`Staff created. Password: ${data.staff.generated_password}`);
      setStaffForm({
        name: '',
        email: '',
        phone: '',
        role: 'queue_operator',
        branch_id: '',
        address: '',
        area: '',
        city: '',
        state: '',
        pincode: '',
        designation: '',
        emergency_contact: '',
        personal_details: ''
      });
      setActiveTab('staff');
      refresh();
    }
  };

  const lookupBranchAddress = async () => {
    const params = new URLSearchParams();
    if (branchForm.address) params.set('address', branchForm.address);
    if (branchForm.area) params.set('area', branchForm.area);
    if (branchForm.city) params.set('city', branchForm.city);
    if (branchForm.state) params.set('state', branchForm.state);
    if (branchForm.pincode) params.set('pincode', branchForm.pincode);
    const data = await api(`/api/maps/geocode?${params.toString()}`);
    if (data.success) {
      setBranchForm({
        ...branchForm,
        address: data.location.address || branchForm.address,
        area: data.location.area || branchForm.area,
        city: data.location.city || branchForm.city,
        state: data.location.state || branchForm.state,
        pincode: data.location.pincode || branchForm.pincode,
        latitude: data.location.latitude || '',
        longitude: data.location.longitude || ''
      });
      setMessage('Branch location filled.');
    } else {
      setMessage(data.error || 'Location lookup failed.');
    }
  };

  const updateBranchPincode = (value) => {
    const next = { ...branchForm, pincode: value };
    setBranchForm(next);
    if (value.trim().length === 6) fillLocationFromPincode(next, setBranchForm, 'Branch location');
  };

  const updateStaffPincode = (value) => {
    const next = { ...staffForm, pincode: value };
    setStaffForm(next);
    if (value.trim().length === 6) fillLocationFromPincode(next, setStaffForm, 'Staff location');
  };

  const tokenAction = async (tokenId, action, providerId) => {
    const data = await api(`/api/operator/tokens/${tokenId}/action`, {
      method: 'POST',
      body: JSON.stringify({ action, provider_id: providerId })
    });
    if (data.success) refresh();
    else setMessage(data.error || 'Action failed');
  };

  const pauseBranchQueue = async (branchId, pause) => {
    const reason = pause ? window.prompt('Enter the reason for pausing this queue') : '';
    if (pause && !reason?.trim()) return;
    const data = await api(`/api/branch/${branchId}/queue-pause`, {
      method: 'POST',
      body: JSON.stringify({ action: pause ? 'pause' : 'resume', reason })
    });
    if (data.success) {
      setMessage(pause ? 'Queue paused and users notified.' : 'Queue resumed and users notified.');
      refresh();
    } else {
      setMessage(data.error || 'Queue pause update failed.');
    }
  };

  const loadQueueHistory = useCallback(async () => {
    const params = new URLSearchParams();
    if (historyFilters.q.trim()) params.set('q', historyFilters.q.trim());
    if (historyFilters.date_from) params.set('date_from', historyFilters.date_from);
    if (historyFilters.date_to) params.set('date_to', historyFilters.date_to);
    const suffix = params.toString() ? `?${params.toString()}` : '';
    const data = await api(`/api/operator/queue-history${suffix}`);
    if (data.success) setQueueHistory(data.tokens || []);
    else setMessage(data.error || 'Queue history failed.');
  }, [api, historyFilters]);

  const loadSecretDevices = useCallback(async () => {
    if (user.role !== 'main_admin') return;
    const data = await api('/api/admin/secret/devices');
    if (data.success) {
      setSecretDevices(data.devices || []);
      setSecretUserLogs(data.user_logs || []);
      setSecurityInfo(data.security || null);
    } else {
      setMessage(data.error || 'Secret device table failed.');
    }
  }, [api, user.role]);

  const unlockSecret = async (event) => {
    event.preventDefault();
    const data = await api('/api/admin/secret/unlock', {
      method: 'POST',
      body: JSON.stringify({ password: secretPassword })
    });
    if (data.success) {
      setSecretDevices(data.devices || []);
      setSecretUserLogs(data.user_logs || []);
      setSecurityInfo(data.security || null);
      setSecretPassword('');
      setShowSecretLock(false);
      setActiveTab('secret');
      setMessage('Secret section unlocked.');
    } else {
      setMessage(data.error || 'Secret unlock failed.');
    }
  };

  const openSecretLock = () => {
    setSecretPassword('');
    setShowSecretLock(true);
  };

  useEffect(() => {
    if (activeTab === 'queue-history') {
      loadQueueHistory();
    }
    if (activeTab === 'secret' && !showSecretLock) {
      loadSecretDevices();
    }
  }, [activeTab, loadQueueHistory, loadSecretDevices, showSecretLock]);

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

  const renderOptionList = (items, isSelected, onToggle) => (
    <div className="option-listbox">
      {items.map((item) => (
        <button
          type="button"
          key={item.value || item[0] || item}
          className={isSelected(item) ? 'option-row selected' : 'option-row'}
          onClick={() => onToggle(item)}
        >
          <span className="option-check">{isSelected(item) ? 'x' : ''}</span>
          <span className="option-copy">
            <strong>{item.label || item[1] || item}</strong>
            {item.description && <small>{item.description}</small>}
          </span>
        </button>
      ))}
    </div>
  );

  const logoPreset = getLogoPreset(user.industry_logo_preset);
  const closeCreatePage = () => {
    setActiveTab(activeTab === 'create-staff' ? 'staff' : 'branches');
  };
  const dashboardTabs = [
    ...(user.role === 'main_admin' ? [{ id: 'requests', label: 'Access Requests' }] : []),
    ...(user.role === 'main_admin' ? [{ id: 'event-logs', label: 'Event Logs' }] : []),
    ...(['main_admin', 'industry_admin'].includes(user.role) ? [{ id: 'user-management', label: 'User Management' }] : []),
    ...(['main_admin', 'industry_admin'].includes(user.role) ? [{ id: 'reset-requests', label: 'Reset Requests' }] : []),
    ...(user.role === 'industry_admin' ? [
      { id: 'branches', label: 'Branches' },
      { id: 'staff', label: 'Staff' }
    ] : []),
    { id: 'queue', label: 'Current Queue' },
    { id: 'queue-history', label: 'Queue History' }
  ];
  const selectedTabValue = dashboardTabs.some((tab) => tab.id === activeTab)
    ? activeTab
    : dashboardTabs[0]?.id || 'queue';

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

  const visibleUsers = activeUserType === 'all'
    ? userDirectory.users
    : (userDirectory.grouped[activeUserType] || []);
  const normalizedUserSearch = userSearch.trim().toLowerCase();
  const searchedUsers = normalizedUserSearch
    ? visibleUsers.filter((item) => [
        item.user_code,
        item.name,
        item.email,
        item.phone,
        item.company?.name,
        item.branch?.name,
        item.work?.designation,
        item.details?.phone,
        item.details?.emergency_contact,
        item.details?.address,
        item.details?.area,
        item.details?.city,
        item.details?.state,
        item.details?.pincode,
        item.details?.personal_details
      ].some((value) => String(value || '').toLowerCase().includes(normalizedUserSearch)))
    : visibleUsers;

  const requestColumns = [
    { label: 'Industry', value: 'industry_name' },
    { label: 'Type', value: (item) => `${item.industry_type}${item.other_type_name ? ` / ${item.other_type_name}` : ''}` },
    { label: 'Admin', value: 'admin_name' },
    { label: 'Email', value: 'admin_email' },
    { label: 'Status', value: 'status' },
  ];
  const resetColumns = [
    { label: 'Requester', value: 'requester_name' },
    { label: 'Email', value: 'requester_email' },
    { label: 'Role', value: 'requester_role' },
    { label: 'Status', value: 'status' },
    { label: 'Created', value: (item) => new Date(item.created_at).toLocaleString() },
  ];
  const branchColumns = [
    { label: 'Name', value: 'name' },
    { label: 'Type', value: (item) => `${item.branch_type}${item.other_type_name ? ` / ${item.other_type_name}` : ''}` },
    { label: 'Details', value: (item) => item.details || '-' },
    { label: 'Address', value: (item) => formatAddressParts(item) || '-' },
    { label: 'Fields', value: (item) => (item.user_schema || []).map((field) => `${field.key}:${field.type}`).join(', ') },
  ];
  const staffColumns = [
    { label: 'Name', value: 'name' },
    { label: 'Email', value: 'email' },
    { label: 'Role', value: (item) => roleLabels[item.role] || item.role },
    { label: 'Branch', value: (item) => item.branch_name || '-' },
    { label: 'Phone', value: (item) => item.phone || '-' },
    { label: 'Designation', value: (item) => item.designation || '-' },
    { label: 'Address', value: (item) => formatAddressParts(item) || '-' },
  ];
  const userColumns = [
    { label: 'User ID', value: 'user_code' },
    { label: 'Name', value: 'name' },
    { label: 'Email', value: 'email' },
    { label: 'Role', value: (item) => roleLabels[item.role] || item.role },
    { label: 'Company', value: (item) => item.company?.name || '-' },
    { label: 'Branch', value: (item) => item.branch?.name || '-' },
    { label: 'Phone', value: (item) => item.details?.phone || item.phone || '-' },
    { label: 'Tokens', value: (item) => item.work?.token_count || 0 },
  ];
  const queueColumns = [
    { label: 'Token', value: 'token_code' },
    { label: 'User ID', value: 'user_code' },
    { label: 'User', value: (item) => item.display_name || item.user_name },
    { label: 'Branch', value: 'branch_name' },
    { label: 'Status', value: 'status' },
    { label: 'Emergency', value: (item) => item.emergency_accepted ? 'Accepted' : item.emergency_requested ? 'Requested' : 'No' },
    { label: roleLabels.service_provider, value: (item) => item.provider_name || '-' },
  ];
  const historyColumns = [
    ...queueColumns,
    { label: 'Created', value: (item) => new Date(item.created_at).toLocaleString() },
    { label: 'Details', value: (item) => Object.entries(item.details || {}).map(([key, value]) => `${key}: ${value}`).join(', ') },
    { label: 'Suggestion', value: (item) => item.ai_suggestion || '-' },
  ];
  const eventLogColumns = [
    { label: 'Time', value: (item) => new Date(item.created_at).toLocaleString() },
    { label: 'Event', value: 'event_type' },
    { label: 'User', value: 'user_name' },
    { label: 'Role', value: 'user_role' },
    { label: 'Industry', value: (item) => item.industry_name || '-' },
    { label: 'Branch', value: (item) => item.branch_name || '-' },
    { label: 'Token', value: (item) => item.token_code || '-' },
    { label: 'Message', value: 'message' },
  ];

  return (
    <div className="dashboard admin-dashboard">
      <div className="dashboard-header">
        <div>
          <div className="title-with-home">
            <h1>{user.role === 'main_admin' ? 'Application Admin' : roleLabels[user.role] || 'Token Desk Staff'}</h1>
            {user.role === 'industry_admin' && (
              <button className="title-home-logo" onClick={onHome} aria-label="Home">
                {user.industry_logo_url ? (
                  <img src={user.industry_logo_url} alt="" />
                ) : (
                  <span style={presetStyle(logoPreset)}>{logoPreset.initials}</span>
                )}
              </button>
            )}
          </div>
          <p className="user-email">{user.industry_name || 'All industries'}</p>
        </div>
        <div className="stats-summary">
          {user.role === 'main_admin' && (
            <button type="button" className="secret-logo-btn" onClick={openSecretLock} aria-label="Open secret section">
              Secret
            </button>
          )}
          <span className="stat">Queue: {queue.length}</span>
          <span className="stat">Branches: {branches.length}</span>
          <span className="stat">Staff: {staff.length}</span>
        </div>
      </div>

      {message && <div className="success-message">{message}</div>}

      {showSecretLock && (
        <div className="consent-overlay">
          <form className="consent-dialog" onSubmit={unlockSecret}>
            <h3>Secret Password</h3>
            <p>Enter the main admin secret password to open the device security table.</p>
            <div className="form-group">
              <label>Secret password</label>
              <input
                type="password"
                value={secretPassword}
                onChange={(event) => setSecretPassword(event.target.value)}
                autoFocus
                required
              />
            </div>
            <div className="button-row">
              <button type="submit">Open Secret</button>
              <button type="button" className="secondary-btn" onClick={() => setShowSecretLock(false)}>Cancel</button>
            </div>
          </form>
        </div>
      )}

      <BottomNavigation items={dashboardTabs} activeId={selectedTabValue} onSelect={setActiveTab} />

      {user.role === 'industry_admin' && activeTab === 'branches' && (
        <button className="floating-action" onClick={() => setActiveTab('create-branch')} aria-label="Create branch">+</button>
      )}
      {user.role === 'industry_admin' && activeTab === 'staff' && (
        <button className="floating-action" onClick={() => setActiveTab('create-staff')} aria-label="Create staff">+</button>
      )}

      {activeTab === 'requests' && (
        <div className="data-container">
          <div className="data-container-header">
            <div>
              <h3>Access Requests</h3>
              <p>Industry access approval and rejection records.</p>
            </div>
            <ExportMenu title="Access Requests" filename="access-requests" columns={requestColumns} rows={requests} />
          </div>
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
        </div>
      )}

      {activeTab === 'event-logs' && user.role === 'main_admin' && (
        <div className="section-stack">
          <div className="data-container-header">
            <div>
              <h3>User Event Logs</h3>
              <p>Login, logout, token, cancellation, emergency, and service events from past to current.</p>
            </div>
            <ExportMenu title="User Event Logs" filename="user-event-logs" columns={eventLogColumns} rows={eventLogs} />
          </div>
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Event</th>
                  <th>User</th>
                  <th>Role</th>
                  <th>Industry</th>
                  <th>Branch</th>
                  <th>Token</th>
                  <th>Message</th>
                </tr>
              </thead>
              <tbody>
                {eventLogs.map((item) => (
                  <tr key={item.id}>
                    <td>{new Date(item.created_at).toLocaleString()}</td>
                    <td><span className="badge badge-info">{item.event_type}</span></td>
                    <td>{item.user_name}</td>
                    <td>{item.user_role}</td>
                    <td>{item.industry_name || '-'}</td>
                    <td>{item.branch_name || '-'}</td>
                    <td>{item.token_code || '-'}</td>
                    <td>{item.message}</td>
                  </tr>
                ))}
                {!eventLogs.length && (
                  <tr>
                    <td colSpan="8" className="empty-table-cell">No user events recorded yet.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'secret' && user.role === 'main_admin' && (
        <div className="section-stack secret-section">
          <div className="section-heading">
            <div>
              <h3>Secret Security</h3>
              <p>Main-admin-only device permission log and data protection status.</p>
            </div>
            <button type="button" className="secondary-btn" onClick={loadSecretDevices}>Refresh</button>
          </div>
          <div className="security-summary-grid">
            <section>
              <span>Terms</span>
              <p>{securityInfo?.terms || 'Terms loading...'}</p>
            </section>
            <section>
              <span>Encryption</span>
              <p>{securityInfo?.encryption || 'Device audit data is protected before display.'}</p>
            </section>
            <section>
              <span>Security headers</span>
              <p>{(securityInfo?.headers || []).join(', ') || 'Headers loading...'}</p>
            </section>
          </div>
          <div className="table-responsive">
            <div className="section-heading compact-heading">
              <div>
                <h3>User Usage Log</h3>
                <p>All past and current users are listed. Users without permission remain hidden as unknown users.</p>
              </div>
            </div>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Permission</th>
                  <th>Place</th>
                  <th>Device</th>
                  <th>Last Used</th>
                </tr>
              </thead>
              <tbody>
                {secretUserLogs.map((item) => (
                  <tr key={item.id}>
                    <td>{item.display_name}</td>
                    <td>{item.email}</td>
                    <td>{item.role}</td>
                    <td><span className={item.permission === 'Allowed' ? 'badge badge-success' : item.permission === 'Not answered' ? 'badge badge-info' : 'badge badge-warning'}>{item.permission}</span></td>
                    <td>{item.place}</td>
                    <td>{item.device_name}</td>
                    <td>{item.last_used_at ? new Date(item.last_used_at).toLocaleString() : '-'}</td>
                  </tr>
                ))}
                {!secretUserLogs.length && (
                  <tr>
                    <td colSpan="7" className="empty-table-cell">No user usage records yet.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="table-responsive">
            <div className="section-heading compact-heading">
              <div>
                <h3>Device Event Log</h3>
                <p>Login and permission events stored for the security table.</p>
              </div>
            </div>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Event</th>
                  <th>Permission</th>
                  <th>Place</th>
                  <th>Device</th>
                  <th>IP</th>
                  <th>Browser</th>
                  <th>Time</th>
                </tr>
              </thead>
              <tbody>
                {secretDevices.map((item) => (
                  <tr key={item.id}>
                    <td>{item.display_name}</td>
                    <td>{item.event_type}</td>
                    <td><span className={item.permission === 'Allowed' ? 'badge badge-success' : 'badge badge-warning'}>{item.permission}</span></td>
                    <td>{item.place}</td>
                    <td>{item.device_name}</td>
                    <td>{item.ip_address}</td>
                    <td>{item.browser}</td>
                    <td>{new Date(item.created_at).toLocaleString()}</td>
                  </tr>
                ))}
                {!secretDevices.length && (
                  <tr>
                    <td colSpan="8" className="empty-table-cell">No device permission records yet.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'reset-requests' && (
        <div className="data-container">
          <div className="data-container-header">
            <div>
              <h3>Reset Requests</h3>
              <p>Default password approval history.</p>
            </div>
            <ExportMenu title="Reset Requests" filename="reset-requests" columns={resetColumns} rows={resetRequests} />
          </div>
          <div className="grid-list">
            {resetRequests.map((item) => (
              <div className="record-card" key={item.id}>
                <div className="record-title">{item.requester_name}</div>
                <p>{item.requester_role.replace('_', ' ')}</p>
                <p>{item.requester_email}</p>
                <span className={`badge ${item.status === 'pending' ? 'badge-warning' : item.status === 'approved' ? 'badge-success' : 'badge-danger'}`}>{item.status}</span>
                {item.status === 'pending' && (
                  <div className="button-row">
                    <button onClick={() => decideReset(item.id, 'approve')}>Create Default Password</button>
                    <button className="danger-btn" onClick={() => decideReset(item.id, 'reject')}>Reject</button>
                  </div>
                )}
                {item.generated_password && <code>Default password: {item.generated_password}</code>}
              </div>
            ))}
            {!resetRequests.length && <div className="empty-state">No password reset requests.</div>}
          </div>
        </div>
      )}

      {activeTab === 'user-management' && (
        <div className="section-stack user-management">
          <div className="section-heading">
            <div>
              <h3>User Management</h3>
              <p>View every account by type with company, branch, work, and personal details.</p>
            </div>
            <ExportMenu title="User Management" filename="user-management" columns={userColumns} rows={searchedUsers} />
          </div>

          <div className="user-summary-grid">
            <div className="summary-card">
              <span>Total Users</span>
              <strong>{userDirectory.summary?.total_users || 0}</strong>
            </div>
            <div className="summary-card">
              <span>Companies</span>
              <strong>{userDirectory.summary?.companies || 0}</strong>
            </div>
            <div className="summary-card">
              <span>Branches</span>
              <strong>{userDirectory.summary?.branches || 0}</strong>
            </div>
          </div>

          {user.role === 'main_admin' && (
            <div className="user-type-tabs">
              {[
                ['users', 'Users'],
                ['industries', 'Industries'],
                ['branches', 'Branches']
              ].map(([id, label]) => (
                <button
                  type="button"
                  key={id}
                  className={managementView === id ? 'active' : ''}
                  onClick={() => {
                    setManagementView(id);
                    setAdminEdit(null);
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
          )}

          {adminEdit && user.role === 'main_admin' && (
            <form className="control-panel admin-edit-panel" onSubmit={saveAdminEdit}>
              <div className="form-title-row">
                <h3>Edit {adminEdit.type}</h3>
                <button type="button" className="terminator-btn" onClick={() => setAdminEdit(null)} aria-label="Close edit">x</button>
              </div>
              {adminEdit.type === 'user' && (
                <>
                  <input value={adminEdit.values.name || ''} onChange={(event) => updateAdminEdit('name', event.target.value)} placeholder="Name" required />
                  <input value={adminEdit.values.email || ''} onChange={(event) => updateAdminEdit('email', event.target.value)} placeholder="Email" type="email" required />
                  <input value={adminEdit.values.phone || ''} onChange={(event) => updateAdminEdit('phone', event.target.value)} placeholder="Phone" />
                  <select value={adminEdit.values.role || 'user'} onChange={(event) => updateAdminEdit('role', event.target.value)}>
                    {['main_admin', 'industry_admin', 'queue_operator', 'service_provider', 'user'].map((role) => <option key={role} value={role}>{roleLabels[role] || role}</option>)}
                  </select>
                  <select value={adminEdit.values.industry_id || ''} onChange={(event) => updateAdminEdit('industry_id', event.target.value)}>
                    <option value="">No industry</option>
                    {(userDirectory.industries || []).map((industry) => <option key={industry.id} value={industry.id}>{industry.name}</option>)}
                  </select>
                  <select value={adminEdit.values.branch_id || ''} onChange={(event) => updateAdminEdit('branch_id', event.target.value)}>
                    <option value="">No branch</option>
                    {(userDirectory.branches || [])
                      .filter((branch) => !adminEdit.values.industry_id || String(branch.industry_id) === String(adminEdit.values.industry_id))
                      .map((branch) => <option key={branch.id} value={branch.id}>{branch.industry_name} - {branch.name}</option>)}
                  </select>
                  <input value={adminEdit.values.designation || ''} onChange={(event) => updateAdminEdit('designation', event.target.value)} placeholder="Designation" />
                  <input value={adminEdit.values.emergency_contact || ''} onChange={(event) => updateAdminEdit('emergency_contact', event.target.value)} placeholder="Emergency contact" />
                  <textarea value={adminEdit.values.personal_details || ''} onChange={(event) => updateAdminEdit('personal_details', event.target.value)} placeholder="Personal details" />
                </>
              )}
              {adminEdit.type === 'industry' && (
                <>
                  <input value={adminEdit.values.name || ''} onChange={(event) => updateAdminEdit('name', event.target.value)} placeholder="Industry name" required />
                  <select value={adminEdit.values.industry_type || 'hospital'} onChange={(event) => updateAdminEdit('industry_type', event.target.value)}>
                    {branchTypes.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}
                  </select>
                  <input value={adminEdit.values.other_type_name || ''} onChange={(event) => updateAdminEdit('other_type_name', event.target.value)} placeholder="Other type name" />
                  <textarea value={adminEdit.values.details || ''} onChange={(event) => updateAdminEdit('details', event.target.value)} placeholder="Details" />
                  <textarea value={adminEdit.values.terms || ''} onChange={(event) => updateAdminEdit('terms', event.target.value)} placeholder="Terms" />
                  <select value={adminEdit.values.admin_id || ''} onChange={(event) => updateAdminEdit('admin_id', event.target.value)}>
                    <option value="">No admin</option>
                    {(userDirectory.users || [])
                      .filter((item) => item.role === 'industry_admin')
                      .map((item) => <option key={item.id} value={item.id}>{item.name} - {item.email}</option>)}
                  </select>
                </>
              )}
              {adminEdit.type === 'branch' && (
                <>
                  <input value={adminEdit.values.name || ''} onChange={(event) => updateAdminEdit('name', event.target.value)} placeholder="Branch name" required />
                  <textarea value={adminEdit.values.details || ''} onChange={(event) => updateAdminEdit('details', event.target.value)} placeholder="Details" />
                  <select value={adminEdit.values.branch_type || 'hospital'} onChange={(event) => updateAdminEdit('branch_type', event.target.value)}>
                    {branchTypes.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}
                  </select>
                  <input value={adminEdit.values.other_type_name || ''} onChange={(event) => updateAdminEdit('other_type_name', event.target.value)} placeholder="Other type name" />
                  <div className="inline-row field-row">
                    <input value={adminEdit.values.area || ''} onChange={(event) => updateAdminEdit('area', event.target.value)} placeholder="Area" />
                    <input value={adminEdit.values.city || ''} onChange={(event) => updateAdminEdit('city', event.target.value)} placeholder="City" />
                    <input value={adminEdit.values.state || ''} onChange={(event) => updateAdminEdit('state', event.target.value)} placeholder="State" />
                    <input value={adminEdit.values.pincode || ''} onChange={(event) => updateAdminEdit('pincode', event.target.value)} placeholder="Pincode" />
                  </div>
                </>
              )}
              <div className="form-actions">
                <button type="button" className="secondary-btn" onClick={() => setAdminEdit(null)}>Cancel</button>
                <button type="submit">Save Changes</button>
              </div>
            </form>
          )}

          {managementView === 'users' && (
            <>
          <div className="user-type-tabs">
            {userTypeTabs.map((tab) => (
              <button
                type="button"
                key={tab.id}
                className={activeUserType === tab.id ? 'active' : ''}
                onClick={() => setActiveUserType(tab.id)}
              >
                {tab.label}
                <span>{tab.id === 'all' ? userDirectory.users.length : (userDirectory.grouped[tab.id] || []).length}</span>
              </button>
            ))}
          </div>

          <select
            className="dashboard-tab-select user-type-select"
            value={activeUserType}
            onChange={(event) => setActiveUserType(event.target.value)}
            aria-label="User type"
          >
            {userTypeTabs.map((tab) => (
              <option key={tab.id} value={tab.id}>
                {tab.label} ({tab.id === 'all' ? userDirectory.users.length : (userDirectory.grouped[tab.id] || []).length})
              </option>
            ))}
          </select>

          <div className="directory-search">
            <input
              type="search"
              value={userSearch}
              onChange={(event) => setUserSearch(event.target.value)}
              placeholder="Search name, branch, phone number, email, or 6-digit user ID"
              aria-label="Search users"
            />
          </div>

          <div className="user-directory-list">
            {searchedUsers.map((item) => (
              <article className="user-directory-card" key={item.id}>
                <div className="user-card-header">
                  <div>
                    <h4>{item.name}</h4>
                    <p>{item.email}</p>
                    <code>User ID: {item.user_code || 'Pending'}</code>
                  </div>
                  <span className="status-line">
                    <span className={item.is_online ? 'presence-dot online' : 'presence-dot offline'}></span>
                    <span className="badge badge-info">{roleLabels[item.role] || item.role}</span>
                  </span>
                </div>

                <div className="user-detail-grid">
                  <section>
                    <span>Company</span>
                    <strong>{item.company?.name || 'No company'}</strong>
                    <small>{item.company?.industry_type || 'Global account'}</small>
                    {item.company?.details && <p>{item.company.details}</p>}
                  </section>
                  <section>
                    <span>Branch</span>
                    <strong>{item.branch?.name || 'No branch assigned'}</strong>
                    <small>{item.branch?.branch_type || 'All branches'}</small>
                    {item.branch?.details && <p>{item.branch.details}</p>}
                  </section>
                  <section>
                    <span>Work</span>
                    <strong>{item.work?.designation || roleLabels[item.role] || item.role}</strong>
                    <small>{item.work?.token_count || 0} tokens, {item.work?.active_token_count || 0} active</small>
                    <small>{item.work?.is_online ? 'Online now' : 'Offline'}</small>
                    {item.work?.must_reset_password && <p>Password reset required</p>}
                  </section>
                  <section>
                    <span>Details</span>
                    <strong>{item.details?.phone || 'No phone'}</strong>
                    <small>{item.details?.emergency_contact || 'No emergency contact'}</small>
                    {formatAddressParts(item.details) && <p>{formatAddressParts(item.details)}</p>}
                    {item.details?.personal_details && <p>{item.details.personal_details}</p>}
                  </section>
                </div>
                {user.role === 'main_admin' && (
                  <div className="button-row">
                    <button type="button" className="secondary-btn" onClick={() => startAdminEdit('user', item)}>Edit</button>
                    <button type="button" className="danger-btn" onClick={() => deleteAdminItem('user', item)}>Delete</button>
                  </div>
                )}
              </article>
            ))}
            {!searchedUsers.length && <div className="empty-state">No users found for this search.</div>}
          </div>
            </>
          )}

          {managementView === 'industries' && user.role === 'main_admin' && (
            <div className="grid-list">
              {(userDirectory.industries || []).map((industry) => (
                <article className="record-card" key={industry.id}>
                  <div className="record-title">{industry.name}</div>
                  <p>{industry.industry_type}{industry.other_type_name ? ` / ${industry.other_type_name}` : ''}</p>
                  <p>{industry.details || 'No details added.'}</p>
                  <small>Admin: {industry.admin_name || 'Not assigned'} | Branches: {industry.branch_count} | Users: {industry.user_count}</small>
                  <div className="button-row">
                    <button type="button" className="secondary-btn" onClick={() => startAdminEdit('industry', industry)}>Edit</button>
                    <button type="button" className="danger-btn" onClick={() => deleteAdminItem('industry', industry)}>Delete</button>
                  </div>
                </article>
              ))}
              {!userDirectory.industries?.length && <div className="empty-state">No industries found.</div>}
            </div>
          )}

          {managementView === 'branches' && user.role === 'main_admin' && (
            <div className="grid-list">
              {(userDirectory.branches || []).map((branch) => (
                <article className="record-card" key={branch.id}>
                  <div className="record-title">{branch.name}</div>
                  <p>{branch.industry_name} - {branch.branch_type}{branch.other_type_name ? ` / ${branch.other_type_name}` : ''}</p>
                  <p>{branch.details || 'No details added.'}</p>
                  {formatAddressParts(branch) && <small>{formatAddressParts(branch)}</small>}
                  {branch.queue_paused && <small className="pause-note">Paused: {branch.queue_pause_reason || 'No reason saved'}</small>}
                  <div className="button-row">
                    <button type="button" className="secondary-btn" onClick={() => startAdminEdit('branch', branch)}>Edit</button>
                    <button type="button" className="danger-btn" onClick={() => deleteAdminItem('branch', branch)}>Delete</button>
                  </div>
                </article>
              ))}
              {!userDirectory.branches?.length && <div className="empty-state">No branches found.</div>}
            </div>
          )}
        </div>
      )}

      {activeTab === 'create-branch' && (
        <div className="create-layout">
          <form className="control-panel" onSubmit={createBranch}>
            <div className="form-title-row">
              <h3>Create Branch</h3>
              <button type="button" className="terminator-btn" onClick={closeCreatePage} aria-label="Close create branch">x</button>
            </div>
            <input placeholder="Branch name" value={branchForm.name} onChange={(event) => setBranchForm({ ...branchForm, name: event.target.value })} required />
            <textarea placeholder="Details" value={branchForm.details} onChange={(event) => setBranchForm({ ...branchForm, details: event.target.value })} />
            <div className="checkbox-section">
              <h4>Branch type</h4>
              {renderOptionList(
                branchTypes,
                (type) => branchForm.branch_type === type.value,
                (type) => setBranchForm({ ...branchForm, branch_type: type.value })
              )}
            </div>
            {branchForm.branch_type === 'other' && (
              <input placeholder="Other type name" value={branchForm.other_type_name} onChange={(event) => setBranchForm({ ...branchForm, other_type_name: event.target.value })} required />
            )}

            <div className="mini-builder">
              <h4>Branch map location</h4>
              <div className="inline-row field-row">
                <input placeholder="Area" value={branchForm.area} onChange={(event) => setBranchForm({ ...branchForm, area: event.target.value })} />
                <input placeholder="City" value={branchForm.city} onChange={(event) => setBranchForm({ ...branchForm, city: event.target.value })} />
                <input placeholder="State" value={branchForm.state} onChange={(event) => setBranchForm({ ...branchForm, state: event.target.value })} />
                <input placeholder="Pincode" value={branchForm.pincode} onChange={(event) => updateBranchPincode(event.target.value)} />
                <button type="button" onClick={lookupBranchAddress}>Find Address</button>
              </div>
              <div className="inline-row">
                <input placeholder="Latitude" value={branchForm.latitude} onChange={(event) => setBranchForm({ ...branchForm, latitude: event.target.value })} />
                <input placeholder="Longitude" value={branchForm.longitude} onChange={(event) => setBranchForm({ ...branchForm, longitude: event.target.value })} />
              </div>
            </div>

            <div className="checkbox-section">
              <h4>{roleLabels.service_provider} dashboard</h4>
              {renderOptionList(
                [
                  ['display_user_details', 'Display user details'],
                  ['display_previous_details', 'Display previous user details'],
                  ['display_next_details', 'Display next details'],
                  ['display_current_details', 'Display current user details'],
                  ['display_suggestion_boxes', 'Display suggestion text boxes'],
                  ['display_search_items', 'Display searchable checkbox items'],
                  ['display_cash_price', 'Display cash price totals'],
                  ['display_transactions', 'Display transactions'],
                  ['ai_suggestion', 'Display AI suggestion button']
                ],
                ([key]) => branchForm.dashboard_config.service_provider[key],
                ([key]) => toggleServiceProviderOption(key)
              )}
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
              {renderOptionList(
                aggregationOptions,
                (item) => branchForm.dashboard_config.service_provider.aggregations.includes(item.value),
                (item) => toggleAggregation(item.value)
              )}
            </div>

            <div className="checkbox-section">
              <h4>{roleLabels.queue_operator} dashboard</h4>
              {renderOptionList(
                [
                  ['can_edit_user_details', 'Can edit user details'],
                  ['can_allocate_provider', `Can allocate ${roleLabels.service_provider}`],
                  ['display_user_details', 'Display user details'],
                  ['display_previous_details', 'Display previous users'],
                  ['display_suggestions', 'Display suggestions']
                ],
                ([key]) => branchForm.dashboard_config.queue_operator[key],
                ([key]) => toggleOperatorOption(key)
              )}
            </div>

            <div className="checkbox-section">
              <h4>User site options</h4>
              {renderOptionList(
                [
                  ['display_previous_suggestions', 'Display previous suggestions'],
                  ['display_current_suggestions', 'Display current suggestions'],
                  ['display_current_queue_count', 'Display current queue count'],
                  ['allow_generate_token', 'Allow generate queue token'],
                  ['allow_reject_token', 'Allow reject queue token'],
                  ['display_cash_price', 'Display cash price'],
                  ['display_transactions', 'Display transactions'],
                  ['display_operator_contact', 'Display operator contact'],
                  ['display_provider_contact', `Display ${roleLabels.service_provider} contact`],
                  ['allow_emergency_queue', 'Allow emergency requests']
                ],
                ([key]) => branchForm.dashboard_config.user[key],
                ([key]) => toggleUserOption(key)
              )}
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

            <div className="form-actions">
              <button type="button" className="secondary-btn" onClick={closeCreatePage}>Cancel</button>
              <button type="submit">Create Branch</button>
            </div>
          </form>
          <div className="grid-list create-side-list">
            {branches.map((branch) => (
              <div className="record-card" key={branch.id}>
                <div className="record-title">{branch.name}</div>
                <p>{branch.branch_type}</p>
                <p>{branch.details}</p>
                {formatAddressParts(branch) && <small>{formatAddressParts(branch)}</small>}
                <small>{branch.user_schema.map((field) => `${field.key}:${field.type}`).join(', ')}</small>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'branches' && (
        <div className="section-stack">
          <div className="section-heading">
            <div>
              <h3>Created Branches</h3>
              <p>Only branches created for this industry are shown here.</p>
            </div>
            <ExportMenu title="Created Branches" filename="created-branches" columns={branchColumns} rows={branches} />
          </div>
          <div className="grid-list">
            {branches.map((branch) => (
              <div className="record-card" key={branch.id}>
                <div className="record-title">{branch.name}</div>
                <p>{branch.branch_type}{branch.other_type_name ? ` / ${branch.other_type_name}` : ''}</p>
                <p>{branch.details || 'No branch details added.'}</p>
                {formatAddressParts(branch) && <small>{formatAddressParts(branch)}</small>}
                <small>{branch.user_schema.map((field) => `${field.key}:${field.type}`).join(', ')}</small>
                {branch.queue_paused && <small className="pause-note">Paused: {branch.queue_pause_reason || 'No reason saved'}</small>}
              </div>
            ))}
            {!branches.length && <div className="empty-state">No branches created yet.</div>}
          </div>
        </div>
      )}

      {activeTab === 'staff' && (
        <div className="section-stack">
          <div className="section-heading">
            <div>
              <h3>Staff</h3>
              <p>{roleLabels.queue_operator} and {roleLabels.service_provider} accounts created for branches.</p>
            </div>
            <ExportMenu title="Staff" filename="staff" columns={staffColumns} rows={staff} />
          </div>
          <div className="grid-list">
            {staff.map((item) => (
              <div className="record-card" key={item.id}>
                <div className="record-title">{item.name}</div>
                <p className="status-line">
                  <span className={item.is_online ? 'presence-dot online' : 'presence-dot offline'}></span>
                  {roleLabels[item.role] || item.role}
                </p>
                <p>{item.email}</p>
                <p>{item.branch_name}</p>
                {item.designation && <small>{item.designation}</small>}
                {formatAddressParts(item) && <small>{formatAddressParts(item)}</small>}
              </div>
            ))}
            {!staff.length && <div className="empty-state">No staff created yet.</div>}
          </div>
        </div>
      )}

      {activeTab === 'create-staff' && (
        <div className="create-layout">
          <form className="control-panel" onSubmit={createStaff}>
            <div className="form-title-row">
              <h3>Create {roleLabels.queue_operator} or {roleLabels.service_provider}</h3>
              <button type="button" className="terminator-btn" onClick={closeCreatePage} aria-label="Close create staff">x</button>
            </div>
            <input placeholder="Name" value={staffForm.name} onChange={(event) => setStaffForm({ ...staffForm, name: event.target.value })} required />
            <input placeholder="Email" type="email" value={staffForm.email} onChange={(event) => setStaffForm({ ...staffForm, email: event.target.value })} required />
            <input placeholder="Phone" value={staffForm.phone} onChange={(event) => setStaffForm({ ...staffForm, phone: event.target.value })} />
            <input placeholder="Designation" value={staffForm.designation} onChange={(event) => setStaffForm({ ...staffForm, designation: event.target.value })} />
            <input placeholder="Emergency contact" value={staffForm.emergency_contact} onChange={(event) => setStaffForm({ ...staffForm, emergency_contact: event.target.value })} />
            <div className="inline-row field-row">
              <input placeholder="Area" value={staffForm.area} onChange={(event) => setStaffForm({ ...staffForm, area: event.target.value })} />
              <input placeholder="City" value={staffForm.city} onChange={(event) => setStaffForm({ ...staffForm, city: event.target.value })} />
              <input placeholder="State" value={staffForm.state} onChange={(event) => setStaffForm({ ...staffForm, state: event.target.value })} />
              <input placeholder="Pincode" value={staffForm.pincode} onChange={(event) => updateStaffPincode(event.target.value)} />
            </div>
            <textarea placeholder="More personal details" value={staffForm.personal_details} onChange={(event) => setStaffForm({ ...staffForm, personal_details: event.target.value })} />
            <select value={staffForm.role} onChange={(event) => setStaffForm({ ...staffForm, role: event.target.value })}>
              <option value="queue_operator">{roleLabels.queue_operator}</option>
              <option value="service_provider">{roleLabels.service_provider}</option>
            </select>
            <select value={staffForm.branch_id} onChange={(event) => setStaffForm({ ...staffForm, branch_id: event.target.value })} required>
              <option value="">Select branch</option>
              {branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}
            </select>
            <div className="form-actions">
              <button type="button" className="secondary-btn" onClick={closeCreatePage}>Cancel</button>
              <button type="submit">Create Staff</button>
            </div>
          </form>
        </div>
      )}

      {activeTab === 'queue' && (
        <div className="section-stack queue-control-view">
          <div className="data-container-header">
            <div>
              <h3>Current Queue</h3>
              <p>Live queue with cancellation and emergency control.</p>
            </div>
            <ExportMenu title="Current Queue" filename="current-queue" columns={queueColumns} rows={queue} />
          </div>
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Token</th>
                  <th>User</th>
                  <th>Branch</th>
                  <th>Status</th>
                  <th>Emergency</th>
                  <th>AI Suggestion</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {queue.map((token) => (
                  <tr key={token.token_id}>
                    <td><strong>{token.token_code}</strong><br /><small>ID: {token.user_code}</small></td>
                    <td>{token.display_name || token.user_name}<br /><small>{token.user_email}</small></td>
                    <td>{token.branch_name}</td>
                    <td>
                      <span className="badge badge-info">{token.status}</span>
                      {token.queue_paused && <><br /><span className="badge badge-warning">Paused</span></>}
                    </td>
                    <td>
                      {token.emergency_accepted ? <span className="badge badge-danger">Accepted</span> : token.emergency_requested ? <span className="badge badge-warning">Requested</span> : '-'}
                    </td>
                    <td>{token.ai_suggestion}</td>
                    <td>
                      {token.status === 'cancelled' ? (
                        <span className="cancelled-note">Token is cancelled</span>
                      ) : (
                        <div className="button-row">
                          {user.role === 'queue_operator' && (
                            token.queue_paused ? (
                              <button type="button" onClick={() => pauseBranchQueue(token.branch_id, false)}>Resume Queue</button>
                            ) : (
                              <button type="button" className="warning-btn" onClick={() => pauseBranchQueue(token.branch_id, true)}>Pause Queue</button>
                            )
                          )}
                          {['requested', 'verified'].includes(token.status) && (
                            <button onClick={() => tokenAction(token.token_id, 'customer_in')}>Customer In</button>
                          )}
                          {token.branch_config?.user?.allow_emergency_queue !== false && ['requested', 'verified'].includes(token.status) && token.emergency_requested && !token.emergency_accepted && (
                            <button className="warning-btn" onClick={() => tokenAction(token.token_id, 'accept_emergency')}>Accept Emergency</button>
                          )}
                          {token.branch_config?.user?.allow_emergency_queue !== false && token.emergency_requested && (
                            <button className="secondary-btn" onClick={() => tokenAction(token.token_id, 'cancel_emergency')}>Cancel Emergency</button>
                          )}
                          <select
                            disabled={token.status !== 'customer_in'}
                            onChange={(event) => event.target.value && tokenAction(token.token_id, 'allocate', event.target.value)}
                            defaultValue=""
                          >
                            <option value="">Allocate {roleLabels.service_provider}</option>
                            {providers.map((provider) => <option key={provider.id} value={provider.id}>{provider.name}</option>)}
                          </select>
                          <button className="danger-btn" onClick={() => tokenAction(token.token_id, 'cancel')}>Cancel</button>
                        </div>
                      )}
                    </td>
                  </tr>
              ))}
            </tbody>
          </table>
        </div>
        </div>
      )}

      {activeTab === 'queue-history' && (
        <div className="section-stack queue-control-view">
          <div className="queue-history-panel">
            <div className="section-heading">
              <div>
                <h3>Queue History</h3>
                <p>Search previous queue entries by user, token, branch, status, phone, email, or 6-digit ID.</p>
              </div>
              <ExportMenu title="Queue History" filename="queue-history" columns={historyColumns} rows={queueHistory} />
            </div>
            <form className="history-filter-grid" onSubmit={(event) => { event.preventDefault(); loadQueueHistory(); }}>
              <div className="form-group">
                <label>Search</label>
                <input
                  value={historyFilters.q}
                  onChange={(event) => setHistoryFilters({ ...historyFilters, q: event.target.value })}
                  placeholder="Name, phone, branch, token, ID"
                />
              </div>
              <div className="form-group">
                <label>Date from</label>
                <input
                  type="date"
                  value={historyFilters.date_from}
                  onChange={(event) => setHistoryFilters({ ...historyFilters, date_from: event.target.value })}
                />
              </div>
              <div className="form-group">
                <label>Date to</label>
                <input
                  type="date"
                  value={historyFilters.date_to}
                  onChange={(event) => setHistoryFilters({ ...historyFilters, date_to: event.target.value })}
                />
              </div>
              <button type="submit">Load History</button>
            </form>

            <div className="table-responsive">
              <table className="data-table history-table">
                <thead>
                  <tr>
                    <th>Token</th>
                    <th>User</th>
                    <th>Branch</th>
                    <th>Status</th>
                    <th>Emergency</th>
                    <th>Created</th>
                    <th>{roleLabels.service_provider}</th>
                    <th>{roleLabels.queue_operator}</th>
                    <th>Details</th>
                    <th>Suggestion</th>
                  </tr>
                </thead>
                <tbody>
                  {queueHistory.map((token) => (
                    <tr key={token.token_id}>
                      <td><strong>{token.token_code}</strong></td>
                      <td>
                        {token.user_name}
                        <br />
                        <small>ID: {token.user_code || 'Pending'}</small>
                        {token.user_email && (
                          <>
                            <br />
                            <small>{token.user_email}</small>
                          </>
                        )}
                      </td>
                      <td>{token.branch_name}</td>
                      <td><span className="badge badge-info">{token.status}</span></td>
                      <td>{token.emergency_accepted ? 'Accepted' : token.emergency_requested ? 'Requested' : '-'}</td>
                      <td>{new Date(token.created_at).toLocaleString()}</td>
                      <td>{token.provider_name || '-'}</td>
                      <td>{token.operator_name || '-'}</td>
                      <td>
                        {token.details && Object.keys(token.details).length > 0
                          ? Object.entries(token.details).map(([key, value]) => `${key}: ${value}`).join(', ')
                          : '-'}
                      </td>
                      <td>{token.ai_suggestion || '-'}</td>
                    </tr>
                  ))}
                  {!queueHistory.length && (
                    <tr>
                      <td colSpan="10" className="empty-table-cell">No queue history found.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminDashboard;
