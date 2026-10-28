// Regras de negócio de documentos. Depende apenas do repositório e da
// configuração; não conhece Express nem multer.

const crypto = require('node:crypto');
const path = require('node:path');

const { storageDir } = require('../config');
const documentsRepository = require('../repositories/documents.repository');

const DEFAULT_OWNER = 'anonymous';

// Representação pública do documento (omite o nome físico em disco).
function toPublicDocument(document) {
  const { storedName, ...publicDocument } = document;
  return publicDocument;
}

function createDocument({ originalName, storedName, size, mimeType, owner }) {
  const document = {
    id: crypto.randomUUID(),
    originalName,
    storedName,
    size,
    mimeType,
    uploadedAt: new Date().toISOString(),
    owner: typeof owner === 'string' && owner.trim() ? owner.trim() : DEFAULT_OWNER,
  };

  documentsRepository.save(document);
  return toPublicDocument(document);
}

function listDocuments() {
  return documentsRepository
    .findAll()
    .sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt))
    .map(toPublicDocument);
}

// Resolve o documento para download: metadados + caminho físico do arquivo.
// O caminho é sempre derivado do storedName gerado pelo sistema, nunca da
// entrada do usuário (proteção contra path traversal).
function getDocumentForDownload(id) {
  const document = documentsRepository.findById(id);
  if (!document) {
    return null;
  }

  return {
    originalName: document.originalName,
    filePath: path.join(storageDir, document.storedName),
  };
}

module.exports = { createDocument, listDocuments, getDocumentForDownload };
