// Configuração central via variáveis de ambiente (12-Factor).
// Valores inválidos derrubam a inicialização com mensagem clara (fail fast).
const path = require('node:path');

// Diretório onde os uploads são gravados (restrição: filesystem local).
const storageDir = process.env.STORAGE_DIR
  ? path.resolve(process.env.STORAGE_DIR)
  : path.resolve(__dirname, '..', 'storage');

function parsePositiveInteger(name, fallback) {
  const raw = process.env[name];
  if (raw === undefined || raw === '') {
    return fallback;
  }
  const value = Number(raw);
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(
      `Configuração inválida: ${name} deve ser um inteiro positivo (recebido: "${raw}").`
    );
  }
  return value;
}

// Limite de tamanho de upload em bytes (padrão: 10 MB).
const maxFileSizeBytes = parsePositiveInteger(
  'MAX_FILE_SIZE_BYTES',
  10 * 1024 * 1024
);

// Extensões permitidas para upload (CSV via env, ex.: ".pdf,.png").
const DEFAULT_ALLOWED_EXTENSIONS =
  '.pdf,.png,.jpg,.jpeg,.gif,.txt,.csv,.md,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.zip';

const allowedExtensions = (
  process.env.ALLOWED_EXTENSIONS || DEFAULT_ALLOWED_EXTENSIONS
)
  .split(',')
  .map((extension) => extension.trim().toLowerCase())
  .filter(Boolean);

module.exports = { storageDir, maxFileSizeBytes, allowedExtensions };
