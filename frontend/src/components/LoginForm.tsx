import { useState } from 'react';
import { login, extractErrors } from '../api/auth';

interface FormState {
  email: string;
  password: string;
}

interface FormErrors {
  email?: string;
  password?: string;
  general?: string;
}

interface Props {
  onSuccess: (token: string) => void;
}

export default function LoginForm({ onSuccess }: Props) {
  const [form, setForm] = useState<FormState>({ email: '', password: '' });
  const [errors, setErrors] = useState<FormErrors>({});
  const [loading, setLoading] = useState(false);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: undefined }));
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrors({});
    setLoading(true);

    try {
      const res = await login(form);
      localStorage.setItem('accessToken', res.accessToken);
      onSuccess(res.accessToken);
    } catch (err) {
      const extracted = extractErrors(err);
      if (typeof extracted === 'string') {
        setErrors({ general: extracted });
      } else {
        const fieldErrors: FormErrors = {};
        extracted.forEach(({ field, message }) => {
          if (field === 'email') fieldErrors.email = message;
          else if (field === 'password') fieldErrors.password = message;
          else fieldErrors.general = message;
        });
        setErrors(fieldErrors);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="register-card">
      <h1 className="register-title">Iniciar sesión</h1>
      <p className="register-subtitle">Bienvenido de nuevo a Ágora</p>

      {errors.general && <div className="alert alert-error">{errors.general}</div>}

      <form onSubmit={handleSubmit} noValidate>
        <div className="field">
          <label htmlFor="email">Correo electrónico</label>
          <input
            id="email"
            name="email"
            type="email"
            value={form.email}
            onChange={handleChange}
            placeholder="usuario@ejemplo.com"
            className={errors.email ? 'input-error' : ''}
            autoComplete="email"
          />
          {errors.email && <span className="field-error">{errors.email}</span>}
        </div>

        <div className="field">
          <label htmlFor="password">Contraseña</label>
          <input
            id="password"
            name="password"
            type="password"
            value={form.password}
            onChange={handleChange}
            placeholder="Tu contraseña"
            className={errors.password ? 'input-error' : ''}
            autoComplete="current-password"
          />
          {errors.password && <span className="field-error">{errors.password}</span>}
        </div>

        <button type="submit" className="btn-primary" disabled={loading}>
          {loading ? 'Iniciando sesión...' : 'Iniciar sesión'}
        </button>
      </form>
    </div>
  );
}
