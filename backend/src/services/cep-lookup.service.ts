export type CepLookupResult = {
  zipCode: string;
  street: string;
  neighborhood: string;
  city: string;
  state: string;
};

function onlyDigits(value: unknown): string {
  return String(value || "").replace(/\D/g, "").slice(0, 8);
}

export async function lookupCep(cep: unknown): Promise<CepLookupResult> {
  const digits = onlyDigits(cep);
  if (digits.length !== 8) {
    throw Object.assign(new Error("Informe um CEP com 8 dígitos."), { status: 400 });
  }

  const response = await fetch(`https://viacep.com.br/ws/${digits}/json/`, {
    headers: { Accept: "application/json" },
  });

  if (!response.ok) {
    throw Object.assign(new Error("Não foi possível buscar o CEP."), { status: 502 });
  }

  const data = (await response.json()) as {
    erro?: boolean;
    cep?: string;
    logradouro?: string;
    bairro?: string;
    localidade?: string;
    uf?: string;
  };

  if (!data || data.erro) {
    throw Object.assign(new Error("CEP não encontrado."), { status: 404 });
  }

  return {
    zipCode: String(data.cep || `${digits.slice(0, 5)}-${digits.slice(5)}`),
    street: String(data.logradouro || "").trim(),
    neighborhood: String(data.bairro || "").trim(),
    city: String(data.localidade || "").trim(),
    state: String(data.uf || "").trim().toUpperCase(),
  };
}
