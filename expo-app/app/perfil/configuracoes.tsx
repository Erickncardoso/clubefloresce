import { createClienteMirrorScreen } from '@/screens/createClienteMirrorScreen';

export default createClienteMirrorScreen({
  route: '/perfil/configuracoes',
  sourceFile: 'cliente/pages/perfil/configuracoes.vue',
  layout: 'patient',
  middleware: ["patient-only"],
});
