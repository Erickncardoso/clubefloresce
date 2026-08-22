#!/usr/bin/env bash
# Sincroniza variáveis de ambiente no Coolify via API (bulk).
# Uso:
#   COOLIFY_URL=https://... COOLIFY_TOKEN=... COOLIFY_APP_UUID=... \
#   ./ops/coolify/sync-envs.sh ops/coolify/backend.env.list backend
#
# Cada linha do arquivo .list é um NOME de variável.
# O valor vem do ambiente do runner (GitHub Secret com o mesmo nome).
# Valores vazios / ausentes são pulados (não sobrescreve prod).

set -euo pipefail

LIST_FILE="${1:-}"
APP_LABEL="${2:-app}"
if [[ -z "$LIST_FILE" || ! -f "$LIST_FILE" ]]; then
  echo "Uso: $0 <arquivo.env.list> [rótulo]" >&2
  exit 1
fi

: "${COOLIFY_URL:?Defina COOLIFY_URL (ex.: https://panel.erickcardoso.com.br)}"
: "${COOLIFY_TOKEN:?Defina COOLIFY_TOKEN (API token do Coolify)}"
: "${COOLIFY_APP_UUID:?Defina COOLIFY_APP_UUID (UUID da application)}"

BASE="${COOLIFY_URL%/}"
API="$BASE/api/v1"

tmp="$(mktemp)"
synced_list="$(mktemp)"
skipped_list="$(mktemp)"
trap 'rm -f "$tmp" "$synced_list" "$skipped_list"' EXIT

synced=0
skipped=0

while IFS= read -r raw || [[ -n "$raw" ]]; do
  line="${raw%%#*}"
  line="${line#"${line%%[![:space:]]*}"}"
  line="${line%"${line##*[![:space:]]}"}"
  [[ -z "$line" ]] && continue

  if ! declare -p "$line" &>/dev/null; then
    echo "skip $line (não definido no CI)"
    echo "$line" >>"$skipped_list"
    skipped=$((skipped + 1))
    continue
  fi
  value="${!line}"
  if [[ -z "$value" ]]; then
    echo "skip $line (valor vazio — não sobrescreve)"
    echo "$line" >>"$skipped_list"
    skipped=$((skipped + 1))
    continue
  fi

  printf '%s\0%s\0' "$line" "$value" >>"$tmp"
  echo "sync $line"
  echo "$line" >>"$synced_list"
  synced=$((synced + 1))
done < "$LIST_FILE"

if [[ -n "${GITHUB_OUTPUT:-}" ]]; then
  {
    echo "synced=$synced"
    echo "skipped=$skipped"
  } >>"$GITHUB_OUTPUT"
fi

if [[ -n "${GITHUB_STEP_SUMMARY:-}" ]]; then
  {
    echo "### Sync envs · ${APP_LABEL}"
    echo
    echo "| Métrica | Valor |"
    echo "| --- | --- |"
    echo "| Enviadas | **$synced** |"
    echo "| Puladas (vazio) | $skipped |"
    echo
    if [[ "$synced" -gt 0 ]]; then
      echo "<details><summary>Keys sincronizadas (só nomes)</summary>"
      echo
      echo "\`\`\`"
      sort -u "$synced_list"
      echo "\`\`\`"
      echo "</details>"
      echo
    fi
    if [[ "$skipped" -gt 0 ]]; then
      echo "<details><summary>Keys puladas (prod preservado)</summary>"
      echo
      echo "\`\`\`"
      sort -u "$skipped_list"
      echo "\`\`\`"
      echo "</details>"
      echo
    fi
  } >>"$GITHUB_STEP_SUMMARY"
fi

if [[ "$synced" -eq 0 ]]; then
  echo "Nenhuma env para sincronizar ($skipped puladas)."
  exit 0
fi

payload="$(
  python3 - "$tmp" <<'PY'
import json, sys
path = sys.argv[1]
items = []
with open(path, "rb") as f:
    data = f.read().split(b"\0")
parts = [p.decode("utf-8", "replace") for p in data if p]
for i in range(0, len(parts) - 1, 2):
    items.append({"key": parts[i], "value": parts[i + 1]})
print(json.dumps({"data": items}))
PY
)"

echo "Enviando $synced env(s) para app ${APP_LABEL} ..."
curl -fsS --retry 8 --retry-delay 10 --retry-all-errors --connect-timeout 60 --max-time 300 -X PATCH \
  -H "Authorization: Bearer $COOLIFY_TOKEN" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -d "$payload" \
  "$API/applications/$COOLIFY_APP_UUID/envs/bulk"

echo
echo "OK — sync ${APP_LABEL} concluído (puladas: $skipped)."
