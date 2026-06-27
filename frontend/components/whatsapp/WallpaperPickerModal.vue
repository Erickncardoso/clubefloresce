<template>
  <Teleport to="body">
    <div v-if="open" class="wallpaper-overlay" @click.self="$emit('cancel')">
      <div class="wallpaper-modal" role="dialog" aria-modal="true" aria-label="Papel de parede">
        <header class="wallpaper-header">
          <button type="button" class="wallpaper-close" aria-label="Fechar" @click="$emit('cancel')">
            <X class="wallpaper-close-icon" />
          </button>
          <h2 class="wallpaper-title">Papel de parede</h2>
        </header>

        <div class="wallpaper-body">
          <p class="wallpaper-hint">Escolha um fundo padrão ou envie uma foto do seu computador.</p>

          <div class="wallpaper-grid" role="listbox" aria-label="Papéis de parede padrão">
            <button
              v-for="preset in presets"
              :key="preset.id"
              type="button"
              class="wallpaper-tile"
              :class="{ 'is-selected': selectedId === preset.id }"
              :aria-selected="selectedId === preset.id ? 'true' : 'false'"
              role="option"
              @click="onSelectPreset(preset.id)"
            >
              <span
                class="wallpaper-tile-preview"
                :style="previewStyle(preset)"
              />
              <span class="wallpaper-tile-label">{{ preset.label }}</span>
            </button>

            <button
              type="button"
              class="wallpaper-tile wallpaper-tile--upload"
              :class="{ 'is-selected': selectedId === 'custom' }"
              :aria-selected="selectedId === 'custom' ? 'true' : 'false'"
              role="option"
              @click="triggerUpload"
            >
              <span class="wallpaper-tile-preview wallpaper-tile-preview--upload">
                <img
                  v-if="customPreviewUrl"
                  :src="customPreviewUrl"
                  alt=""
                  class="wallpaper-upload-preview-img"
                />
                <Upload v-else class="wallpaper-upload-icon" aria-hidden="true" />
              </span>
              <span class="wallpaper-tile-label">{{ customPreviewUrl ? 'Personalizado' : 'Enviar foto' }}</span>
            </button>
          </div>

          <input
            ref="fileInputRef"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            class="wallpaper-file-input"
            @change="onFileChange"
          />

          <p v-if="uploadError" class="wallpaper-error" role="alert">{{ uploadError }}</p>
        </div>

        <footer class="wallpaper-footer">
          <button type="button" class="wallpaper-btn wallpaper-btn--ghost" @click="$emit('cancel')">
            Cancelar
          </button>
          <button type="button" class="wallpaper-btn wallpaper-btn--primary" @click="$emit('apply')">
            Definir papel de parede
          </button>
        </footer>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { ref } from 'vue'
import { X, Upload } from 'lucide-vue-next'
import { WA_WALLPAPER_PRESETS } from '~/composables/whatsapp/useWhatsappWallpaper.js'

const props = defineProps({
  open: { type: Boolean, default: false },
  selectedId: { type: String, default: 'default' },
  customPreviewUrl: { type: String, default: '' },
  uploadError: { type: String, default: '' },
})

const emit = defineEmits(['cancel', 'apply', 'select-preset', 'upload'])

const presets = WA_WALLPAPER_PRESETS
const fileInputRef = ref(null)

const previewStyle = (preset) => ({
  backgroundColor: preset.backgroundColor,
  backgroundImage: preset.backgroundImage && preset.backgroundImage !== 'none' ? preset.backgroundImage : undefined,
  backgroundSize: preset.backgroundSize || 'cover',
  backgroundRepeat: preset.backgroundRepeat || 'no-repeat',
  backgroundPosition: 'center',
})

const onSelectPreset = (id) => {
  emit('select-preset', id)
}

const triggerUpload = () => {
  fileInputRef.value?.click?.()
}

const onFileChange = (event) => {
  const file = event?.target?.files?.[0]
  event.target.value = ''
  if (!file) return
  emit('upload', file)
}
</script>

<style scoped>
.wallpaper-overlay {
  position: fixed;
  inset: 0;
  z-index: 10085;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px 16px;
  background: rgba(11, 20, 26, 0.45);
}

.wallpaper-modal {
  width: min(100%, 520px);
  max-height: min(92vh, 720px);
  display: flex;
  flex-direction: column;
  background: #fff;
  border-radius: 16px;
  box-shadow: 0 8px 32px rgba(11, 20, 26, 0.18);
  overflow: hidden;
}

.wallpaper-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  border-bottom: 1px solid #e9edef;
}

.wallpaper-close {
  width: 36px;
  height: 36px;
  border: none;
  border-radius: 999px;
  background: transparent;
  color: #54656f;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

.wallpaper-close:hover {
  background: rgba(11, 20, 26, 0.06);
}

.wallpaper-close-icon {
  width: 20px;
  height: 20px;
}

.wallpaper-title {
  flex: 1;
  margin: 0;
  font-size: 1rem;
  font-weight: 500;
  color: #111b21;
}

.wallpaper-body {
  padding: 16px 20px 8px;
  overflow-y: auto;
}

.wallpaper-hint {
  margin: 0 0 16px;
  font-size: 0.875rem;
  line-height: 1.45;
  color: #667781;
}

.wallpaper-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
}

.wallpaper-tile {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 0;
  border: none;
  background: transparent;
  cursor: pointer;
}

.wallpaper-tile-preview {
  width: 100%;
  aspect-ratio: 3 / 4;
  border-radius: 12px;
  border: 2px solid transparent;
  box-shadow: inset 0 0 0 1px rgba(11, 20, 26, 0.08);
  overflow: hidden;
}

.wallpaper-tile.is-selected .wallpaper-tile-preview {
  border-color: #00a884;
  box-shadow: 0 0 0 1px #00a884;
}

.wallpaper-tile-preview--upload {
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f0f2f5;
}

.wallpaper-upload-icon {
  width: 28px;
  height: 28px;
  color: #54656f;
}

.wallpaper-upload-preview-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.wallpaper-tile-label {
  font-size: 0.8125rem;
  color: #54656f;
  text-align: center;
}

.wallpaper-file-input {
  display: none;
}

.wallpaper-error {
  margin: 12px 0 0;
  font-size: 0.8125rem;
  color: #ea0038;
}

.wallpaper-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding: 12px 16px 16px;
  border-top: 1px solid #e9edef;
}

.wallpaper-btn {
  min-height: 40px;
  padding: 0 18px;
  border-radius: 999px;
  border: none;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
}

.wallpaper-btn--ghost {
  background: transparent;
  color: #00a884;
}

.wallpaper-btn--ghost:hover {
  background: rgba(0, 168, 132, 0.08);
}

.wallpaper-btn--primary {
  background: #00a884;
  color: #fff;
}

.wallpaper-btn--primary:hover {
  background: #008f72;
}

@media (max-width: 480px) {
  .wallpaper-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>
