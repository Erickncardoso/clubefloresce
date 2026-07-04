import { createClienteMirrorScreen } from '@/screens/createClienteMirrorScreen';

export default createClienteMirrorScreen({
  route: '/assinatura',
  sourceFile: 'cliente/pages/assinatura/index.vue',
  layout: 'patient',
  middleware: ["patient-only"],
});
