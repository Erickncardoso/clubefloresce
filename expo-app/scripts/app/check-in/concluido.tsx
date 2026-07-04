import { createClienteMirrorScreen } from '@/screens/createClienteMirrorScreen';

export default createClienteMirrorScreen({
  route: '/check-in/concluido',
  sourceFile: 'cliente/pages/check-in/concluido.vue',
  layout: 'patient',
  middleware: ["patient-only"],
});
