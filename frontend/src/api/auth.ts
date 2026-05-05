import axios from 'axios';

const api = axios.create({ baseURL: '/api' });

export interface FieldError {
  field: string;
  message: string;
}

export interface RegisterPayload {
  email: string;
  password: string;
  confirmPassword: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface LoginResponse {
  accessToken: string;
  message: string;
}

export interface RegisterResponse {
  message: string;
}

export async function register(payload: RegisterPayload): Promise<RegisterResponse> {
  const res = await api.post<RegisterResponse>('/auth/register', payload);
  return res.data;
}

export async function login(payload: LoginPayload): Promise<LoginResponse> {
  const res = await api.post<LoginResponse>('/auth/login', payload);
  return res.data;
}

export function extractErrors(error: unknown): FieldError[] | string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data;
    if (data?.errors && Array.isArray(data.errors)) return data.errors as FieldError[];
    if (data?.message) return data.message as string;
  }
  return 'Error inesperado. Intenta más tarde.';
}
