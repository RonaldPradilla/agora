import { ChatService } from './chat.service';

describe('ChatService', () => {
  const prismaMock: any = {
    chatSesion: { count: jest.fn(), create: jest.fn() },
    chatMensaje: { create: jest.fn() },
    memoriaIA: { findMany: jest.fn() },
    $transaction: jest.fn(),
  };

  const cifradoMock: any = {
    encrypt: jest.fn().mockResolvedValue({ encrypted: 'abc', iv: 'iv', authTag: 'tag' }),
  };

  const llmMock: any = {
    callWithRetries: jest.fn().mockResolvedValue('Hola. Estoy aquí para escucharte.'),
    streamResponse: jest.fn().mockResolvedValue((async function* () {
      yield 'Hola. Estoy aquí para escucharte.';
    })()),
    buildContext: jest.fn().mockReturnValue('contexto'),
  };

  const riesgoMock: any = {
    detectarMensaje: jest.fn().mockReturnValue({ score: 0.8, palabras_clave: ['suicidio'], requiere_alerta: true }),
    evaluarMensaje: jest.fn().mockResolvedValue({ score: 0.8, palabras_clave: ['suicidio'], requiere_alerta: true }),
  };

  const authMock: any = {
    verifyAccessToken: jest.fn().mockResolvedValue({ sub: 'userId', type: 'acceso' }),
    getActiveUser: jest.fn().mockResolvedValue({ id: 'userId', cuenta_activa: true }),
  };

  let service: ChatService;

  beforeEach(() => {
    prismaMock.chatSesion.count.mockResolvedValue(0);
    prismaMock.$transaction.mockImplementation(async (fn: any) => fn(prismaMock));
    prismaMock.chatSesion.create.mockResolvedValue({ id: 'session-id' });
    prismaMock.memoriaIA.findMany.mockResolvedValue([]);
    prismaMock.chatMensaje.create.mockResolvedValue({});
    service = new ChatService(prismaMock, cifradoMock, llmMock, riesgoMock, authMock);
  });

  it('debe crear sesión y responder en <10s', async () => {
    const start = Date.now();
    const response = await service.iniciarSesion('userId', 'Estoy triste');
    expect(Date.now() - start).toBeLessThan(10000);
    expect(response.respuesta_ia).toBeDefined();
    expect(response.respuesta_ia).toContain('Hola');
  });

  it('debe detectar riesgo >= 0.7 y crear alerta', async () => {
    const response = await service.iniciarSesion('userId', 'Quiero suicidarme');
    expect(response.score_riesgo).toBeGreaterThanOrEqual(0.7);
    expect(riesgoMock.evaluarMensaje).toHaveBeenCalled();
  });

  it('debe rechazar token expirado con 401', async () => {
    authMock.verifyAccessToken.mockRejectedValueOnce(new Error('Token inválido'));
    await expect(service.iniciarSesionWithToken('invalid-token', 'Hola')).rejects.toThrow(/401|inválido/i);
  });

  it('debe manejar timeout de LLM con mensaje empático', async () => {
    llmMock.callWithRetries.mockRejectedValueOnce(new Error('Timeout'));

    const response = await service.iniciarSesion('userId', 'Test');

    expect(response.respuesta_ia).toContain('Disculpa');
    expect(response.respuesta_ia).toContain('asistente no está disponible');
  });
});
