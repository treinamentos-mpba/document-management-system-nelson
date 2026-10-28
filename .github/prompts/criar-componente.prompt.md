---
description: Cria um componente React do frontend seguindo as convenções do projeto.
name: criar-componente
argument-hint: nome do componente (ex. DocumentFilter)
agent: agent
---

# Criar componente do frontend

Crie o componente `${input:componente:nome do componente}` em
`frontend/src/components` seguindo as convenções do projeto.

Requisitos:

- Componente funcional com React Hooks (sem classes).
- Nome do arquivo e do componente em PascalCase (ex. `DocumentFilter.jsx`).
- Mensagens ao usuário e comentários em português; símbolos de código em inglês.
- Comunicação com o backend somente através de `frontend/src/services`
  (via fetch com o prefixo `/api`); nunca chame `fetch` direto no componente.
- Estado e efeitos mínimos: prefira receber dados e callbacks via props,
  deixando o estado compartilhado no componente pai.
- Trate estados de carregamento e erro visíveis ao usuário quando aplicável.
- Reutilize componentes existentes e evite duplicação.
- Integre o componente onde ele será usado (página ou `App.jsx`) sem quebrar
  funcionalidades existentes.
