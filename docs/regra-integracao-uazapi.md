# Regra de Integracao UAZAPI (Sem Achismo)

## Objetivo

Padronizar a integracao com a UAZAPI para evitar regressao, comportamento inconsistente e implementacoes baseadas em suposicoes.

## Regra principal (obrigatoria)

Sempre usar endpoint real da UAZAPI conforme documentacao oficial e payload validado em ambiente real.

Nao criar contrato "inventado", nao assumir nomes de campos sem confirmar e nao implementar fallback especulativo antes de validar a resposta real.

## Regras operacionais

1. Toda nova integracao deve partir de endpoint oficial da UAZAPI.
2. Antes de codar, validar:
   - metodo HTTP
   - URL
   - headers obrigatorios (ex: token)
   - body esperado
   - exemplos de resposta (200 e erros)
3. Se houver diferenca entre documentacao e resposta real, registrar e normalizar no backend (nunca espalhar gambiarra no frontend).
4. Preferir endpoint dedicado no backend para casos criticos de negocio (ex: grupo, participantes, nomes, avatares), em vez de depender apenas de proxy generico.
5. Todo parse de payload deve ser defensivo, mas sem "adivinhar" campos nao documentados.
6. Toda mudanca de contrato deve vir com:
   - ajuste de normalizacao
   - validacao manual do fluxo
   - teste automatizado quando possivel

## Proibicoes

- Nao implementar "achismo" de payload.
- Nao usar campo sem confirmar na documentacao/resposta real.
- Nao substituir endpoint oficial por heuristica local.
- Nao introduzir fallback que mascara erro de integracao sem log adequado.

## Fluxo padrao de implementacao

1. Confirmar endpoint oficial na documentacao da UAZAPI.
2. Testar chamada real (com token e payload corretos).
3. Implementar no backend:
   - validacao de entrada
   - chamada ao endpoint real
   - normalizacao minima de resposta
4. Expor contrato estavel para frontend.
5. Atualizar frontend para consumir contrato do backend.
6. Validar com caso real em tela.

## Checklist rapido (PR / revisao)

- Endpoint real da UAZAPI foi usado?
- Metodo, body e headers estao corretos?
- Campos foram confirmados em resposta real?
- Nao ha logica baseada em suposicao?
- Houve normalizacao centralizada no backend?
- Fluxo funcional validado em ambiente real?

## Exemplo de referencia

Para informacoes de grupo, usar endpoint oficial:

- `POST /group/info`
- Exemplo base: `https://erickcardoso.uazapi.com/group/info`
- Campos esperados incluem `Participants`, `AddressingMode`, `OwnerPN` (conforme documentacao/resposta real)

## Vigencia

Esta regra deve ser consultada e seguida em toda manutencao e nova funcionalidade que envolva integracao com a UAZAPI.

