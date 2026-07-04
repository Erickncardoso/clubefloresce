import { createClienteMirrorScreen } from '@/screens/createClienteMirrorScreen';

export default createClienteMirrorScreen({
  route: '/bella/chat/[topic]',
  sourceFile: 'cliente/pages/bella/chat/[[topic]].vue',
  layout: 'bella-chat',
  middleware: ["patient-only"],
});
