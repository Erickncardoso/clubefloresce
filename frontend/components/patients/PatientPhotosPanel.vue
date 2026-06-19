<template>
  <div class="patient-photos">
    <div v-if="loading" class="patient-photos-loading">Carregando fotos…</div>
    <p v-else-if="error" class="patient-photos-error">{{ error }}</p>
    <p v-else-if="!photos.length" class="patient-photos-empty">
      Nenhuma foto de refeição registrada ainda.
    </p>
    <div v-else class="patient-photos-grid">
      <button
        v-for="photo in photos"
        :key="photo.id"
        type="button"
        class="patient-photos-item"
        @click="openLightbox(photo)"
      >
        <img :src="photo.imageUrl" alt="" loading="lazy" />
        <span class="patient-photos-meta">
          {{ photo.mealLabel || photo.mealType }}
          <small>{{ formatDate(photo.entryDate) }}</small>
        </span>
      </button>
    </div>

    <Teleport to="body">
      <div v-if="lightbox" class="patient-photos-lightbox" @click.self="lightbox = null">
        <button type="button" class="patient-photos-close" aria-label="Fechar" @click="lightbox = null">×</button>
        <img :src="lightbox.imageUrl" alt="" />
        <p class="patient-photos-lightbox-meta">
          {{ lightbox.mealLabel || lightbox.mealType }}
          · {{ formatDate(lightbox.entryDate) }}
          <span v-if="lightbox.caloriesKcal"> · {{ Math.round(lightbox.caloriesKcal) }} kcal</span>
        </p>
      </div>
    </Teleport>
  </div>
</template>

<script setup>
const props = defineProps({
  patientId: { type: String, required: true },
})

const config = useRuntimeConfig()

const loading = ref(true)
const error = ref('')
const photos = ref([])
const lightbox = ref(null)

function authHeaders() {
  const token = import.meta.client ? localStorage.getItem('auth_token') : null
  return token ? { Authorization: `Bearer ${token}` } : {}
}

function formatDate(value) {
  const date = new Date(`${value}T12:00:00`)
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
}

function openLightbox(photo) {
  lightbox.value = photo
}

async function loadPhotos() {
  loading.value = true
  error.value = ''
  try {
    const data = await $fetch(`${config.public.apiBase}/patients/${props.patientId}/food-diary/photos`, {
      headers: authHeaders(),
      query: { limit: 60 },
    })
    photos.value = data.photos || []
  } catch (err) {
    error.value = err?.data?.message || 'Não foi possível carregar as fotos.'
    photos.value = []
  } finally {
    loading.value = false
  }
}

watch(() => props.patientId, loadPhotos, { immediate: true })
</script>

<style scoped>
.patient-photos-loading,
.patient-photos-empty,
.patient-photos-error {
  font-size: 0.88rem;
  color: #666;
}

.patient-photos-error {
  color: #c53030;
}

.patient-photos-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: 0.75rem;
}

.patient-photos-item {
  position: relative;
  aspect-ratio: 1;
  padding: 0;
  border: 1px solid var(--admin-border, #e8ece9);
  border-radius: 12px;
  overflow: hidden;
  background: #f5f5f5;
  cursor: pointer;
}

.patient-photos-item img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.patient-photos-meta {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  padding: 0.35rem 0.45rem;
  background: linear-gradient(transparent, rgba(0, 0, 0, 0.72));
  color: #fff;
  font-size: 0.68rem;
  font-weight: 600;
  line-height: 1.3;
  text-align: left;
}

.patient-photos-meta small {
  display: block;
  font-weight: 500;
  opacity: 0.9;
}

.patient-photos-lightbox {
  position: fixed;
  inset: 0;
  z-index: 200;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 1.5rem;
  background: rgba(0, 0, 0, 0.88);
}

.patient-photos-lightbox img {
  max-width: min(100%, 520px);
  max-height: 70vh;
  border-radius: 12px;
  object-fit: contain;
}

.patient-photos-lightbox-meta {
  margin: 0.75rem 0 0;
  color: #fff;
  font-size: 0.88rem;
}

.patient-photos-close {
  position: absolute;
  top: 1rem;
  right: 1rem;
  width: 2.25rem;
  height: 2.25rem;
  border: none;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.15);
  color: #fff;
  font-size: 1.35rem;
  cursor: pointer;
}
</style>
