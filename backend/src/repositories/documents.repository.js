// Repositório de documentos. Nesta fase os metadados ficam em memória;
// esta camada isola a persistência para permitir troca futura por banco
// de dados sem afetar services e controllers.

const documents = [];

function save(document) {
  documents.push(document);
  return document;
}

function findAll() {
  return [...documents];
}

function findById(id) {
  return documents.find((document) => document.id === id);
}

module.exports = { save, findAll, findById };
