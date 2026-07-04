import { createClienteMirrorScreen } from '@/screens/createClienteMirrorScreen';

export default createClienteMirrorScreen({
  route: '/conteudo',
  sourceFile: 'cliente/pages/conteudo/index.vue',
  layout: 'patient',
  middleware: ["patient-only"],
});
