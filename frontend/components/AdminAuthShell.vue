<template>
  <div class="auth-container">
    <aside class="auth-visual" aria-hidden="true">
      <div class="auth-visual-bg">
        <div class="auth-visual-orb auth-visual-orb--one" />
        <div class="auth-visual-orb auth-visual-orb--two" />
        <div class="auth-visual-orb auth-visual-orb--three" />
      </div>
      <div class="visual-content">
        <span class="brand-badge">Portal nutricionista</span>
        <h1>
          Nutrição que
          <span>floresce</span>
          de dentro para fora.
        </h1>
        <p>Acompanhe pacientes, conteúdos e jornadas em um só lugar.</p>
      </div>
    </aside>

    <main class="auth-main">
      <div class="auth-card cf-squircle cf-squircle--surface">
        <header v-if="title" class="auth-header">
          <img src="/logoflorescer.svg" alt="Florescer" class="auth-logo" width="128" height="38">
          <h2>{{ title }}</h2>
          <p v-if="subtitle">{{ subtitle }}</p>
        </header>
        <slot />
      </div>

      <footer class="main-footer">
        &copy; 2026 Florescer
      </footer>
    </main>
  </div>
</template>

<script setup>
defineProps({
  title: { type: String, default: '' },
  subtitle: { type: String, default: '' },
})
</script>

<style scoped>
.auth-container {
  --auth-green: #8B967C;
  --auth-green-glow: #8ec487;
  --auth-text: #1a2e24;
  --auth-muted: #5c6b64;
  --auth-border: #e2e8e4;
  --auth-surface: #ffffff;

  display: flex;
  min-height: 100vh;
  min-height: 100dvh;
  width: 100%;
  font-family: var(--cf-font);
  color: var(--auth-text);
  background: #f4f7f5;
}

.auth-visual {
  position: relative;
  flex: 1.05;
  display: flex;
  align-items: center;
  padding: clamp(2.5rem, 5vw, 4.5rem);
  overflow: hidden;
  background: linear-gradient(145deg, #5a6152 0%, #8B967C 42%, #9aa88f 100%);
}

@media (max-width: 1024px) {
  .auth-visual {
    display: none;
  }
}

.auth-visual-bg {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.auth-visual-orb {
  position: absolute;
  border-radius: 50%;
  filter: blur(0.5px);
}

.auth-visual-orb--one {
  top: -12%;
  right: -8%;
  width: min(28rem, 55vw);
  height: min(28rem, 55vw);
  background: radial-gradient(circle, rgba(168, 213, 162, 0.35) 0%, transparent 68%);
}

.auth-visual-orb--two {
  bottom: -18%;
  left: -10%;
  width: min(22rem, 45vw);
  height: min(22rem, 45vw);
  background: radial-gradient(circle, rgba(255, 255, 255, 0.12) 0%, transparent 70%);
}

.auth-visual-orb--three {
  top: 42%;
  left: 38%;
  width: 9rem;
  height: 9rem;
  background: radial-gradient(circle, rgba(142, 196, 135, 0.22) 0%, transparent 72%);
}

.visual-content {
  position: relative;
  z-index: 1;
  max-width: 32rem;
  color: #fff;
}

.brand-badge {
  display: inline-flex;
  align-items: center;
  margin-bottom: 1.75rem;
  padding: 0.45rem 0.9rem;
  border: 1px solid rgba(255, 255, 255, 0.22);
  border-radius: var(--cf-radius-pill);
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  font-size: 0.72rem;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.visual-content h1 {
  margin: 0 0 1.15rem;
  font-size: clamp(2rem, 3.4vw, 3rem);
  font-weight: 700;
  line-height: 1.12;
  letter-spacing: -0.03em;
  text-wrap: balance;
}

.visual-content h1 span {
  color: var(--auth-green-glow);
}

.visual-content p {
  margin: 0;
  max-width: 28rem;
  font-size: 1.02rem;
  line-height: 1.6;
  color: rgba(255, 255, 255, 0.86);
}

.auth-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: clamp(1.5rem, 4vw, 3rem);
}

.auth-card {
  width: 100%;
  max-width: 26rem;
  padding: clamp(1.5rem, 3vw, 2rem);
  background: var(--auth-surface);
  border: 1px solid var(--auth-border);
  box-shadow:
    0 1px 2px rgba(26, 46, 36, 0.04),
    0 12px 36px rgba(26, 46, 36, 0.06);
}

.auth-header {
  margin-bottom: 1.65rem;
  text-align: center;
}

.auth-logo {
  display: block;
  margin: 0 auto 1rem;
  object-fit: contain;
}

.auth-header h2 {
  margin: 0 0 0.4rem;
  font-size: 1.45rem;
  font-weight: 700;
  letter-spacing: -0.02em;
  color: var(--auth-text);
}

.auth-header p {
  margin: 0;
  font-size: 0.9rem;
  line-height: 1.5;
  color: var(--auth-muted);
}

.main-footer {
  margin-top: 1.5rem;
  font-size: 0.75rem;
  font-weight: 500;
  color: #9aa8a2;
}

:deep(.auth-form) {
  display: flex;
  flex-direction: column;
  gap: 1.35rem;
}

:deep(.form-group.field--float) {
  position: relative;
  margin-top: 0.35rem;
}

:deep(.form-group--stacked) {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

:deep(.form-group--stacked > label) {
  display: block;
  margin: 0;
  font-size: 0.76rem;
  font-weight: 700;
  color: var(--auth-text);
}

:deep(.form-group.field--float > label) {
  position: absolute;
  top: -0.58rem;
  left: 0.78rem;
  z-index: 2;
  margin: 0;
  padding: 0 0.4rem;
  background: var(--auth-surface);
  font-size: 0.76rem;
  font-weight: 700;
  line-height: 1;
  color: var(--auth-text);
  pointer-events: none;
}

:deep(.form-group.field--float.focused > label) {
  color: var(--auth-green);
}

:deep(.input-wrapper) {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  border: 1.5px solid var(--auth-border);
  padding: 0 0.9rem;
  background: var(--auth-surface);
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
}

:deep(.input-icon) {
  width: 1.125rem;
  height: 1.125rem;
  flex-shrink: 0;
  color: #b0bab5;
  transition: color 0.15s ease;
}

:deep(.input-wrapper input) {
  flex: 1;
  min-width: 0;
  border: none;
  background: transparent;
  padding: 0.95rem 0 0.85rem;
  font-family: inherit;
  font-size: 0.95rem;
  color: var(--auth-text);
  outline: none;
}

:deep(.input-wrapper input::placeholder) {
  color: #b0bab5;
}

:deep(.form-group.focused .input-wrapper) {
  border-color: #9fc499;
  box-shadow: 0 0 0 3px rgba(45, 90, 39, 0.1);
}

:deep(.form-group.focused .input-icon) {
  color: var(--auth-green);
}

:deep(.error-banner) {
  display: flex;
  align-items: center;
  gap: 0.65rem;
  padding: 0.9rem 1rem;
  border: 1px solid #fed7d7;
  background: #fff5f5;
  color: #c53030;
  font-size: 0.88rem;
  font-weight: 600;
}

:deep(.error-icon) {
  width: 1.125rem;
  height: 1.125rem;
  flex-shrink: 0;
}

:deep(.auth-footer-link) {
  margin: 0;
  text-align: center;
  font-size: 0.86rem;
}

:deep(.auth-footer-link a) {
  color: var(--auth-green);
  font-weight: 700;
  text-decoration: none;
}

:deep(.status-block),
:deep(.success-block) {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1.25rem;
  text-align: center;
  line-height: 1.55;
  color: var(--auth-muted);
  font-size: 0.92rem;
}

:deep(.btn-auth-submit--inline) {
  width: auto;
  min-width: 10.5rem;
  max-width: 100%;
  min-height: 2.75rem;
  padding: 0.62rem 1.35rem;
  text-decoration: none;
}

@supports (corner-shape: squircle) {
  .auth-card.cf-squircle--surface,
  :deep(.input-wrapper.cf-squircle--control),
  :deep(.btn-auth-submit.cf-squircle--control),
  :deep(.error-banner.cf-squircle--control) {
    corner-shape: squircle;
  }
}
</style>
