import { createClienteMirrorScreen } from '@/screens/createClienteMirrorScreen';

export default createClienteMirrorScreen({
  route: '/bella',
  sourceFile: 'cliente/pages/bella/index.vue',
  layout: 'patient',
  middleware: ["patient-only"],
});
