interface Props {
  onLogout: () => void;
}

export default function Dashboard({ onLogout }: Props) {
  function handleLogout() {
    localStorage.removeItem('accessToken');
    onLogout();
  }

  return (
    <div className="register-card">
      <h1 className="register-title">Bienvenido a Ágora</h1>
      <p className="register-subtitle">Sesión iniciada correctamente.</p>
      <div className="alert alert-success">Tu cuenta está activa y autenticada.</div>
      <button className="btn-primary" onClick={handleLogout}>
        Cerrar sesión
      </button>
    </div>
  );
}
