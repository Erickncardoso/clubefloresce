<template>
  <div class="patient-page biblioteca-page patient-page--with-tab">
    <PatientHeader title="Biblioteca" :show-bell="false" />

    <header class="bib-hero">
      <p class="bib-hero-eyebrow">Aprenda no seu ritmo</p>
      <h1 class="bib-hero-title">Conteúdos para florescer</h1>
      <p class="bib-hero-desc">Cursos, guias e materiais escolhidos para apoiar sua rotina.</p>
    </header>

    <div class="bib-search">
      <Search class="bib-search-icon" aria-hidden="true" />
      <input
        v-model="search"
        type="search"
        class="patient-input bib-search-input"
        placeholder="Buscar cursos ou materiais"
        aria-label="Buscar conteúdos"
      >
    </div>

    <div class="bib-chips" ref="chipsRef" data-h-scroll role="tablist" aria-label="Filtrar conteúdos">
      <button
        v-for="chip in chips"
        :key="chip.id"
        type="button"
        role="tab"
        class="cf-chip"
        :class="{ active: activeChip === chip.id }"
        :aria-selected="activeChip === chip.id"
        @click="activeChip = chip.id"
      >
        {{ chip.label }}
      </button>
    </div>

    <PatientPageSkeleton v-if="loading" layout="library" />

    <template v-else>
      <p v-if="loadError" class="bib-error">{{ loadError }}</p>

      <article
        v-if="featuredItem && showFeatured"
        class="bib-featured"
        role="button"
        tabindex="0"
        :aria-label="`Abrir destaque ${featuredItem.title}`"
        @click="openItem(featuredItem)"
        @keydown.enter.prevent="openItem(featuredItem)"
        @keydown.space.prevent="openItem(featuredItem)"
      >
        <div class="bib-featured-cover">
          <picture v-if="featuredItem.cover">
            <source v-if="featuredItem.coverMobile" media="(max-width: 640px)" :srcset="featuredItem.coverMobile" />
            <img :src="featuredItem.cover" :alt="featuredItem.title" loading="eager" decoding="async" />
          </picture>
          <div v-else class="bib-featured-cover-empty">
            <Sparkles class="bib-featured-cover-icon" aria-hidden="true" />
          </div>
        </div>
        <div class="bib-featured-body">
          <span class="patient-badge patient-badge--green">{{ featuredItem.badge || 'Em destaque' }}</span>
          <h2 class="bib-featured-title">{{ featuredItem.title }}</h2>
          <p class="bib-featured-desc">{{ featuredItem.subtitle }}</p>
          <span class="bib-featured-cta">
            Começar agora
            <ArrowRight class="bib-featured-cta-icon" aria-hidden="true" />
          </span>
        </div>
      </article>

      <section class="bib-quick" aria-label="Atalhos por tema">
        <button
          v-for="topic in quickTopics"
          :key="topic.id"
          type="button"
          class="bib-quick-item"
          :class="{ 'bib-quick-item--active': activeChip === topic.id }"
          @click="activeChip = topic.id"
        >
          <span class="bib-quick-icon" :class="`bib-quick-icon--${topic.tone}`" aria-hidden="true">
            <component :is="topic.icon" />
          </span>
          <span class="bib-quick-label">{{ topic.label }}</span>
        </button>
      </section>

      <BibliotecaScrollRow
        v-if="courseCards.length"
        heading-id="bib-courses-title"
        title="Cursos em vídeo"
        see-all-to="/cursos"
        :items="courseCards"
        @select="openItem"
      />

      <BibliotecaScrollRow
        v-if="ebookCards.length"
        heading-id="bib-ebooks-title"
        title="Materiais para leitura"
        see-all-to="/cursos#ebooks"
        :items="ebookCards"
        @select="openItem"
      />

      <div v-if="!hasVisibleContent && !loadError" class="bib-empty">
        <BookOpen class="bib-empty-icon" aria-hidden="true" />
        <h2>Nada por aqui ainda</h2>
        <p v-if="search.trim()">Nenhum resultado para “{{ search.trim() }}”. Tente outro termo.</p>
        <p v-else>A biblioteca será atualizada em breve com novos conteúdos.</p>
        <button v-if="search.trim() || activeChip !== 'all'" type="button" class="bib-empty-btn" @click="resetFilters">
          Limpar filtros
        </button>
      </div>
    </template>
  </div>
</template>

<script setup>
import {
  ArrowRight,
  BookOpen,
  Brain,
  Dumbbell,
  Heart,
  Search,
  Sparkles,
  Utensils,
} from 'lucide-vue-next'
import { mapCourseToTile, mapEbookToTile } from '~/utils/course-tile'
import { openPatientCourse } from '~/utils/open-patient-course'

definePageMeta({ layout: 'patient', middleware: 'patient-only' })

const config = useRuntimeConfig()
const apiBase = config.public.apiBase
const { openDocument } = usePatientDocument()

const search = ref('')
const activeChip = ref('all')
const loading = ref(true)
const loadError = ref('')
const courses = ref([])
const ebooks = ref([])
const chipsRef = ref(null)

useVerticalWheelPassthrough(chipsRef)

const chips = [
  { id: 'all', label: 'Tudo' },
  { id: 'courses', label: 'Cursos' },
  { id: 'ebooks', label: 'E-books' },
  { id: 'recipes', label: 'Receitas' },
]

const quickTopics = [
  { id: 'nutrition', label: 'Nutrição', icon: Heart, tone: 'rose' },
  { id: 'recipes', label: 'Receitas', icon: Utensils, tone: 'peach' },
  { id: 'training', label: 'Treino', icon: Dumbbell, tone: 'green' },
  { id: 'mindset', label: 'Mindset', icon: Brain, tone: 'lavender' },
]

const DEFAULT_COURSE_COVER = '/curso-capa-personalizada.png'
const DEFAULT_COURSE_COVER_MOBILE = '/curso-capa-personalizada-mobile.png'

function getCourseCover(course, variant = 'desktop') {
  if (!course) return variant === 'mobile' ? DEFAULT_COURSE_COVER_MOBILE : DEFAULT_COURSE_COVER
  if (variant === 'mobile') return course.thumbnailMobile || course.thumbnail || DEFAULT_COURSE_COVER_MOBILE
  return course.thumbnail || DEFAULT_COURSE_COVER
}

function mapCourseToCard(course) {
  return mapCourseToTile(course, { getCover: getCourseCover })
}

function mapEbookToCard(ebook) {
  return mapEbookToTile(ebook)
}

const normalizedSearch = computed(() => search.value.trim().toLowerCase())

function matchesSearch(item) {
  if (!normalizedSearch.value) return true
  const haystack = `${item.value || ''} ${item.meta || ''}`.toLowerCase()
  return haystack.includes(normalizedSearch.value)
}

function matchesChip(item) {
  if (activeChip.value === 'all') return true
  if (activeChip.value === 'courses') return item.kind === 'course'
  if (activeChip.value === 'ebooks') return item.kind === 'ebook'
  if (activeChip.value === 'recipes') return item.topic === 'recipes'
  if (activeChip.value === 'nutrition') return item.topic === 'nutrition'
  if (activeChip.value === 'training') return item.topic === 'training'
  if (activeChip.value === 'mindset') return item.topic === 'mindset'
  return true
}

const allCards = computed(() => [
  ...courses.value.map(mapCourseToCard),
  ...ebooks.value.map(mapEbookToCard),
])

const filteredCards = computed(() => allCards.value.filter((item) => matchesSearch(item) && matchesChip(item)))

const courseCards = computed(() => filteredCards.value.filter((item) => item.kind === 'course'))
const ebookCards = computed(() => filteredCards.value.filter((item) => item.kind === 'ebook'))

const featuredItem = computed(() => {
  const firstCourse = courseCards.value[0]
  if (firstCourse) {
    const course = firstCourse.raw
    return {
      ...firstCourse,
      title: course.bannerTitle || course.title,
      subtitle: course.bannerSubtitle || course.description || firstCourse.meta,
      cover: course.bannerImage || getCourseCover(course, 'desktop'),
      coverMobile: course.bannerImageMobile || course.bannerImage || getCourseCover(course, 'mobile'),
      badge: course.bannerKicker || 'Destaque da semana',
    }
  }
  const firstEbook = ebookCards.value[0]
  if (firstEbook) {
    return {
      ...firstEbook,
      title: firstEbook.value,
      subtitle: firstEbook.meta,
      badge: 'E-book',
    }
  }
  return null
})

const showFeatured = computed(() => activeChip.value === 'all' && !normalizedSearch.value)
const hasVisibleContent = computed(() => Boolean(
  (showFeatured.value && featuredItem.value)
  || courseCards.value.length
  || ebookCards.value.length,
))

function resetFilters() {
  search.value = ''
  activeChip.value = 'all'
}

function openCourse(course) {
  if (!course?.id) return
  if (openPatientCourse(course, navigateTo)) return
  navigateTo('/cursos')
}

function openEbook(ebook) {
  if (ebook?.fileUrl) {
    openDocument(ebook.fileUrl, { title: ebook.title || 'Ebook' })
    return
  }
  navigateTo('/cursos#ebooks')
}

function openItem(item) {
  if (!item) return
  if (item.kind === 'course') openCourse(item.raw)
  else openEbook(item.raw)
}

async function loadLibrary() {
  loading.value = true
  loadError.value = ''
  const token = localStorage.getItem('auth_token')
  const headers = token ? { Authorization: `Bearer ${token}` } : {}

  try {
    const [coursesData, ebooksData] = await Promise.all([
      $fetch(`${apiBase}/courses`, { headers }),
      $fetch(`${apiBase}/ebooks`, { headers }),
    ])
    courses.value = Array.isArray(coursesData) ? coursesData : []
    ebooks.value = Array.isArray(ebooksData) ? ebooksData : []
  } catch {
    loadError.value = 'Não foi possível carregar a biblioteca. Tente novamente em instantes.'
    courses.value = []
    ebooks.value = []
  } finally {
    loading.value = false
  }
}

onMounted(loadLibrary)
</script>

<style scoped>
.biblioteca-page {
  padding-top: 0;
  overflow-y: visible;
}

.bib-hero {
  margin-bottom: 1rem;
}

.bib-hero-eyebrow {
  margin: 0 0 0.25rem;
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--cf-pink-dark);
}

.bib-hero-title {
  margin: 0 0 0.35rem;
  font-size: 1.35rem;
  font-weight: 800;
  letter-spacing: -0.035em;
  line-height: 1.15;
  color: var(--cf-text);
}

.bib-hero-desc {
  margin: 0;
  font-size: 0.85rem;
  font-weight: 500;
  line-height: 1.45;
  color: var(--cf-text-muted);
}

.bib-search {
  position: relative;
  margin-bottom: 0.75rem;
}

.bib-search-icon {
  position: absolute;
  left: 0.95rem;
  top: 50%;
  transform: translateY(-50%);
  width: 1rem;
  height: 1rem;
  color: var(--cf-text-muted);
  pointer-events: none;
}

.bib-search-input {
  padding-left: 2.5rem;
}

.bib-chips {
  display: flex;
  gap: 0.45rem;
  overflow-x: auto;
  overflow-y: visible;
  overscroll-behavior-y: auto;
  margin-bottom: 1rem;
  padding-bottom: 0.15rem;
  scrollbar-width: none;
}

.bib-chips::-webkit-scrollbar {
  display: none;
}

.bib-loading {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.bib-skeleton {
  border-radius: 16px;
  background: var(--cf-track);
  animation: bib-pulse 1.2s ease-in-out infinite;
}

.bib-skeleton--featured {
  height: 14rem;
}

.bib-skeleton--row {
  height: 9rem;
}

@keyframes bib-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.55; }
}

.bib-error {
  margin: 0 0 1rem;
  padding: 0.75rem 0.85rem;
  border-radius: 12px;
  border: 1px solid color-mix(in srgb, var(--pa-red, #d64545) 25%, var(--cf-border));
  background: #fff5f5;
  font-size: 0.82rem;
  font-weight: 600;
  color: var(--pa-red, #d64545);
}

.bib-featured {
  display: flex;
  flex-direction: column;
  margin-bottom: 1.15rem;
  border: 1px solid var(--cf-border);
  border-radius: 18px;
  overflow: hidden;
  background: var(--cf-surface);
  box-shadow: var(--cf-shadow-lg);
  cursor: pointer;
  text-align: left;
  font-family: inherit;
}

.bib-featured:active {
  transform: scale(0.995);
}

.bib-featured-cover {
  aspect-ratio: 16 / 9;
  background: var(--cf-green-soft);
  border-bottom: 1px solid var(--cf-border);
}

.bib-featured-cover img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.bib-featured-cover-empty {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--cf-pink-soft);
}

.bib-featured-cover-icon {
  width: 2rem;
  height: 2rem;
  color: var(--cf-pink-dark);
}

.bib-featured-body {
  padding: 0.95rem 1rem 1rem;
}

.bib-featured-title {
  margin: 0.55rem 0 0.35rem;
  font-size: 1.05rem;
  font-weight: 800;
  letter-spacing: -0.03em;
  line-height: 1.25;
  color: var(--cf-text);
}

.bib-featured-desc {
  margin: 0;
  font-size: 0.82rem;
  font-weight: 500;
  line-height: 1.45;
  color: var(--cf-text-muted);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.bib-featured-cta {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  margin-top: 0.75rem;
  font-size: 0.82rem;
  font-weight: 700;
  color: var(--cf-pink-dark);
}

.bib-featured-cta-icon {
  width: 0.9rem;
  height: 0.9rem;
}

.bib-quick {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 0.45rem;
  margin-bottom: 1.15rem;
}

.bib-quick-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.4rem;
  padding: 0.55rem 0.25rem;
  border: 1px solid var(--cf-border);
  border-radius: 14px;
  background: var(--cf-surface);
  cursor: pointer;
  font-family: inherit;
}

.bib-quick-item--active {
  border-color: var(--cf-pink);
  background: var(--cf-pink-soft);
}

.bib-quick-icon {
  width: 2rem;
  height: 2rem;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 10px;
}

.bib-quick-icon :deep(svg) {
  width: 1rem;
  height: 1rem;
}

.bib-quick-icon--rose { background: #f3e4e5; color: #a06267; }
.bib-quick-icon--peach { background: #faeee6; color: #b07a4a; }
.bib-quick-icon--green { background: var(--cf-green-soft); color: var(--cf-green-dark); }
.bib-quick-icon--lavender { background: #eeeaf5; color: #7c5fad; }

.bib-quick-label {
  font-size: 0.68rem;
  font-weight: 600;
  color: var(--cf-text);
  text-align: center;
  line-height: 1.2;
}

.bib-empty {
  margin-top: 1.5rem;
  padding: 1.5rem 1rem;
  border: 1px dashed var(--cf-border);
  border-radius: 16px;
  text-align: center;
  background: #fafafa;
}

.bib-empty-icon {
  width: 1.75rem;
  height: 1.75rem;
  color: var(--cf-text-muted);
  margin-bottom: 0.65rem;
}

.bib-empty h2 {
  margin: 0 0 0.35rem;
  font-size: 0.95rem;
  font-weight: 700;
  color: var(--cf-text);
}

.bib-empty p {
  margin: 0;
  font-size: 0.82rem;
  color: var(--cf-text-muted);
  line-height: 1.45;
}

.bib-empty-btn {
  margin-top: 0.85rem;
  padding: 0.55rem 0.85rem;
  border: 1px solid var(--cf-border);
  border-radius: 10px;
  background: var(--cf-surface);
  font-family: inherit;
  font-size: 0.78rem;
  font-weight: 600;
  color: var(--cf-pink-dark);
  cursor: pointer;
}

@media (prefers-reduced-motion: reduce) {
  .bib-skeleton {
    animation: none;
  }

  .bib-featured:active {
    transform: none;
  }
}
</style>
