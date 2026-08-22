#!/usr/bin/env bash
# Desativa deploy automático (webhook/git push) nos apps Coolify.
# Deploy passa a ser SOMENTE via GitHub Actions → POST /api/v1/deploy.
#
# Uso: COOLIFY_TOKEN=... ./ops/coolify/disable-auto-deploy.sh

set -euo pipefail

: "${COOLIFY_TOKEN:?Defina COOLIFY_TOKEN}"

COOLIFY_URL="${COOLIFY_URL:-https://panel.erickcardoso.com.br}"
API="${COOLIFY_URL%/}/api/v1"

UUIDS=(
  "${COOLIFY_BACKEND_UUID:-kqa4iq7h1majc0jqztsrq4ik}"
  "${COOLIFY_FRONTEND_UUID:-u80x1ajaxs9xvg7vs703n9gl}"
  "${COOLIFY_CLIENTE_UUID:-l73nlpvox9cjfn1wl93l775c}"
)

for uuid in "${UUIDS[@]}"; do
  name="$(curl -fsS -H "Authorization: Bearer $COOLIFY_TOKEN" "$API/applications/$uuid" \
    | python3 -c "import json,sys; print(json.load(sys.stdin).get('name','?'))")"
  curl -fsS -X PATCH \
    -H "Authorization: Bearer $COOLIFY_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"is_auto_deploy_enabled": false}' \
    "$API/applications/$uuid" >/dev/null
  auto="$(curl -fsS -H "Authorization: Bearer $COOLIFY_TOKEN" "$API/applications/$uuid" \
    | python3 -c "import json,sys; print(json.load(sys.stdin)['settings']['is_auto_deploy_enabled'])")"
  echo "$name ($uuid): is_auto_deploy_enabled=$auto"
done

echo "OK — deploy automático desligado. Use GitHub Actions (ops/coolify/deploy.sh)."
