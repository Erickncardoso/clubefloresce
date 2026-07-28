import type { AppToastPayload } from '@/providers/AppToastProvider';

/** Alerta verde — sucesso / confirmação. */
export function toastSuccess(title: string, message?: string): AppToastPayload {
  return {
    type: 'success',
    title,
    message,
  };
}

/** Alerta vermelho — erro. */
export function toastError(title: string, message?: string): AppToastPayload {
  return {
    type: 'error',
    title,
    message: message || 'Tente novamente.',
  };
}

/** Alerta verde — chamada / ação especial (mesmo visual do PWA). */
export function toastCall(title: string, message?: string): AppToastPayload {
  return {
    type: 'call',
    title,
    message,
  };
}

export function toastSaved(label = 'Alterações') {
  return toastSuccess(`${label} salvas`);
}

export function toastSaveError(message?: string) {
  return toastError('Não foi possível salvar', message);
}
