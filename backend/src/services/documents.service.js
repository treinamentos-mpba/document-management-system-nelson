// Regras de negócio de documentos. Depende apenas do repositório;
// não conhece Express, multer nem detalhes do filesystem.

const crypto = require('node:crypto');

const documentsRepository = require('../repositories/documents.repository');

const DEFAULT_OWNER = 'anonymous';
const MAX_OWNER_LENGTH = 100;

// ---------------------------------------------------------------------------
// Funções de domínio: cada uma com uma única responsabilidade.
// ---------------------------------------------------------------------------

// Erro de regra de negócio, convertido em resposta 400 no limite HTTP.
function validationError(message) {
  const error = new Error(message);
  error.statusCode = 400;
  return error;
}

// Garante que o dono informado respeita a política do campo.
function assertValidOwner(owner) {
  if (typeof owner === 'string' && owner.trim().length > MAX_OWNER_LENGTH) {
    throw validationError(
      `O campo dono deve ter no máximo ${MAX_OWNER_LENGTH} caracteres.`
    );
  }
}

// Normaliza o dono informado, aplicando o padrão quando ausente ou vazio.
function normalizeOwner(owner) {
  if (typeof owner !== 'string') {
    return DEFAULT_OWNER;
  }
  const trimmedOwner = owner.trim();
  return trimmedOwner || DEFAULT_OWNER;
}

// Constrói a entidade Document a partir dos dados do upload.
function buildDocument({ originalName, storedName, size, mimeType, owner }) {
  assertValidOwner(owner);
  return {
    id: crypto.randomUUID(),
    originalName,
    storedName,
    size,
    mimeType,
    uploadedAt: new Date().toISOString(),
    owner: normalizeOwner(owner),
  };
}

// Representação pública do documento (omite o nome físico em disco).
function toPublicDocument(document) {
  const { storedName, ...publicDocument } = document;
  return publicDocument;
}

// Comparador: do mais recente para o mais antigo.
function byNewestFirst(a, b) {
  return b.uploadedAt.localeCompare(a.uploadedAt);
}

// Predicado de filtro por dono.
function belongsToOwner(owner) {
  return (document) => document.owner === owner;
}

// ---------------------------------------------------------------------------
// Casos de uso expostos pela camada de serviço.
// ---------------------------------------------------------------------------

function createDocument(input) {
  const document = documentsRepository.save(buildDocument(input));
  return toPublicDocument(document);
}

function listDocuments(owner) {
  const documents = documentsRepository.findAll();
  const visibleDocuments = owner
    ? documents.filter(belongsToOwner(owner))
    : documents;

  return visibleDocuments.sort(byNewestFirst).map(toPublicDocument);
}

// Resolve o documento para download: metadados + caminho físico validado
// pelo repositório (nunca derivado da entrada do usuário).
function getDocumentForDownload(id) {
  const document = documentsRepository.findById(id);
  if (!document) {
    return null;
  }

  const filePath = documentsRepository.resolveFilePath(document.storedName);
  if (!filePath) {
    return null;
  }

  return { originalName: document.originalName, filePath };
}

module.exports = { createDocument, listDocuments, getDocumentForDownload };
