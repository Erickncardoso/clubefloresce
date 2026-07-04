import { createClienteMirrorScreen } from '@/screens/createClienteMirrorScreen';

export default createClienteMirrorScreen({
  route: '/comunidade',
  sourceFile: 'cliente/pages/comunidade.vue',
  layout: 'patient',
  middleware: ["patient-only"],
});
