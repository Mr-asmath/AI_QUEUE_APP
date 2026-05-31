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
import QueueLoader from './components/QueueLoader';
import { apiPath } from './config';

function App() {
  const initialResetToken = new URLSearchParams(window.location.search).get('reset_token');
  const [currentView, setCurrentView] = useState(initialResetToken ? 'reset-password' : 'login');
  const [resetToken, setResetToken] = useState(initialResetToken);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [networkIssue, setNetworkIssue] = useState('');

  useEffect(() => {
    const updateOnlineState = () => setNetworkIssue(navigator.onLine ? '' : 'Network issue. Check connection');
    window.addEventListener('online', updateOnlineState);
    window.addEventListener('offline', updateOnlineState);
    updateOnlineState();
    return () => {
      window.removeEventListener('online', updateOnlineState);
      window.removeEventListener('offline', updateOnlineState);
    };
  }, []);

  const checkAuth = useCallback(async () => {
    try {
      const response = await fetch(apiPath('/api/auth/me'), {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        }
      });
      
      if (response.status === 401) {
        setNetworkIssue('');
        setUser(null);
        setCurrentView(resetToken ? 'reset-password' : 'login');
        setLoading(false);
        return;
      }
      
      const data = await response.json();
      
      if (data.success) {
        setNetworkIssue('');
        setUser(data.user);
        setCurrentView(resetToken ? 'reset-password' : 'dashboard');
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      setNetworkIssue('Network issue. Check backend connection');
    } finally {
      setLoading(false);
    }
  }, [resetToken]);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  useEffect(() => {
    if (!networkIssue) return undefined;
    const interval = setInterval(async () => {
      if (!navigator.onLine) return;
      try {
        const response = await fetch(apiPath('/health'), { cache: 'no-store' });
        if (response.ok) {
          setNetworkIssue('');
          checkAuth();
        }
      } catch (error) {
        setNetworkIssue('Project is updating. Please try again later.');
      }
    }, 30000);
    return () => clearInterval(interval);
  }, [checkAuth, networkIssue]);

  const handleLogin = (userData) => {
    setNetworkIssue('');
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
    return <QueueLoader message="Queue loading" overlay />;
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
          <ProfilePage
            user={user}
            onUserUpdate={handleUserUpdate}
            onLogout={handleLogout}
            onHome={() => setCurrentView('dashboard')}
          />
        )}
      </main>

      {networkIssue && (
        <QueueLoader message="Queue loading" overlay />
      )}
    </div>
  );
}

export default App;
