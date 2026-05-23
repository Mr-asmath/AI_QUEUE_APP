import React, { useState, useEffect } from 'react';
import './App.css';
import Login from './components/Login';
import Register from './components/Register';
import UserDashboard from './components/UserDashboard';
import AdminDashboard from './components/AdminDashboard';
import DoctorDashboard from './components/DoctorDashboard';
import Navbar from './components/Navbar';
import ResetPassword from './components/ResetPassword';
import ProfilePage from './components/ProfilePage';

function App() {
  const initialResetToken = new URLSearchParams(window.location.search).get('reset_token');
  const [currentView, setCurrentView] = useState(initialResetToken ? 'reset-password' : 'login');
  const [resetToken, setResetToken] = useState(initialResetToken);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/auth/me', {
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
  };

  const handleLogin = (userData) => {
    setUser(userData);
    setResetToken(null);
    setCurrentView('dashboard');
    window.history.replaceState({}, '', '/');
  };

  const handleLogout = async () => {
    try {
      await fetch('http://localhost:5000/api/auth/logout', {
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
        return <AdminDashboard user={user} onLogout={handleLogout} />;
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
          activeView={currentView}
          onNavigate={setCurrentView}
          onLogout={handleLogout}
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
          <ProfilePage user={user} onUserUpdate={handleUserUpdate} />
        )}
      </main>
    </div>
  );
}

export default App;
