import { createClienteMirrorScreen } from '@/screens/createClienteMirrorScreen';

export default createClienteMirrorScreen({
  route: '/ebooks',
  sourceFile: 'cliente/pages/ebooks.vue',
  layout: 'patient',
  middleware: ["patient-only"],
});
