import { parseCardExpiration } from './masks';

export type CardFormInput = {
  cardholderName: string;
  cardNumber: string;
  expirationDate: string;
  securityCode: string;
  identificationNumber: string;
};

export async function createMercadoPagoCardToken(
  publicKey: string,
  card: CardFormInput,
): Promise<string> {
  const { month, year } = parseCardExpiration(card.expirationDate);
  const response = await fetch(
    `https://api.mercadopago.com/v1/card_tokens?public_key=${encodeURIComponent(publicKey)}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        card_number: card.cardNumber.replace(/\D/g, ''),
        expiration_month: month,
        expiration_year: year,
        security_code: card.securityCode.replace(/\D/g, ''),
        cardholder: {
          name: card.cardholderName.trim(),
          identification: {
            type: 'CPF',
            number: card.identificationNumber.replace(/\D/g, ''),
          },
        },
      }),
    },
  );

  const data = await response.json();
  if (!response.ok) {
    const message = data?.message
      || data?.cause?.[0]?.description
      || 'Não foi possível validar o cartão.';
    throw new Error(message);
  }
  if (!data?.id) throw new Error('Mercado Pago não retornou token do cartão.');
  return String(data.id);
}
