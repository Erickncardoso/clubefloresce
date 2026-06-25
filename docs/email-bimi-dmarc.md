# E-mail: BIMI, DMARC e logo no Gmail

Guia para exibir a logo do Clube Florescer ao lado de `contato@` e `noreply@` no Gmail e reforçar autenticação.

Domínio: **nutrisabellajardim.com.br**  
Remetentes: `contato@`, `noreply@` (Resend)  
Logo BIMI (quadrada, SVG Tiny PS):  
`https://app.nutrisabellajardim.com.br/bimi/clube-florescer.svg`

Arquivo no repo: `frontend/public/bimi/clube-florescer.svg` (copiado em `cliente/public/bimi/`).

---

## Checklist rápido

| # | Etapa | Onde |
|---|--------|------|
| 1 | Domínio verificado no Resend | [resend.com/domains](https://resend.com/domains) |
| 2 | SPF + DKIM no DNS | Painel do domínio (Cloudflare, Registro.br, etc.) |
| 3 | DMARC `p=quarantine` ou `reject` | DNS `_dmarc` |
| 4 | Registro BIMI | DNS `default._bimi` |
| 5 | Logo publicada em HTTPS | App paciente em produção |
| 6 | Google Postmaster Tools | [postmaster.google.com](https://postmaster.google.com) |
| 7 | VMC (certificado de marca) | DigiCert / Entrust — **obrigatório no Gmail** para avatar |

Verificar DNS localmente:

```bash
node backend/scripts/check-email-dns.mjs
```

---

## 1. Resend — domínio e DNS base

1. Acesse **Resend → Domains → Add domain** → `nutrisabellajardim.com.br`
2. Copie os registros exatos que o Resend mostrar (podem variar).
3. Marque como **Verified** antes de seguir.

### SPF (TXT na raiz `@`)

Use o valor que o Resend indicar. Exemplo típico:

```txt
Tipo:  TXT
Nome:  @
Valor: v=spf1 include:amazonses.com ~all
```

Se já existir SPF, **não crie outro TXT** — edite e adicione `include:amazonses.com` num único registro.

### DKIM (TXT)

```txt
Tipo:  TXT
Nome:  resend._domainkey
Valor: (copiar do painel Resend — começa com v=DKIM1 ou p=MIG…)
```

---

## 2. DMARC (obrigatório para BIMI)

### Fase A — monitorar (1–2 semanas)

```txt
Tipo:  TXT
Nome:  _dmarc
Valor: v=DMARC1; p=none; rua=mailto:contato@nutrisabellajardim.com.br; adkim=s; aspf=s;
```

### Fase B — exigido para BIMI / Gmail

Depois de confirmar que SPF e DKIM passam nos relatórios:

```txt
Tipo:  TXT
Nome:  _dmarc
Valor: v=DMARC1; p=quarantine; pct=100; rua=mailto:contato@nutrisabellajardim.com.br; adkim=s; aspf=s;
```

Opcional (mais rigoroso):

```txt
v=DMARC1; p=reject; pct=100; rua=mailto:contato@nutrisabellajardim.com.br; adkim=s; aspf=s;
```

---

## 3. BIMI — logo ao lado do remetente

### Registro DNS (sem VMC — Yahoo e alguns clientes)

```txt
Tipo:  TXT
Nome:  default._bimi
Valor: v=BIMI1; l=https://app.nutrisabellajardim.com.br/bimi/clube-florescer.svg;
```

### Registro DNS (com VMC — Gmail)

Após comprar o **Verified Mark Certificate (VMC)** e hospedar o `.pem`:

```txt
Tipo:  TXT
Nome:  default._bimi
Valor: v=BIMI1; l=https://app.nutrisabellajardim.com.br/bimi/clube-florescer.svg; a=https://app.nutrisabellajardim.com.br/bimi/vmc.pem;
```

Hospede `vmc.pem` em `cliente/public/bimi/vmc.pem` **somente depois** de obter o certificado (não commitar arquivo real no git).

### VMC para Gmail

1. Registrar marca no INPI (Brasil) ou equivalente internacional.
2. Contratar VMC: [DigiCert Verified Mark Certificate](https://www.digicert.com/tls-ssl/verified-mark-certificate) ou Entrust.
3. Enviar a logo quadrada (`clube-florescer.svg`) e validar domínio.
4. Publicar o `.pem` na URL do registro `a=`.
5. Atualizar o TXT `default._bimi` com o parâmetro `a=`.

Sem VMC, o Gmail **pode não** mostrar a logo redonda — mas a logo **dentro** do e-mail HTML já funciona via `EMAIL_LOGO_URL`.

---

## 4. Google Postmaster Tools

1. Acesse [postmaster.google.com](https://postmaster.google.com)
2. Adicione **nutrisabellajardim.com.br**
3. Verifique o domínio (TXT que o Google pedir)
4. Aguarde reputação e alinhamento DMARC
5. Em **Brand Indicators (BIMI)**, informe a URL da logo se a opção aparecer

---

## 5. Gravatar (complementar, opcional)

Funciona em alguns clientes, não substitui BIMI no Gmail.

1. Crie conta em [gravatar.com](https://gravatar.com)
2. Adicione os e-mails `contato@nutrisabellajardim.com.br` e `noreply@nutrisabellajardim.com.br`
3. Confirme cada caixa (encaminhamento ou acesso)
4. Use a mesma imagem quadrada da logo

---

## 6. Variáveis no backend (.env)

```env
EMAIL_FROM_CONTACT="Clube Florescer <contato@nutrisabellajardim.com.br>"
EMAIL_FROM_NOREPLY="Clube Florescer <noreply@nutrisabellajardim.com.br>"
EMAIL_LOGO_URL=https://app.nutrisabellajardim.com.br/bimi/clube-florescer.svg
PATIENT_APP_URL=https://app.nutrisabellajardim.com.br
```

---

## 7. Deploy da logo

Após deploy do app paciente, teste no navegador:

```
https://app.nutrisabellajardim.com.br/bimi/clube-florescer.svg
```

Deve retornar **200** e `Content-Type: image/svg+xml`.

---

## 8. Ordem recomendada

1. Verificar domínio no Resend (SPF + DKIM)
2. Publicar logo (`/bimi/clube-florescer.svg`)
3. DMARC `p=none` → monitorar 1–2 semanas
4. DMARC `p=quarantine`
5. Registro BIMI `default._bimi`
6. Google Postmaster Tools
7. VMC quando quiser logo redonda no Gmail
8. `node backend/scripts/check-email-dns.mjs`

---

## Troubleshooting

| Problema | Causa provável |
|----------|----------------|
| Logo não aparece no Gmail | Falta VMC ou DMARC não está em quarantine/reject |
| BIMI inválido | SVG não é Tiny PS ou URL não é HTTPS |
| E-mail cai em spam | SPF/DKIM falhando — conferir Resend |
| Logo no corpo OK, avatar não | Normal sem BIMI+VMC — são coisas diferentes |

Documentação Resend: [Managing Domains](https://resend.com/docs/dashboard/domains/introduction)
