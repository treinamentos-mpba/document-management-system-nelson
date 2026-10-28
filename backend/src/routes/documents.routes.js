// Rotas de documentos: definem os endpoints, configuram o multer
// (armazenamento local em disco) e delegam ao controller.

const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const express = require('express');
const multer = require('multer');

const { storageDir, maxFileSizeBytes } = require('../config');
const documentsController = require('../controllers/documents.controller');

// Garante que a pasta de armazenamento exista na inicialização.
fs.mkdirSync(storageDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, storageDir),
  filename: (req, file, cb) => {
    // Nome físico único e sanitizado para evitar colisões e path traversal.
    const safeName = path.basename(file.originalname).replace(/[^\w.-]/g, '_');
    cb(null, `${Date.now()}-${crypto.randomUUID()}-${safeName}`);
  },
});

const upload = multer({ storage, limits: { fileSize: maxFileSizeBytes } });

const router = express.Router();

router.post('/upload', upload.single('file'), documentsController.uploadDocument);
router.get('/documents', documentsController.listDocuments);
router.get('/documents/:id/download', documentsController.downloadDocument);

// Erros do multer são tratados aqui, no limite HTTP do sistema.
router.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    const message =
      err.code === 'LIMIT_FILE_SIZE'
        ? 'Arquivo excede o tamanho máximo permitido.'
        : 'Falha no processamento do upload.';
    return res.status(400).json({ error: message });
  }
  next(err);
});

module.exports = router;
