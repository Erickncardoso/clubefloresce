export type ClienteScreenMeta = {
  route: string;
  sourceFile: string;
  layout?: 'none' | 'patient' | 'onboarding' | 'bella-chat';
  middleware?: string[];
};

/** Mapa 1:1 das telas do PWA `cliente/pages/`. */
export const CLIENTE_SCREEN_MAP: ClienteScreenMeta[] = [
  { route: '/', sourceFile: 'cliente/pages/index.vue', layout: 'none', middleware: ['patient-guest'] },
  { route: '/register', sourceFile: 'cliente/pages/register.vue', layout: 'none' },
  { route: '/esqueci-senha', sourceFile: 'cliente/pages/esqueci-senha.vue', layout: 'none' },
  { route: '/redefinir-senha', sourceFile: 'cliente/pages/redefinir-senha.vue', layout: 'none' },
  { route: '/abrir', sourceFile: 'cliente/pages/abrir.vue', layout: 'none', middleware: ['patient-guest'] },
  { route: '/documento', sourceFile: 'cliente/pages/documento.vue', layout: 'patient' },
  { route: '/inicio', sourceFile: 'cliente/pages/inicio.vue', layout: 'patient', middleware: ['patient-only'] },
  { route: '/onboarding', sourceFile: 'cliente/pages/onboarding/index.vue', layout: 'onboarding', middleware: ['patient-onboarding'] },
  { route: '/assinatura', sourceFile: 'cliente/pages/assinatura/index.vue', layout: 'patient', middleware: ['patient-only'] },
  { route: '/assinatura/obrigado', sourceFile: 'cliente/pages/assinatura/obrigado.vue', layout: 'patient', middleware: ['patient-only'] },
  { route: '/dieta', sourceFile: 'cliente/pages/dieta/index.vue', layout: 'patient', middleware: ['patient-only'] },
  { route: '/bella', sourceFile: 'cliente/pages/bella/index.vue', layout: 'patient', middleware: ['patient-only'] },
  { route: '/bella/chat', sourceFile: 'cliente/pages/bella/chat/index.vue', layout: 'patient', middleware: ['patient-only'] },
  { route: '/bella/chat/[topic]', sourceFile: 'cliente/pages/bella/chat/[[topic]].vue', layout: 'bella-chat', middleware: ['patient-only'] },
  { route: '/evolucao', sourceFile: 'cliente/pages/evolucao/index.vue', layout: 'patient', middleware: ['patient-only'] },
  { route: '/evolucao/nutricao', sourceFile: 'cliente/pages/evolucao/nutricao.vue', layout: 'patient', middleware: ['patient-only'] },
  { route: '/conteudo', sourceFile: 'cliente/pages/conteudo/index.vue', layout: 'patient', middleware: ['patient-only'] },
  { route: '/cursos', sourceFile: 'cliente/pages/cursos/index.vue', layout: 'patient', middleware: ['patient-only'] },
  { route: '/cursos/[id]', sourceFile: 'cliente/pages/cursos/[id].vue', layout: 'patient', middleware: ['patient-only'] },
  { route: '/modulos/[id]', sourceFile: 'cliente/pages/modulos/[id].vue', layout: 'none', middleware: ['patient-only'] },
  { route: '/ebooks', sourceFile: 'cliente/pages/ebooks.vue', layout: 'patient', middleware: ['patient-only'] },
  { route: '/comunidade', sourceFile: 'cliente/pages/comunidade.vue', layout: 'patient', middleware: ['patient-only'] },
  { route: '/substituicao', sourceFile: 'cliente/pages/substituicao/index.vue', layout: 'patient', middleware: ['patient-only'] },
  { route: '/check-in', sourceFile: 'cliente/pages/check-in.vue', layout: 'patient', middleware: ['patient-only'] },
  { route: '/check-in/responder', sourceFile: 'cliente/pages/check-in/responder.vue', layout: 'patient', middleware: ['patient-only'] },
  { route: '/check-in/resumo', sourceFile: 'cliente/pages/check-in/resumo.vue', layout: 'patient', middleware: ['patient-only'] },
  { route: '/check-in/concluido', sourceFile: 'cliente/pages/check-in/concluido.vue', layout: 'patient', middleware: ['patient-only'] },
  { route: '/check-in/historico', sourceFile: 'cliente/pages/check-in/historico.vue', layout: 'patient', middleware: ['patient-only'] },
  { route: '/perfil', sourceFile: 'cliente/pages/perfil/index.vue', layout: 'patient', middleware: ['patient-only'] },
  { route: '/perfil/configuracoes', sourceFile: 'cliente/pages/perfil/configuracoes.vue', layout: 'patient', middleware: ['patient-only'] },
  { route: '/perfil/notificacoes', sourceFile: 'cliente/pages/perfil/notificacoes.vue', layout: 'patient', middleware: ['patient-only'] },
  { route: '/chamada', sourceFile: 'cliente/pages/chamada.vue', layout: 'none', middleware: ['patient-only'] },
];

export function findClienteScreen(route: string): ClienteScreenMeta | undefined {
  return CLIENTE_SCREEN_MAP.find((item) => item.route === route);
}
