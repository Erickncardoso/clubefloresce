import { createClienteMirrorScreen } from '@/screens/createClienteMirrorScreen';

export default createClienteMirrorScreen({
  route: '/cursos/[id]',
  sourceFile: 'cliente/pages/cursos/[id].vue',
  layout: 'patient',
  middleware: ["patient-only"],
});
