// Servidor backend do Document Management System.
//
// Camadas (Clean Architecture simples):
//   - routes/       (definição das rotas)
//   - controllers/  (entrada HTTP e validação)
//   - services/     (regras de negócio)
//   - repositories/ (persistência: arquivos locais + metadados em memória)
//
// Restrição do projeto: uploads são gravados no filesystem local da aplicação
// usando multer com diskStorage. Não utilize provedores externos.

const express = require('express');

const documentsRouter = require('./routes/documents.routes');
const documentsRepository = require('./repositories/documents.repository');

const app = express();
const PORT = process.env.PORT || 3000;

// Evita expor a stack via header X-Powered-By.
app.disable('x-powered-by');

app.use(express.json());

// Impede que navegadores "adivinhem" o tipo do conteúdo servido.
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  next();
});

// Endpoint de verificação de saúde.
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Rotas de documentos: POST /upload, GET /documents,
// GET /documents/:id/download.
app.use(documentsRouter);

// Rotas desconhecidas respondem JSON, seguindo o contrato de erro do sistema.
app.use((req, res) => {
  res.status(404).json({ error: 'Rota não encontrada.' });
});

// Tratador genérico de erros no limite do sistema.
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Erro interno do servidor.' });
});

if (require.main === module) {
  // Metadados são voláteis: arquivos de execuções anteriores ficam órfãos
  // e são removidos na inicialização para não acumular disco.
  documentsRepository.removeOrphanFiles();

  app.listen(PORT, () => {
    console.log(`DMS backend ouvindo na porta ${PORT}`);
  });
}

module.exports = app;
