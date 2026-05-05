import ChatWindow from './ChatWindow';

interface Props {
  onLogout: () => void;
}

export default function Dashboard({ onLogout }: Props) {
  function handleLogout() {
    localStorage.removeItem('accessToken');
    onLogout();
  }

  return (
    <main className="dashboard-layout">
      <header className="dashboard-header">
        <div>
          <h1 className="register-title">Bienvenido a Ágora</h1>
          <p className="register-subtitle">Tu espacio de apoyo emocional en tiempo real.</p>
        </div>
        <button className="btn-primary" onClick={handleLogout}>
          Cerrar sesión
        </button>
      </header>

      <ChatWindow />
    </main>
  );
}
