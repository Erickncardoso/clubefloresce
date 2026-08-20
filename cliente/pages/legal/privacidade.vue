<template>
  <div class="patient-page legal-page patient-page--no-tab">
    <PatientHeader />
    <article class="legal-page__body">
      <p class="legal-page__updated">Atualizado em 18 de julho de 2026</p>
      <section v-for="section in sections" :key="section.heading">
        <h2>{{ section.heading }}</h2>
        <p>{{ section.body }}</p>
      </section>
    </article>
  </div>
</template>

<script setup>
definePageMeta({ layout: 'patient' })

const sections = [
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
      + '(peso, metas, check-ins, diário alimentar), registros de uso do app, fotos que você publica na comunidade '
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
      + 'Você pode solicitar exclusão da conta em Configurações → Excluir minha conta.',
  },
  {
    heading: '6. Contato',
    body: 'Dúvidas sobre privacidade: contato@nutrisabellajardim.com.br',
  },
]
</script>

<style scoped>
.legal-page__body {
  padding: 1rem 1.25rem 2rem;
  display: grid;
  gap: 1rem;
}
.legal-page__updated {
  color: var(--cf-text-muted, #6b7280);
  font-size: 0.85rem;
}
section h2 {
  font-size: 1rem;
  margin: 0 0 0.35rem;
}
section p {
  margin: 0;
  color: var(--cf-text-muted, #6b7280);
  line-height: 1.55;
  font-size: 0.92rem;
}
</style>
