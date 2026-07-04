import { createClienteMirrorScreen } from '@/screens/createClienteMirrorScreen';

export default createClienteMirrorScreen({
  route: '/check-in',
  sourceFile: 'cliente/pages/check-in.vue',
  layout: 'patient',
  middleware: ["patient-only"],
});
