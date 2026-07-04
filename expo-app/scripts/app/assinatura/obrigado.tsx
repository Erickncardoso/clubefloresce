import { createClienteMirrorScreen } from '@/screens/createClienteMirrorScreen';

export default createClienteMirrorScreen({
  route: '/assinatura/obrigado',
  sourceFile: 'cliente/pages/assinatura/obrigado.vue',
  layout: 'patient',
  middleware: ["patient-only"],
});
