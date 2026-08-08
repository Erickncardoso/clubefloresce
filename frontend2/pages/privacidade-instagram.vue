<template>
  <main class="igp-page">
    <article class="igp-card">
      <h1>Política de Privacidade — Automação de Instagram</h1>
      <p class="igp-updated">Última atualização: 25 de julho de 2026</p>

      <p>
        Esta política descreve como o <strong>Clube Florescer</strong> trata os dados recebidos
        por meio da integração com a plataforma Instagram (Meta) usada para responder
        automaticamente comentários, respostas de story e mensagens diretas.
      </p>

      <h2>Quais dados coletamos</h2>
      <ul>
        <li>Identificador da sua conta no Instagram no escopo deste aplicativo (IGSID) e nome de usuário público;</li>
        <li>Conteúdo de comentários e mensagens que contenham as palavras-chave configuradas;</li>
        <li>Data e hora das interações.</li>
      </ul>

      <h2>Para que usamos</h2>
      <ul>
        <li>Enviar a resposta automática solicitada por você (por exemplo, um link de material);</li>
        <li>Evitar envios duplicados para a mesma interação;</li>
        <li>Registrar o histórico mínimo necessário ao funcionamento do serviço.</li>
      </ul>

      <h2>O que não fazemos</h2>
      <ul>
        <li>Não vendemos nem compartilhamos seus dados com terceiros;</li>
        <li>Não enviamos mensagens em massa não solicitadas;</li>
        <li>Não armazenamos sua senha do Instagram — a conexão é feita pelo login oficial da Meta.</li>
      </ul>

      <h2>Armazenamento e segurança</h2>
      <p>
        Os dados ficam em banco de dados privado, acessível apenas pelo servidor do Clube Florescer,
        e são mantidos somente pelo tempo necessário ao funcionamento da automação.
      </p>

      <h2>Seus direitos</h2>
      <p>
        Você pode solicitar a exclusão dos seus dados a qualquer momento. Veja como em
        <NuxtLink to="/exclusao-de-dados-instagram">Exclusão de dados</NuxtLink>
        ou escreva para <a href="mailto:contato@clubeflorescer.com.br">contato@clubeflorescer.com.br</a>.
      </p>
    </article>
  </main>
</template>

<script setup>
definePageMeta({ layout: false })
useHead({ title: 'Privacidade — Instagram | Clube Florescer' })
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

.igp-card ul {
  padding-left: 1.25rem;
}
</style>
