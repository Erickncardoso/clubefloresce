#!/usr/bin/env bash
# Copia envs do Coolify → GitHub Actions secrets (repo atual).
# Uso: COOLIFY_TOKEN=... ./ops/coolify/push-github-secrets.sh

set -euo pipefail

: "${COOLIFY_TOKEN:?Defina COOLIFY_TOKEN}"

COOLIFY_URL="${COOLIFY_URL:-https://panel.erickcardoso.com.br}"
API="${COOLIFY_URL%/}/api/v1"

BACKEND_UUID="${COOLIFY_BACKEND_UUID:-kqa4iq7h1majc0jqztsrq4ik}"
FRONTEND_UUID="${COOLIFY_FRONTEND_UUID:-u80x1ajaxs9xvg7vs703n9gl}"
CLIENTE_UUID="${COOLIFY_CLIENTE_UUID:-l73nlpvox9cjfn1wl93l775c}"

if ! command -v gh >/dev/null 2>&1; then
  echo "gh CLI não encontrado." >&2
  exit 1
fi

if ! gh auth status >/dev/null 2>&1; then
  echo "Faça login: gh auth login" >&2
  exit 1
fi

set_secret() {
  local name="$1"
  local value="$2"
  if [[ -z "$value" ]]; then
    echo "skip $name (vazio)"
    return 0
  fi
  printf '%s' "$value" | gh secret set "$name"
  echo "set $name"
}

fetch_envs() {
  local uuid="$1"
  curl -fsS \
    -H "Authorization: Bearer $COOLIFY_TOKEN" \
    -H "Accept: application/json" \
    "$API/applications/$uuid/envs"
}

push_envs() {
  local mode="$1"
  local uuid="$2"
  fetch_envs "$uuid" | python3 -c '
import json, subprocess, sys

mode = sys.argv[1]
data = json.load(sys.stdin)
items = data if isinstance(data, list) else data.get("data", data.get("envs", []))

aliases = {"NODE_ENV": "FRONTEND_NODE_ENV", "PORT": "FRONTEND_PORT"} if mode == "frontend" else {}

for item in items:
    key = item.get("key") or item.get("name") or ""
    val = item.get("real_value") or item.get("value") or ""
    if not key or not str(val).strip():
        continue
    gh_key = aliases.get(key, key)
    subprocess.run(
        ["gh", "secret", "set", gh_key],
        input=str(val),
        text=True,
        check=True,
        stdout=subprocess.DEVNULL,
    )
    print(f"set {gh_key}")
' "$mode"
}

echo "=== Conexão Coolify ==="
set_secret COOLIFY_URL "$COOLIFY_URL"
set_secret COOLIFY_TOKEN "$COOLIFY_TOKEN"
set_secret COOLIFY_BACKEND_UUID "$BACKEND_UUID"
set_secret COOLIFY_FRONTEND_UUID "$FRONTEND_UUID"
set_secret COOLIFY_CLIENTE_UUID "$CLIENTE_UUID"

echo "=== Backend ==="
push_envs backend "$BACKEND_UUID"

echo "=== Frontend ==="
push_envs frontend "$FRONTEND_UUID"

echo "=== Cliente ==="
push_envs cliente "$CLIENTE_UUID"
set_secret NUXT_PUBLIC_MOBILE_APP "true"
set_secret CLIENTE_NODE_ENV "production"

echo "OK — secrets sincronizados Coolify → GitHub."
