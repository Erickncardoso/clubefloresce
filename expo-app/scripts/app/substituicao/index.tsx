import { createClienteMirrorScreen } from '@/screens/createClienteMirrorScreen';

export default createClienteMirrorScreen({
  route: '/substituicao',
  sourceFile: 'cliente/pages/substituicao/index.vue',
  layout: 'patient',
  middleware: ["patient-only"],
});
