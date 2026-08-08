<template>
  <div class="chat-conversation-empty" aria-label="Conversa sem mensagens">
    <div class="chat-date-pill" role="status">{{ todayLabel }}</div>
    <div class="chat-e2e-notice" role="note">
      <Lock class="chat-e2e-notice__lock" aria-hidden="true" />
      <p class="chat-e2e-notice__text">
        As mensagens e ligações são protegidas com a criptografia de ponta a ponta. Somente as pessoas que fazem parte da conversa podem ler, ouvir e compartilhar o conteúdo dessas conversas.
        <a
          class="chat-e2e-notice__link"
          href="https://www.whatsapp.com/security"
          target="_blank"
          rel="noopener noreferrer"
        >Clique para saber mais.</a>
      </p>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { Lock } from 'lucide-vue-next'
import { formatConversationDateLabel } from '~/composables/whatsapp/useWhatsappUtils.js'

const todayLabel = computed(() => formatConversationDateLabel(Date.now()))
</script>
