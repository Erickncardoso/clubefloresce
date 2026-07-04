import { createClienteMirrorScreen } from '@/screens/createClienteMirrorScreen';

export default createClienteMirrorScreen({
  route: '/evolucao',
  sourceFile: 'cliente/pages/evolucao/index.vue',
  layout: 'patient',
  middleware: ["patient-only"],
});
