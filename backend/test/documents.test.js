// Testes dos endpoints de documentos com o runner nativo do Node.
// Usa um diretório de storage temporário para isolar os testes do ambiente.

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

process.env.STORAGE_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'dms-test-'));

const { test, before, after } = require('node:test');
const assert = require('node:assert');

const app = require('../src/app');

let server;
let baseUrl;
let uploadedId;

function buildUploadForm({ fileName = 'teste.txt', content = 'conteudo', owner } = {}) {
  const form = new FormData();
  form.append('file', new Blob([content], { type: 'text/plain' }), fileName);
  if (owner !== undefined) {
    form.append('owner', owner);
  }
  return form;
}

before(async () => {
  server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  await new Promise((resolve) => server.close(resolve));
  fs.rmSync(process.env.STORAGE_DIR, { recursive: true, force: true });
});

test('POST /upload sem arquivo retorna 400', async () => {
  const response = await fetch(`${baseUrl}/upload`, { method: 'POST' });
  assert.strictEqual(response.status, 400);
  const body = await response.json();
  assert.strictEqual(body.error, 'Nenhum arquivo foi enviado.');
});

test('POST /upload com extensão não permitida retorna 400', async () => {
  const response = await fetch(`${baseUrl}/upload`, {
    method: 'POST',
    body: buildUploadForm({ fileName: 'malicioso.exe' }),
  });
  assert.strictEqual(response.status, 400);
  const body = await response.json();
  assert.strictEqual(body.error, 'Tipo de arquivo não permitido.');
});

test('POST /upload com owner acima do limite retorna 400', async () => {
  const response = await fetch(`${baseUrl}/upload`, {
    method: 'POST',
    body: buildUploadForm({ owner: 'a'.repeat(101) }),
  });
  assert.strictEqual(response.status, 400);
  const body = await response.json();
  assert.match(body.error, /no máximo 100 caracteres/);
});

test('POST /upload com arquivo retorna 201 e metadados públicos', async () => {
  const response = await fetch(`${baseUrl}/upload`, {
    method: 'POST',
    body: buildUploadForm({ content: 'conteudo de teste', owner: 'maria' }),
  });
  assert.strictEqual(response.status, 201);
  const body = await response.json();

  assert.ok(body.id, 'deve retornar um id');
  assert.strictEqual(body.originalName, 'teste.txt');
  assert.strictEqual(body.size, 'conteudo de teste'.length);
  assert.strictEqual(body.owner, 'maria');
  assert.ok(body.uploadedAt, 'deve retornar uploadedAt');
  assert.strictEqual(body.storedName, undefined, 'não deve expor storedName');

  uploadedId = body.id;
});

test('POST /upload sem owner usa "anonymous"', async () => {
  const response = await fetch(`${baseUrl}/upload`, {
    method: 'POST',
    body: buildUploadForm({ fileName: 'outro.txt' }),
  });
  assert.strictEqual(response.status, 201);
  const body = await response.json();
  assert.strictEqual(body.owner, 'anonymous');
});

test('GET /documents lista ordenada do mais recente para o mais antigo', async () => {
  const response = await fetch(`${baseUrl}/documents`);
  assert.strictEqual(response.status, 200);
  const documents = await response.json();

  assert.strictEqual(documents.length, 2);
  for (let i = 1; i < documents.length; i += 1) {
    assert.ok(
      documents[i - 1].uploadedAt >= documents[i].uploadedAt,
      'lista deve estar ordenada por uploadedAt decrescente'
    );
  }
});

test('GET /documents?owner= filtra por dono', async () => {
  const response = await fetch(`${baseUrl}/documents?owner=maria`);
  assert.strictEqual(response.status, 200);
  const documents = await response.json();

  assert.strictEqual(documents.length, 1);
  assert.strictEqual(documents[0].owner, 'maria');
});

test('GET /documents/:id/download retorna o conteúdo do arquivo', async () => {
  const response = await fetch(`${baseUrl}/documents/${uploadedId}/download`);
  assert.strictEqual(response.status, 200);
  assert.match(
    response.headers.get('content-disposition'),
    /attachment; filename="teste.txt"/
  );
  assert.strictEqual(await response.text(), 'conteudo de teste');
});

test('GET /documents/:id/download com id inexistente retorna 404', async () => {
  const response = await fetch(`${baseUrl}/documents/nao-existe/download`);
  assert.strictEqual(response.status, 404);
  const body = await response.json();
  assert.strictEqual(body.error, 'Documento não encontrado.');
});

test('rota desconhecida retorna 404 em JSON', async () => {
  const response = await fetch(`${baseUrl}/rota-que-nao-existe`);
  assert.strictEqual(response.status, 404);
  const body = await response.json();
  assert.strictEqual(body.error, 'Rota não encontrada.');
});
