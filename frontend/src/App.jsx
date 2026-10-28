import { useCallback, useEffect, useState } from 'react';

import DocumentList from './components/DocumentList.jsx';
import UploadComponent from './components/UploadComponent.jsx';
import { listDocuments, uploadDocument } from './services/documentsApi.js';

// Componente raiz: concentra o estado da lista de documentos e orquestra
// upload, listagem e download.
export default function App() {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const refreshDocuments = useCallback(async () => {
    setError('');
    try {
      setDocuments(await listDocuments());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshDocuments();
  }, [refreshDocuments]);

  // Envia o documento e atualiza a lista sem recarregar a página.
  async function handleUpload(file, owner) {
    await uploadDocument(file, owner);
    await refreshDocuments();
  }

  return (
    <main style={{ fontFamily: 'system-ui, sans-serif', padding: '2rem' }}>
      <h1>Document Management System</h1>

      <section>
        <h2>Enviar documento</h2>
        <UploadComponent onUpload={handleUpload} />
      </section>

      <section>
        <h2>Documentos</h2>
        {error && <p role="alert" style={{ color: 'crimson' }}>{error}</p>}
        {loading ? <p>Carregando documentos…</p> : <DocumentList documents={documents} />}
      </section>
    </main>
  );
}
