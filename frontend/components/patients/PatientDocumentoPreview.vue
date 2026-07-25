<template>
  <div class="popreview-wrap" :class="{ 'popreview-wrap--large': variant === 'large' }">
    <article ref="pageRef" class="popreview-page">
      <div class="popreview-bg" aria-hidden="true">
        <img
          class="popreview-bg__logo"
          :src="DOCUMENTO_LOGO_SRC"
          alt=""
        >
      </div>

      <header class="popreview-head">
        <div class="popreview-head__copy">
          <p class="popreview-kicker">{{ kicker || 'Documento' }}</p>
          <h3>{{ title || 'Novo Documento' }}</h3>
          <dl class="popreview-meta">
            <div>
              <dt>Paciente</dt>
              <dd>{{ patientName || '—' }}</dd>
            </div>
            <div>
              <dt>CPF</dt>
              <dd>{{ patientCpf || '—' }}</dd>
            </div>
          </dl>
        </div>
        <div class="popreview-brand" aria-hidden="true">
          <img class="popreview-brand__logo" :src="DOCUMENTO_LOGO_SRC" alt="">
        </div>
      </header>

      <div class="popreview-body">
        <div
          v-if="hasContent"
          class="popreview-content"
          v-html="content"
        />
        <p v-else class="popreview-empty">Preencha o conteúdo para visualizar</p>
      </div>

      <footer class="popreview-foot">
        <div class="popreview-foot__brand" aria-hidden="true">
          <img class="popreview-brand__logo popreview-brand__logo--foot" :src="DOCUMENTO_LOGO_SRC" alt="">
        </div>
        <div class="popreview-foot__sign">
          <p>Nutricionista: {{ authorLine }}</p>
          <span class="popreview-sign-line">{{ authorName || 'Assinatura' }}</span>
        </div>
        <span class="popreview-page-no">Página 1</span>
      </footer>
    </article>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import { DOCUMENTO_LOGO_SRC, htmlToPlainText } from '~/utils/documento-templates.js'

const props = defineProps({
  title: { type: String, default: '' },
  content: { type: String, default: '' },
  kicker: { type: String, default: '' },
  patientName: { type: String, default: '' },
  patientCpf: { type: String, default: '' },
  authorName: { type: String, default: '' },
  authorCrn: { type: String, default: '' },
  variant: { type: String, default: 'default' },
})

const pageRef = ref(null)

const authorLine = computed(() => {
  const name = String(props.authorName || '—').trim()
  const crn = String(props.authorCrn || '').trim()
  if (crn) return `${name} — CRN ${crn}`
  return name
})

const hasContent = computed(() => Boolean(htmlToPlainText(props.content)))

defineExpose({ pageRef })
</script>

<style scoped>
.popreview-wrap {
  display: flex;
  justify-content: center;
  min-height: 0;
  padding: 0.35rem 0 0.75rem;
}

.popreview-wrap--large {
  flex: 1;
  min-height: 0;
  padding: 0.35rem 0 0.5rem;
  justify-content: center;
  align-items: flex-start;
}

.popreview-wrap--large .popreview-page {
  width: min(100%, 30rem);
  max-width: 100%;
  height: auto;
  min-height: 0;
  aspect-ratio: 210 / 297;
  padding: 1.35rem 1.2rem 0.95rem;
  border-radius: 0 !important;
  corner-shape: unset;
  border: 1px solid #dfe3df;
  box-shadow: 0 10px 32px rgba(15, 23, 42, 0.12);
  flex-shrink: 0;
}

.popreview-wrap--large .popreview-kicker {
  font-size: 0.72rem;
}

.popreview-wrap--large .popreview-head h3 {
  font-size: 1rem;
  margin-bottom: 0.45rem;
}

.popreview-wrap--large .popreview-head {
  margin-bottom: 0.65rem;
}

.popreview-wrap--large .popreview-meta {
  grid-template-columns: 1fr 1fr;
  gap: 0.25rem 0.75rem;
}

.popreview-wrap--large .popreview-meta div {
  flex-direction: column;
  gap: 0.05rem;
  font-size: 0.68rem;
}

.popreview-wrap--large .popreview-content {
  font-size: 0.75rem;
  line-height: 1.55;
}

.popreview-wrap--large .popreview-empty {
  font-size: 0.78rem;
  margin-top: 3.5rem;
}

.popreview-wrap--large .popreview-brand__logo {
  width: 1.45rem;
  height: 2rem;
}

.popreview-wrap--large .popreview-foot__sign p {
  font-size: 0.62rem;
}

.popreview-wrap--large .popreview-sign-line {
  font-size: 0.72rem;
}

.popreview-wrap--large .popreview-page-no {
  font-size: 0.62rem;
}

.popreview-wrap--large .popreview-foot {
  margin-top: 0.55rem;
  padding-top: 0.45rem;
}

.popreview-wrap--large .popreview-bg__logo {
  width: min(72%, 11rem);
  right: -22%;
  top: 38%;
  opacity: 0.06;
  transform: translateY(-50%) rotate(-6deg);
}

.popreview-page {
  position: relative;
  width: min(100%, 18.5rem);
  min-height: 26rem;
  aspect-ratio: 210 / 297;
  display: flex;
  flex-direction: column;
  padding: 1.15rem 1rem 0.9rem;
  background: #fff;
  border: 1px solid #ecefed;
  border-radius: var(--cf-radius-control);
  box-shadow: 0 10px 28px rgba(15, 23, 42, 0.08);
  overflow: hidden;
  box-sizing: border-box;
}

.popreview-bg {
  position: absolute;
  inset: 0;
  pointer-events: none;
  overflow: hidden;
}

.popreview-bg__logo {
  position: absolute;
  width: min(68%, 9rem);
  height: auto;
  right: -18%;
  top: 36%;
  transform: translateY(-50%) rotate(-8deg);
  opacity: 0.07;
  filter: saturate(0.85);
  object-fit: contain;
}

.popreview-head,
.popreview-body,
.popreview-foot {
  position: relative;
  z-index: 1;
}

.popreview-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.75rem;
  margin-bottom: 1rem;
}

.popreview-head__copy {
  min-width: 0;
}

.popreview-kicker {
  margin: 0 0 0.2rem;
  font-size: 0.68rem;
  font-weight: 600;
  letter-spacing: 0.02em;
  color: #8a9288;
}

.popreview-head h3 {
  margin: 0 0 0.65rem;
  font-size: 0.92rem;
  font-weight: 700;
  line-height: 1.35;
  color: #2c322c;
}

.popreview-meta {
  display: grid;
  gap: 0.2rem;
  margin: 0;
}

.popreview-meta div {
  display: flex;
  gap: 0.35rem;
  font-size: 0.64rem;
  line-height: 1.35;
}

.popreview-meta dt {
  margin: 0;
  color: #8a9288;
  font-weight: 500;
}

.popreview-meta dd {
  margin: 0;
  color: #374151;
  font-weight: 500;
}

.popreview-brand {
  display: grid;
  justify-items: end;
  gap: 0.15rem;
  flex-shrink: 0;
}

.popreview-brand__logo {
  width: 1.35rem;
  height: 1.9rem;
  object-fit: contain;
}

.popreview-brand__logo--foot {
  width: 1.2rem;
  height: 1.7rem;
}

.popreview-brand__name {
  font-size: 0.58rem;
  font-weight: 700;
  color: #6b7368;
  text-align: right;
  line-height: 1.2;
}

.popreview-body {
  flex: 1;
  min-height: 0;
  overflow: auto;
}

.popreview-content {
  font-size: 0.68rem;
  line-height: 1.65;
  color: #374151;
}

.popreview-content :deep(p) {
  margin: 0 0 0.55rem;
}

.popreview-content :deep(ul),
.popreview-content :deep(ol) {
  margin: 0 0 0.55rem;
  padding-left: 1rem;
}

.popreview-content :deep(li) {
  margin-bottom: 0.2rem;
}

.popreview-content :deep(strong) {
  color: #2c322c;
  font-weight: 600;
}

.popreview-content :deep(table) {
  width: 100%;
  margin: 0 0 0.55rem;
  border-collapse: collapse;
  table-layout: fixed;
}

.popreview-content :deep(tr:first-child th),
.popreview-content :deep(tr:first-child td) {
  background: #f3f5f3;
}

.popreview-content :deep(th),
.popreview-content :deep(td) {
  border: 1px solid #dfe4df;
  padding: 0.25rem 0.35rem;
  vertical-align: top;
  word-break: break-word;
}

.popreview-empty {
  margin: 2.5rem 0 0;
  text-align: center;
  font-size: 0.72rem;
  color: #9aa39a;
}

.popreview-foot {
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: end;
  gap: 0.55rem;
  margin-top: 0.85rem;
  padding-top: 0.65rem;
  border-top: 1px solid #eef1ee;
}

.popreview-foot__brand {
  display: grid;
  gap: 0.08rem;
}

.popreview-foot__sign {
  text-align: center;
  max-width: 12rem;
  margin: 0 auto;
}

.popreview-foot__sign p {
  margin: 0 0 0.2rem;
  font-size: 0.58rem;
  color: #6b7368;
}

.popreview-sign-line {
  display: block;
  font-size: 0.64rem;
  font-weight: 600;
  color: #2c322c;
  border-top: 1px solid #d1d5db;
  padding-top: 0.2rem;
}

.popreview-page-no {
  font-size: 0.58rem;
  color: #9aa39a;
  white-space: nowrap;
}
</style>
