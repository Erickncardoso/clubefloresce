import { Redirect } from 'expo-router';

/** Rota legada — histórico ficou na própria página de check-in. */
export default function CheckInHistoricoScreen() {
  return <Redirect href="/check-in" />;
}
