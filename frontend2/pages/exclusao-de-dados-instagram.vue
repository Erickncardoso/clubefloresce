<template>
  <main class="igp-page">
    <article class="igp-card">
      <h1>Exclusão de Dados — Automação de Instagram</h1>
      <p class="igp-updated">Última atualização: 25 de julho de 2026</p>

      <p>
        Se você interagiu com o Instagram do <strong>Clube Florescer</strong> e deseja excluir
        os dados associados à sua conta (identificador, nome de usuário e histórico de
        interações com as automações), siga um dos caminhos abaixo.
      </p>

      <h2>Como solicitar a exclusão</h2>
      <ol>
        <li>
          Envie um e-mail para
          <a href="mailto:contato@clubeflorescer.com.br">contato@clubeflorescer.com.br</a>
          com o assunto <strong>“Exclusão de dados — Instagram”</strong>, informando o seu
          nome de usuário (@) do Instagram; ou
        </li>
        <li>Envie uma mensagem direta no Instagram do Clube Florescer pedindo a exclusão.</li>
      </ol>

      <h2>O que acontece depois</h2>
      <ul>
        <li>Confirmamos o recebimento do pedido em até 72 horas;</li>
        <li>Excluímos todos os registros associados à sua conta em até 30 dias;</li>
        <li>Você recebe uma confirmação quando a exclusão for concluída.</li>
      </ul>

      <p>
        Detalhes sobre como tratamos seus dados estão na nossa
        <NuxtLink to="/privacidade-instagram">Política de Privacidade</NuxtLink>.
      </p>
    </article>
  </main>
</template>

<script setup>
definePageMeta({ layout: false })
useHead({ title: 'Exclusão de dados — Instagram | Clube Florescer' })
</script>

<style scoped>
.igp-page {
  min-height: 100vh;
  display: flex;
  justify-content: center;
  padding: 2.5rem 1.25rem;
  background: #faf7f2;
}

.igp-card {
  max-width: 46rem;
  width: 100%;
  background: #fff;
  border-radius: var(--cf-radius-control);
  padding: 2.5rem 2rem;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.06);
  color: #333;
  line-height: 1.65;
}

.igp-card h1 {
  font-size: 1.5rem;
  margin: 0 0 0.25rem;
}

.igp-updated {
  font-size: 0.85rem;
  opacity: 0.65;
  margin-bottom: 1.5rem;
}

.igp-card h2 {
  font-size: 1.1rem;
  margin: 1.5rem 0 0.5rem;
}

.igp-card ul,
.igp-card ol {
  padding-left: 1.25rem;
}
</style>
