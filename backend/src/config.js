// Configuração central via variáveis de ambiente (12-Factor).
const path = require('node:path');

// Diretório onde os uploads são gravados (restrição: filesystem local).
const storageDir = process.env.STORAGE_DIR
  ? path.resolve(process.env.STORAGE_DIR)
  : path.resolve(__dirname, '..', 'storage');

// Limite de tamanho de upload em bytes (padrão: 10 MB).
const maxFileSizeBytes =
  Number(process.env.MAX_FILE_SIZE_BYTES) || 10 * 1024 * 1024;

module.exports = { storageDir, maxFileSizeBytes };
