<template>
  <div class="popreview-wrap">
    <article ref="pageRef" class="popreview-page">
      <div class="popreview-bg" aria-hidden="true">
        <span class="popreview-bg__blob popreview-bg__blob--1" />
        <span class="popreview-bg__blob popreview-bg__blob--2" />
      </div>

      <header class="popreview-head">
        <div class="popreview-head__copy">
          <p class="popreview-kicker">Orientações</p>
          <h3>{{ title || 'Nova Orientação' }}</h3>
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
          <span class="popreview-brand__mark">CF</span>
          <span class="popreview-brand__name">Clube Florescer</span>
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
          <span class="popreview-brand__mark">CF</span>
          <span class="popreview-brand__name">Clube Florescer</span>
        </div>
        <div class="popreview-foot__sign">
          <p>Nutricionista: {{ authorName || '—' }}</p>
          <span class="popreview-sign-line">{{ authorName || 'Assinatura' }}</span>
        </div>
        <span class="popreview-page-no">Página 1</span>
      </footer>
    </article>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import { htmlToPlainText } from '~/utils/orientacao-templates.js'

const props = defineProps({
  title: { type: String, default: '' },
  content: { type: String, default: '' },
  patientName: { type: String, default: '' },
  patientCpf: { type: String, default: '' },
  authorName: { type: String, default: '' },
})

const pageRef = ref(null)

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

.popreview-page {
  position: relative;
  width: min(100%, 18.5rem);
  min-height: 26rem;
  aspect-ratio: 210 / 297;
  display: flex;
  flex-direction: column;
  padding: 1.1rem 1rem 0.85rem;
  background: #fff;
  border: 1px solid #e8ece9;
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

.popreview-bg__blob {
  position: absolute;
  border-radius: 50%;
  opacity: 0.35;
}

.popreview-bg__blob--1 {
  width: 9rem;
  height: 9rem;
  top: -2rem;
  right: -2rem;
  background: rgba(139, 150, 124, 0.18);
}

.popreview-bg__blob--2 {
  width: 7rem;
  height: 7rem;
  bottom: 3.5rem;
  left: -2.5rem;
  background: rgba(0, 178, 202, 0.12);
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
  gap: 0.65rem;
  margin-bottom: 0.85rem;
}

.popreview-head__copy {
  min-width: 0;
}

.popreview-kicker {
  margin: 0 0 0.15rem;
  font-size: 0.62rem;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: #8a9288;
}

.popreview-head h3 {
  margin: 0 0 0.45rem;
  font-size: 0.82rem;
  font-weight: 600;
  line-height: 1.35;
  color: #2c322c;
}

.popreview-meta {
  display: grid;
  gap: 0.15rem;
  margin: 0;
}

.popreview-meta div {
  display: flex;
  gap: 0.35rem;
  font-size: 0.62rem;
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
  font-weight: 400;
}

.popreview-brand {
  display: grid;
  justify-items: end;
  gap: 0.1rem;
  flex-shrink: 0;
}

.popreview-brand__mark {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.35rem;
  height: 1.35rem;
  border-radius: var(--cf-radius-xs);
  background: #8b967c;
  color: #fff;
  font-size: 0.58rem;
  font-weight: 700;
}

.popreview-brand__name {
  font-size: 0.58rem;
  font-weight: 600;
  color: #5f7560;
  text-align: right;
  line-height: 1.2;
}

.popreview-body {
  flex: 1;
  min-height: 0;
  overflow: auto;
}

.popreview-content {
  font-size: 0.64rem;
  line-height: 1.55;
  color: #374151;
}

.popreview-content :deep(p) {
  margin: 0 0 0.45rem;
}

.popreview-content :deep(ul),
.popreview-content :deep(ol) {
  margin: 0 0 0.45rem;
  padding-left: 1rem;
}

.popreview-content :deep(li) {
  margin-bottom: 0.15rem;
}

.popreview-content :deep(strong) {
  color: #2c322c;
  font-weight: 600;
}

.popreview-content :deep(table) {
  width: 100%;
  margin: 0 0 0.45rem;
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
  padding: 0.22rem 0.32rem;
  vertical-align: top;
  word-break: break-word;
}

.popreview-empty {
  margin: 2rem 0 0;
  text-align: center;
  font-size: 0.68rem;
  color: #9aa39a;
}

.popreview-foot {
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: end;
  gap: 0.45rem;
  margin-top: 0.75rem;
  padding-top: 0.55rem;
  border-top: 1px solid #eef1ee;
}

.popreview-foot__brand {
  display: grid;
  gap: 0.08rem;
}

.popreview-foot__sign {
  text-align: center;
}

.popreview-foot__sign p {
  margin: 0 0 0.15rem;
  font-size: 0.58rem;
  color: #6b7368;
}

.popreview-sign-line {
  display: block;
  font-size: 0.62rem;
  font-weight: 500;
  color: #2c322c;
  border-top: 1px solid #d1d5db;
  padding-top: 0.15rem;
}

.popreview-page-no {
  font-size: 0.58rem;
  color: #9aa39a;
}
</style>
