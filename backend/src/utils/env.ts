/** Lê variável de ambiente, removendo aspas extras comuns no Coolify/Docker. */
export function readEnv(name: string): string | null {
  const raw = process.env[name];
  if (raw == null) return null;

  let value = raw.trim();
  if (!value) return null;

  if (
    (value.startsWith('"') && value.endsWith('"'))
    || (value.startsWith("'") && value.endsWith("'"))
  ) {
    value = value.slice(1, -1).trim();
  }

  return value || null;
}

export function maskSecret(value: string | null, visibleTail = 4): string {
  if (!value) return "(ausente)";
  if (value.length <= visibleTail) return "***";
  return `***${value.slice(-visibleTail)}`;
}
