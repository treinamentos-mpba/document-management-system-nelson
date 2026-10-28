// Rotas de documentos: definem os endpoints e delegam ao controller.
// A configuração de upload (multer) fica no middleware dedicado.

const express = require('express');

const { upload, uploadErrorHandler } = require('../middlewares/upload');
const documentsController = require('../controllers/documents.controller');

const router = express.Router();

router.post('/upload', upload.single('file'), documentsController.uploadDocument);
router.get('/documents', documentsController.listDocuments);
router.get('/documents/:id/download', documentsController.downloadDocument);

router.use(uploadErrorHandler);

module.exports = router;
