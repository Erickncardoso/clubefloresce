import { createClienteMirrorScreen } from '@/screens/createClienteMirrorScreen';

export default createClienteMirrorScreen({
  route: '/check-in/resumo',
  sourceFile: 'cliente/pages/check-in/resumo.vue',
  layout: 'patient',
  middleware: ["patient-only"],
});
