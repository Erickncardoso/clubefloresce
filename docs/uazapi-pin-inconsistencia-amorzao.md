# Evidencias - inconsistencia de pin no UAZAPI (Amorzao)

Data: 2026-04-24  
Ambiente: `localhost:3001` (proxy backend)  
Endpoint observado: `POST /api/whatsapp/proxy/chat/find`

## Contexto

No WhatsApp oficial (celular/web), o chat **Amorzao** aparece fixado.  
No payload retornado pela UAZAPI, o mesmo chat vem com `wa_isPinned: false`.

## Evidencia 1 - consulta direta por chat

Request observado no proxy:

```json
{
  "wa_chatid": "5511975178048@s.whatsapp.net",
  "offset": 0
}
```

Response observado no proxy:

```json
{
  "request_wa_chatid": "5511975178048@s.whatsapp.net",
  "wa_chatid": "5511975178048@s.whatsapp.net",
  "wa_name": "Isabella",
  "wa_contactName": "Amorzao😍❤️",
  "name": "Amorzao😍❤️",
  "wa_isPinned": false
}
```

## Evidencia 2 - filtro de chats fixados

Request observado no proxy:

```json
{
  "operator": "AND",
  "sort": "-wa_lastMsgTimestamp",
  "limit": 200,
  "offset": 0,
  "wa_isPinned": true
}
```

Resumo de resposta observado no proxy:

```json
{
  "total": 1,
  "containsAmorzao": false
}
```

## Conclusao tecnica

Existe divergencia entre o estado de pin no cliente oficial do WhatsApp e o estado retornado pelo endpoint `chat/find` da UAZAPI para chat privado.

## Acao temporaria aplicada no frontend

- Reconciliacao de pin em duas leituras UAZAPI:
  - lista geral de chats;
  - lista com filtro `wa_isPinned: true`.
- O pin final so promove para `true` quando houver evidencia positiva e evita rebaixamento por resposta pontual inconsistente.

## Proximo passo recomendado (fornecedor UAZAPI)

Validar internamente no backend da UAZAPI a sincronizacao do campo `wa_isPinned` para conversas privadas (`@s.whatsapp.net` e `@lid`) no endpoint `chat/find`.
