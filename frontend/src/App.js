import React, { useState, useEffect, useCallback } from 'react';
import './App.css';
import Login from './components/Login';
import Register from './components/Register';
import UserDashboard from './components/UserDashboard';
import AdminDashboard from './components/AdminDashboard';
import DoctorDashboard from './components/DoctorDashboard';
import Navbar from './components/Navbar';
import ResetPassword from './components/ResetPassword';
import ProfilePage from './components/ProfilePage';
import { apiPath } from './config';

function collectDeviceDetails(user) {
  return {
    device_name: navigator.userAgentData?.platform || navigator.platform || 'Unknown device',
    platform: navigator.platform || '',
    browser: navigator.userAgent || '',
    place: Intl.DateTimeFormat().resolvedOptions().timeZone || 'Unknown place',
    account_name: user?.name || ''
  };
}

function DeviceConsentPrompt({ user, onUserUpdate }) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const sendConsent = async (allow) => {
    setSaving(true);
    setError('');
    const details = collectDeviceDetails(user);
    const submit = async (deviceDetails) => {
      const response = await fetch(apiPath('/api/security/device-consent'), {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ allow, device_details: deviceDetails })
      });
      const data = await response.json();
      if (data.success) onUserUpdate(data.user);
      else setError(data.error || 'Could not save device permission.');
      setSaving(false);
    };

    if (allow && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => submit({
          ...details,
          place: `${details.place}; ${position.coords.latitude.toFixed(4)}, ${position.coords.longitude.toFixed(4)}`
        }),
        () => submit(details),
        { timeout: 5000, maximumAge: 300000 }
      );
      return;
    }
    submit(details);
  };

  return (
    <div className="consent-overlay">
      <section className="consent-dialog">
        <h3>Device Details Permission</h3>
        <p>
          Terms are accepted for this account. Allow this app to share simple device details
          such as account name, approximate place, browser, and device name with the main admin security table?
        </p>
        {error && <div className="error-message">{error}</div>}
        <div className="button-row">
          <button type="button" onClick={() => sendConsent(true)} disabled={saving}>Allow</button>
          <button type="button" className="secondary-btn" onClick={() => sendConsent(false)} disabled={saving}>Do Not Allow</button>
        </div>
      </section>
    </div>
  );
}

function App() {
  const initialResetToken = new URLSearchParams(window.location.search).get('reset_token');
  const [currentView, setCurrentView] = useState(initialResetToken ? 'reset-password' : 'login');
  const [resetToken, setResetToken] = useState(initialResetToken);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const checkAuth = useCallback(async () => {
    try {
      const response = await fetch(apiPath('/api/auth/me'), {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        }
      });
      
      if (response.status === 401) {
        setUser(null);
        setCurrentView(resetToken ? 'reset-password' : 'login');
        setLoading(false);
        return;
      }
      
      const data = await response.json();
      
      if (data.success) {
        setUser(data.user);
        setCurrentView(resetToken ? 'reset-password' : 'dashboard');
      }
    } catch (error) {
      console.error('Auth check failed:', error);
    } finally {
      setLoading(false);
    }
  }, [resetToken]);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const handleLogin = (userData) => {
    setUser(userData);
    setResetToken(null);
    setCurrentView('dashboard');
    window.history.replaceState({}, '', '/');
  };

  const handleLogout = async () => {
    try {
      await fetch(apiPath('/api/auth/logout'), {
        method: 'POST',
        credentials: 'include'
      });
      setUser(null);
      setCurrentView('login');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const handleUserUpdate = (updatedUser) => {
    setUser(updatedUser);
  };

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loader"></div>
        <p>Loading...</p>
      </div>
    );
  }

  const renderDashboard = () => {
    if (!user) return null;
    
    switch(user.role) {
      case 'main_admin':
      case 'industry_admin':
      case 'queue_operator':
        return <AdminDashboard user={user} onHome={() => setCurrentView('dashboard')} />;
      case 'doctor':
      case 'service_provider':
        return <DoctorDashboard user={user} onLogout={handleLogout} />;
      default:
        return <UserDashboard user={user} onLogout={handleLogout} />;
    }
  };

  return (
    <div className="App">
      {user && (
        <Navbar
          user={user}
          onNavigate={setCurrentView}
        />
      )}
      
      <main className="app-main">
        {user?.device_consent_required && (
          <DeviceConsentPrompt user={user} onUserUpdate={handleUserUpdate} />
        )}

        {currentView === 'reset-password' && (
          <ResetPassword
            token={resetToken}
            onBackToLogin={() => {
              setResetToken(null);
              window.history.replaceState({}, '', '/');
              setCurrentView('login');
            }}
          />
        )}

        {currentView === 'login' && (
          <Login 
            onLogin={handleLogin}
            onSwitchToRegister={() => setCurrentView('register')}
          />
        )}
        
        {currentView === 'register' && (
          <Register 
            onRegister={handleLogin}
            onSwitchToLogin={() => setCurrentView('login')}
          />
        )}
        
        {currentView === 'dashboard' && renderDashboard()}

        {currentView === 'profile' && user && (
          <ProfilePage user={user} onUserUpdate={handleUserUpdate} onLogout={handleLogout} />
        )}
      </main>
    </div>
  );
}

export default App;
