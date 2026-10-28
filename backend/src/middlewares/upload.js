// Middleware de upload: configura o multer com diskStorage local, allowlist
// de extensões e limites de tamanho/campos. Erros de upload são convertidos
// em respostas JSON no limite HTTP do sistema.

const crypto = require('node:crypto');
const path = require('node:path');

const multer = require('multer');

const { storageDir, maxFileSizeBytes, allowedExtensions } = require('../config');
const documentsRepository = require('../repositories/documents.repository');

// Garante que a pasta de armazenamento exista antes de aceitar uploads.
try {
  documentsRepository.ensureStorageDir();
} catch (err) {
  throw new Error(
    `Não foi possível criar a pasta de armazenamento "${storageDir}": ${err.message}`
  );
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, storageDir),
  filename: (req, file, cb) => {
    // Nome físico único e sanitizado para evitar colisões e path traversal.
    const safeName = path.basename(file.originalname).replace(/[^\w.-]/g, '_');
    cb(null, `${Date.now()}-${crypto.randomUUID()}-${safeName}`);
  },
});

// Aceita apenas extensões presentes na allowlist configurada.
function fileFilter(req, file, cb) {
  const extension = path.extname(file.originalname).toLowerCase();
  if (!allowedExtensions.includes(extension)) {
    const error = new Error('Tipo de arquivo não permitido.');
    error.statusCode = 400;
    return cb(error);
  }
  cb(null, true);
}

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: maxFileSizeBytes,
    files: 1,
    fields: 5,
    fieldSize: 1024,
  },
});

// Tratador de erros de upload no limite HTTP.
function uploadErrorHandler(err, req, res, next) {
  if (err instanceof multer.MulterError) {
    const message =
      err.code === 'LIMIT_FILE_SIZE'
        ? 'Arquivo excede o tamanho máximo permitido.'
        : 'Falha no processamento do upload.';
    return res.status(400).json({ error: message });
  }
  if (err && err.statusCode === 400) {
    return res.status(400).json({ error: err.message });
  }
  next(err);
}

module.exports = { upload, uploadErrorHandler };
