<template>
  <aside v-if="open" class="group-permissions-panel">
    <header class="group-permissions-header">
      <button type="button" class="group-permissions-icon-btn" aria-label="Voltar" @click="$emit('back')">
        <ChevronLeft class="group-permissions-header-icon" />
      </button>
      <h3>Permissões do grupo</h3>
      <span class="group-permissions-header-spacer" aria-hidden="true" />
    </header>

    <div class="group-permissions-body">
      <p v-if="loading" class="group-permissions-status">Carregando permissões...</p>
      <p v-else-if="errorMessage" class="group-permissions-status group-permissions-status--error">{{ errorMessage }}</p>

      <section class="group-permissions-section">
        <h4>Os membros do grupo podem:</h4>

        <article class="group-permissions-row">
          <PencilLine class="group-permissions-row-icon" />
          <div class="group-permissions-row-main">
            <strong>Editar configurações do grupo</strong>
            <small>Essa opção inclui o nome, a imagem, a descrição, a duração das mensagens temporárias, a opção de fixar e desafixar mensagens e de salvar mensagens na conversa.</small>
          </div>
          <button
            type="button"
            class="group-permissions-toggle"
            :class="{ 'group-permissions-toggle--on': membersCanEdit }"
            :disabled="saving"
            aria-label="Editar configurações do grupo"
            @click="$emit('toggle', 'membersCanEdit', !membersCanEdit)"
          />
        </article>

        <article class="group-permissions-row">
          <MessageSquare class="group-permissions-row-icon" />
          <div class="group-permissions-row-main">
            <strong>Enviar novas mensagens</strong>
          </div>
          <button
            type="button"
            class="group-permissions-toggle"
            :class="{ 'group-permissions-toggle--on': membersCanSend }"
            :disabled="saving"
            aria-label="Enviar novas mensagens"
            @click="$emit('toggle', 'membersCanSend', !membersCanSend)"
          />
        </article>

        <article class="group-permissions-row">
          <UserRoundPlus class="group-permissions-row-icon" />
          <div class="group-permissions-row-main">
            <strong>Adicionar membros</strong>
            <small v-if="!membersCanAddSupported">Esta permissão é somente leitura na API atual.</small>
          </div>
          <button
            type="button"
            class="group-permissions-toggle"
            :class="{ 'group-permissions-toggle--on': membersCanAdd }"
            :disabled="saving || !membersCanAddSupported"
            aria-label="Adicionar membros"
            @click="$emit('toggle', 'membersCanAdd', !membersCanAdd)"
          />
        </article>
      </section>

      <section class="group-permissions-section">
        <h4>Os admins do grupo podem:</h4>

        <article class="group-permissions-row">
          <Users class="group-permissions-row-icon" />
          <div class="group-permissions-row-main">
            <strong>Aprovar novos membros</strong>
            <small>Enquanto essa opção estiver ativada, os admins deverão aprovar a entrada de membros no grupo.</small>
            <small v-if="!joinApprovalSupported" class="group-permissions-note">Esta permissão é somente leitura na API atual.</small>
          </div>
          <button
            type="button"
            class="group-permissions-toggle"
            :class="{ 'group-permissions-toggle--on': adminsApproveJoin }"
            :disabled="saving || !joinApprovalSupported"
            aria-label="Aprovar novos membros"
            @click="$emit('toggle', 'adminsApproveJoin', !adminsApproveJoin)"
          />
        </article>
      </section>

      <section class="group-permissions-section group-permissions-section--admins">
        <h4>Admins do grupo</h4>
        <article class="group-permissions-row is-clickable" @click="$emit('request-edit-admins')">
          <UserCog class="group-permissions-row-icon" />
          <div class="group-permissions-row-main">
            <strong>Editar admins do grupo</strong>
            <small>{{ viewerLabel }}</small>
          </div>
        </article>
      </section>
    </div>
  </aside>
</template>

<script setup>
import { computed } from 'vue'
import {
  ChevronLeft, MessageSquare, PencilLine, UserCog, UserRoundPlus, Users
} from 'lucide-vue-next'

const props = defineProps({
  open: { type: Boolean, default: false },
  loading: { type: Boolean, default: false },
  saving: { type: Boolean, default: false },
  errorMessage: { type: String, default: '' },
  groupInfo: { type: Object, default: null },
  viewerIsAdmin: { type: Boolean, default: false }
})

defineEmits(['back', 'toggle', 'request-edit-admins'])

const membersCanEdit = computed(() => !Boolean(props.groupInfo?.IsLocked ?? props.groupInfo?.isLocked))
const membersCanSend = computed(() => !Boolean(props.groupInfo?.IsAnnounce ?? props.groupInfo?.isAnnounce))
const membersCanAdd = computed(() => {
  const mode = String(props.groupInfo?.MemberAddMode || props.groupInfo?.memberAddMode || '').toLowerCase()
  return mode === 'all_member_add'
})
const adminsApproveJoin = computed(() =>
  Boolean(props.groupInfo?.IsJoinApprovalRequired ?? props.groupInfo?.isJoinApprovalRequired)
)

const membersCanAddSupported = false
const joinApprovalSupported = false

const viewerLabel = computed(() => (props.viewerIsAdmin ? 'Você' : 'Admin'))
</script>

<style scoped>
.group-permissions-panel {
  width: min(420px, 42vw);
  min-width: 320px;
  flex-shrink: 0;
  height: 100%;
  background: #ffffff;
  color: #111b21;
  border-left: 1px solid #e9edef;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.group-permissions-header {
  min-height: 60px;
  display: grid;
  grid-template-columns: 40px 1fr 40px;
  align-items: center;
  padding: 0 8px;
  background: #f0f2f5;
  flex-shrink: 0;
}
.group-permissions-header h3 {
  margin: 0;
  font-size: 1rem;
  font-weight: 500;
  text-align: center;
}
.group-permissions-header-spacer { width: 40px; height: 40px; }
.group-permissions-icon-btn {
  border: none;
  background: transparent;
  color: #54656f;
  cursor: pointer;
  width: 40px;
  height: 40px;
  display: grid;
  place-items: center;
  border-radius: 999px;
}
.group-permissions-icon-btn:hover { background: rgba(0, 0, 0, 0.05); }
.group-permissions-header-icon { width: 1.25rem; height: 1.25rem; }
.group-permissions-body {
  flex: 1;
  overflow-y: auto;
  padding: 8px 0 24px;
}
.group-permissions-status {
  margin: 12px 20px;
  font-size: 0.82rem;
  color: #667781;
}
.group-permissions-status--error { color: #d32f2f; }
.group-permissions-section {
  padding: 8px 0;
  border-bottom: 8px solid #f0f2f5;
}
.group-permissions-section--admins { border-bottom: none; }
.group-permissions-section h4 {
  margin: 0;
  padding: 8px 24px 4px;
  font-size: 0.78rem;
  font-weight: 500;
  color: #008069;
}
.group-permissions-row {
  display: grid;
  grid-template-columns: 28px 1fr auto;
  gap: 14px;
  align-items: start;
  padding: 12px 24px;
}
.group-permissions-row.is-clickable { cursor: pointer; }
.group-permissions-row.is-clickable:hover { background: #f5f6f6; }
.group-permissions-row-icon {
  width: 1.15rem;
  height: 1.15rem;
  color: #54656f;
  margin-top: 2px;
}
.group-permissions-row-main {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}
.group-permissions-row-main strong {
  font-size: 0.92rem;
  font-weight: 400;
  color: #111b21;
}
.group-permissions-row-main small {
  font-size: 0.76rem;
  line-height: 1.35;
  color: #667781;
}
.group-permissions-note { color: #8696a0; }
.group-permissions-toggle {
  width: 36px;
  height: 20px;
  border-radius: 999px;
  border: none;
  background: #c2c9ce;
  position: relative;
  cursor: pointer;
  flex-shrink: 0;
  margin-top: 2px;
  transition: background 0.15s ease;
}
.group-permissions-toggle:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}
.group-permissions-toggle::after {
  content: '';
  position: absolute;
  top: 2px;
  left: 2px;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: #ffffff;
  transition: transform 0.15s ease;
}
.group-permissions-toggle--on {
  background: #008069;
}
.group-permissions-toggle--on::after {
  transform: translateX(16px);
}
</style>
