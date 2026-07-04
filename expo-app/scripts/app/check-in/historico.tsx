import { createClienteMirrorScreen } from '@/screens/createClienteMirrorScreen';

export default createClienteMirrorScreen({
  route: '/check-in/historico',
  sourceFile: 'cliente/pages/check-in/historico.vue',
  layout: 'patient',
  middleware: ["patient-only"],
});
