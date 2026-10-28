import { useRef, useState } from 'react';

// Formulário de upload: seleciona o arquivo, informa o dono (opcional) e
// delega o envio ao callback onUpload fornecido pelo componente pai.
export default function UploadComponent({ onUpload }) {
  const fileInputRef = useRef(null);
  const [file, setFile] = useState(null);
  const [owner, setOwner] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');

    if (!file) {
      setError('Selecione um arquivo para enviar.');
      return;
    }

    setSubmitting(true);
    try {
      await onUpload(file, owner);
      // Limpa o formulário após o envio bem-sucedido.
      setFile(null);
      setOwner('');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '0.5rem', maxWidth: '24rem' }}>
      <label>
        Arquivo:{' '}
        <input
          type="file"
          ref={fileInputRef}
          onChange={(event) => setFile(event.target.files[0] ?? null)}
          disabled={submitting}
        />
      </label>
      <label>
        Dono (opcional):{' '}
        <input
          type="text"
          value={owner}
          placeholder="anonymous"
          onChange={(event) => setOwner(event.target.value)}
          disabled={submitting}
        />
      </label>
      <button type="submit" disabled={submitting}>
        {submitting ? 'Enviando…' : 'Enviar documento'}
      </button>
      {error && <p role="alert" style={{ color: 'crimson', margin: 0 }}>{error}</p>}
    </form>
  );
}
