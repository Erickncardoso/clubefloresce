import { createClienteMirrorScreen } from '@/screens/createClienteMirrorScreen';

export default createClienteMirrorScreen({
  route: '/dieta',
  sourceFile: 'cliente/pages/dieta/index.vue',
  layout: 'patient',
  middleware: ["patient-only"],
});
