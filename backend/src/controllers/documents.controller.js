// Controller de documentos: trata entrada/saída HTTP, delegando as regras
// de negócio (incluindo a política do campo dono) ao service. Erros de
// validação lançados pelo service são convertidos em 400 pelo tratador de
// erros registrado nas rotas.

const documentsService = require('../services/documents.service');

function uploadDocument(req, res) {
  if (!req.file) {
    return res.status(400).json({ error: 'Nenhum arquivo foi enviado.' });
  }

  const document = documentsService.createDocument({
    originalName: req.file.originalname,
    storedName: req.file.filename,
    size: req.file.size,
    mimeType: req.file.mimetype,
    owner: req.body ? req.body.owner : undefined,
  });

  res.status(201).json(document);
}

function listDocuments(req, res) {
  // Filtro opcional por dono (?owner=...). Apenas valores simples são aceitos.
  const owner = typeof req.query.owner === 'string' ? req.query.owner : undefined;
  res.json(documentsService.listDocuments(owner));
}

function downloadDocument(req, res) {
  const download = documentsService.getDocumentForDownload(req.params.id);

  if (!download) {
    return res.status(404).json({ error: 'Documento não encontrado.' });
  }

  res.download(download.filePath, download.originalName, (err) => {
    // Metadado existe, mas a leitura do arquivo físico falhou.
    if (err && !res.headersSent) {
      res.status(500).json({ error: 'Falha ao ler o arquivo.' });
    }
  });
}

module.exports = { uploadDocument, listDocuments, downloadDocument };
