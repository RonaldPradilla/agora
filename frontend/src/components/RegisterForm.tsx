import { useState } from 'react';
import { register, extractErrors } from '../api/auth';
import type { FieldError } from '../api/auth';

interface FormState {
  email: string;
  password: string;
  confirmPassword: string;
}

interface FormErrors {
  email?: string;
  password?: string;
  confirmPassword?: string;
  general?: string;
}

export default function RegisterForm() {
  const [form, setForm] = useState<FormState>({
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: undefined }));
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrors({});
    setSuccess('');
    setLoading(true);

    try {
      const res = await register(form);
      setSuccess(res.message);
      setForm({ email: '', password: '', confirmPassword: '' });
    } catch (err) {
      const extracted = extractErrors(err);

      if (typeof extracted === 'string') {
        setErrors({ general: extracted });
      } else {
        const fieldErrors: FormErrors = {};
        (extracted as FieldError[]).forEach(({ field, message }) => {
          if (field === 'email') fieldErrors.email = message;
          else if (field === 'password') fieldErrors.password = message;
          else if (field === 'confirmPassword') fieldErrors.confirmPassword = message;
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
      <h1 className="register-title">Crear cuenta</h1>
      <p className="register-subtitle">Únete a Ágora, tu espacio de apoyo emocional</p>

      {success && <div className="alert alert-success">{success}</div>}
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
            placeholder="Mínimo 8 caracteres, una mayúscula y un número"
            className={errors.password ? 'input-error' : ''}
            autoComplete="new-password"
          />
          {errors.password && <span className="field-error">{errors.password}</span>}
        </div>

        <div className="field">
          <label htmlFor="confirmPassword">Confirmar contraseña</label>
          <input
            id="confirmPassword"
            name="confirmPassword"
            type="password"
            value={form.confirmPassword}
            onChange={handleChange}
            placeholder="Repite tu contraseña"
            className={errors.confirmPassword ? 'input-error' : ''}
            autoComplete="new-password"
          />
          {errors.confirmPassword && (
            <span className="field-error">{errors.confirmPassword}</span>
          )}
        </div>

        <button type="submit" className="btn-primary" disabled={loading}>
          {loading ? 'Creando cuenta...' : 'Registrarse'}
        </button>
      </form>
    </div>
  );
}
