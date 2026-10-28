// Repositório de documentos: dono da persistência (metadados em memória e
// acesso físico ao storage local). Nesta fase os metadados são voláteis;
// esta camada isola a persistência para permitir troca futura por banco
// de dados sem afetar services e controllers.

const fs = require('node:fs');
const path = require('node:path');

const { storageDir } = require('../config');

const documents = [];

// Retorna sempre cópias para que callers não mutem o estado interno.
function save(document) {
  documents.push({ ...document });
  return { ...document };
}

function findAll() {
  return documents.map((document) => ({ ...document }));
}

function findById(id) {
  const document = documents.find((item) => item.id === id);
  return document ? { ...document } : undefined;
}

function ensureStorageDir() {
  fs.mkdirSync(storageDir, { recursive: true });
}

// Resolve o caminho físico validando que permaneça dentro do storage
// (defesa em profundidade contra path traversal).
function resolveFilePath(storedName) {
  const resolvedPath = path.resolve(storageDir, storedName);
  if (!resolvedPath.startsWith(storageDir + path.sep)) {
    return null;
  }
  return resolvedPath;
}

// Remove arquivos órfãos do storage (sem metadado correspondente). Como os
// metadados são voláteis, arquivos de execuções anteriores ficam
// inacessíveis e são limpos na inicialização do servidor.
function removeOrphanFiles() {
  ensureStorageDir();
  const referencedNames = new Set(documents.map((document) => document.storedName));
  for (const entry of fs.readdirSync(storageDir)) {
    if (entry.startsWith('.') || referencedNames.has(entry)) {
      continue;
    }
    fs.rmSync(path.join(storageDir, entry), { force: true });
  }
}

module.exports = {
  save,
  findAll,
  findById,
  ensureStorageDir,
  resolveFilePath,
  removeOrphanFiles,
};
