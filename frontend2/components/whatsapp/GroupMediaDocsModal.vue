<template>
  <Teleport v-if="!embedded" to="body">
    <div v-if="open" class="group-media-backdrop" @click.self="$emit('close')">
      <aside class="group-media-modal">
        <GroupMediaDocsPanel
          :active-tab="activeTab"
          :media-items="mediaItems"
          :document-items="documentItems"
          :link-items="linkItems"
          @close="$emit('close')"
          @update:active-tab="$emit('update:active-tab', $event)"
          @open-item="$emit('open-item', $event)"
        />
      </aside>
    </div>
  </Teleport>
  <aside v-else-if="open" class="group-media-panel group-media-panel--embedded">
    <GroupMediaDocsPanel
      :active-tab="activeTab"
      :media-items="mediaItems"
      :document-items="documentItems"
      :link-items="linkItems"
      embedded
      @close="$emit('close')"
      @update:active-tab="$emit('update:active-tab', $event)"
      @open-item="$emit('open-item', $event)"
    />
  </aside>
</template>

<script setup>
import GroupMediaDocsPanel from './GroupMediaDocsPanel.vue'

defineProps({
  open: { type: Boolean, default: false },
  embedded: { type: Boolean, default: false },
  activeTab: { type: String, default: 'media' },
  mediaItems: { type: Array, default: () => [] },
  documentItems: { type: Array, default: () => [] },
  linkItems: { type: Array, default: () => [] }
})

defineEmits(['close', 'update:active-tab', 'open-item'])
</script>

<style scoped>
.group-media-backdrop {
  position: fixed;
  inset: 0;
  z-index: 130;
  background: rgba(0, 0, 0, 0.72);
  display: flex;
  justify-content: center;
  align-items: stretch;
}
.group-media-modal {
  width: min(760px, 100vw);
  height: 100dvh;
  background: #0b141a;
  color: #e9edef;
  display: flex;
  flex-direction: column;
}
.group-media-panel--embedded {
  width: min(420px, 42vw);
  min-width: 320px;
  flex-shrink: 0;
  height: 100%;
  background: #ffffff;
  border-left: 1px solid #e2e8f0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  z-index: 12;
  box-shadow: -4px 0 16px rgba(15, 23, 42, 0.08);
}
</style>
