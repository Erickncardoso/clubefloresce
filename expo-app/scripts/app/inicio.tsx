import { createClienteMirrorScreen } from '@/screens/createClienteMirrorScreen';

export default createClienteMirrorScreen({
  route: '/inicio',
  sourceFile: 'cliente/pages/inicio.vue',
  layout: 'patient',
  middleware: ["patient-only"],
});
