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
    heading: '1. Aceitação',
    body: 'Ao criar uma conta ou usar o Clube Florescer, você concorda com estes Termos de Uso e com a Política de Privacidade.',
  },
  {
    heading: '2. Serviço',
    body:
      'O app oferece conteúdos, ferramentas de acompanhamento, comunidade e recursos de apoio nutricional. '
      + 'O serviço não substitui consulta presencial ou emergência médica.',
  },
  {
    heading: '3. Assinatura',
    body:
      'O acesso completo pode depender de assinatura ativa. No iPhone, a contratação ou renovação pode ser feita pelo site oficial do Clube Florescer.',
  },
  {
    heading: '4. Encerramento',
    body:
      'Você pode encerrar sua conta a qualquer momento nas configurações do app. Podemos suspender contas que violem estes termos ou a legislação aplicável.',
  },
  {
    heading: '5. Contato',
    body: 'Suporte e dúvidas: contato@nutrisabellajardim.com.br',
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
