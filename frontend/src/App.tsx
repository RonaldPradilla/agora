import { useState } from 'react';
import './App.css';
import LoginForm from './components/LoginForm';
import RegisterForm from './components/RegisterForm';
import Dashboard from './components/Dashboard';

type View = 'login' | 'register' | 'dashboard';

export default function App() {
  const [view, setView] = useState<View>(() =>
    localStorage.getItem('accessToken') ? 'dashboard' : 'login',
  );

  return (
    <main className="app-layout">
      <div className="auth-wrapper">
        {view === 'dashboard' && (
          <Dashboard onLogout={() => setView('login')} />
        )}

        {view === 'login' && (
          <>
            <LoginForm onSuccess={() => setView('dashboard')} />
            <p className="auth-switch">
              ¿No tienes cuenta?{' '}
              <button className="link-btn" onClick={() => setView('register')}>
                Regístrate
              </button>
            </p>
          </>
        )}

        {view === 'register' && (
          <>
            <RegisterForm onLogin={() => setView('login')} />
            <p className="auth-switch">
              ¿Ya tienes cuenta?{' '}
              <button className="link-btn" onClick={() => setView('login')}>
                Inicia sesión
              </button>
            </p>
          </>
        )}
      </div>
    </main>
  );
}
