# Especificação - Document Management System (DMS)

> Especificação gerada a partir de `spec-template.md` (Spec Driven Development).
> Esta spec orienta a implementação dos Passos 2 (backend) e 3 (frontend).
> Nenhum arquivo de backend ou frontend é criado nesta etapa.

## 1. Objetivo

Disponibilizar um sistema web simples para que usuários enviem, listem e
baixem documentos, com arquivos gravados no filesystem local da aplicação e
metadados mantidos em memória.

## 2. Escopo

### Dentro do escopo

- Upload de documentos (um arquivo por requisição)
- Listagem de documentos com seus metadados
- Download de documentos pelo identificador
- Gestão simples por usuário (campo `owner` informado no upload)

### Fora do escopo

- Armazenamento externo ou em nuvem (S3, blob storage, serviços de terceiros)
- Versionamento de documentos
- Autenticação/autorização real (o "dono" é apenas um identificador textual)
- Persistência de metadados em banco de dados (ficam em memória nesta fase)
- Exclusão e edição de documentos

## 3. Requisitos funcionais

| ID    | Requisito                                                                 |
| ----- | ------------------------------------------------------------------------- |
| RF-01 | O usuário pode enviar um documento via formulário `multipart/form-data`   |
| RF-02 | O usuário pode listar os documentos enviados com seus metadados           |
| RF-03 | O usuário pode baixar um documento pelo identificador                     |
| RF-04 | O upload aceita um campo opcional `owner` identificando o dono do arquivo |
| RF-05 | O sistema rejeita upload sem arquivo com erro `400` e mensagem clara      |
| RF-06 | Download de id inexistente retorna `404` com mensagem clara               |

## 4. Requisitos não funcionais

| ID     | Requisito                                                                      |
| ------ | ------------------------------------------------------------------------------ |
| RNF-01 | Arquivos gravados no filesystem local em `backend/storage` via `multer` com `diskStorage` |
| RNF-02 | Metadados mantidos em memória (array no repositório) nesta fase                |
| RNF-03 | Configuração via variáveis de ambiente (12-Factor): `PORT`, `STORAGE_DIR`      |
| RNF-04 | Backend em Clean Architecture simples: `routes -> controllers -> services -> repositories` |
| RNF-05 | Erros tratados nos limites do sistema (entrada HTTP e I/O de arquivos)         |
| RNF-06 | Nome físico do arquivo em disco é único (prefixo com id/timestamp) para evitar colisões |
| RNF-07 | Respostas de erro em JSON no formato `{ "error": "<mensagem em português>" }`  |
| RNF-08 | Testes do backend com o runner nativo do Node (`node:test`) + `supertest` opcional via `app` exportado |

## 5. Modelo de dados (metadados do documento)

Entidade `Document` (mantida em memória pelo repositório):

| Campo        | Tipo   | Descrição                                            |
| ------------ | ------ | ---------------------------------------------------- |
| id           | string | Identificador único (UUID gerado via `crypto.randomUUID()`) |
| originalName | string | Nome original do arquivo enviado                     |
| storedName   | string | Nome físico do arquivo em `backend/storage` (interno, não exposto na API) |
| size         | number | Tamanho em bytes                                     |
| mimeType     | string | Tipo MIME informado no upload                        |
| uploadedAt   | string | Data/hora do upload em ISO 8601                      |
| owner        | string | Identificador do usuário dono (padrão: `"anonymous"`) |

Representação pública na API (omite `storedName`):

```json
{
  "id": "6f1c0e6a-...",
  "originalName": "contrato.pdf",
  "size": 48213,
  "mimeType": "application/pdf",
  "uploadedAt": "2026-10-28T18:00:00.000Z",
  "owner": "maria"
}
```

## 6. Contratos de API

O frontend consome os endpoints via prefixo `/api` (proxy do Vite reescreve
`/api/*` para `http://localhost:3000/*`). Os contratos abaixo descrevem o
backend diretamente.

### POST /upload

- Entrada: `multipart/form-data`
  - `file` (obrigatório): o arquivo a enviar
  - `owner` (opcional): identificador textual do dono; padrão `"anonymous"`
- Saída de sucesso: `201 Created` com os metadados públicos do documento
- Erros:
  - `400 Bad Request` — `{ "error": "Nenhum arquivo foi enviado." }`

### GET /documents

- Entrada: nenhuma
- Saída de sucesso: `200 OK` com array de metadados públicos (ordenado por
  `uploadedAt` decrescente)

```json
[
  { "id": "...", "originalName": "...", "size": 0, "mimeType": "...", "uploadedAt": "...", "owner": "..." }
]
```

### GET /documents/:id/download

- Entrada: `id` como parâmetro de rota
- Saída de sucesso: `200 OK` com o conteúdo binário do arquivo e cabeçalho
  `Content-Disposition: attachment; filename="<originalName>"` (via `res.download`)
- Erros:
  - `404 Not Found` — `{ "error": "Documento não encontrado." }`
  - `500 Internal Server Error` — `{ "error": "Falha ao ler o arquivo." }`
    (metadado existe, mas o arquivo físico falhou na leitura)

### GET /health (já existente)

- Saída: `200 OK` — `{ "status": "ok" }`

## 7. Decisões arquiteturais

- **Clean Architecture simples no backend**: `routes/` definem endpoints e
  delegam; `controllers/` tratam HTTP e validação básica; `services/`
  concentram regras de negócio; `repositories/` cuidam da persistência.
  Camadas internas não conhecem camadas externas.
- **Armazenamento estritamente local**: `multer` com `diskStorage` gravando em
  `backend/storage` (configurável via `STORAGE_DIR`). Nenhum provedor externo.
- **Metadados em memória**: um repositório com array em memória, isolado atrás
  de uma interface simples (`save`, `findAll`, `findById`) para permitir troca
  futura por banco de dados sem afetar services/controllers.
- **Identidade**: `crypto.randomUUID()` (nativo do Node), sem dependência nova.
- **Frontend baseado em componentes**: React + Hooks, organização em
  `components/`, `pages/`, `services/`; comunicação via `fetch` no prefixo `/api`.
- **Convenções**: código CommonJS no backend, ESM no frontend; símbolos em
  inglês, mensagens e comentários em português.

### Riscos

| Risco                                                   | Mitigação                                                      |
| ------------------------------------------------------- | -------------------------------------------------------------- |
| Metadados perdidos ao reiniciar o servidor              | Aceitável nesta fase; repositório isolado facilita evolução    |
| Colisão de nomes de arquivos em disco                   | Nome físico único (id/timestamp + nome sanitizado)             |
| Upload de arquivos muito grandes                        | Limite de tamanho no multer (ex.: 10 MB) configurável por env  |
| `backend/storage` ausente no primeiro uso               | Criar a pasta na inicialização (`fs.mkdirSync(..., { recursive: true })`) e manter `.gitkeep` |
| Path traversal no download                              | Nunca usar entrada do usuário como caminho; resolver sempre a partir de `storedName` do repositório |

## 8. Plano de execução

> Este plano NÃO executa os arquivos de backend/frontend nesta etapa; ele
> apenas define a ordem de implementação para os próximos passos.

### Etapa 1 — Camada de persistência (repositório)

- Arquivos: `backend/src/repositories/documentRepository.js`
- Conteúdo: array em memória + funções `save`, `findAll`, `findById`
- Critérios de aceite:
  - Repositório não conhece Express nem multer
  - `findById` retorna `undefined` para id inexistente

### Etapa 2 — Regras de negócio (service)

- Arquivos: `backend/src/services/documentService.js`
- Conteúdo: criação de metadados (id, `uploadedAt`, `owner` padrão), listagem
  ordenada e resolução de documento para download (metadado + caminho físico)
- Critérios de aceite:
  - Service depende apenas do repositório
  - `owner` ausente resulta em `"anonymous"`
  - Listagem ordenada por `uploadedAt` decrescente

### Etapa 3 — Controllers e rotas + configuração do multer

- Arquivos: `backend/src/controllers/documentController.js`,
  `backend/src/routes/documentRoutes.js`,
  configuração do multer (`diskStorage` em `backend/storage`, limite de tamanho),
  registro das rotas em `backend/src/app.js`
- Critérios de aceite:
  - `POST /upload` responde `201` com metadados públicos; `400` sem arquivo
  - `GET /documents` responde `200` com array
  - `GET /documents/:id/download` responde com o binário ou `404`
  - `/health` continua funcionando (não quebrar o existente)
  - Nenhum serviço externo de armazenamento é usado

### Etapa 4 — Testes do backend

- Arquivos: `backend/test/documents.test.js` (runner nativo `node:test`,
  usando o `app` exportado)
- Critérios de aceite:
  - `npm test` cobre: upload com sucesso, upload sem arquivo (400),
    listagem e download inexistente (404)

### Etapa 5 — Serviço de API do frontend

- Arquivos: `frontend/src/services/documentsApi.js`
- Conteúdo: funções `uploadDocument`, `listDocuments`, `getDownloadUrl`
  usando `fetch` com prefixo `/api`
- Critérios de aceite:
  - Nenhuma URL absoluta do backend no código (apenas `/api/...`)
  - Erros HTTP convertidos em mensagens em português

### Etapa 6 — Componentes e página do frontend

- Arquivos: `frontend/src/components/UploadForm.jsx`,
  `frontend/src/components/DocumentList.jsx`,
  `frontend/src/pages/DocumentsPage.jsx`,
  ajuste em `frontend/src/App.jsx` para renderizar a página
- Critérios de aceite:
  - Componentes funcionais com Hooks, sem duplicação
  - Upload atualiza a lista sem recarregar a página
  - Lista exibe nome, tamanho, data, dono e link de download
  - Estados de carregamento e erro visíveis ao usuário

### Etapa 7 — Integração e verificação final

- Arquivos: nenhum novo (validação ponta a ponta)
- Critérios de aceite:
  - Backend (`npm run dev` na porta 3000) + frontend (Vite na 5173) integrados
    via proxy `/api`
  - Fluxo completo: enviar → listar → baixar, verificando o arquivo gravado em
    `backend/storage`
  - `npm test` do backend verde
