import ClienteMirrorScreen from '@/components/ClienteMirrorScreen';
import PatientShell from '@/components/PatientShell';
import type { ClienteScreenMeta } from '@/lib/cliente-screen-map';

export function createClienteMirrorScreen(meta: ClienteScreenMeta) {
  return function ClienteMirrorRoute() {
    const content = <ClienteMirrorScreen {...meta} />;

    if (meta.layout === 'patient') {
      return <PatientShell>{content}</PatientShell>;
    }

    return content;
  };
}
