import { createClienteMirrorScreen } from '@/screens/createClienteMirrorScreen';

export default createClienteMirrorScreen({
  route: '/cursos',
  sourceFile: 'cliente/pages/cursos/index.vue',
  layout: 'patient',
  middleware: ["patient-only"],
});
