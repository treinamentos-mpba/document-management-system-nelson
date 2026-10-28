import { getDownloadUrl } from '../services/documentsApi.js';

// Botão de download: link direto para o endpoint de download do documento.
export default function DownloadButton({ documentId, originalName }) {
  return (
    <a
      href={getDownloadUrl(documentId)}
      download={originalName}
      title={`Baixar ${originalName}`}
    >
      Baixar
    </a>
  );
}
