<template>
  <div class="patient-photos">
    <div v-if="loading" class="patient-photos-loading">Carregando fotos…</div>
    <p v-else-if="error" class="patient-photos-error">{{ error }}</p>
    <p v-else-if="!photos.length" class="patient-photos-empty">
      Nenhuma foto de refeição registrada ainda.
    </p>

    <!-- Feed estilo TikTok -->
    <div v-else-if="compact" class="patient-photos-tiktok">
      <button
        v-for="(photo, index) in visiblePhotos"
        :key="photo.id"
        type="button"
        class="patient-photos-slide"
        @click="openLightbox(photo)"
      >
        <img :src="photo.imageUrl" alt="" loading="lazy" />
        <div class="patient-photos-slide-shade" aria-hidden="true" />
        <div class="patient-photos-slide-ui">
          <div class="patient-photos-slide-caption">
            <strong>{{ photo.mealLabel || photo.mealType }}</strong>
            <span>{{ formatDate(photo.entryDate) }}</span>
          </div>
          <div class="patient-photos-slide-rail">
            <span v-if="photo.caloriesKcal" class="patient-photos-rail-pill">
              <small>kcal</small>
              {{ Math.round(photo.caloriesKcal) }}
            </span>
            <span class="patient-photos-rail-index">{{ index + 1 }}/{{ visiblePhotos.length }}</span>
          </div>
        </div>
      </button>
    </div>

    <!-- Grid padrão -->
    <div v-else class="patient-photos-grid">
      <button
        v-for="photo in visiblePhotos"
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
  compact: { type: Boolean, default: false },
  limit: { type: Number, default: 60 },
})

const visiblePhotos = computed(() => photos.value.slice(0, props.limit))

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
      query: { limit: Math.max(props.limit, 12) },
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

/* TikTok feed */
.patient-photos-tiktok {
  display: flex;
  flex-direction: column;
  gap: 0.55rem;
  height: 30rem;
  overflow-y: auto;
  scroll-snap-type: y mandatory;
  scroll-behavior: smooth;
  padding: 0.15rem 0.15rem 0.15rem 0;
  border-radius: 16px;
  background: transparent;
  scrollbar-width: thin;
  scrollbar-color: rgba(0, 0, 0, 0.18) transparent;
}

.patient-photos-slide {
  position: relative;
  flex: 0 0 88%;
  width: 100%;
  min-height: 24rem;
  padding: 0;
  border: 1px solid var(--admin-border, #e8ece9);
  border-radius: 18px;
  overflow: hidden;
  background: #f5f5f5;
  cursor: pointer;
  scroll-snap-align: center;
  scroll-snap-stop: always;
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.08);
}

.patient-photos-slide img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.patient-photos-slide-shade {
  position: absolute;
  inset: 0;
  background: linear-gradient(
    180deg,
    rgba(0, 0, 0, 0.08) 35%,
    rgba(0, 0, 0, 0.2) 62%,
    rgba(0, 0, 0, 0.72) 100%
  );
  pointer-events: none;
}

.patient-photos-slide-ui {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 0.65rem;
  padding: 0.85rem 0.75rem 1rem;
  pointer-events: none;
}

.patient-photos-slide-caption {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  min-width: 0;
  text-align: left;
  color: #fff;
}

.patient-photos-slide-caption strong {
  font-size: 0.92rem;
  font-weight: 800;
  line-height: 1.2;
  text-shadow: 0 1px 6px rgba(0, 0, 0, 0.45);
}

.patient-photos-slide-caption span {
  font-size: 0.74rem;
  font-weight: 500;
  opacity: 0.92;
}

.patient-photos-slide-rail {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.55rem;
  flex-shrink: 0;
}

.patient-photos-rail-pill {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-width: 2.65rem;
  padding: 0.45rem 0.35rem;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.16);
  backdrop-filter: blur(6px);
  color: #fff;
  font-size: 0.82rem;
  font-weight: 800;
  line-height: 1.1;
}

.patient-photos-rail-pill small {
  font-size: 0.58rem;
  font-weight: 600;
  opacity: 0.85;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.patient-photos-rail-index {
  font-size: 0.62rem;
  font-weight: 700;
  color: rgba(255, 255, 255, 0.78);
  padding: 0.2rem 0.45rem;
  border-radius: 999px;
  background: rgba(0, 0, 0, 0.28);
}

/* Grid padrão */
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
  z-index: 1200;
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
  z-index: 1;
  width: 2.25rem;
  height: 2.25rem;
  border: none;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.15);
  color: #fff;
  font-size: 1.35rem;
  cursor: pointer;
}

@media (prefers-reduced-motion: reduce) {
  .patient-photos-tiktok {
    scroll-behavior: auto;
  }
}
</style>
