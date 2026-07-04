import { createClienteMirrorScreen } from '@/screens/createClienteMirrorScreen';

export default createClienteMirrorScreen({
  route: '/bella/chat',
  sourceFile: 'cliente/pages/bella/chat/index.vue',
  layout: 'patient',
  middleware: ["patient-only"],
});
