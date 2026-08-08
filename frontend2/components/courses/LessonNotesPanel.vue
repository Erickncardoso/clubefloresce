<template>
  <div class="anotacoes-panel" @click.stop>
    <form class="anotacoes-caixa" @submit.prevent="saveCompose">
      <button
        type="button"
        class="anotacoes-badge-tempo"
        :title="`Ir para ${currentTimeLabel}`"
        @click.stop="emitSeek(props.currentTime)"
      >
        <Play :size="12" fill="currentColor" stroke="none" aria-hidden="true" />
        <span>{{ currentTimeLabel }}</span>
      </button>

      <textarea
        ref="composeInputRef"
        v-model="composeText"
        class="anotacoes-caixa__textarea"
        placeholder="Escreva uma anotação..."
        rows="5"
        maxlength="2000"
        @keydown.ctrl.enter.prevent="saveCompose"
        @keydown.meta.enter.prevent="saveCompose"
      />

      <div class="anotacoes-caixa__rodape">
        <button
          type="submit"
          class="anotacoes-caixa__btn"
          :disabled="!composeText.trim() || isSavingCompose"
        >
          <FlorescerPlayerIcons name="check" />
          Anotar
        </button>
      </div>
    </form>

    <p v-if="!notes.length" class="anotacoes-msg-vazio">
      Você ainda não tem anotações nesta aula.
    </p>

    <div v-if="notes.length" class="anotacoes-lista">
      <article
        v-for="note in notes"
        :key="note.id"
        class="anotacoes-item"
        :class="{ 'is-editing': editingId === note.id }"
      >
        <form
          v-if="editingId === note.id"
          class="anotacoes-item__editor"
          @submit.prevent="saveEdit(note.id)"
        >
          <button
            type="button"
            class="anotacoes-badge-tempo anotacoes-badge-tempo--sm"
            @click.stop="emitSeek(note.seconds)"
          >
            <Play :size="10" fill="currentColor" stroke="none" aria-hidden="true" />
            <span>{{ note.time }}</span>
          </button>
          <textarea
            ref="editInputRef"
            v-model="editText"
            class="anotacoes-caixa__textarea anotacoes-caixa__textarea--sm"
            rows="3"
            maxlength="2000"
          />
          <div class="anotacoes-composer__acoes">
            <button type="button" class="anotacoes-composer__btn" @click.stop="cancelEdit">Cancelar</button>
            <button type="submit" class="anotacoes-composer__btn anotacoes-composer__btn--salvar" :disabled="!editText.trim()">
              Salvar
            </button>
          </div>
        </form>

        <template v-else>
          <button
            type="button"
            class="anotacoes-item__badge"
            @click.stop="emitSeek(note.seconds)"
          >
            <Play :size="10" fill="currentColor" stroke="none" aria-hidden="true" />
            <span>{{ note.time }}</span>
          </button>

          <button
            type="button"
            class="anotacoes-item__conteudo"
            @click.stop="emitSeek(note.seconds)"
          >
            <span class="anotacoes-item__texto">{{ note.text }}</span>
          </button>

          <div class="anotacoes-item__menu">
            <button
              type="button"
              class="anotacoes-menu-trigger"
              :aria-expanded="openMenuId === note.id"
              aria-label="Opções da anotação"
              @click.stop="toggleMenu(note.id)"
            >
              <span aria-hidden="true">⋯</span>
            </button>
            <div
              v-if="openMenuId === note.id"
              class="anotacoes-menu-dropdown"
              @click.stop
            >
              <button type="button" @click.stop="handleSeek(note)">Ir para o tempo</button>
              <button type="button" @click.stop="startEdit(note)">Editar</button>
              <button type="button" class="is-danger" @click.stop="removeNote(note.id)">Excluir</button>
            </div>
          </div>
        </template>
      </article>
    </div>
  </div>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { Play } from 'lucide-vue-next'
import FlorescerPlayerIcons from '~/components/courses/FlorescerPlayerIcons.vue'
import {
  createLessonNote,
  formatNoteTime,
  loadLessonNotes,
  saveLessonNotes,
} from '~/utils/lesson-notes'

const props = defineProps({
  lessonId: { type: String, required: true },
  currentTime: { type: Number, default: 0 },
})

const emit = defineEmits(['seek'])

const notes = ref([])
const composeText = ref('')
const editingId = ref(null)
const editText = ref('')
const openMenuId = ref(null)
const composeInputRef = ref(null)
const editInputRef = ref(null)
const isSavingCompose = ref(false)

const currentTimeLabel = computed(() => formatNoteTime(props.currentTime))

function persist() {
  saveLessonNotes(props.lessonId, notes.value)
}

function reloadNotes() {
  notes.value = loadLessonNotes(props.lessonId)
}

function emitSeek(seconds) {
  emit('seek', seconds)
}

function closeMenu() {
  openMenuId.value = null
}

function toggleMenu(noteId) {
  openMenuId.value = openMenuId.value === noteId ? null : noteId
}

function saveCompose() {
  if (isSavingCompose.value) return
  const text = composeText.value.trim()
  if (!text) return
  isSavingCompose.value = true
  notes.value = [
    ...notes.value,
    createLessonNote(props.currentTime, text),
  ].sort((a, b) => a.seconds - b.seconds || a.createdAt - b.createdAt)
  persist()
  composeText.value = ''
  isSavingCompose.value = false
  composeInputRef.value?.focus()
}

async function startEdit(note) {
  editingId.value = note.id
  editText.value = note.text
  closeMenu()
  await nextTick()
  const input = Array.isArray(editInputRef.value) ? editInputRef.value[0] : editInputRef.value
  input?.focus()
}

function cancelEdit() {
  editingId.value = null
  editText.value = ''
}

function saveEdit(noteId) {
  const text = editText.value.trim()
  if (!text) return
  notes.value = notes.value
    .map((note) => (note.id === noteId ? { ...note, text } : note))
    .sort((a, b) => a.seconds - b.seconds || a.createdAt - b.createdAt)
  persist()
  cancelEdit()
}

function handleSeek(note) {
  closeMenu()
  emitSeek(note.seconds)
}

function removeNote(noteId) {
  notes.value = notes.value.filter((note) => note.id !== noteId)
  persist()
  closeMenu()
}

function onDocumentClick(event) {
  if (event.target.closest('.anotacoes-item__menu')) return
  closeMenu()
}

watch(
  () => props.lessonId,
  () => {
    cancelEdit()
    closeMenu()
    composeText.value = ''
    reloadNotes()
  },
)

onMounted(() => {
  reloadNotes()
  document.addEventListener('click', onDocumentClick)
})

onBeforeUnmount(() => {
  document.removeEventListener('click', onDocumentClick)
})
</script>
