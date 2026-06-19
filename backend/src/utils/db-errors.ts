export function mapDatabaseError(error: unknown): string | null {
  const code = (error as { code?: string })?.code;
  const message = error instanceof Error ? error.message : String(error || "");

  if (
    code === "P2024"
    || /connection pool/i.test(message)
    || /Timed out fetching a new connection/i.test(message)
  ) {
    return "Banco de dados temporariamente indisponível. Aguarde alguns segundos e tente novamente.";
  }

  if (/Can't reach database server|ECONNREFUSED|ENOTFOUND/i.test(message)) {
    return "Não foi possível conectar ao banco de dados. Tente novamente em instantes.";
  }

  if (/prisma/i.test(message) || /Invalid `prisma/i.test(message)) {
    return "Serviço temporariamente indisponível. Tente novamente.";
  }

  return null;
}
