#!/usr/bin/env bash
# Dispara deploy no Coolify via API (POST /api/v1/deploy) e acompanha o build.
# Não usa webhook — o GitHub Actions chama este script após sync de envs.
#
#   COOLIFY_URL=... COOLIFY_TOKEN=... COOLIFY_APP_UUID=... ./ops/coolify/deploy.sh [rótulo]
#
# Env opcionais:
#   COOLIFY_WAIT=true|false     (default: true)
#   COOLIFY_WAIT_TIMEOUT=900    segundos (default 15min)
#   COOLIFY_WAIT_INTERVAL=10    segundos entre polls

set -euo pipefail

APP_LABEL="${1:-app}"
WAIT="${COOLIFY_WAIT:-true}"
TIMEOUT="${COOLIFY_WAIT_TIMEOUT:-900}"
INTERVAL="${COOLIFY_WAIT_INTERVAL:-10}"

: "${COOLIFY_URL:?}"
: "${COOLIFY_TOKEN:?}"
: "${COOLIFY_APP_UUID:?}"

BASE="${COOLIFY_URL%/}"
API="$BASE/api/v1"

echo "Deploy Coolify ($APP_LABEL) ..."
response="$(curl -fsS -X POST \
  -H "Authorization: Bearer $COOLIFY_TOKEN" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -d "{\"uuid\":\"$COOLIFY_APP_UUID\",\"force\":false}" \
  "$API/deploy")"

deployment_uuid="$(
  python3 -c 'import json,sys
try:
  d=json.loads(sys.argv[1])
  deps=d.get("deployments") or []
  print((deps[0] or {}).get("deployment_uuid") or "")
except Exception:
  print("")
' "$response"
)"

if [[ -z "$deployment_uuid" ]]; then
  echo "::error::Coolify não retornou deployment_uuid"
  exit 1
fi

echo "Deploy enfileirado ($APP_LABEL)."

final_status="queued"
elapsed=0

if [[ "$WAIT" == "true" || "$WAIT" == "1" ]]; then
  echo "Aguardando Coolify (Docker/build) — timeout=${TIMEOUT}s interval=${INTERVAL}s"
  while (( elapsed < TIMEOUT )); do
    dep_json="$(curl -fsS \
      -H "Authorization: Bearer $COOLIFY_TOKEN" \
      -H "Accept: application/json" \
      "$API/deployments/$deployment_uuid")"
    final_status="$(
      python3 -c 'import json,sys
d=json.loads(sys.argv[1])
print((d.get("status") or "unknown").strip())
' "$dep_json"
    )"
    echo "[${elapsed}s] status=$final_status"

    case "$final_status" in
      finished)
        echo "OK — deploy $APP_LABEL concluído no Coolify."
        break
        ;;
      failed|cancelled|cancelled-by-user)
        echo "::error::Deploy $APP_LABEL falhou no Coolify (status=$final_status)"
        python3 -c 'import json,sys,re
d=json.loads(sys.argv[1])
logs=str(d.get("logs") or "")
logs=re.sub(r"[a-z0-9]{20,}","[id]",logs)
print(logs[-3500:])
' "$dep_json" || true
        exit 1
        ;;
    esac

    sleep "$INTERVAL"
    elapsed=$((elapsed + INTERVAL))
  done

  if [[ "$final_status" != "finished" ]]; then
    echo "::error::Timeout aguardando deploy $APP_LABEL (último status=$final_status)"
    exit 1
  fi
else
  echo "Wait desligado — deploy apenas enfileirado."
fi

if [[ -n "${GITHUB_OUTPUT:-}" ]]; then
  {
    echo "status=$final_status"
  } >>"$GITHUB_OUTPUT"
fi

if [[ -n "${GITHUB_STEP_SUMMARY:-}" ]]; then
  {
    echo "### Deploy · ${APP_LABEL}"
    echo
    echo "| Campo | Valor |"
    echo "| --- | --- |"
    echo "| Status final | **$final_status** |"
    echo "| Espera Coolify | \`$WAIT\` (${elapsed}s) |"
    echo
  } >>"$GITHUB_STEP_SUMMARY"
fi
