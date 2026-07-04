import { useCallback, useState } from 'react';
import { createMercadoPagoCardToken } from '@/lib/mercadopago';
import { usePatientApi } from '@/hooks/usePatientApi';

export function useBilling() {
  const { request } = usePatientApi();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchConfig = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      return await request('/billing/config');
    } catch (err) {
      setError((err as Error).message);
      return null;
    } finally {
      setLoading(false);
    }
  }, [request]);

  const fetchSubscription = useCallback(async () => {
    try {
      return await request('/billing/subscription/me');
    } catch {
      return null;
    }
  }, [request]);

  const subscribeWithPix = useCallback(async (payload: {
    planId: string;
    payerIdentification?: { type: string; number: string };
  }) => {
    setLoading(true);
    setError('');
    try {
      return await request('/billing/subscribe/pix', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    } catch (err) {
      setError((err as Error).message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [request]);

  const subscribeWithCard = useCallback(async (payload: {
    publicKey: string;
    planId: string;
    payerEmail: string;
    payerName: string;
    amount: number;
    card: {
      cardholderName: string;
      cardNumber: string;
      expirationDate: string;
      securityCode: string;
      identificationNumber: string;
    };
  }) => {
    setLoading(true);
    setError('');
    try {
      const cardToken = await createMercadoPagoCardToken(payload.publicKey, payload.card);
      return await request('/billing/subscribe/card', {
        method: 'POST',
        body: JSON.stringify({
          planId: payload.planId,
          cardToken,
          payerEmail: payload.payerEmail,
          payerName: payload.payerName,
          identification: {
            type: 'CPF',
            number: payload.card.identificationNumber.replace(/\D/g, ''),
          },
        }),
      });
    } catch (err) {
      setError((err as Error).message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [request]);

  return {
    loading,
    error,
    setError,
    fetchConfig,
    fetchSubscription,
    subscribeWithPix,
    subscribeWithCard,
  };
}
