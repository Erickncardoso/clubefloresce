export const LEGAL_DOCUMENTS = {
  privacidade: {
    title: 'Política de Privacidade',
    updatedAt: '27 de julho de 2026',
    sections: [
      {
        heading: '1. Quem somos',
        body:
          'O Clube Florescer é um programa de acompanhamento nutricional oferecido por Nutri Sabella Jardim. '
          + 'Esta política descreve como tratamos dados pessoais no aplicativo móvel e nos serviços relacionados.',
      },
      {
        heading: '2. Dados que coletamos',
        body:
          'Coletamos dados de cadastro (nome, e-mail, telefone), dados de saúde informados voluntariamente '
          + '(peso, metas, check-ins, diário alimentar), registros de uso do app, fotos que você publica na comunidade, '
          + 'denúncias de conteúdo (motivo e identificação da publicação) '
          + 'e dados técnicos necessários ao funcionamento (token de sessão, versão do app).',
      },
      {
        heading: '3. Finalidade do tratamento',
        body:
          'Utilizamos seus dados para prestar o serviço contratado, personalizar orientações, permitir comunicação '
          + 'com sua nutricionista, processar assinatura, enviar lembretes e melhorar a experiência no app.',
      },
      {
        heading: '4. Compartilhamento',
        body:
          'Seus dados clínicos são acessíveis à sua nutricionista responsável e à equipe autorizada do Clube Florescer. '
          + 'Não vendemos dados pessoais. Prestadores de infraestrutura (hospedagem, e-mail, pagamentos) podem '
          + 'processar dados conforme contratos de confidencialidade.',
      },
      {
        heading: '5. Retenção e exclusão',
        body:
          'Mantemos os dados enquanto sua conta estiver ativa ou enquanto necessário para cumprir obrigações legais. '
          + 'Você pode solicitar exclusão da conta em Configurações → Excluir minha conta. A exclusão remove o acesso '
          + 'e apaga dados vinculados à conta, salvo registros exigidos por lei.',
      },
      {
        heading: '6. Segurança',
        body:
          'Adotamos medidas técnicas e organizacionais para proteger seus dados, incluindo transmissão criptografada (HTTPS) '
          + 'e armazenamento seguro de credenciais no dispositivo.',
      },
      {
        heading: '7. Seus direitos (LGPD)',
        body:
          'Você pode solicitar acesso, correção, portabilidade, anonimização ou exclusão de dados, além de revogar '
          + 'consentimentos quando aplicável. Entre em contato pelo e-mail de suporte informado abaixo.',
      },
      {
        heading: '8. Contato',
        body:
          'Dúvidas sobre privacidade: contato@nutrisabellajardim.com.br',
      },
    ],
  },
  termos: {
    title: 'Termos de Uso',
    updatedAt: '27 de julho de 2026',
    sections: [
      {
        heading: '1. Aceitação',
        body:
          'Ao criar uma conta ou usar o Clube Florescer, você concorda com estes Termos de Uso e com a Política de Privacidade.',
      },
      {
        heading: '2. Serviço',
        body:
          'O app oferece conteúdos, ferramentas de acompanhamento, comunidade e recursos de apoio nutricional. '
          + 'O serviço não substitui consulta presencial ou emergência médica.',
      },
      {
        heading: '3. Conta e segurança',
        body:
          'Você é responsável por manter suas credenciais em sigilo e por informar dados verdadeiros no cadastro. '
          + 'Notifique-nos imediatamente sobre uso não autorizado da conta.',
      },
      {
        heading: '4. Assinatura',
        body:
          'O acesso completo depende de assinatura ativa vinculada à sua conta. No aplicativo iOS, a contratação e '
          + 'renovação são feitas exclusivamente no site oficial (app.nutrisabellajardim.com.br), fora da App Store. '
          + 'Após pagar, entre no app com a mesma conta e toque em Atualizar acesso em Perfil → Status da assinatura. '
          + 'Dúvidas: contato@nutrisabellajardim.com.br.',
      },
      {
        heading: '5. Conduta na comunidade',
        body:
          'É proibido publicar conteúdo ofensivo, ilegal, que viole privacidade de terceiros ou que promova práticas '
          + 'de saúde inseguras. Use Denunciar ou Bloquear publicação no menu de cada post. '
          + 'Conteúdos podem ser moderados ou removidos pela equipe.',
      },
      {
        heading: '6. Propriedade intelectual',
        body:
          'Materiais, marcas e conteúdos do Clube Florescer são protegidos. É vedada a reprodução não autorizada.',
      },
      {
        heading: '7. Encerramento',
        body:
          'Você pode encerrar sua conta a qualquer momento nas configurações do app. Podemos suspender contas que '
          + 'violen estes termos ou a legislação aplicável.',
      },
      {
        heading: '8. Contato',
        body:
          'Suporte e dúvidas: contato@nutrisabellajardim.com.br',
      },
    ],
  },
} as const;

export type LegalDocumentKey = keyof typeof LEGAL_DOCUMENTS;
