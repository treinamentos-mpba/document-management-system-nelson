// Testes dos endpoints de documentos com o runner nativo do Node.
// Cada teste cria os próprios dados (sem dependência de ordem) e usa um
// diretório de storage temporário para isolar os testes do ambiente.

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

process.env.STORAGE_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'dms-test-'));

const { test, before, after } = require('node:test');
const assert = require('node:assert');

const app = require('../src/app');

let server;
let baseUrl;

function buildUploadForm({ fileName = 'teste.txt', content = 'conteudo', owner } = {}) {
  const form = new FormData();
  form.append('file', new Blob([content], { type: 'text/plain' }), fileName);
  if (owner !== undefined) {
    form.append('owner', owner);
  }
  return form;
}

async function uploadFile(options) {
  return fetch(`${baseUrl}/upload`, {
    method: 'POST',
    body: buildUploadForm(options),
  });
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
  const response = await uploadFile({ fileName: 'malicioso.exe' });
  assert.strictEqual(response.status, 400);
  const body = await response.json();
  assert.strictEqual(body.error, 'Tipo de arquivo não permitido.');
});

test('POST /upload com owner acima do limite retorna 400', async () => {
  const response = await uploadFile({ owner: 'a'.repeat(101) });
  assert.strictEqual(response.status, 400);
  const body = await response.json();
  assert.match(body.error, /no máximo 100 caracteres/);
});

test('POST /upload com arquivo retorna 201 e metadados públicos', async () => {
  const content = 'conteudo de teste';
  const response = await uploadFile({ content, owner: 'maria' });
  assert.strictEqual(response.status, 201);
  const body = await response.json();

  assert.ok(body.id, 'deve retornar um id');
  assert.strictEqual(body.originalName, 'teste.txt');
  assert.strictEqual(body.size, content.length);
  assert.strictEqual(body.owner, 'maria');
  assert.ok(body.uploadedAt, 'deve retornar uploadedAt');
  assert.strictEqual(body.storedName, undefined, 'não deve expor storedName');
});

test('POST /upload sem owner usa "anonymous"', async () => {
  const response = await uploadFile({ fileName: 'outro.txt' });
  assert.strictEqual(response.status, 201);
  const body = await response.json();
  assert.strictEqual(body.owner, 'anonymous');
});

test('GET /documents lista do mais recente para o mais antigo', async () => {
  const first = await (await uploadFile({ fileName: 'primeiro.txt', owner: 'lista' })).json();
  const second = await (await uploadFile({ fileName: 'segundo.txt', owner: 'lista' })).json();

  const response = await fetch(`${baseUrl}/documents`);
  assert.strictEqual(response.status, 200);
  const documents = await response.json();

  const ids = documents.map((documentItem) => documentItem.id);
  assert.ok(ids.includes(first.id), 'lista deve conter o primeiro upload');
  assert.ok(ids.includes(second.id), 'lista deve conter o segundo upload');
  assert.ok(
    ids.indexOf(second.id) <= ids.indexOf(first.id),
    'o upload mais recente deve vir antes do mais antigo'
  );
  for (let i = 1; i < documents.length; i += 1) {
    assert.ok(
      documents[i - 1].uploadedAt >= documents[i].uploadedAt,
      'lista deve estar ordenada por uploadedAt decrescente'
    );
  }
});

test('GET /documents?owner= filtra por dono', async () => {
  const owner = `dono-${Date.now()}`;
  const created = await (await uploadFile({ owner })).json();

  const response = await fetch(`${baseUrl}/documents?owner=${owner}`);
  assert.strictEqual(response.status, 200);
  const documents = await response.json();

  assert.strictEqual(documents.length, 1);
  assert.strictEqual(documents[0].id, created.id);
  assert.strictEqual(documents[0].owner, owner);
});

test('GET /documents/:id/download retorna o conteúdo do arquivo', async () => {
  const content = `conteudo exclusivo ${Date.now()}`;
  const created = await (
    await uploadFile({ fileName: 'baixavel.txt', content })
  ).json();

  const response = await fetch(`${baseUrl}/documents/${created.id}/download`);
  assert.strictEqual(response.status, 200);
  assert.match(
    response.headers.get('content-disposition'),
    /attachment; filename="baixavel.txt"/
  );
  assert.strictEqual(await response.text(), content);
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
