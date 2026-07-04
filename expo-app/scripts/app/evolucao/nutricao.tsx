import { createClienteMirrorScreen } from '@/screens/createClienteMirrorScreen';

export default createClienteMirrorScreen({
  route: '/evolucao/nutricao',
  sourceFile: 'cliente/pages/evolucao/nutricao.vue',
  layout: 'patient',
  middleware: ["patient-only"],
});
