import { useState } from 'react';
import type { FormEvent } from 'react';
import { useChat } from '../hooks/useChat';

export default function ChatWindow() {
  const { messages, isTyping, error, isConnected, enviarMensaje } = useChat();
  const [inputValue, setInputValue] = useState('');

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!inputValue.trim()) return;
    await enviarMensaje(inputValue.trim());
    setInputValue('');
  }

  return (
    <section className="chat-window" aria-label="Chat con Ágora">
      <div className="chat-header">
        <h2>Ágora - Chat emocional</h2>
        <span className="status-pill">
          {isConnected ? 'Conectado' : 'Conexión por HTTP'}
        </span>
      </div>

      <div className="chat-messages" role="log" aria-live="polite">
        {messages.map((message) => (
          <article
            key={message.id}
            className={`chat-message ${message.remitente === 'usuario' ? 'user' : 'ia'}`}
          >
            <div className="message-label">
              {message.remitente === 'usuario' ? 'Tú' : 'Ágora'}
            </div>
            <p>{message.contenido}</p>
            <time dateTime={message.timestamp}>{new Date(message.timestamp).toLocaleTimeString()}</time>
          </article>
        ))}
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <form className="chat-form" onSubmit={handleSubmit}>
        <label htmlFor="chat-input">Escribe tu mensaje</label>
        <textarea
          id="chat-input"
          value={inputValue}
          onChange={(event) => setInputValue(event.target.value)}
          rows={3}
          placeholder="Comparte cómo te sientes…"
          aria-label="Escribe tu mensaje"
        />

        <div className="chat-actions">
          <button type="submit" className="btn-primary" disabled={!inputValue.trim()}>
            Enviar
          </button>
          {isTyping && <span className="typing-indicator">Ágora está escribiendo...</span>}
        </div>
      </form>
    </section>
  );
}
