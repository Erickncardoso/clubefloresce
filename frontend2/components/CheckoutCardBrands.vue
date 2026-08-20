<template>
  <ul class="checkout-brands" aria-label="Bandeiras de crédito aceitas">
    <li>
      <svg viewBox="0 0 48 32" aria-hidden="true"><rect width="48" height="32" rx="5" fill="#fff" /><text x="24" y="21.2" text-anchor="middle" fill="#1A1F71" font-family="Arial, Helvetica, sans-serif" font-size="11.5" font-style="italic" font-weight="800" letter-spacing="0.6">VISA</text></svg>
      <span class="sr-only">Visa</span>
    </li>
    <li>
      <svg viewBox="0 0 48 32" aria-hidden="true"><rect width="48" height="32" rx="5" fill="#fff" /><circle cx="19.2" cy="16" r="8.4" fill="#EB001B" /><circle cx="28.8" cy="16" r="8.4" fill="#F79E1B" /><path fill="#FF5F00" d="M24 9.5a8.4 8.4 0 0 0-4.8 6.5 8.4 8.4 0 0 0 4.8 6.5 8.4 8.4 0 0 0 4.8-6.5A8.4 8.4 0 0 0 24 9.5z" /></svg>
      <span class="sr-only">Mastercard</span>
    </li>
    <li>
      <svg viewBox="0 0 48 32" aria-hidden="true"><rect width="48" height="32" rx="5" fill="#006FCF" /><text x="24" y="14.2" text-anchor="middle" fill="#fff" font-family="Arial, Helvetica, sans-serif" font-size="5.4" font-weight="800" letter-spacing="0.35">AMERICAN</text><text x="24" y="22.4" text-anchor="middle" fill="#fff" font-family="Arial, Helvetica, sans-serif" font-size="5.4" font-weight="800" letter-spacing="0.35">EXPRESS</text></svg>
      <span class="sr-only">American Express</span>
    </li>
    <li>
      <svg viewBox="0 0 48 32" aria-hidden="true"><rect width="48" height="32" rx="5" fill="#fff" /><ellipse cx="24" cy="13.2" rx="9.4" ry="8.6" fill="#004B87" /><ellipse cx="24" cy="13.2" rx="4.2" ry="7.1" fill="#fff" /><path fill="#C8102E" d="M14.6 13.2a9.4 8.6 0 0 1 9.4-8.6v17.2a9.4 8.6 0 0 1-9.4-8.6z" /><path fill="#007A5E" d="M33.4 13.2a9.4 8.6 0 0 0-9.4-8.6v17.2a9.4 8.6 0 0 0 9.4-8.6z" /><text x="24" y="28.4" text-anchor="middle" fill="#1a1a1a" font-family="Arial, Helvetica, sans-serif" font-size="4.2" font-weight="700">DINERS CLUB</text></svg>
      <span class="sr-only">Diners Club</span>
    </li>
    <li>
      <svg viewBox="0 0 48 32" aria-hidden="true"><rect width="48" height="32" rx="5" fill="#fff" /><circle cx="24" cy="16" r="10" fill="#00A4E0" /><rect x="18.4" y="10.2" width="3.6" height="11.6" rx="1.8" fill="#fff" /><rect x="26" y="10.2" width="3.6" height="11.6" rx="1.8" fill="#fff" /></svg>
      <span class="sr-only">Elo</span>
    </li>
  </ul>
</template>

<style scoped>
.checkout-brands {
  display: flex;
  flex-wrap: nowrap;
  align-items: center;
  gap: 0.38rem;
  margin: -0.2rem 0 1rem;
  padding: 0;
  list-style: none;
}

.checkout-brands li {
  position: relative;
  flex: 0 0 auto;
  width: 2.85rem;
  height: 1.85rem;
  border-radius: 0.42rem;
  overflow: hidden;
  box-shadow: 0 1px 2px rgba(20, 20, 20, 0.08);
}

.checkout-brands svg {
  display: block;
  width: 100%;
  height: 100%;
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}
</style>
