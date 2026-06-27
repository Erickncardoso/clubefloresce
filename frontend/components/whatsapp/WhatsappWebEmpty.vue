<template>
  <div class="wa-web-empty">
    <div class="wa-web-empty__inner">
      <div class="wa-web-empty__illustration" aria-hidden="true">
        <svg viewBox="0 0 380 260" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="40" y="30" width="300" height="190" rx="12" fill="#fff" stroke="#d1d7db" stroke-width="2" />
          <rect x="56" y="48" width="268" height="154" rx="4" fill="#f0f2f5" />
          <rect x="72" y="64" width="120" height="10" rx="5" fill="#d1d7db" />
          <rect x="72" y="84" width="200" height="8" rx="4" fill="#e9edef" />
          <rect x="72" y="100" width="180" height="8" rx="4" fill="#e9edef" />
          <rect x="72" y="116" width="160" height="8" rx="4" fill="#e9edef" />
          <circle cx="290" cy="170" r="28" fill="#25d366" opacity="0.15" />
          <path d="M278 170l8 8 16-16" stroke="#25d366" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" />
          <rect x="130" y="175" width="120" height="220" rx="16" fill="#fff" stroke="#d1d7db" stroke-width="2" />
          <rect x="142" y="188" width="96" height="170" rx="4" fill="#f0f2f5" />
          <rect x="158" y="204" width="64" height="8" rx="4" fill="#d1d7db" />
          <rect x="158" y="220" width="48" height="6" rx="3" fill="#e9edef" />
          <circle cx="190" cy="330" r="10" fill="#f0f2f5" stroke="#d1d7db" stroke-width="2" />
        </svg>
      </div>
      <h2 class="wa-web-empty__title">WhatsApp Web</h2>
      <p class="wa-web-empty__subtitle">
        Envie e receba mensagens sem manter seu celular conectado.<br />
        Selecione uma conversa ao lado para começar.
      </p>
    </div>
    <footer class="wa-web-empty__footer">
      <Lock class="wa-web-empty__lock" aria-hidden="true" />
      <span>Suas mensagens pessoais são protegidas com criptografia de ponta a ponta.</span>
    </footer>
  </div>
</template>

<script setup>
import { Lock } from 'lucide-vue-next'
</script>

<style scoped>
.wa-web-empty {
  flex: 1 1 0;
  min-height: 0;
  width: 100%;
  height: 100%;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: #f0f2f5;
  position: relative;
  border-left: 1px solid #e9edef;
}
.wa-web-empty__inner {
  text-align: center;
  max-width: 560px;
  padding: 2rem;
}
.wa-web-empty__illustration {
  margin: 0 auto 2rem;
  width: min(320px, 70%);
}
.wa-web-empty__illustration svg {
  width: 100%;
  height: auto;
  display: block;
}
.wa-web-empty__title {
  margin: 0 0 1rem;
  font-size: 2rem;
  font-weight: 300;
  color: #41525d;
  letter-spacing: -0.02em;
}
.wa-web-empty__subtitle {
  margin: 0;
  font-size: 0.875rem;
  line-height: 1.5;
  color: #667781;
}
.wa-web-empty__footer {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.35rem;
  padding: 1.75rem 1rem;
  font-size: 0.875rem;
  color: #667781;
  border-top: 3px solid #25d366;
  background: #f0f2f5;
}
.wa-web-empty__lock {
  width: 10px;
  height: 10px;
  flex-shrink: 0;
  color: #667781;
}
</style>
