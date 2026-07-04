import { createClienteMirrorScreen } from '@/screens/createClienteMirrorScreen';

export default createClienteMirrorScreen({
  route: '/check-in/responder',
  sourceFile: 'cliente/pages/check-in/responder.vue',
  layout: 'patient',
  middleware: ["patient-only"],
});
