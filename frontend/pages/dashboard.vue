<template>
  <NuxtLayout name="dashboard">
    <div class="dashboard-page">
      <!-- Seção Superior: Postar Novidades + Novas Aulas -->
      <div class="top-grid">
        <!-- Carrossel de Novidades (Elite) -->
        <div class="news-carousel">
          <div class="carousel-inner" :style="{ transform: `translateX(-${activeSlide * 100}%)` }">
            <!-- Slide 1: Welcome -->
            <div class="slide">
              <div class="slide-content">
                <span class="slide-tag">Boas-vindas</span>
                <h2>Sua jornada para o bem-estar começa aqui.</h2>
                <p>Explore nossos módulos e descubra como a nutrição pode transformar sua vida.</p>
                <NuxtLink to="/cursos" class="slide-cta">Começar agora</NuxtLink>
              </div>
              <div class="slide-image">
                <div class="image-overlay"></div>
                <img src="https://images.unsplash.com/photo-1490645935967-10de6ba17061?q=80&w=2070&auto=format&fit=crop" alt="Healthy Food" />
              </div>
            </div>

            <!-- Slide 2: Latest Course -->
            <div class="slide" v-if="latestCourse">
              <div class="slide-content">
                <span class="slide-tag">Lançamento</span>
                <h2>{{ latestCourse.title }}</h2>
                <p>{{ latestCourse.description || 'Confira o novo conteúdo exclusivo que preparamos para você.' }}</p>
                <NuxtLink :to="`/cursos`" class="slide-cta">Ver curso</NuxtLink>
              </div>
              <div class="slide-image">
                <div class="image-overlay"></div>
                <img :src="latestCourse.thumbnail || 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?q=80&w=2070&auto=format&fit=crop'" alt="Course Thumbnail" />
              </div>
            </div>

            <!-- Slide 3: Blog/Tip -->
            <div class="slide">
              <div class="slide-content">
                <span class="slide-tag">Dica do Especialista</span>
                <h2>Os benefícios dos antioxidantes naturais.</h2>
                <p>Saiba quais alimentos incluir na sua rotina para combater o envelhecimento celular.</p>
                <button class="slide-cta ghost">Ler artigo</button>
              </div>
              <div class="slide-image">
                <div class="image-overlay"></div>
                <img src="https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?q=80&w=1974&auto=format&fit=crop" alt="Antioxidants" />
              </div>
            </div>
          </div>

          <div class="carousel-controls">
            <button class="ctrl-btn" @click="prevSlide"><ChevronLeft /></button>
            <div class="carousel-dots">
              <span v-for="i in slidesCount" :key="i" class="dot" :class="{ active: activeSlide === i - 1 }" @click="activeSlide = i - 1"></span>
            </div>
            <button class="ctrl-btn" @click="nextSlide"><ChevronRight /></button>
          </div>
        </div>

        <!-- Seção de Novas Aulas (Card Elite) -->
        <div class="new-classes-card">
          <div class="card-header">
            <div class="header-main">
              <PlayCircle class="header-icon-green" />
              <h3>Aulas recentes</h3>
            </div>
            <NuxtLink to="/cursos" class="view-all">Ver todas</NuxtLink>
          </div>
          
          <div class="classes-list" v-if="recentCourses.length">
            <div v-for="course in recentCourses" :key="course.id" class="class-item">
              <div class="class-thumb">
                <img v-if="course.thumbnail" :src="course.thumbnail" />
                <BookOpen v-else class="thumb-placeholder" />
              </div>
              <div class="class-info">
                <h4>{{ course.title }}</h4>
                <p>{{ course.modules?.length || 0 }} Módulos</p>
              </div>
            </div>
          </div>
          <div v-else class="classes-empty">
            <p>Ainda não há aulas registradas.</p>
          </div>
        </div>
      </div>

      <!-- Seção Inferior: Notificações + Blog -->
      <div class="bottom-grid">
        <!-- Notificações -->
        <div class="notifications-card shadow-card">
          <div class="card-header">
            <div class="header-main">
              <Bell class="header-icon-orange" />
              <h3>Minhas Notificações</h3>
            </div>
            <span class="notif-count" v-if="unreadCount > 0">{{ unreadCount }} novas</span>
          </div>
          <div class="notif-list" v-if="notifications.length">
            <div v-for="n in notifications" :key="n.id" class="notif-item">
              <div class="notif-dot" :class="{ unread: !n.read }"></div>
              <div class="notif-content">
                <p class="notif-text"><strong>{{ n.title }}</strong>: {{ n.body }}</p>
                <span class="notif-time">{{ formatTime(n.createdAt) }}</span>
              </div>
            </div>
          </div>
          <div v-else class="empty-state">
            <p>Nenhuma notificação por enquanto.</p>
          </div>
        </div>

        <!-- Blog Florescer -->
        <div class="blog-preview shadow-card">
          <div class="card-header">
            <div class="header-main">
              <TrendingUp class="header-icon-purple" />
              <h3>Blog Florescer</h3>
            </div>
            <ChevronRight class="header-icon-small" />
          </div>
          <div class="blog-articles">
            <div class="blog-article-mini">
              <div class="blog-img-box">
                <img src="https://images.unsplash.com/photo-1547524960-8f2713f09b56?q=80&w=2070&auto=format&fit=crop" />
              </div>
              <div class="blog-txt">
                <h5>Como organizar sua marmita semanal</h5>
                <p>Dicas práticas para manter o foco na dieta durante a correria.</p>
              </div>
            </div>
            <div class="blog-article-mini">
              <div class="blog-img-box">
                <img src="https://images.unsplash.com/photo-1511690656952-34342bb7c2f2?q=80&w=2000&auto=format&fit=crop" />
              </div>
              <div class="blog-txt">
                <h5>Músculos e Proteína Vegetal</h5>
                <p>É possível ganhar massa sendo vegano? Especialistas respondem.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </NuxtLayout>
</template>

<script setup>
import { 
  ChevronLeft, 
  ChevronRight, 
  Bell, 
  BookOpen, 
  TrendingUp,
  PlayCircle,
  Plus
} from 'lucide-vue-next'

const userName = ref('')
const activeSlide = ref(0)
const slidesCount = ref(3)
const recentCourses = ref([])
const latestCourse = computed(() => recentCourses.value[0])
const notifications = ref([
  { id: 1, title: 'Atualização', body: 'Seu plano alimentar foi atualizado pela Nutri.', read: false, createdAt: new Date() },
  { id: 2, title: 'Comunidade', body: 'João comentou no seu post: "Muito bom!"', read: true, createdAt: new Date(Date.now() - 3600000) }
])
const unreadCount = computed(() => notifications.value.filter(n => !n.read).length)

const nextSlide = () => {
  activeSlide.value = (activeSlide.value + 1) % slidesCount.value
}
const prevSlide = () => {
  activeSlide.value = (activeSlide.value - 1 + slidesCount.value) % slidesCount.value
}

const fetchDashboardData = async () => {
  try {
    const token = localStorage.getItem('auth_token')
    const { data } = await $fetch('http://localhost:3001/api/courses', {
      headers: { Authorization: `Bearer ${token}` }
    })
    recentCourses.value = data.slice(0, 3)
    userName.value = localStorage.getItem('user_name') || 'Visitante'
  } catch (err) {
    console.error('Erro ao carregar dashboard:', err)
  }
}

const formatTime = (date) => {
  return new Intl.RelativeTimeFormat('pt-BR', { numeric: 'auto' }).format(-1, 'hour')
}

// Auto-play carousel
let timer
onMounted(() => {
  fetchDashboardData()
  timer = setInterval(nextSlide, 7000)
})

onUnmounted(() => {
  clearInterval(timer)
})
</script>

<style scoped>
.dashboard-page {
  padding: 3rem;
  max-width: 1440px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 2.5rem;
}

/* CAROUSEL ELITE */
.news-carousel {
  grid-column: span 1;
  background: #1a1a1a;
  border-radius: 24px;
  position: relative;
  overflow: hidden;
  height: 440px;
  box-shadow: 0 10px 30px rgba(0,0,0,0.1);
}

.carousel-inner {
  display: flex;
  height: 100%;
  transition: transform 0.8s cubic-bezier(0.65, 0, 0.35, 1);
}

.slide {
  min-width: 100%;
  height: 100%;
  display: flex;
  position: relative;
}

.slide-content {
  flex: 1;
  padding: 4rem;
  display: flex;
  flex-direction: column;
  justify-content: center;
  z-index: 10;
  background: linear-gradient(90deg, #1a1a1a 40%, transparent);
}

.slide-tag {
  color: var(--primary-light);
  font-weight: 800;
  text-transform: uppercase;
  font-size: 0.75rem;
  letter-spacing: 0.1em;
  margin-bottom: 1.2rem;
  display: block;
}

.slide h2 {
  color: white;
  font-size: 2.5rem;
  line-height: 1.1;
  font-weight: 800;
  margin-bottom: 1.5rem;
  max-width: 400px;
}

.slide p {
  color: rgba(255,255,255,0.7);
  font-size: 1.1rem;
  margin-bottom: 2rem;
  max-width: 400px;
}

.slide-cta {
  align-self: flex-start;
  padding: 1rem 2.5rem;
  background: var(--primary);
  color: white;
  border-radius: 12px;
  text-decoration: none;
  font-weight: 700;
  transition: 0.3s;
}

.slide-cta:hover {
  background: var(--primary-light);
  transform: translateY(-3px);
}

.slide-cta.ghost {
  background: transparent;
  border: 1px solid rgba(255,255,255,0.2);
}

.slide-image {
  position: absolute;
  top: 0;
  right: 0;
  width: 60%;
  height: 100%;
}

.slide-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.image-overlay {
  position: absolute;
  inset: 0;
  background: linear-gradient(90deg, #1a1a1a 0%, transparent 100%);
}

.carousel-controls {
  position: absolute;
  bottom: 2rem;
  left: 4rem;
  display: flex;
  align-items: center;
  gap: 2rem;
  z-index: 20;
}

.ctrl-btn {
  background: rgba(255,255,255,0.1);
  border: none;
  color: white;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: 0.2s;
}

.ctrl-btn:hover { background: rgba(255,255,255,0.2); }

.carousel-dots {
  display: flex;
  gap: 8px;
}

.dot {
  width: 8px;
  height: 8px;
  border-radius: 4px;
  background: rgba(255,255,255,0.2);
  cursor: pointer;
  transition: 0.3s;
}

.dot.active {
  width: 24px;
  background: var(--primary);
}

/* TOP GRID COLS */
.top-grid {
  display: grid;
  grid-template-columns: 2.2fr 1fr;
  gap: 2rem;
}

/* RECENT CLASSES CARD */
.new-classes-card {
  background: white;
  border-radius: 24px;
  padding: 2rem;
  display: flex;
  flex-direction: column;
  box-shadow: 0 4px 20px rgba(0,0,0,0.03);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
}

.header-main {
  display: flex;
  align-items: center;
  gap: 12px;
}

.header-main h3 {
  font-size: 1.25rem;
  font-weight: 800;
  color: #111;
}

.header-icon-green { color: var(--primary); }
.header-icon-orange { color: #f39c12; }
.header-icon-purple { color: #8e44ad; }

.view-all {
  color: var(--primary);
  font-size: 0.85rem;
  font-weight: 700;
  text-decoration: none;
}

.classes-list {
  display: flex;
  flex-direction: column;
  gap: 1.2rem;
}

.class-item {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 0.8rem;
  border-radius: 16px;
  transition: 0.2s;
  cursor: pointer;
}

.class-item:hover {
  background: #fcfcfc;
  transform: translateX(5px);
}

.class-thumb {
  width: 60px;
  height: 60px;
  border-radius: 12px;
  background: #f0f0f0;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.class-thumb img { width: 100%; height: 100%; object-fit: cover; }
.thumb-placeholder { width: 24px; color: #ddd; }

.class-info h4 {
  font-size: 1rem;
  font-weight: 700;
  color: #333;
  margin-bottom: 2px;
}

.class-info p {
  font-size: 0.8rem;
  color: #999;
  font-weight: 600;
}

/* BOTTOM GRID */
.bottom-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 2rem;
}

.shadow-card {
  background: white;
  border-radius: 24px;
  padding: 2rem;
  box-shadow: 0 4px 20px rgba(0,0,0,0.03);
}

/* NOTIFICATIONS */
.notif-item {
  display: flex;
  gap: 12px;
  padding: 1rem 0;
  border-bottom: 1px solid #f5f5f5;
}

.notif-item:last-child { border-bottom: none; }

.notif-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #eee;
  margin-top: 6px;
  flex-shrink: 0;
}

.notif-dot.unread { background: #f39c12; }

.notif-text { font-size: 0.95rem; color: #555; margin-bottom: 4px; line-height: 1.4; }
.notif-time { font-size: 0.75rem; color: #aaa; font-weight: 600; }

/* BLOG PREVIEW */
.blog-articles {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.blog-article-mini {
  display: flex;
  gap: 1.2rem;
  align-items: center;
}

.blog-img-box {
  width: 100px;
  height: 70px;
  border-radius: 12px;
  overflow: hidden;
  flex-shrink: 0;
}

.blog-img-box img { width: 100%; height: 100%; object-fit: cover; }

.blog-txt h5 { font-size: 0.95rem; font-weight: 700; color: #222; margin-bottom: 4px; }
.blog-txt p { font-size: 0.85rem; color: #888; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }

.classes-empty, .empty-state {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #ccc;
  font-size: 0.9rem;
  text-align: center;
}
</style>
