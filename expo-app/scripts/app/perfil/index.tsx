import { createClienteMirrorScreen } from '@/screens/createClienteMirrorScreen';

export default createClienteMirrorScreen({
  route: '/perfil',
  sourceFile: 'cliente/pages/perfil/index.vue',
  layout: 'patient',
  middleware: ["patient-only"],
});
