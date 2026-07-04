<template>
  <Teleport to="body">
    <div v-if="open" class="ig-safari-escape" role="dialog" aria-modal="true" aria-label="Abrir no Safari">
      <div class="ig-safari-escape__card">
        <p class="ig-safari-escape__eyebrow">Instagram</p>
        <h2 class="ig-safari-escape__title">Abrir no Safari</h2>
        <p class="ig-safari-escape__text">
          Para o app funcionar direito (login, notificações e instalação), abra este link no Safari.
        </p>

        <button type="button" class="ig-safari-escape__primary" @click="openSafari">
          Abrir no Safari
        </button>

        <button type="button" class="ig-safari-escape__secondary" @click="copyLink">
          {{ copied ? 'Link copiado' : 'Copiar link' }}
        </button>

        <p class="ig-safari-escape__hint">
          Se não abrir sozinho: toque em <strong>⋯</strong> no canto superior → <strong>Abrir no navegador</strong>.
        </p>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { tryIosSafariEscape, shouldShowInstagramSafariEscape } from '~/utils/instagram-external-browser'

const open = ref(false)
const copied = ref(false)

function openSafari() {
  tryIosSafariEscape(window.location.href)
}

async function copyLink() {
  const href = window.location.href
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(href)
    } else {
      const input = document.createElement('textarea')
      input.value = href
      input.setAttribute('readonly', '')
      input.style.position = 'fixed'
      input.style.opacity = '0'
      document.body.appendChild(input)
      input.select()
      document.execCommand('copy')
      document.body.removeChild(input)
    }
    copied.value = true
    window.setTimeout(() => { copied.value = false }, 2200)
  } catch {
    copied.value = false
  }
}

onMounted(() => {
  if (!shouldShowInstagramSafariEscape()) return
  window.setTimeout(() => {
    if (shouldShowInstagramSafariEscape()) open.value = true
  }, 900)
})
</script>

<style scoped>
.ig-safari-escape {
  position: fixed;
  inset: 0;
  z-index: 25000;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  padding: 1rem 1rem calc(1rem + env(safe-area-inset-bottom));
  background: rgba(15, 23, 42, 0.58);
  backdrop-filter: blur(4px);
}

.ig-safari-escape__card {
  width: min(100%, 24rem);
  border-radius: 1.25rem;
  background: #fff;
  padding: 1.25rem 1.15rem 1.1rem;
  box-shadow: 0 18px 48px rgba(15, 23, 42, 0.22);
}

.ig-safari-escape__eyebrow {
  margin: 0 0 0.35rem;
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #64748b;
}

.ig-safari-escape__title {
  margin: 0 0 0.55rem;
  font-size: 1.25rem;
  line-height: 1.2;
  color: #0f172a;
}

.ig-safari-escape__text {
  margin: 0 0 1rem;
  font-size: 0.92rem;
  line-height: 1.45;
  color: #475569;
}

.ig-safari-escape__primary,
.ig-safari-escape__secondary {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  min-height: 3rem;
  border-radius: 999px;
  font: inherit;
  font-size: 0.95rem;
  font-weight: 700;
  cursor: pointer;
}

.ig-safari-escape__primary {
  border: none;
  background: #007aff;
  color: #fff;
}

.ig-safari-escape__secondary {
  margin-top: 0.55rem;
  border: 1px solid #dbe3ea;
  background: #fff;
  color: #0f172a;
}

.ig-safari-escape__hint {
  margin: 0.95rem 0 0;
  font-size: 0.82rem;
  line-height: 1.45;
  color: #64748b;
  text-align: center;
}
</style>
