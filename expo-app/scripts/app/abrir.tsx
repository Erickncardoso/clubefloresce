import { createClienteMirrorScreen } from '@/screens/createClienteMirrorScreen';

export default createClienteMirrorScreen({
  route: '/abrir',
  sourceFile: 'cliente/pages/abrir.vue',
  layout: 'none',
  middleware: ["patient-guest"],
});
