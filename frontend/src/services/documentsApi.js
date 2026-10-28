// Cliente da API de documentos. Toda a comunicação com o backend passa por
// aqui, via fetch com o prefixo /api (proxy configurado no Vite).

const API_PREFIX = '/api';

// Extrai a mensagem de erro do corpo JSON ou usa uma mensagem padrão.
async function extractErrorMessage(response, fallbackMessage) {
  try {
    const body = await response.json();
    return body.error || fallbackMessage;
  } catch {
    return fallbackMessage;
  }
}

export async function uploadDocument(file, owner) {
  const formData = new FormData();
  formData.append('file', file);
  if (owner) {
    formData.append('owner', owner);
  }

  const response = await fetch(`${API_PREFIX}/upload`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    throw new Error(
      await extractErrorMessage(response, 'Falha ao enviar o documento.')
    );
  }

  return response.json();
}

export async function listDocuments() {
  const response = await fetch(`${API_PREFIX}/documents`);

  if (!response.ok) {
    throw new Error(
      await extractErrorMessage(response, 'Falha ao listar os documentos.')
    );
  }

  return response.json();
}

export function getDownloadUrl(id) {
  return `${API_PREFIX}/documents/${encodeURIComponent(id)}/download`;
}
