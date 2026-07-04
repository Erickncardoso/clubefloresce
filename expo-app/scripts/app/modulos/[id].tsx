import { createClienteMirrorScreen } from '@/screens/createClienteMirrorScreen';

export default createClienteMirrorScreen({
  route: '/modulos/[id]',
  sourceFile: 'cliente/pages/modulos/[id].vue',
  layout: 'none',
  middleware: ["patient-only"],
});
