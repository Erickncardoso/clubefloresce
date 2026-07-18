import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptsDir = path.dirname(fileURLToPath(import.meta.url));
const appDir = path.join(scriptsDir, '..', 'app');

const realScreens = {
  'app/register.tsx': '@/screens/RegisterScreen',
  'app/esqueci-senha.tsx': '@/screens/EsqueciSenhaScreen',
  'app/redefinir-senha.tsx': '@/screens/RedefinirSenhaScreen',
  'app/abrir.tsx': '@/screens/AbrirScreen',
  'app/documento.tsx': '@/screens/DocumentoScreen',
  'app/(tabs)/inicio/index.tsx': '@/screens/HomeScreen',
  'app/(tabs)/bella/index.tsx': '@/screens/BellaHomeScreen',
  'app/(tabs)/evolucao/index.tsx': '@/screens/EvolucaoScreen',
  'app/(tabs)/evolucao/nutricao.tsx': '@/screens/EvolucaoNutricaoScreen',
  'app/(tabs)/conteudo/index.tsx': '@/screens/ConteudoScreen',
  'app/(tabs)/comunidade/index.tsx': '@/screens/ComunidadeScreen',
  'app/onboarding/index.tsx': '@/screens/OnboardingScreen',
  'app/assinatura/index.tsx': '@/screens/SubscriptionScreen',
  'app/assinatura/obrigado.tsx': '@/screens/ObrigadoScreen',
  'app/dieta/index.tsx': '@/screens/DietaScreen',
  'app/cursos/index.tsx': '@/screens/CursosListScreen',
  'app/cursos/[id].tsx': '@/screens/CourseDetailScreen',
  'app/modulos/[id].tsx': '@/screens/ModulePlayerScreen',
  'app/ebooks.tsx': '@/screens/EbooksScreen',
  'app/check-in/index.tsx': '@/screens/CheckInScreen',
  'app/check-in/responder.tsx': '@/screens/CheckInResponderScreen',
  'app/check-in/resumo.tsx': '@/screens/CheckInResumoScreen',
  'app/check-in/concluido.tsx': '@/screens/CheckInConcluidoScreen',
  'app/check-in/historico.tsx': '@/screens/CheckInHistoricoScreen',
  'app/bella/chat/[topic].tsx': '@/screens/BellaChatScreen',
  'app/bella/chat/index.tsx': '@/screens/BellaChatIndexScreen',
  'app/substituicao/index.tsx': '@/screens/SubstituicaoScreen',
  'app/perfil/index.tsx': '@/screens/PerfilScreen',
  'app/perfil/configuracoes.tsx': '@/screens/PerfilConfiguracoesScreen',
  'app/perfil/notificacoes.tsx': '@/screens/PerfilNotificacoesScreen',
};

const screens = [
  { route: '/register', file: 'app/register.tsx', source: 'cliente/pages/register.vue', layout: 'none' },
  { route: '/esqueci-senha', file: 'app/esqueci-senha.tsx', source: 'cliente/pages/esqueci-senha.vue', layout: 'none' },
  { route: '/redefinir-senha', file: 'app/redefinir-senha.tsx', source: 'cliente/pages/redefinir-senha.vue', layout: 'none' },
  { route: '/abrir', file: 'app/abrir.tsx', source: 'cliente/pages/abrir.vue', layout: 'none', middleware: ['patient-guest'] },
  { route: '/documento', file: 'app/documento.tsx', source: 'cliente/pages/documento.vue', layout: 'patient' },
  { route: '/inicio', file: 'app/(tabs)/inicio/index.tsx', source: 'cliente/pages/inicio.vue', layout: 'patient', middleware: ['patient-only'] },
  { route: '/comunidade', file: 'app/(tabs)/comunidade/index.tsx', source: 'cliente/pages/comunidade.vue', layout: 'patient', middleware: ['patient-only'] },
  { route: '/ebooks', file: 'app/ebooks.tsx', source: 'cliente/pages/ebooks.vue', layout: 'patient', middleware: ['patient-only'] },
  { route: '/onboarding', file: 'app/onboarding/index.tsx', source: 'cliente/pages/onboarding/index.vue', layout: 'onboarding', middleware: ['patient-onboarding'] },
  { route: '/assinatura', file: 'app/assinatura/index.tsx', source: 'cliente/pages/assinatura/index.vue', layout: 'patient', middleware: ['patient-only'] },
  { route: '/assinatura/obrigado', file: 'app/assinatura/obrigado.tsx', source: 'cliente/pages/assinatura/obrigado.vue', layout: 'patient', middleware: ['patient-only'] },
  { route: '/dieta', file: 'app/dieta/index.tsx', source: 'cliente/pages/dieta/index.vue', layout: 'patient', middleware: ['patient-only'] },
  { route: '/bella', file: 'app/(tabs)/bella/index.tsx', source: 'cliente/pages/bella/index.vue', layout: 'patient', middleware: ['patient-only'] },
  { route: '/bella/chat', file: 'app/bella/chat/index.tsx', source: 'cliente/pages/bella/chat/index.vue', layout: 'patient', middleware: ['patient-only'] },
  { route: '/bella/chat/[topic]', file: 'app/bella/chat/[topic].tsx', source: 'cliente/pages/bella/chat/[[topic]].vue', layout: 'bella-chat', middleware: ['patient-only'] },
  { route: '/evolucao', file: 'app/(tabs)/evolucao/index.tsx', source: 'cliente/pages/evolucao/index.vue', layout: 'patient', middleware: ['patient-only'] },
  { route: '/evolucao/nutricao', file: 'app/(tabs)/evolucao/nutricao.tsx', source: 'cliente/pages/evolucao/nutricao.vue', layout: 'patient', middleware: ['patient-only'] },
  { route: '/conteudo', file: 'app/(tabs)/conteudo/index.tsx', source: 'cliente/pages/conteudo/index.vue', layout: 'patient', middleware: ['patient-only'] },
  { route: '/cursos', file: 'app/cursos/index.tsx', source: 'cliente/pages/cursos/index.vue', layout: 'patient', middleware: ['patient-only'] },
  { route: '/cursos/[id]', file: 'app/cursos/[id].tsx', source: 'cliente/pages/cursos/[id].vue', layout: 'patient', middleware: ['patient-only'] },
  { route: '/modulos/[id]', file: 'app/modulos/[id].tsx', source: 'cliente/pages/modulos/[id].vue', layout: 'none', middleware: ['patient-only'] },
  { route: '/substituicao', file: 'app/substituicao/index.tsx', source: 'cliente/pages/substituicao/index.vue', layout: 'patient', middleware: ['patient-only'] },
  { route: '/check-in', file: 'app/check-in/index.tsx', source: 'cliente/pages/check-in.vue', layout: 'patient', middleware: ['patient-only'] },
  { route: '/check-in/responder', file: 'app/check-in/responder.tsx', source: 'cliente/pages/check-in/responder.vue', layout: 'patient', middleware: ['patient-only'] },
  { route: '/check-in/resumo', file: 'app/check-in/resumo.tsx', source: 'cliente/pages/check-in/resumo.vue', layout: 'patient', middleware: ['patient-only'] },
  { route: '/check-in/concluido', file: 'app/check-in/concluido.tsx', source: 'cliente/pages/check-in/concluido.vue', layout: 'patient', middleware: ['patient-only'] },
  { route: '/check-in/historico', file: 'app/check-in/historico.tsx', source: 'cliente/pages/check-in/historico.vue', layout: 'patient', middleware: ['patient-only'] },
  { route: '/perfil', file: 'app/perfil/index.tsx', source: 'cliente/pages/perfil/index.vue', layout: 'patient', middleware: ['patient-only'] },
  { route: '/perfil/configuracoes', file: 'app/perfil/configuracoes.tsx', source: 'cliente/pages/perfil/configuracoes.vue', layout: 'patient', middleware: ['patient-only'] },
  { route: '/perfil/notificacoes', file: 'app/perfil/notificacoes.tsx', source: 'cliente/pages/perfil/notificacoes.vue', layout: 'patient', middleware: ['patient-only'] },
];

for (const screen of screens) {
  const middleware = screen.middleware || [];
  const realImport = realScreens[screen.file];

  const content = realImport
    ? `export { default } from '${realImport}';\n`
    : `import { createClienteMirrorScreen } from '@/screens/createClienteMirrorScreen';

export default createClienteMirrorScreen({
  route: '${screen.route}',
  sourceFile: '${screen.source}',
  layout: '${screen.layout}',
  middleware: ${JSON.stringify(middleware)},
});
`;

  const target = path.join(appDir, screen.file.replace(/^app\//, ''));
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, content);
}

console.log(`generated ${screens.length} routes in ${appDir}`);
