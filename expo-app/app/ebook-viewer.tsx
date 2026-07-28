import { Redirect, useLocalSearchParams } from 'expo-router';
import { buildDocumentRouteParams } from '@/lib/patient-document';

/** Rota legada — redireciona para `/documento`. */
export default function EbookViewerScreen() {
  const { url, title } = useLocalSearchParams<{ url?: string; title?: string }>();
  const params = url
    ? buildDocumentRouteParams(decodeURIComponent(url), {
        title: typeof title === 'string' ? title : 'E-book',
        from: '/conteudo',
      })
    : null;

  if (!params) {
    return <Redirect href="/conteudo" />;
  }

  return (
    <Redirect
      href={{
        pathname: '/documento',
        params,
      }}
    />
  );
}
