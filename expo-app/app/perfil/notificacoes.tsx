import { createClienteMirrorScreen } from '@/screens/createClienteMirrorScreen';

export default createClienteMirrorScreen({
  route: '/perfil/notificacoes',
  sourceFile: 'cliente/pages/perfil/notificacoes.vue',
  layout: 'patient',
  middleware: ["patient-only"],
});
