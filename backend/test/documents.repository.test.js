// Testes unitários do repositório de documentos: cópias defensivas,
// validação de caminho físico (path traversal) e limpeza de órfãos.
// Usa um diretório de storage temporário isolado.

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

process.env.STORAGE_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'dms-repo-test-'));

const { test, after } = require('node:test');
const assert = require('node:assert');

const documentsRepository = require('../src/repositories/documents.repository');

const storageDir = process.env.STORAGE_DIR;

after(() => {
  fs.rmSync(storageDir, { recursive: true, force: true });
});

test('save/findAll/findById retornam cópias (estado interno protegido)', () => {
  const saved = documentsRepository.save({
    id: 'id-copia',
    originalName: 'a.txt',
    storedName: 'a-fisico.txt',
    size: 1,
    mimeType: 'text/plain',
    uploadedAt: '2026-01-01T00:00:00.000Z',
    owner: 'maria',
  });

  // Mutações nas cópias não podem afetar o estado interno.
  saved.owner = 'alterado';
  const fromFindAll = documentsRepository.findAll().find((item) => item.id === 'id-copia');
  fromFindAll.owner = 'alterado-de-novo';

  const found = documentsRepository.findById('id-copia');
  assert.strictEqual(found.owner, 'maria');
});

test('findById retorna undefined para id inexistente', () => {
  assert.strictEqual(documentsRepository.findById('nao-existe'), undefined);
});

test('resolveFilePath retorna caminho dentro do storage para nome válido', () => {
  const filePath = documentsRepository.resolveFilePath('arquivo-valido.txt');
  assert.strictEqual(filePath, path.join(storageDir, 'arquivo-valido.txt'));
});

test('resolveFilePath rejeita tentativas de path traversal', () => {
  assert.strictEqual(documentsRepository.resolveFilePath('../fora.txt'), null);
  assert.strictEqual(
    documentsRepository.resolveFilePath('../../etc/passwd'),
    null
  );
  assert.strictEqual(documentsRepository.resolveFilePath(''), null);
});

test('removeOrphanFiles remove não referenciados e preserva referenciados e dotfiles', () => {
  documentsRepository.ensureStorageDir();

  fs.writeFileSync(path.join(storageDir, 'orfao.txt'), 'orfao');
  fs.writeFileSync(path.join(storageDir, 'referenciado.txt'), 'ok');
  fs.writeFileSync(path.join(storageDir, '.gitkeep'), '');

  documentsRepository.save({
    id: 'id-referenciado',
    originalName: 'r.txt',
    storedName: 'referenciado.txt',
    size: 2,
    mimeType: 'text/plain',
    uploadedAt: '2026-01-01T00:00:00.000Z',
    owner: 'maria',
  });

  documentsRepository.removeOrphanFiles();

  assert.ok(!fs.existsSync(path.join(storageDir, 'orfao.txt')), 'órfão deve ser removido');
  assert.ok(fs.existsSync(path.join(storageDir, 'referenciado.txt')), 'referenciado deve permanecer');
  assert.ok(fs.existsSync(path.join(storageDir, '.gitkeep')), 'dotfiles devem permanecer');
});
