import DownloadButton from './DownloadButton.jsx';

// Formata o tamanho em bytes para uma unidade legível.
function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// Formata a data ISO para o padrão brasileiro.
function formatDate(isoDate) {
  return new Date(isoDate).toLocaleString('pt-BR');
}

// Lista de documentos enviados, com link de download para cada item.
export default function DocumentList({ documents }) {
  if (documents.length === 0) {
    return <p>Nenhum documento enviado até o momento.</p>;
  }

  return (
    <table style={{ borderCollapse: 'collapse', width: '100%' }}>
      <thead>
        <tr>
          <th style={{ textAlign: 'left' }}>Nome</th>
          <th style={{ textAlign: 'left' }}>Tamanho</th>
          <th style={{ textAlign: 'left' }}>Enviado em</th>
          <th style={{ textAlign: 'left' }}>Dono</th>
          <th style={{ textAlign: 'left' }}>Ações</th>
        </tr>
      </thead>
      <tbody>
        {documents.map((document) => (
          <tr key={document.id}>
            <td>{document.originalName}</td>
            <td>{formatSize(document.size)}</td>
            <td>{formatDate(document.uploadedAt)}</td>
            <td>{document.owner}</td>
            <td>
              <DownloadButton
                documentId={document.id}
                originalName={document.originalName}
              />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
