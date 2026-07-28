<template>
  <div class="patient-page legal-page patient-page--no-tab">
    <PatientHeader title="Ajuda e Suporte" show-back back-to="/perfil/configuracoes" :show-bell="false" />
    <article class="legal-page__body">
      <section>
        <h2>Fale com a gente</h2>
        <p>
          Está com dúvidas, problemas técnicos ou precisa de ajuda com sua conta no Clube Florescer?
          Envie uma mensagem para <a href="mailto:contato@nutrisabellajardim.com.br">contato@nutrisabellajardim.com.br</a>
          e nossa equipe responde em até 2 dias úteis.
        </p>
      </section>

      <section>
        <h2>Perguntas frequentes</h2>

        <h3>Esqueci minha senha, e agora?</h3>
        <p>
          Na tela de login, toque em "Esqueci a senha" e siga as instruções enviadas para o seu e-mail cadastrado.
        </p>

        <h3>Como funciona a assinatura?</h3>
        <p>
          A contratação e renovação do plano são feitas pelo site oficial. Depois de confirmar o pagamento,
          volte ao app e toque em "atualizar acesso" para liberar seu conteúdo.
        </p>

        <h3>Como excluo minha conta?</h3>
        <p>
          Vá em Perfil → Configurações → Excluir minha conta. A exclusão é permanente e remove seus dados
          conforme nossa <NuxtLink to="/legal/privacidade">Política de Privacidade</NuxtLink>.
        </p>

        <h3>Encontrei um problema técnico no app</h3>
        <p>
          Descreva o que aconteceu (e, se possível, uma captura de tela) e envie para o e-mail de suporte acima.
        </p>
      </section>

      <section>
        <h2>Outros canais</h2>
        <p>
          WhatsApp da nutricionista (pacientes ativos): disponível dentro do app, na tela Início.<br>
          Termos de Uso: <NuxtLink to="/legal/termos">clubeflorescer</NuxtLink> ·
          Privacidade: <NuxtLink to="/legal/privacidade">clubeflorescer</NuxtLink>
        </p>
      </section>
    </article>
  </div>
</template>

<script setup>
definePageMeta({ layout: 'patient' })
</script>

<style scoped>
.legal-page__body {
  padding: 1rem 1.25rem 2rem;
  display: grid;
  gap: 1.25rem;
}
section h2 {
  font-size: 1rem;
  margin: 0 0 0.5rem;
}
section h3 {
  font-size: 0.92rem;
  margin: 0.75rem 0 0.25rem;
  color: var(--cf-text, #141414);
}
section p {
  margin: 0;
  color: var(--cf-text-muted, #6b7280);
  line-height: 1.55;
  font-size: 0.92rem;
}
section p a {
  color: var(--cf-green-dark, #6f7863);
  font-weight: 600;
}
</style>
