import axios from 'axios';

const api = axios.create({ baseURL: '/api/v1/chat' });

export interface ChatSessionResponse {
  sesion_id: string;
  respuesta_ia: string;
  score_riesgo: number;
  timestamp: string;
}

export async function iniciarSesionHTTP(mensaje_inicial: string, token: string): Promise<ChatSessionResponse> {
  const response = await api.post<ChatSessionResponse>(
    '/sessions',
    { mensaje_inicial },
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  );
  return response.data;
}
