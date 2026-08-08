<template>
  <Teleport to="body">
    <div v-if="open" class="poll-modal-backdrop" @click.self="$emit('cancel')">
      <div class="poll-modal-shell" role="dialog" aria-modal="true" aria-label="Criar mensagem interativa">
      <section class="poll-modal modal-card">
      <header class="poll-modal-header">
        <h3>Mensagem interativa</h3>
        <button type="button" class="poll-close-btn" aria-label="Fechar" @click="$emit('cancel')">✕</button>
      </header>

      <div class="poll-modal-body">
        <div class="modal-fields">
          <div class="field field--float">
            <label for="poll-type">Tipo</label>
            <SharedCfSelect
              id="poll-type"
              :model-value="form.type"
              :options="messageTypeOptions"
              :disabled="sending"
              @update:model-value="updateField('type', $event)"
            />
          </div>

          <div v-if="form.type !== 'pix-button'" class="field field--float">
            <label for="poll-text">Texto principal</label>
            <input
              id="poll-text"
              :value="form.text"
              type="text"
              class="cf-squircle cf-squircle--control"
              placeholder="Digite o texto principal"
              :disabled="sending"
              @input="updateField('text', $event.target.value)"
            />
          </div>

          <div v-if="form.type === 'button'" class="field field--float field--group poll-field-group">
            <label>Botões de ação</label>
            <InteractiveButtonsBuilder
              :model-value="form.choicesText"
              :disabled="sending"
              @update:model-value="updateField('choicesText', $event)"
            />
          </div>

          <div v-else-if="form.type === 'poll'" class="field field--float">
            <label for="poll-choices">Opções da enquete</label>
            <textarea
              id="poll-choices"
              :value="form.choicesText"
              class="cf-squircle cf-squircle--control"
              placeholder="Opção 1&#10;Opção 2"
              rows="4"
              :disabled="sending"
              @input="updateField('choicesText', $event.target.value)"
            />
          </div>

          <div v-if="form.type === 'carousel'" class="field field--float field--group poll-field-group">
            <label>Cartões do carrossel</label>
            <InteractiveCarouselBuilder
              :model-value="form.carouselCardsText"
              :disabled="sending"
              @update:model-value="updateField('carouselCardsText', $event)"
            />
          </div>

          <div v-if="form.type === 'list'" class="field field--float">
            <label for="poll-list-button">Texto do botão da lista</label>
            <input
              id="poll-list-button"
              :value="form.listButton"
              class="cf-squircle cf-squircle--control"
              type="text"
              placeholder="Ver opções"
              :disabled="sending"
              @input="updateField('listButton', $event.target.value)"
            />
          </div>

          <div v-if="form.type === 'button' || form.type === 'list'" class="field field--float">
            <label for="poll-footer">
              Rodapé <span class="field-optional">(opcional)</span>
            </label>
            <input
              id="poll-footer"
              :value="form.footerText"
              class="cf-squircle cf-squircle--control"
              type="text"
              placeholder="Texto de rodapé"
              :disabled="sending"
              @input="updateField('footerText', $event.target.value)"
            />
          </div>

          <div v-if="form.type === 'list'" class="field field--float field--group poll-field-group">
            <label>Itens da lista</label>
            <InteractiveListBuilder
              :model-value="form.choicesText"
              :disabled="sending"
              @update:model-value="updateField('choicesText', $event)"
            />
          </div>

          <div v-if="form.type === 'button'" class="field field--float">
            <label for="poll-image">
              Imagem do botão <span class="field-optional">(opcional)</span>
            </label>
            <input
              id="poll-image"
              :value="form.imageButton"
              class="cf-squircle cf-squircle--control"
              type="text"
              placeholder="https://..."
              :disabled="sending"
              @input="updateField('imageButton', $event.target.value)"
            />
          </div>

          <label v-if="form.type === 'poll'" class="poll-toggle-row">
            <span>Permitir várias respostas</span>
            <input
              :checked="Boolean(form.allowMultiple)"
              type="checkbox"
              :disabled="sending"
              @change="updateField('allowMultiple', $event.target.checked)"
            />
          </label>

          <template v-if="form.type === 'request-payment' || form.type === 'pix-button'">
            <div class="field field--float">
              <label for="poll-pix-type">Tipo da chave PIX</label>
              <SharedCfSelect
                id="poll-pix-type"
                :model-value="form.pixType"
                :options="pixTypeOptions"
                :disabled="sending"
                @update:model-value="updateField('pixType', $event)"
              />
            </div>

            <div class="field field--float">
              <label for="poll-pix-key">Chave PIX</label>
              <input
                id="poll-pix-key"
                :value="form.pixKey"
                class="cf-squircle cf-squircle--control"
                type="text"
                placeholder="Digite a chave PIX"
                :disabled="sending"
                @input="updateField('pixKey', $event.target.value)"
              />
            </div>

            <div class="field field--float">
              <label for="poll-pix-name">
                Nome do recebedor <span class="field-optional">(opcional)</span>
              </label>
              <input
                id="poll-pix-name"
                :value="form.pixName"
                class="cf-squircle cf-squircle--control"
                type="text"
                placeholder="Ex: Loja Exemplo"
                :disabled="sending"
                @input="updateField('pixName', $event.target.value)"
              />
            </div>
          </template>

          <template v-if="form.type === 'request-payment'">
            <div class="field field--float">
              <label for="poll-amount">Valor (BRL)</label>
              <input
                id="poll-amount"
                :value="form.amount"
                class="cf-squircle cf-squircle--control"
                type="number"
                min="0"
                step="0.01"
                placeholder="199.90"
                :disabled="sending"
                @input="updateField('amount', $event.target.value)"
              />
            </div>

            <div class="field field--float">
              <label for="poll-item-name">
                Nome do item <span class="field-optional">(opcional)</span>
              </label>
              <input
                id="poll-item-name"
                :value="form.itemName"
                class="cf-squircle cf-squircle--control"
                type="text"
                placeholder="Assinatura Plano Ouro"
                :disabled="sending"
                @input="updateField('itemName', $event.target.value)"
              />
            </div>

            <div class="field field--float">
              <label for="poll-invoice">
                Número da fatura <span class="field-optional">(opcional)</span>
              </label>
              <input
                id="poll-invoice"
                :value="form.invoiceNumber"
                class="cf-squircle cf-squircle--control"
                type="text"
                placeholder="PED-123"
                :disabled="sending"
                @input="updateField('invoiceNumber', $event.target.value)"
              />
            </div>

            <div class="field field--float">
              <label for="poll-payment-link">
                Link de pagamento <span class="field-optional">(opcional)</span>
              </label>
              <input
                id="poll-payment-link"
                :value="form.paymentLink"
                class="cf-squircle cf-squircle--control"
                type="text"
                placeholder="https://pagamentos.exemplo.com/checkout/abc"
                :disabled="sending"
                @input="updateField('paymentLink', $event.target.value)"
              />
            </div>

            <div class="field field--float">
              <label for="poll-file-url">
                URL do arquivo <span class="field-optional">(opcional)</span>
              </label>
              <input
                id="poll-file-url"
                :value="form.fileUrl"
                class="cf-squircle cf-squircle--control"
                type="text"
                placeholder="https://cdn.exemplo.com/boleto.pdf"
                :disabled="sending"
                @input="updateField('fileUrl', $event.target.value)"
              />
            </div>

            <div class="field field--float">
              <label for="poll-file-name">
                Nome do arquivo <span class="field-optional">(opcional)</span>
              </label>
              <input
                id="poll-file-name"
                :value="form.fileName"
                class="cf-squircle cf-squircle--control"
                type="text"
                placeholder="boleto-123.pdf"
                :disabled="sending"
                @input="updateField('fileName', $event.target.value)"
              />
            </div>

            <div class="field field--float">
              <label for="poll-boleto">
                Linha digitável do boleto <span class="field-optional">(opcional)</span>
              </label>
              <input
                id="poll-boleto"
                :value="form.boletoCode"
                class="cf-squircle cf-squircle--control"
                type="text"
                placeholder="34191.79001..."
                :disabled="sending"
                @input="updateField('boletoCode', $event.target.value)"
              />
            </div>
          </template>
        </div>
      </div>

      <footer class="poll-modal-footer modal-actions modal-actions--single">
        <p v-if="error" class="poll-error" role="alert">{{ error }}</p>
        <button
          type="button"
          class="btn-primary"
          :disabled="sending || !canSubmit"
          @click="$emit('confirm')"
        >
          {{ sending ? 'Enviando...' : 'Enviar mensagem interativa' }}
        </button>
      </footer>
      </section>

      <aside class="poll-modal-preview" aria-label="Preview em tempo real">
        <header class="poll-preview-header">
          <h4>Teste ao vivo</h4>
          <span class="poll-preview-hint">Clique na mensagem para simular o que o paciente verá</span>
        </header>
        <div class="poll-preview-body">
          <InteractiveMessagePreview :form="form" playground />
        </div>
      </aside>
    </div>
  </div>
  </Teleport>
</template>

<script setup>
import { computed } from 'vue'
import InteractiveListBuilder from '~/components/whatsapp/InteractiveListBuilder.vue'
import InteractiveButtonsBuilder from '~/components/whatsapp/InteractiveButtonsBuilder.vue'
import InteractiveCarouselBuilder from '~/components/whatsapp/InteractiveCarouselBuilder.vue'
import InteractiveMessagePreview from '~/components/whatsapp/InteractiveMessagePreview.vue'

const props = defineProps({
  open: { type: Boolean, default: false },
  sending: { type: Boolean, default: false },
  error: { type: String, default: '' },
  form: {
    type: Object,
    default: () => ({
      type: 'poll',
      text: '',
      choicesText: '',
      footerText: '',
      listButton: 'Ver opções',
      imageButton: '',
      allowMultiple: false,
      carouselCardsText: '',
      amount: '',
      pixKey: '',
      pixType: 'EVP',
      pixName: '',
      paymentLink: '',
      fileUrl: '',
      fileName: '',
      boletoCode: '',
      invoiceNumber: '',
      itemName: ''
    })
  }
})

const emit = defineEmits(['cancel', 'confirm', 'update:form'])

const messageTypeOptions = [
  { value: 'poll', label: 'Enquete' },
  { value: 'button', label: 'Botões' },
  { value: 'list', label: 'Lista' },
  { value: 'carousel', label: 'Carrossel' },
  { value: 'request-payment', label: 'Solicitar pagamento' },
  { value: 'pix-button', label: 'Botão PIX' }
]

const pixTypeOptions = [
  { value: 'EVP', label: 'EVP' },
  { value: 'CPF', label: 'CPF' },
  { value: 'CNPJ', label: 'CNPJ' },
  { value: 'PHONE', label: 'PHONE' },
  { value: 'EMAIL', label: 'EMAIL' }
]

const sanitizeForm = (draft) => ({
  type: String(draft?.type || 'poll'),
  text: String(draft?.text || ''),
  choicesText: String(draft?.choicesText || ''),
  footerText: String(draft?.footerText || ''),
  listButton: String(draft?.listButton || 'Ver opções'),
  imageButton: String(draft?.imageButton || ''),
  allowMultiple: Boolean(draft?.allowMultiple),
  carouselCardsText: String(draft?.carouselCardsText || ''),
  amount: String(draft?.amount || ''),
  pixKey: String(draft?.pixKey || ''),
  pixType: String(draft?.pixType || 'EVP'),
  pixName: String(draft?.pixName || ''),
  paymentLink: String(draft?.paymentLink || ''),
  fileUrl: String(draft?.fileUrl || ''),
  fileName: String(draft?.fileName || ''),
  boletoCode: String(draft?.boletoCode || ''),
  invoiceNumber: String(draft?.invoiceNumber || ''),
  itemName: String(draft?.itemName || '')
})

const updateField = (key, value) => {
  const next = sanitizeForm(props.form)
  next[key] = value
  emit('update:form', next)
}

const canSubmit = computed(() => {
  const text = String(props.form?.text || '').trim()
  const options = String(props.form?.choicesText || '')
    .split('\n')
    .map((v) => String(v || '').trim())
    .filter(Boolean)
  const type = String(props.form?.type || 'poll')
  if (type !== 'pix-button' && !text) return false
  if (type === 'poll') return options.length >= 2
  if (type === 'carousel') return String(props.form?.carouselCardsText || '').trim().length > 0
  if (type === 'request-payment') return Number(props.form?.amount || 0) > 0 && String(props.form?.pixKey || '').trim().length > 0
  if (type === 'pix-button') return String(props.form?.pixKey || '').trim().length > 0
  return options.length >= 1
})
</script>

<style scoped>
.poll-modal-backdrop {
  position: fixed;
  inset: 0;
  z-index: 10080;
  background: rgba(17, 27, 33, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  box-sizing: border-box;
}
.poll-modal-shell {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 400px;
  align-items: stretch;
  width: min(1040px, calc(100vw - 48px));
  max-height: min(90vh, 820px);
  min-height: 0;
  border-radius: 14px;
  overflow: hidden;
  border: 1px solid #e9edef;
  box-shadow: 0 12px 40px rgba(11, 20, 26, 0.18);
  background: #fff;
}
.poll-modal {
  min-width: 0;
  min-height: 0;
  max-height: inherit;
  background: #fff;
  color: #111b21;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border-right: 1px solid #e9edef;
}
.poll-modal-preview {
  width: 400px;
  min-width: 0;
  min-height: 0;
  max-height: inherit;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: #e5ddd5;
}
.poll-preview-header {
  flex-shrink: 0;
  padding: 14px 16px 10px;
  background: #f0f2f5;
  border-bottom: 1px solid #e9edef;
}
.poll-preview-header h4 {
  margin: 0;
  font-size: 0.9rem;
  font-weight: 600;
  color: #111b21;
}
.poll-preview-hint {
  display: block;
  margin-top: 2px;
  font-size: 0.75rem;
  color: #667781;
}
.poll-preview-body {
  flex: 1;
  min-height: 0;
  min-width: 0;
  overflow-x: hidden;
  overflow-y: auto;
  padding: 14px 16px 18px;
  -webkit-overflow-scrolling: touch;
}
.poll-preview-body :deep(.interactive-preview-header) {
  display: none;
}
.poll-preview-body :deep(.interactive-preview),
.poll-preview-body :deep(.interactive-chat-preview) {
  width: 100%;
  max-width: 100%;
  min-width: 0;
  box-sizing: border-box;
}
.poll-preview-body :deep(.interactive-bubble),
.poll-preview-body :deep(.interactive-menu-card),
.poll-preview-body :deep(.interactive-bubble--hint) {
  width: 100%;
  max-width: 100%;
  min-width: 0;
  box-sizing: border-box;
}
.poll-preview-body :deep(.interactive-menu-action-btn),
.poll-preview-body :deep(.interactive-menu-action-row),
.poll-preview-body :deep(.interactive-list-btn),
.poll-preview-body :deep(.interactive-carousel-action) {
  min-width: 0;
  max-width: 100%;
}
.poll-preview-body :deep(.interactive-menu-label),
.poll-preview-body :deep(.interactive-menu-title) {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 100%;
}
.poll-preview-body :deep(.interactive-list-panel) {
  width: 100%;
  max-width: 100%;
  box-sizing: border-box;
}
.poll-preview-body :deep(.interactive-carousel) {
  max-width: 100%;
  margin: 0;
  padding: 6px 0 8px;
}
.poll-preview-body :deep(.interactive-carousel-card) {
  min-width: 160px;
  max-width: calc(100% - 8px);
  flex-shrink: 0;
}
.poll-preview-body :deep(.interactive-bubble--hint) {
  font-size: 0.78rem;
  line-height: 1.35;
  word-break: break-word;
  white-space: normal;
}
.poll-modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 16px 20px;
  background: #f0f2f5;
  border-bottom: 1px solid #e9edef;
  flex-shrink: 0;
}
.poll-modal-header h3 {
  margin: 0;
  font-size: 1.05rem;
  font-weight: 600;
  color: #111b21;
}
.poll-close-btn {
  border: none;
  background: transparent;
  color: #667781;
  cursor: pointer;
  font-size: 1.15rem;
  line-height: 1;
  padding: 4px 6px;
  border-radius: 6px;
}
.poll-close-btn:hover {
  background: rgba(11, 20, 26, 0.06);
  color: #111b21;
}
.poll-modal-body {
  padding: 0.35rem 20px 16px;
  overflow-x: hidden;
  overflow-y: auto;
  flex: 1;
  min-height: 0;
}
.poll-modal-body .modal-fields {
  margin-top: 0.15rem;
}
.poll-modal .field--group > label {
  z-index: 3;
}
.poll-modal .field--group {
  padding-top: 0.35rem;
}
.poll-field-group {
  margin-top: 0.75rem;
  padding: 1rem 0.85rem 0.85rem;
  border: 1.5px solid #e8ece9;
  border-radius: var(--cf-radius-control);
  background: #fff;
}
.poll-field-group > label {
  background: #fff;
}
.poll-modal .field-optional {
  font-weight: 500;
  color: #aaa;
}
.poll-toggle-row {
  margin-top: 0.5rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-weight: 600;
  font-size: 0.9rem;
  color: #333d3b;
  padding: 12px 14px;
  background: #f4f7f6;
  border-radius: var(--cf-radius-control);
  border: 1.5px solid #e8ece9;
}
.poll-toggle-row input {
  width: 18px;
  height: 18px;
  accent-color: var(--primary, #8B967C);
}
.poll-error {
  margin: 0;
  padding: 10px 12px;
  border-radius: var(--cf-radius-control);
  background: #fce8e6;
  color: #b3261e;
  font-size: 0.86rem;
  line-height: 1.4;
  border: 1px solid #f5c6c2;
}
.poll-modal-footer {
  flex-shrink: 0;
  padding: 14px 20px 18px;
  background: #f4f7f6;
  border-top: 1px solid #e8ece9;
}
.poll-modal-footer.modal-actions--single {
  display: flex;
  flex-direction: column;
  gap: 0.65rem;
}
.poll-modal-footer.modal-actions--single .btn-primary {
  width: 100%;
}
@media (max-width: 860px) {
  .poll-modal-shell {
    grid-template-columns: 1fr;
    grid-template-rows: minmax(0, 1fr) minmax(260px, 38vh);
    width: min(560px, calc(100vw - 24px));
    max-height: min(96vh, 920px);
  }
  .poll-modal {
    border-right: none;
    border-bottom: 1px solid #e9edef;
    max-height: 58vh;
  }
  .poll-modal-preview {
    width: 100%;
    min-height: 260px;
  }
}
</style>

<style>
/* Teleport para body — herda o mesmo padrão dos modais do painel (.modal-overlay) */
.poll-modal-backdrop .poll-modal.modal-card .modal-fields {
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
}

.poll-modal-backdrop .poll-modal.modal-card .field--float {
  position: relative;
  margin-top: 0.35rem;
}

.poll-modal-backdrop .poll-modal.modal-card .field--float > label {
  position: absolute;
  top: -0.58rem;
  left: 0.78rem;
  margin: 0;
  padding: 0 0.4rem;
  background: #fff;
  z-index: 2;
  font-size: 0.76rem;
  font-weight: 700;
  color: #444;
  line-height: 1;
  pointer-events: none;
}

.poll-modal-backdrop .poll-modal.modal-card .field input,
.poll-modal-backdrop .poll-modal.modal-card .field textarea {
  width: 100%;
  padding: 0.85rem 0.9rem;
  border: 1.5px solid #e8ece9;
  border-radius: var(--cf-radius-control);
  font-family: inherit;
  font-size: 0.9rem;
  box-sizing: border-box;
  background: #fff;
  color: #1a2e24;
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
}

.poll-modal-backdrop .poll-modal.modal-card .field textarea {
  min-height: 6.5rem;
  resize: vertical;
  line-height: 1.45;
}

.poll-modal-backdrop .poll-modal.modal-card .field--float input,
.poll-modal-backdrop .poll-modal.modal-card .field--float textarea {
  padding-top: 0.95rem;
}

.poll-modal-backdrop .poll-modal.modal-card .field input:focus,
.poll-modal-backdrop .poll-modal.modal-card .field textarea:focus {
  outline: none;
  border-color: #b8d4b4;
  box-shadow: 0 0 0 3px rgba(45, 90, 39, 0.08);
}

.poll-modal-backdrop .poll-modal.modal-card .field input:disabled,
.poll-modal-backdrop .poll-modal.modal-card .field textarea:disabled {
  background: #f4f7f6;
  color: #8696a0;
}

.poll-modal-backdrop .poll-modal.modal-card .field--float .cf-select {
  width: 100%;
}

.poll-modal-backdrop .poll-field-group > label {
  background: #fff;
}

.poll-modal-backdrop .btn-builder-field > label,
.poll-modal-backdrop .list-builder-field > label,
.poll-modal-backdrop .carousel-field > label {
  background: #f4f7f6;
}

.poll-modal-backdrop .field--group .btn-builder,
.poll-modal-backdrop .field--group .list-builder,
.poll-modal-backdrop .field--group .carousel-builder {
  margin-top: 0.15rem;
}

@supports (corner-shape: squircle) {
  .poll-modal-backdrop .poll-modal.modal-card .field input,
  .poll-modal-backdrop .poll-modal.modal-card .field textarea,
  .poll-modal-backdrop .poll-modal.modal-card .btn-primary,
  .poll-modal-backdrop .poll-modal.modal-card .btn-secondary {
    corner-shape: squircle;
  }
}
</style>
