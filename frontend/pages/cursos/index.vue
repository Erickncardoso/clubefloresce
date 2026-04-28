<template>
  <NuxtLayout name="dashboard">
    <div class="courses-container" :class="{ 'patient-view': isPacienteView }">
      <div class="courses-page" :class="{ 'patient-page': isPacienteView }">
        <section
          v-if="isPacienteView"
          class="patient-banner"
          :style="patientBannerStyle"
        >
          <button
            v-if="isNutri && featuredCourse"
            class="banner-edit-btn"
            title="Editar curso em destaque"
            @click.stop="openEditCourseById(featuredCourse?.id, 'banner')"
          >
            <Edit2 />
          </button>
          <div class="patient-banner-bottom-blur"></div>
          <div class="patient-banner-content">
            <span class="patient-banner-kicker">{{ displayBannerKicker }}</span>
            <h2>{{ displayBannerTitle }}</h2>
            <p>
              {{ displayBannerSubtitle }}
            </p>
            <button v-if="featuredCourse" class="patient-banner-btn" @click="openCoursePlayerPage(featuredCourse)">
              {{ displayBannerCtaText }}
            </button>
            <button v-if="isNutri" class="patient-banner-btn ghost" @click="openCreateCourseModal">
              Novo curso
            </button>
          </div>
        </section>

        <!-- Header -->
        <div v-if="!isPacienteView" class="page-header" :class="{ 'patient-header': isPacienteView }">
          <div>
            <h1>Meus Cursos</h1>
            <p>Acesse suas aulas e trilhas de conhecimento.</p>
          </div>
          <button v-if="isNutri" @click="openCreateCourseModal" class="btn-primary">
            <Plus class="btn-icon" />
            Novo Curso
          </button>
        </div>

        <!-- Lista de Cursos (Netflix Style) -->
        <div v-if="courses.length || (isPacienteView && ebooks.length)">
          <template v-if="isPacienteView">
            <section
              v-for="row in patientCourseRows"
              :key="row.key"
              class="course-row-block"
            >
              <h2 class="course-row-title">{{ row.title }}</h2>
              <div class="courses-gallery patient-gallery">
                <div v-for="course in row.courses" :key="course.id" class="netflix-card patient-card" @click="openCoursePlayerPage(course)">
                  <div class="card-image-wrapper">
                    <picture v-if="getCourseCover(course)">
                      <source media="(max-width: 640px)" :srcset="getCourseCover(course, 'mobile')" />
                      <img :src="getCourseCover(course, 'desktop')" :alt="course.title" />
                    </picture>
                    <div v-else class="card-placeholder">
                      <BookOpen class="placeholder-icon" />
                    </div>
                    <div class="card-gradient"></div>
                    <div class="card-content">
                      <h3>{{ course.title }}</h3>
                      <p>{{ course.modules?.length || 0 }} módulo(s)</p>
                    </div>

                    <div class="card-hover-actions" v-if="isNutri">
                      <button @click.stop="openAddLessonFromCourse(course)" class="action-btn-circle" title="Adicionar Videoaula">
                        <Plus />
                      </button>
                      <button @click.stop="openEditCourseById(course.id, 'card')" class="action-btn-circle update mt-2" style="color: #64b5f6;" title="Editar Curso">
                        <Edit2 />
                      </button>
                      <button @click.stop="handleDeleteCourse(course.id)" class="action-btn-circle danger mt-2" title="Excluir Curso">
                        <Trash2 />
                      </button>
                    </div>
                  </div>
                </div>

                <button
                  v-if="isNutri"
                  type="button"
                  class="netflix-card patient-card add-course-card"
                  @click="openCreateCourseModal"
                  title="Adicionar novo curso"
                >
                  <Plus class="add-course-icon" />
                </button>
              </div>
            </section>

            <section v-if="ebooks.length || isNutri" class="course-row-block">
              <h2 class="course-row-title course-row-title-link" @click="openEbooksPage">Ebooks</h2>
              <div class="courses-gallery patient-gallery">
                <div
                  v-for="ebook in ebooks"
                  :key="ebook.id"
                  class="netflix-card patient-card"
                  @click="openEbooksPage"
                >
                  <div class="card-image-wrapper">
                    <img v-if="ebook.thumbnail" :src="ebook.thumbnail" :alt="ebook.title" />
                    <div v-else class="card-placeholder">
                      <BookOpen class="placeholder-icon" />
                    </div>
                    <div class="card-gradient"></div>

                    <div class="card-content">
                      <h3>{{ ebook.title }}</h3>
                      <p>Material para leitura</p>
                    </div>

                    <div class="card-hover-actions" v-if="isNutri">
                      <button
                        @click.stop="openCreateEbookFromCourses"
                        class="action-btn-circle"
                        title="Adicionar PDF"
                      >
                        <Plus />
                      </button>
                      <button
                        @click.stop="openEditEbookFromCourses(ebook)"
                        class="action-btn-circle update mt-2"
                        style="color: #64b5f6;"
                        title="Editar Ebook"
                      >
                        <Edit2 />
                      </button>
                      <button
                        @click.stop="handleDeleteEbookFromCourses(ebook.id)"
                        class="action-btn-circle danger mt-2"
                        title="Excluir Ebook"
                      >
                        <Trash2 />
                      </button>
                    </div>
                  </div>
                </div>

                <button
                  v-if="isNutri"
                  type="button"
                  class="netflix-card patient-card add-course-card"
                  @click="openCreateEbookFromCourses"
                  title="Adicionar novo ebook"
                >
                  <Plus class="add-course-icon" />
                </button>
              </div>
            </section>
          </template>

          <div v-else class="courses-gallery">
            <div v-for="course in courses" :key="course.id" class="netflix-card" @click="openCourseDetails(course)">
              <div class="card-image-wrapper">
                <picture v-if="getCourseCover(course)">
                  <source media="(max-width: 640px)" :srcset="getCourseCover(course, 'mobile')" />
                  <img :src="getCourseCover(course, 'desktop')" :alt="course.title" />
                </picture>
                <div v-else class="card-placeholder">
                  <BookOpen class="placeholder-icon" />
                </div>
                <div class="card-gradient"></div>

                <div class="card-content">
                  <h3>{{ course.title }}</h3>
                  <p>{{ course.modules?.length || 0 }} módulo(s)</p>
                </div>

                <!-- Hover Actions -->
                <div class="card-hover-actions" v-if="isNutri">
                  <button @click.stop="openAddLessonFromCourse(course)" class="action-btn-circle" title="Adicionar Videoaula">
                    <Plus />
                  </button>
                  <button @click.stop="openEditCourseById(course.id, 'card')" class="action-btn-circle update mt-2" style="color: #64b5f6;" title="Editar Curso">
                    <Edit2 />
                  </button>
                  <button @click.stop="handleDeleteCourse(course.id)" class="action-btn-circle danger mt-2" title="Excluir Curso">
                    <Trash2 />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div v-else-if="coursesLoadError" class="empty-state">
          <BookOpen class="empty-state-icon" />
          <h3>Não foi possível carregar os cursos</h3>
          <p>{{ coursesLoadError }}</p>
          <button class="btn-primary mt-4" @click="fetchCourses">Tentar novamente</button>
        </div>

        <!-- Estado vazio -->
        <div v-else class="empty-state">
          <BookOpen class="empty-state-icon" />
          <h3>Nenhum curso disponível</h3>
          <p>{{ isPacienteView ? 'Ainda não há cursos ou ebooks disponíveis para você.' : 'Você ainda não possui cursos cadastrados em sua conta.' }}</p>
          <button v-if="isNutri" @click="openCreateCourseModal" class="btn-primary mt-4">Criar meu primeiro curso</button>
        </div>

        <!-- Modal: Detalhes do Curso (Aulas) - Estilo Netflix Drawer -->
        <div v-if="showDetailsModal && selectedCourseDetails" class="modal-overlay fast-fade netflix-modal-overlay" @click.self="closeDetailsModal">
          <div class="modal-card wide-modal course-detail-modal netflix-theme">
            <button @click="closeDetailsModal" class="btn-close-floating dark-close"><X /></button>
            
            <div class="modal-cover-section netflix-hero">
               <img v-if="selectedCourseDetails.thumbnail" :src="selectedCourseDetails.thumbnail" class="netflix-img" />
               <div v-else class="cover-placeholder-large dark-bg"><BookOpen class="lg-icon" /></div>
               <div class="modal-cover-gradient netflix-vignette"></div>
               <div class="modal-cover-content netflix-hero-content">
                  <h2 class="netflix-serie-title">{{ selectedCourseDetails.title }}</h2>
                  <div class="netflix-hero-actions">
                    <button class="btn-netflix-play" @click="navigateTo(`/modulos/${selectedCourseDetails.modules?.[0]?.id || ''}`)">
                      <Play class="play-fill" fill="currentColor"/> Assistir
                    </button>
                    <!-- Icon buttons for Nutris -->
                    <button v-if="isNutri" class="btn-netflix-icon" title="Editar Curso" @click="openEditCourseById(selectedCourseDetails?.id, 'card')"><Edit2/></button>
                    <button v-if="isNutri" class="btn-netflix-icon" title="Adicionar Módulo" @click="openAddModule(selectedCourseDetails)"><Plus/></button>
                    <button v-if="isNutri" class="btn-netflix-icon" title="Deletar Curso" @click="handleDeleteCourse(selectedCourseDetails.id)"><Trash2/></button>
                  </div>
               </div>
            </div>

            <div class="netflix-modal-body">
               <div class="netflix-metadata">
                 <span class="match-score">Relevante</span>
                 <span class="year">2026</span>
                 <span class="age-rating">Livre</span>
                 <span class="seasons" v-if="selectedCourseDetails.modules">{{ selectedCourseDetails.modules.length }} Módulos</span>
               </div>
               
               <p class="netflix-description">{{ selectedCourseDetails.description || 'Nenhuma descrição fornecida.' }}</p>

               <div class="episodes-section">
                 <div class="episodes-header">
                   <h3>Aulas</h3>
                   <select v-if="selectedCourseDetails.modules?.length" v-model="selectedModuleDropId" class="season-select">
                     <option v-for="(mod, i) in selectedCourseDetails.modules" :key="mod.id" :value="mod.id">
                       {{ mod.title }}
                     </option>
                   </select>
                 </div>
                 
                 <div v-if="isNutri" class="module-edit-actions">
                    <span class="module-selected-title">Módulo: {{ currentDropModule?.title }}</span>
                    <div class="module-nutri-btns">
                      <button @click="openAddLesson(selectedModuleDropId)" class="btn-text-netflix"><Plus class="xs-icon"/> Nova Aula</button>
                      <button @click="handleDeleteModule(selectedModuleDropId, selectedCourseDetails.id)" class="btn-text-netflix danger"><Trash2 class="xs-icon"/></button>
                    </div>
                 </div>

                 <div v-if="!currentDropModule" class="empty-episodes">
                    <p>Módulo não selecionado ou inexistente.</p>
                 </div>
                 <div v-else-if="!currentDropModule.lessons?.length" class="empty-episodes">
                    <p>Nenhuma aula neste módulo.</p>
                 </div>
                 <div v-else class="episodes-list">
                    <div v-for="(lesson, idx) in currentDropModule.lessons" :key="lesson.id" class="episode-row" @click="navigateTo(`/modulos/${selectedModuleDropId}?lessonId=${lesson.id}`)">
                       <div class="episode-number">{{ idx + 1 }}</div>
                      <div class="episode-thumb">
                         <img v-if="lesson.thumbnail" :src="lesson.thumbnail" class="ep-thumb-img" />
                         <img v-else-if="selectedCourseDetails.thumbnail" :src="selectedCourseDetails.thumbnail" class="ep-thumb-img" />
                         <PlayCircle v-else class="ep-icon" />
                         <div class="ep-play-btn"><Play fill="white" class="xs-icon"/></div>
                      </div>
                       <div class="episode-info">
                         <div class="ep-title-row">
                           <h4 class="ep-title">{{ lesson.title }}</h4>
                            <span class="ep-duration">{{ lesson.duration || "-- min" }}</span>
                           <div class="ep-actions" v-if="isNutri">
                             <button @click.stop="handleDeleteLesson(lesson.id, currentDropModule.id)" class="ep-trash" title="Excluir Aula"><Trash2 class="xs-icon"/></button>
                           </div>
                         </div>
                         <p class="ep-desc">{{ lesson.content || 'Acompanhe a aula no reprodutor.' }}</p>
                          
                          <div class="ep-actions-row" v-if="isNutri">
                             <button @click.stop="openEditLesson(lesson)" class="ep-edit" title="Editar Aula" style="margin-right: 8px; color: #666;"><Edit2 class="xs-icon"/></button>
                             <button @click.stop="handleDeleteLesson(lesson.id, currentDropModule.id)" class="ep-trash" title="Excluir Aula"><Trash2 class="xs-icon"/></button>
                          </div>

                       </div>
                    </div>
                 </div>
               </div>
            </div>
          </div>
        </div>

        <!-- Modal: Criar Curso -->
        <div v-if="showCreateCourseModal" class="modal-overlay" @click.self="closeCreateCourseModal">
          <div class="modal-card">
            <div class="modal-header">
              <h2>Novo Curso</h2>
              <button @click="closeCreateCourseModal" class="btn-close"><X /></button>
            </div>
            <p class="modal-subtitle">Crie um novo card de curso com capa, título e descrição.</p>

            <!-- Card do curso (não banner) -->
            <div class="form-group">
              <label>Imagem de Capa do Card (Opcional)</label>
              <small class="form-hint">Capa desktop: recomendado 1080x1350 px (min. 720x900)</small>
              <div class="upload-area" @click="triggerCourseUpload" :class="{ 'has-image': coursePreview }">
                <img v-if="coursePreview" :src="coursePreview" class="upload-preview" />
                <div v-else class="upload-placeholder">
                  <ImageIcon class="upload-icon" />
                  <span>Clique para selecionar a capa do card</span>
                </div>
                <input ref="courseFileInput" type="file" accept="image/*" class="file-input-hidden" @change="handleCourseImageSelect" />
              </div>
            </div>

            <div class="form-group floating-field">
              <label>Título do Curso</label>
              <input v-model="newCourse.title" placeholder="Ex: Nutrição para Hipertrofia" />
            </div>
            <div class="form-group floating-field">
              <label>Descrição</label>
              <textarea v-model="newCourse.description" rows="3" placeholder="Descreva brevemente os objetivos do curso" />
            </div>
            <div class="modal-actions">
              <button @click="closeCreateCourseModal" class="btn-cancel">Cancelar</button>
              <button @click="handleCreateCourse" class="btn-primary" :disabled="uploading">
                <span v-if="uploading">Enviando...</span>
                <span v-else>Criar Curso</span>
              </button>
            </div>
          </div>
        </div>

        <!-- Modal: Editar Curso -->
        <div v-if="showEditCourseModal" class="modal-overlay" @click.self="showEditCourseModal = false">
          <div class="modal-card">
            <div class="modal-header">
              <h2>{{ isBannerEditMode ? 'Editar Banner' : 'Editar Curso' }}</h2>
              <button @click="showEditCourseModal = false" class="btn-close"><X /></button>
            </div>

            <!-- Imagem conforme modo de edição -->
            <div class="form-group">
              <label>{{ isBannerEditMode ? 'Imagem do Banner (Opcional)' : 'Imagem de Capa (Opcional)' }}</label>
              <small class="form-hint">
                {{ isBannerEditMode ? 'Banner desktop: recomendado 1920x640 px (min. 1200x400)' : 'Capa desktop: recomendado 1080x1350 px (min. 720x900)' }}
              </small>
              <div class="upload-area" @click="triggerCourseUpload" :class="{ 'has-image': coursePreview }">
                <img v-if="coursePreview" :src="coursePreview" class="upload-preview" />
                <div v-else class="upload-placeholder">
                  <ImageIcon class="upload-icon" />
                  <span>{{ isBannerEditMode ? 'Clique para selecionar uma nova imagem do banner' : 'Clique para selecionar uma nova imagem de capa' }}</span>
                </div>
                <input ref="courseFileInput" type="file" accept="image/*" class="file-input-hidden" @change="handleCourseImageSelect" />
              </div>
            </div>
            <div class="form-group">
              <label>{{ isBannerEditMode ? 'Imagem do Banner Mobile (Opcional)' : 'Imagem de Capa Mobile (Opcional)' }}</label>
              <small class="form-hint">
                {{ isBannerEditMode ? 'Banner mobile: recomendado 1080x1350 px (min. 720x900)' : 'Capa mobile: recomendado 1080x1350 px (min. 720x900)' }}
              </small>
              <div class="upload-area" @click="triggerCourseMobileUpload" :class="{ 'has-image': courseMobilePreview }">
                <img v-if="courseMobilePreview" :src="courseMobilePreview" class="upload-preview" />
                <div v-else class="upload-placeholder">
                  <ImageIcon class="upload-icon" />
                  <span>{{ isBannerEditMode ? 'Clique para selecionar um novo banner mobile' : 'Clique para selecionar uma nova capa mobile' }}</span>
                </div>
                <input ref="courseMobileFileInput" type="file" accept="image/*" class="file-input-hidden" @change="handleCourseMobileImageSelect" />
              </div>
            </div>

            <template v-if="isCardEditMode">
              <div class="form-group floating-field">
                <label>Título do Curso</label>
                <input v-model="editingCourse.title" placeholder="Ex: Nutrição para Hipertrofia" />
              </div>
              <div class="form-group floating-field">
                <label>Descrição</label>
                <textarea v-model="editingCourse.description" rows="3" placeholder="Descreva brevemente os objetivos do curso" />
              </div>
            </template>

            <template v-else>
              <div class="form-group floating-field">
                <label>Etiqueta do Banner (Opcional)</label>
                <input v-model="editingCourse.bannerKicker" placeholder="Ex: Destaque da semana" />
              </div>
              <div class="form-group floating-field">
                <label>Título no Banner (Opcional)</label>
                <input v-model="editingCourse.bannerTitle" placeholder="Ex: Nutrição Avançada" />
              </div>
              <div class="form-group floating-field">
                <label>Texto do Banner (Opcional)</label>
                <textarea v-model="editingCourse.bannerSubtitle" rows="2" placeholder="Ex: Assista às aulas e mantenha consistência no seu processo." />
              </div>
              <div class="form-group floating-field">
                <label>Texto do Botão (Opcional)</label>
                <input v-model="editingCourse.bannerCtaText" placeholder="Ex: Continuar agora" />
              </div>
            </template>
            <div class="modal-actions">
              <button @click="showEditCourseModal = false" class="btn-cancel">Cancelar</button>
              <button @click="handleUpdateCourse" class="btn-primary" :disabled="uploading">
                <span v-if="uploading">Salvando...</span>
                <span v-else>Salvar Alterações</span>
              </button>
            </div>
          </div>
        </div>

        <!-- Modal: Criar Módulo -->
        <div v-if="showModuleModal" class="modal-overlay" @click.self="showModuleModal = false">
          <div class="modal-card">
            <div class="modal-header">
              <h2>Novo Módulo</h2>
              <button @click="showModuleModal = false" class="btn-close"><X /></button>
            </div>
            <p class="modal-subtitle">Adicionando ao curso: <strong>{{ selectedCourse?.title }}</strong></p>

            <div class="form-group">
              <label>Título do Módulo</label>
              <input v-model="newModule.title" placeholder="Ex: Introdução e Conceitos Básicos" />
            </div>
            <div class="form-group">
              <label>Descrição (opcional)</label>
              <textarea v-model="newModule.description" rows="2" placeholder="O que o aluno aprenderá neste módulo?" />
            </div>

            <div class="modal-actions">
              <button @click="showModuleModal = false" class="btn-cancel">Cancelar</button>
              <button @click="handleCreateModule" class="btn-primary">Criar Módulo</button>
            </div>
          </div>
        </div>
        <!-- Modal: Editar Aula -->
        <div v-if="showEditLessonModal" class="modal-overlay" @click.self="showEditLessonModal = false">
          <div class="modal-card modal-card--lesson">
            <div class="modal-header">
              <h2>Editar Aula</h2>
              <button @click="showEditLessonModal = false" class="btn-close"><X /></button>
            </div>
            <p class="modal-subtitle">Editando detalhes da aula</p>

            <!-- Título -->
            <div class="form-group">
              <label>Título da Aula</label>
              <input v-model="editingLesson.title" placeholder="Ex: A importância das proteínas" />
            </div>

            <!-- Abas: Fonte do Vídeo -->
            <div class="form-group">
              <label>Vídeo</label>
              <div class="tab-pills">
                <button :class="['tab-pill', videoSourceTab === 'link' ? 'active' : '']" @click="videoSourceTab = 'link'">
                  <Link class="xs-icon" /> Link Externo
                </button>
                <button :class="['tab-pill', videoSourceTab === 'upload' ? 'active' : '']" @click="videoSourceTab = 'upload'">
                  <Upload class="xs-icon" /> Upload de Vídeo
                </button>
              </div>

              <!-- Aba Link -->
              <div v-if="videoSourceTab === 'link'" class="tab-content">
                <input v-model="editingLesson.videoUrl" placeholder="Ex: https://youtube.com/watch?v=..." />
              </div>

              <!-- Aba Upload -->
              <div v-if="videoSourceTab === 'upload'" class="tab-content">
                <input ref="videoFileInput" type="file" accept="video/mp4,video/webm,video/quicktime,video/x-msvideo,.mp4,.mov,.webm,.avi,.mkv" class="file-input-hidden" @change="handleVideoFileSelect" />
                <div
                  v-if="!videoFileLocal && !editingLesson.videoUrl"
                  class="video-upload-area"
                  @click="triggerVideoUpload"
                  @dragover.prevent
                  @drop.prevent="handleVideoDrop"
                >
                  <Film class="upload-icon" />
                  <span>Clique ou arraste um vídeo (mp4, mov, webm)</span>
                  <span class="upload-hint">Máximo: 2GB</span>
                </div>
                <div v-else class="video-selected-info">
                  <Film class="xs-icon" />
                  <span v-if="videoFileLocal">{{ videoFileLocal.name }}</span>
                  <span v-else class="video-url-preview">Vídeo atual salvo</span>
                  <button class="btn-mini" @click="triggerVideoUpload">Trocar</button>
                </div>
                <!-- Barra de progresso -->
                <div v-if="videoUploadStatus === 'uploading'" class="upload-progress-bar">
                  <div class="progress-fill" :style="{ width: videoUploadProgress + '%' }"></div>
                  <span>{{ videoUploadProgress }}%</span>
                </div>
                <div v-if="videoUploadStatus === 'done'" class="upload-done">✓ Upload concluído</div>
                <div v-if="videoUploadStatus === 'error'" class="upload-error">✗ Erro no upload. Tente novamente.</div>
              </div>
            </div>

            <!-- Duração -->
            <div class="form-group">
              <label>Duração (opcional)</label>
              <input v-model="editingLesson.duration" placeholder="Ex: 44min ou 1h 20min" />
            </div>

            <!-- Abas: Miniatura -->
            <div class="form-group">
              <label>Miniatura da Aula</label>
              <div class="tab-pills">
                <button :class="['tab-pill', thumbSourceTab === 'upload' ? 'active' : '']" @click="thumbSourceTab = 'upload'">
                  <ImageIcon class="xs-icon" /> Upload de Imagem
                </button>
                <button :class="['tab-pill', thumbSourceTab === 'frame' ? 'active' : '']" @click="thumbSourceTab = 'frame'" :disabled="!frameVideoObjectUrl">
                  <Camera class="xs-icon" /> Frame do Vídeo
                </button>
                <button v-if="isYoutube(editingLesson.videoUrl)" :class="['tab-pill', thumbSourceTab === 'youtube' ? 'active' : '']" @click="thumbSourceTab = 'youtube'; applyYoutubeThumb()">
                  <Play class="xs-icon" /> Capa YouTube
                </button>
              </div>

              <!-- Aba Upload de Imagem -->
              <div v-if="thumbSourceTab === 'upload'" class="tab-content">
                <input ref="lessonThumbInput" type="file" accept="image/*" class="file-input-hidden" @change="handleLessonThumbSelect" />
                <div class="lesson-upload-area" @click="triggerLessonThumbUpload" :class="{ 'has-image': lessonThumbPreview }">
                  <img v-if="lessonThumbPreview" :src="lessonThumbPreview" class="upload-preview" />
                  <div v-else class="upload-placeholder">
                    <ImageIcon class="upload-icon" />
                    <span>Clique para escolher uma imagem</span>
                  </div>
                </div>
              </div>

              <!-- Aba Frame do Vídeo -->
              <div v-if="thumbSourceTab === 'frame'" class="tab-content">
                <div v-if="frameVideoObjectUrl" class="frame-capture-area">
                  <video ref="frameVideoRef" :src="frameVideoObjectUrl" class="frame-video-preview" preload="metadata" @loadedmetadata="onFrameVideoLoaded" muted></video>
                  <div class="frame-controls">
                    <input type="range" min="0" :max="frameVideoDuration" step="0.1" :value="frameSeekTime" @input="onFrameSeekInput" class="frame-slider" />
                    <button @click.stop="captureVideoFrame" class="btn-capture">
                      <Camera class="xs-icon" /> Capturar este Frame
                    </button>
                  </div>
                  <div v-if="lessonThumbPreview && thumbSourceTab === 'frame'" class="frame-preview-box">
                    <span>Preview do frame capturado:</span>
                    <img :src="lessonThumbPreview" class="upload-preview" />
                  </div>
                </div>
                <div v-else class="upload-placeholder">
                  <Camera class="upload-icon" />
                  <span>Faça upload de um vídeo na aba ao lado para capturar um frame</span>
                </div>
              </div>

              <!-- Aba Capa YouTube -->
              <div v-if="thumbSourceTab === 'youtube'" class="tab-content">
                <div class="lesson-upload-area has-image" v-if="lessonThumbPreview">
                  <img :src="lessonThumbPreview" class="upload-preview" />
                </div>
                <p class="thumb-hint">Capa extraída automaticamente do YouTube</p>
              </div>
            </div>

            <div class="modal-actions">
              <button @click="showEditLessonModal = false" class="btn-cancel">Cancelar</button>
              <button @click="handleUpdateLesson" class="btn-primary" :disabled="uploading">
                <span v-if="uploading">Salvando...</span>
                <span v-else>Salvar Alterações</span>
              </button>
            </div>
          </div>
        </div>

        <!-- Modal: Criar Aula -->
        <div v-if="showLessonModal" class="modal-overlay" @click.self="showLessonModal = false">
          <div class="modal-card modal-card--lesson">
            <div class="modal-header">
              <h2>Nova Aula</h2>
              <button @click="showLessonModal = false" class="btn-close"><X /></button>
            </div>
            <p class="modal-subtitle">Adicionando aula neste módulo</p>

            <!-- Título -->
            <div class="form-group">
              <label>Título da Aula</label>
              <input v-model="newLesson.title" placeholder="Ex: A importância das proteínas" />
            </div>

            <!-- Abas: Fonte do Vídeo -->
            <div class="form-group">
              <label>Vídeo</label>
              <div class="tab-pills">
                <button :class="['tab-pill', videoSourceTab === 'link' ? 'active' : '']" @click="videoSourceTab = 'link'">
                  <Link class="xs-icon" /> Link Externo
                </button>
                <button :class="['tab-pill', videoSourceTab === 'upload' ? 'active' : '']" @click="videoSourceTab = 'upload'">
                  <Upload class="xs-icon" /> Upload de Vídeo
                </button>
              </div>

              <!-- Aba Link -->
              <div v-if="videoSourceTab === 'link'" class="tab-content">
                <input v-model="newLesson.videoUrl" placeholder="Ex: https://youtube.com/watch?v=..." />
              </div>

              <!-- Aba Upload -->
              <div v-if="videoSourceTab === 'upload'" class="tab-content">
                <input ref="videoFileInput" type="file" accept="video/mp4,video/webm,video/quicktime,video/x-msvideo,.mp4,.mov,.webm,.avi,.mkv" class="file-input-hidden" @change="handleVideoFileSelect" />
                <div
                  v-if="!videoFileLocal"
                  class="video-upload-area"
                  @click="triggerVideoUpload"
                  @dragover.prevent
                  @drop.prevent="handleVideoDrop"
                >
                  <Film class="upload-icon" />
                  <span>Clique ou arraste um vídeo (mp4, mov, webm)</span>
                  <span class="upload-hint">Máximo: 2GB</span>
                </div>
                <div v-else class="video-selected-info">
                  <Film class="xs-icon" />
                  <span>{{ videoFileLocal.name }}</span>
                  <button class="btn-mini" @click="triggerVideoUpload">Trocar</button>
                </div>
                <!-- Barra de progresso -->
                <div v-if="videoUploadStatus === 'uploading'" class="upload-progress-bar">
                  <div class="progress-fill" :style="{ width: videoUploadProgress + '%' }"></div>
                  <span>{{ videoUploadProgress }}%</span>
                </div>
                <div v-if="videoUploadStatus === 'done'" class="upload-done">✓ Upload concluído</div>
                <div v-if="videoUploadStatus === 'error'" class="upload-error">✗ Erro no upload. Tente novamente.</div>
              </div>
            </div>

            <!-- Duração -->
            <div class="form-group">
              <label>Duração (opcional)</label>
              <input v-model="newLesson.duration" placeholder="Ex: 44min ou 1h 20min" />
            </div>

            <!-- Abas: Miniatura -->
            <div class="form-group">
              <label>Miniatura da Aula</label>
              <div class="tab-pills">
                <button :class="['tab-pill', thumbSourceTab === 'upload' ? 'active' : '']" @click="thumbSourceTab = 'upload'">
                  <ImageIcon class="xs-icon" /> Upload de Imagem
                </button>
                <button :class="['tab-pill', thumbSourceTab === 'frame' ? 'active' : '']" @click="thumbSourceTab = 'frame'" :disabled="!frameVideoObjectUrl">
                  <Camera class="xs-icon" /> Frame do Vídeo
                </button>
                <button v-if="isYoutube(newLesson.videoUrl)" :class="['tab-pill', thumbSourceTab === 'youtube' ? 'active' : '']" @click="thumbSourceTab = 'youtube'; applyYoutubeThumb()">
                  <Play class="xs-icon" /> Capa YouTube
                </button>
              </div>

              <!-- Aba Upload de Imagem -->
              <div v-if="thumbSourceTab === 'upload'" class="tab-content">
                <input ref="lessonThumbInput" type="file" accept="image/*" class="file-input-hidden" @change="handleLessonThumbSelect" />
                <div class="lesson-upload-area" @click="triggerLessonThumbUpload" :class="{ 'has-image': lessonThumbPreview }">
                  <img v-if="lessonThumbPreview" :src="lessonThumbPreview" class="upload-preview" />
                  <div v-else class="upload-placeholder">
                    <ImageIcon class="upload-icon" />
                    <span>Clique para escolher uma imagem</span>
                  </div>
                </div>
              </div>

              <!-- Aba Frame do Vídeo -->
              <div v-if="thumbSourceTab === 'frame'" class="tab-content">
                <div v-if="frameVideoObjectUrl" class="frame-capture-area">
                  <video ref="frameVideoRef" :src="frameVideoObjectUrl" class="frame-video-preview" preload="metadata" @loadedmetadata="onFrameVideoLoaded" muted></video>
                  <div class="frame-controls">
                    <input type="range" min="0" :max="frameVideoDuration" step="0.1" :value="frameSeekTime" @input="onFrameSeekInput" class="frame-slider" />
                    <button @click.stop="captureVideoFrame" class="btn-capture">
                      <Camera class="xs-icon" /> Capturar este Frame
                    </button>
                  </div>
                  <div v-if="lessonThumbPreview && thumbSourceTab === 'frame'" class="frame-preview-box">
                    <span>Preview do frame capturado:</span>
                    <img :src="lessonThumbPreview" class="upload-preview" />
                  </div>
                </div>
                <div v-else class="upload-placeholder">
                  <Camera class="upload-icon" />
                  <span>Faça upload de um vídeo na aba ao lado para capturar um frame</span>
                </div>
              </div>

              <!-- Aba Capa YouTube -->
              <div v-if="thumbSourceTab === 'youtube'" class="tab-content">
                <div class="lesson-upload-area has-image" v-if="lessonThumbPreview">
                  <img :src="lessonThumbPreview" class="upload-preview" />
                </div>
                <p class="thumb-hint">Capa extraída automaticamente do YouTube</p>
              </div>
            </div>

            <div class="modal-actions">
              <button @click="showLessonModal = false" class="btn-cancel">Cancelar</button>
              <button @click="handleCreateLesson" class="btn-primary" :disabled="uploading">
                <span v-if="uploading && videoUploadStatus === 'uploading'">Enviando vídeo... {{ videoUploadProgress }}%</span>
                <span v-else-if="uploading">Salvando...</span>
                <span v-else>Criar Aula</span>
              </button>
            </div>
          </div>
        </div>

        <!-- Modal: Novo Ebook -->
        <div v-if="showCreateEbookModal" class="modal-overlay" @click.self="closeCreateEbookModal">
          <div class="modal-card">
            <div class="modal-header">
              <h2>Novo Ebook</h2>
              <button @click="closeCreateEbookModal" class="btn-close"><X /></button>
            </div>
            <p class="modal-subtitle">Adicione capa, título, descrição e o arquivo PDF.</p>

            <div class="form-group">
              <label>Capa do Ebook (Opcional)</label>
              <div class="upload-area" @click="triggerEbookCoverUpload" :class="{ 'has-image': ebookPreviewUrl }">
                <img v-if="ebookPreviewUrl" :src="ebookPreviewUrl" class="upload-preview" />
                <div v-else class="upload-placeholder">
                  <ImageIcon class="upload-icon" />
                  <span>Clique para selecionar a capa</span>
                </div>
                <input ref="ebookFileInput" type="file" accept="image/*" class="file-input-hidden" @change="handleEbookCoverSelect" />
              </div>
            </div>

            <div class="form-group floating-field">
              <label>Título do Ebook</label>
              <input v-model="newEbook.title" placeholder="Ex: Guia de Receitas Detox" />
            </div>

            <div class="form-group floating-field">
              <label>Descrição Curta</label>
              <textarea v-model="newEbook.description" rows="2" placeholder="Resumo do conteúdo..." />
            </div>

            <div class="form-group">
              <label>Arquivo PDF</label>
              <div class="pdf-upload-box" @click="triggerEbookPdfUpload" :class="{ 'has-file': selectedEbookPdfFile }">
                <FileText class="pdf-icon-big" />
                <span v-if="selectedEbookPdfFile">{{ selectedEbookPdfFile.name }}</span>
                <span v-else>Clique para selecionar o PDF</span>
                <input ref="ebookPdfInput" type="file" accept="application/pdf" class="file-input-hidden" @change="handleEbookPdfSelect" />
              </div>
            </div>

            <div class="modal-actions">
              <button @click="closeCreateEbookModal" class="btn-cancel">Cancelar</button>
              <button @click="handleCreateEbookFromCourses" class="btn-primary" :disabled="ebookUploading">
                <span v-if="ebookUploading">Enviando...</span>
                <span v-else>Salvar Ebook</span>
              </button>
            </div>
          </div>
        </div>

        <!-- Modal: Editar Ebook -->
        <div v-if="showEditEbookModal" class="modal-overlay" @click.self="closeEditEbookModal">
          <div class="modal-card">
            <div class="modal-header">
              <h2>Editar Ebook</h2>
              <button @click="closeEditEbookModal" class="btn-close"><X /></button>
            </div>
            <p class="modal-subtitle">Altere imagem, título, descrição e arquivo PDF se quiser.</p>

            <div class="form-group">
              <label>Capa do Ebook (Opcional)</label>
              <div class="upload-area" @click="triggerEditEbookCoverUpload" :class="{ 'has-image': editEbookPreviewUrl }">
                <img v-if="editEbookPreviewUrl" :src="editEbookPreviewUrl" class="upload-preview" />
                <div v-else class="upload-placeholder">
                  <ImageIcon class="upload-icon" />
                  <span>Clique para selecionar uma nova capa</span>
                </div>
                <input ref="editEbookFileInput" type="file" accept="image/*" class="file-input-hidden" @change="handleEditEbookCoverSelect" />
              </div>
            </div>

            <div class="form-group floating-field">
              <label>Título do Ebook</label>
              <input v-model="editingEbook.title" placeholder="Ex: Guia de Receitas Detox" />
            </div>

            <div class="form-group floating-field">
              <label>Descrição Curta</label>
              <textarea v-model="editingEbook.description" rows="2" placeholder="Resumo do conteúdo..." />
            </div>

            <div class="form-group">
              <label>Arquivo PDF (Opcional)</label>
              <div class="pdf-upload-box" @click="triggerEditEbookPdfUpload" :class="{ 'has-file': selectedEditEbookPdfFile }">
                <FileText class="pdf-icon-big" />
                <span v-if="selectedEditEbookPdfFile">{{ selectedEditEbookPdfFile.name }}</span>
                <span v-else>Clique para selecionar novo PDF (opcional)</span>
                <input ref="editEbookPdfInput" type="file" accept="application/pdf" class="file-input-hidden" @change="handleEditEbookPdfSelect" />
              </div>
            </div>

            <div class="modal-actions">
              <button @click="closeEditEbookModal" class="btn-cancel">Cancelar</button>
              <button @click="handleUpdateEbookFromCourses" class="btn-primary" :disabled="ebookUploading">
                <span v-if="ebookUploading">Salvando...</span>
                <span v-else>Salvar Alterações</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </NuxtLayout>
</template>

<script setup>
const config = useRuntimeConfig()
const apiBase = config.public.apiBase
const whatsappApiBase = config.public.whatsappApiBase

import { BookOpen, Plus, ChevronDown, Layers, PlayCircle, Trash2, X, Image as ImageIcon, Play, Info, Edit2, Upload, Film, Link, Camera, FileText } from 'lucide-vue-next'
const route = useRoute()
const courses = ref([])
const ebooks = ref([])
const isNutri = ref(false)
const coursesLoadError = ref('')
const showCreateCourseModal = ref(false)
const showModuleModal = ref(false)
const selectedCourse = ref(null)
const uploading = ref(false)
const coursePreview = ref(null)
const courseFileInput = ref(null)
const courseFile = ref(null)
const courseMobilePreview = ref(null)
const courseMobileFileInput = ref(null)
const courseMobileFile = ref(null)

const newCourse = reactive({ title: '', description: '', thumbnail: '', thumbnailMobile: '', bannerImage: '', bannerImageMobile: '', bannerKicker: '', bannerTitle: '', bannerSubtitle: '', bannerCtaText: '' })
const showEditCourseModal = ref(false)
const editingCourse = reactive({ id: '', title: '', description: '', thumbnail: '', thumbnailMobile: '', bannerImage: '', bannerImageMobile: '', bannerKicker: '', bannerTitle: '', bannerSubtitle: '', bannerCtaText: '' })
const editCourseMode = ref('card')
const isBannerEditMode = computed(() => editCourseMode.value === 'banner')
const isCardEditMode = computed(() => editCourseMode.value !== 'banner')
const newModule = reactive({ title: '', description: '' })
const newLesson = reactive({ title: '', videoUrl: '', duration: '', thumbnail: '' })
const showEditLessonModal = ref(false)
const editingLesson = reactive({ id: '', title: '', videoUrl: '', duration: '', thumbnail: '' })
const lessonThumbPreview = ref(null)
const lessonThumbInput = ref(null)
const lessonThumbFile = ref(null)

// â”€â”€ Novos estados: Upload de VÃ­deo + Captura de Frame â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const videoSourceTab = ref('link') // 'link' | 'upload'
const thumbSourceTab = ref('upload') // 'upload' | 'frame' | 'youtube'
const videoFileLocal = ref(null) // File do vídeo
const videoUploadProgress = ref(0)
const videoUploadStatus = ref('') // '', 'uploading', 'done', 'error'
const frameVideoRef = ref(null) // ref do <video> para frame
const frameSeekTime = ref(0)
const frameVideoDuration = ref(0)
const frameVideoObjectUrl = ref(null)
const videoFileInput = ref(null)

const showDetailsModal = ref(false)
const showLessonModal = ref(false)
const currentModuleIdForLesson = ref(null)
const showCreateEbookModal = ref(false)
const showEditEbookModal = ref(false)
const ebookUploading = ref(false)
const ebookPreviewUrl = ref(null)
const ebookFileInput = ref(null)
const ebookPdfInput = ref(null)
const selectedEbookCoverFile = ref(null)
const selectedEbookPdfFile = ref(null)
const editEbookPreviewUrl = ref(null)
const editEbookFileInput = ref(null)
const editEbookPdfInput = ref(null)
const selectedEditEbookCoverFile = ref(null)
const selectedEditEbookPdfFile = ref(null)
const newEbook = reactive({
  title: '',
  description: '',
  fileUrl: '',
  thumbnail: ''
})
const editingEbook = reactive({
  id: '',
  title: '',
  description: '',
  fileUrl: '',
  thumbnail: ''
})

const selectedCourseDetails = ref(null)
const selectedModuleDropId = ref(null)

const currentDropModule = computed(() => {
  if (!selectedCourseDetails.value || !selectedModuleDropId.value) return null
  return selectedCourseDetails.value.modules?.find(m => m.id === selectedModuleDropId.value)
})
const isPacienteView = computed(() => true)
const inferCourseRowName = (course) => {
  const explicitCategory = String(course?.category || course?.categoryName || '').trim()
  if (explicitCategory) return explicitCategory

  const haystack = `${course?.title || ''} ${course?.description || ''}`.toLowerCase()
  if (/(culin|cozinh|receita|gastron)/.test(haystack)) return 'Culinária'
  if (/(nutri|alimenta|dieta|metabol|macro|saúde)/.test(haystack)) return 'Nutrição'
  if (/(treino|fitness|academia|muscul|hipertrof|exerc)/.test(haystack)) return 'Treino'
  if (/(mindset|mental|emocional|foco|ansiedade)/.test(haystack)) return 'Mentalidade'
  return 'Outros'
}

const patientCourseRows = computed(() => {
  return [
    {
      key: 'todos-os-cursos',
      title: 'Cursos',
      courses: courses.value
    }
  ]
})
const featuredCourse = computed(() => courses.value?.[0] || null)
const getCourseCover = (course, variant = 'desktop') => {
  const desktop = '/curso-capa-personalizada.png'
  const mobile = '/curso-capa-personalizada-mobile.png'
  if (!course) return variant === 'mobile' ? mobile : desktop
  if (variant === 'mobile') return course.thumbnailMobile || course.thumbnail || mobile
  if (course.thumbnail) return course.thumbnail
  return variant === 'mobile' ? mobile : desktop
}

const getCourseBannerCover = (course, variant = 'desktop') => {
  const desktop = '/curso-capa-personalizada.png'
  const mobile = '/curso-capa-personalizada-mobile.png'
  if (!course) return variant === 'mobile' ? mobile : desktop
  if (variant === 'mobile') return course.bannerImageMobile || course.bannerImage || mobile
  return course.bannerImage || desktop
}

const patientBannerStyle = computed(() => {
  const isEditingFeatured = Boolean(
    showEditCourseModal.value
    && featuredCourse.value?.id
    && editingCourse.id
    && featuredCourse.value.id === editingCourse.id
  )
  const imageUrlDesktop = isEditingFeatured
    ? (coursePreview.value || getCourseBannerCover(featuredCourse.value, 'desktop'))
    : (featuredCourse.value ? getCourseBannerCover(featuredCourse.value, 'desktop') : null)
  const imageUrlMobile = isEditingFeatured
    ? (courseMobilePreview.value || coursePreview.value || getCourseBannerCover(featuredCourse.value, 'mobile'))
    : (featuredCourse.value ? getCourseBannerCover(featuredCourse.value, 'mobile') : null)
  return {
    '--patient-banner-desktop': imageUrlDesktop ? `url('${imageUrlDesktop}')` : 'none',
    '--patient-banner-mobile': imageUrlMobile ? `url('${imageUrlMobile}')` : (imageUrlDesktop ? `url('${imageUrlDesktop}')` : 'none'),
  }
})

const isEditingFeaturedBanner = computed(() => {
  return Boolean(
    showEditCourseModal.value
    && editCourseMode.value === 'banner'
    && featuredCourse.value?.id
    && editingCourse.id
    && featuredCourse.value.id === editingCourse.id
  )
})

const displayBannerKicker = computed(() => {
  if (isEditingFeaturedBanner.value) {
    return editingCourse.bannerKicker
  }
  return featuredCourse.value?.bannerKicker || 'Destaque da semana'
})

const displayBannerTitle = computed(() => {
  if (isEditingFeaturedBanner.value) {
    return editingCourse.bannerTitle
  }
  return featuredCourse.value?.bannerTitle || featuredCourse.value?.title || 'Sua jornada de transformação continua'
})

const displayBannerSubtitle = computed(() => {
  if (isEditingFeaturedBanner.value) {
    return editingCourse.bannerSubtitle
  }
  return featuredCourse.value?.bannerSubtitle || featuredCourse.value?.description || 'Assista às aulas e mantenha consistência no seu processo.'
})

const displayBannerCtaText = computed(() => {
  if (isEditingFeaturedBanner.value) {
    return editingCourse.bannerCtaText
  }
  return featuredCourse.value?.bannerCtaText || 'Continuar agora'
})

const openCourseDetails = (course) => {
  selectedCourseDetails.value = course
  if (course.modules && course.modules.length > 0) {
    selectedModuleDropId.value = course.modules[0].id
  } else {
    selectedModuleDropId.value = null
  }
  showDetailsModal.value = true
}

const openCoursePlayerPage = (course) => {
  if (!course?.id) return
  const firstModuleWithLesson = (course.modules || []).find((module) => module?.lessons?.length)
  const firstLesson = firstModuleWithLesson?.lessons?.[0]
  if (firstModuleWithLesson?.id && firstLesson?.id) {
    navigateTo(`/modulos/${firstModuleWithLesson.id}?lessonId=${firstLesson.id}`)
  }
}

const closeDetailsModal = () => {
  showDetailsModal.value = false
  setTimeout(() => { 
    selectedCourseDetails.value = null 
    selectedModuleDropId.value = null
  }, 300)
}

const openAddModule = (course) => {
  selectedCourse.value = course
  newModule.title = ''
  newModule.description = ''
  showModuleModal.value = true
}

const resetCreateCourseState = () => {
  newCourse.title = ''
  newCourse.description = ''
  newCourse.thumbnail = ''
  newCourse.thumbnailMobile = ''
  newCourse.bannerImage = ''
  newCourse.bannerImageMobile = ''
  newCourse.bannerKicker = ''
  newCourse.bannerTitle = ''
  newCourse.bannerSubtitle = ''
  newCourse.bannerCtaText = ''
  if (coursePreview.value && String(coursePreview.value).startsWith('blob:')) {
    URL.revokeObjectURL(coursePreview.value)
  }
  if (courseMobilePreview.value && String(courseMobilePreview.value).startsWith('blob:')) {
    URL.revokeObjectURL(courseMobilePreview.value)
  }
  coursePreview.value = null
  courseMobilePreview.value = null
  courseFile.value = null
  courseMobileFile.value = null
}

const openCreateCourseModal = () => {
  resetCreateCourseState()
  showCreateCourseModal.value = true
}

const closeCreateCourseModal = () => {
  showCreateCourseModal.value = false
  resetCreateCourseState()
}

const openAddLessonFromCourse = async (course) => {
  if (!course?.id) return
  try {
    const token = localStorage.getItem('auth_token')
    const ensuredModule = await $fetch(`${apiBase}/courses/${course.id}/modules/ensure-first`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` }
    })
    if (!ensuredModule?.id) {
      throw new Error('Não foi possível preparar o módulo inicial do curso.')
    }
    await fetchCourses()
    openAddLesson(ensuredModule.id)
  } catch (err) {
    alert(err?.data?.message || err?.message || 'Erro ao preparar módulo para nova videoaula.')
  }
}

const openEditCourse = (course, mode = 'card') => {
  if (!course?.id) return
  editCourseMode.value = mode
  courseFile.value = null
  courseMobileFile.value = null
  editingCourse.id = course.id
  editingCourse.title = course.title
  editingCourse.description = course.description || ''
  editingCourse.thumbnail = course.thumbnail || ''
  editingCourse.thumbnailMobile = course.thumbnailMobile || ''
  editingCourse.bannerImage = course.bannerImage || ''
  editingCourse.bannerImageMobile = course.bannerImageMobile || ''
  editingCourse.bannerKicker = course.bannerKicker || 'Destaque da semana'
  editingCourse.bannerTitle = course.bannerTitle || course.title || 'Sua jornada de transformação continua'
  editingCourse.bannerSubtitle = course.bannerSubtitle || course.description || 'Assista às aulas e mantenha consistência no seu processo.'
  editingCourse.bannerCtaText = course.bannerCtaText || 'Continuar agora'
  coursePreview.value = mode === 'banner'
    ? (course.bannerImage || null)
    : (course.thumbnail || null)
  courseMobilePreview.value = mode === 'banner'
    ? (course.bannerImageMobile || null)
    : (course.thumbnailMobile || null)
  showEditCourseModal.value = true
}

const openEditCourseById = (courseId, mode = 'card') => {
  if (!courseId) return
  const course = courses.value.find((item) => item.id === courseId)
  if (!course) {
    alert('Não foi possível encontrar o curso selecionado para edição.')
    return
  }
  openEditCourse(course, mode)
}

const triggerCourseUpload = () => {
  const input = courseFileInput.value
  if (!input) return
  // Força disparar change mesmo ao escolher o mesmo arquivo novamente.
  input.value = ''
  input.click()
}

const triggerCourseMobileUpload = () => {
  const input = courseMobileFileInput.value
  if (!input) return
  input.value = ''
  input.click()
}

const getImageDimensions = (file) => new Promise((resolve, reject) => {
  const objectUrl = URL.createObjectURL(file)
  const img = new Image()
  img.onload = () => {
    resolve({ width: img.width, height: img.height })
    URL.revokeObjectURL(objectUrl)
  }
  img.onerror = () => {
    URL.revokeObjectURL(objectUrl)
    reject(new Error('Não foi possível ler as dimensões da imagem.'))
  }
  img.src = objectUrl
})

const validateCourseCoverSize = async (file, variant = 'desktop') => {
  const { width, height } = await getImageDimensions(file)
  if (variant === 'desktop' && (width < 1200 || height < 400)) {
    console.warn(`Imagem desktop abaixo do recomendado: ${width}x${height}.`)
  }
  if (variant === 'mobile' && (width < 720 || height < 900)) {
    console.warn(`Imagem mobile abaixo do recomendado: ${width}x${height}.`)
  }
  return true
}

const handleCourseImageSelect = async (e) => {
  const file = e.target.files?.[0]
  if (!file) return
  const isValid = await validateCourseCoverSize(file, 'desktop')
  if (!isValid) return
  if (coursePreview.value && String(coursePreview.value).startsWith('blob:')) {
    URL.revokeObjectURL(coursePreview.value)
  }
  courseFile.value = file
  coursePreview.value = URL.createObjectURL(file)
}

const handleCourseMobileImageSelect = async (e) => {
  const file = e.target.files?.[0]
  if (!file) return
  const isValid = await validateCourseCoverSize(file, 'mobile')
  if (!isValid) return
  if (courseMobilePreview.value && String(courseMobilePreview.value).startsWith('blob:')) {
    URL.revokeObjectURL(courseMobilePreview.value)
  }
  courseMobileFile.value = file
  courseMobilePreview.value = URL.createObjectURL(file)
}

const fetchCourses = async () => {
  try {
    coursesLoadError.value = ''
    const token = localStorage.getItem('auth_token')
    if (!token) {
      coursesLoadError.value = 'Sessão expirada. Faça login novamente.'
      handleAuthTokenInvalid()
      return
    }
    const data = await $fetch(`${apiBase}/courses`, {
      headers: { Authorization: `Bearer ${token}` }
    })
    if (Array.isArray(data)) {
      courses.value = data
      handlePendingAddLessonAction()
      return
    }
    courses.value = []
    coursesLoadError.value = data?.message || 'Resposta inesperada ao carregar cursos.'
  } catch (err) {
    console.error('Erro ao buscar cursos:', err)
    if (isTokenInvalidError(err)) {
      coursesLoadError.value = 'Sessão expirada. Faça login novamente.'
      handleAuthTokenInvalid()
      return
    }
    courses.value = []
    coursesLoadError.value = err?.data?.message || err?.message || 'Falha de conexão com o servidor de cursos.'
  }
}

const buildCoursePayload = (courseData) => ({
  title: courseData.title,
  description: courseData.description || null,
  thumbnail: courseData.thumbnail || null,
  thumbnailMobile: courseData.thumbnailMobile || null,
  bannerImage: courseData.bannerImage || null,
  bannerImageMobile: courseData.bannerImageMobile || null,
  bannerKicker: courseData.bannerKicker || null,
  bannerTitle: courseData.bannerTitle || null,
  bannerSubtitle: courseData.bannerSubtitle || null,
  bannerCtaText: courseData.bannerCtaText || null
})

const buildLegacyCoursePayload = (courseData) => ({
  title: courseData.title,
  description: courseData.description || null,
  thumbnail: courseData.thumbnail || null
})

const handleAuthTokenInvalid = () => {
  localStorage.removeItem('auth_token')
  localStorage.removeItem('user_role')
  localStorage.removeItem('user_name')
  localStorage.removeItem('user_id')
  navigateTo('/')
}

const isTokenInvalidError = (err) => {
  const message = String(err?.data?.message || err?.message || '').toLowerCase()
  return message.includes('token inválido')
    || message.includes('token invalido')
    || message.includes('jwt')
    || message.includes('unauthorized')
}

const shouldFallbackLegacyPayload = (err) => {
  const message = String(err?.data?.message || err?.message || '').toLowerCase()
  return message.includes('unknown arg')
    || message.includes('thumbnailmobile')
    || message.includes('bannerkicker')
    || message.includes('bannertitle')
    || message.includes('bannersubtitle')
    || message.includes('bannerctatext')
}

const fetchEbooks = async () => {
  try {
    const token = localStorage.getItem('auth_token')
    if (!token) {
      ebooks.value = []
      return
    }
    const data = await $fetch(`${apiBase}/ebooks`, {
      headers: { Authorization: `Bearer ${token}` }
    })
    ebooks.value = Array.isArray(data) ? data : []
  } catch (err) {
    console.error('Erro ao buscar ebooks:', err)
    if (isTokenInvalidError(err)) {
      handleAuthTokenInvalid()
      return
    }
    ebooks.value = []
  }
}

const handlePendingAddLessonAction = () => {
  if (!isNutri.value) return
  if (route.query.action !== 'add-lesson') return

  const courseId = String(route.query.courseId || '')
  const requestedModuleId = String(route.query.moduleId || '')
  if (!courseId) return

  const targetCourse = courses.value.find((item) => item.id === courseId)
  if (!targetCourse) return

  const targetModuleId = requestedModuleId || targetCourse.modules?.[0]?.id
  if (!targetModuleId) {
    alert('Este curso não possui módulo. Crie um módulo antes de adicionar aulas.')
    navigateTo('/cursos', { replace: true })
    return
  }

  openAddLesson(targetModuleId)
  navigateTo('/cursos', { replace: true })
}

const openEbooksPage = () => {
  navigateTo('/ebooks')
}

const openCreateEbookFromCourses = () => {
  openCreateEbookModal()
}

const handleDeleteEbookFromCourses = async (ebookId) => {
  if (!ebookId) return
  if (!confirm('Deseja excluir este ebook?')) return
  try {
    const token = localStorage.getItem('auth_token')
    if (!token) {
      handleAuthTokenInvalid()
      return
    }
    await $fetch(`${apiBase}/ebooks/${ebookId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` }
    })
    await fetchEbooks()
  } catch (err) {
    alert(err?.data?.message || err?.message || 'Erro ao excluir ebook.')
  }
}

const resetEditEbookState = () => {
  Object.assign(editingEbook, { id: '', title: '', description: '', fileUrl: '', thumbnail: '' })
  if (editEbookPreviewUrl.value && String(editEbookPreviewUrl.value).startsWith('blob:')) {
    URL.revokeObjectURL(editEbookPreviewUrl.value)
  }
  editEbookPreviewUrl.value = null
  selectedEditEbookCoverFile.value = null
  selectedEditEbookPdfFile.value = null
}

const openEditEbookFromCourses = (ebook) => {
  if (!ebook?.id) return
  resetEditEbookState()
  editingEbook.id = ebook.id
  editingEbook.title = ebook.title || ''
  editingEbook.description = ebook.description || ''
  editingEbook.fileUrl = ebook.fileUrl || ''
  editingEbook.thumbnail = ebook.thumbnail || ''
  editEbookPreviewUrl.value = ebook.thumbnail || null
  showEditEbookModal.value = true
}

const closeEditEbookModal = () => {
  showEditEbookModal.value = false
  resetEditEbookState()
}

const resetCreateEbookState = () => {
  Object.assign(newEbook, { title: '', description: '', fileUrl: '', thumbnail: '' })
  if (ebookPreviewUrl.value && String(ebookPreviewUrl.value).startsWith('blob:')) {
    URL.revokeObjectURL(ebookPreviewUrl.value)
  }
  ebookPreviewUrl.value = null
  selectedEbookCoverFile.value = null
  selectedEbookPdfFile.value = null
}

const openCreateEbookModal = () => {
  resetCreateEbookState()
  showCreateEbookModal.value = true
}

const closeCreateEbookModal = () => {
  showCreateEbookModal.value = false
  resetCreateEbookState()
}

const triggerEbookCoverUpload = () => {
  const input = ebookFileInput.value
  if (!input) return
  input.value = ''
  input.click()
}

const triggerEbookPdfUpload = () => {
  const input = ebookPdfInput.value
  if (!input) return
  input.value = ''
  input.click()
}

const handleEbookCoverSelect = (e) => {
  const file = e.target.files?.[0]
  if (!file) return
  selectedEbookCoverFile.value = file
  if (ebookPreviewUrl.value && String(ebookPreviewUrl.value).startsWith('blob:')) {
    URL.revokeObjectURL(ebookPreviewUrl.value)
  }
  ebookPreviewUrl.value = URL.createObjectURL(file)
}

const handleEbookPdfSelect = (e) => {
  const file = e.target.files?.[0]
  if (!file) return
  if (file.type !== 'application/pdf') {
    alert('Selecione um arquivo PDF válido.')
    return
  }
  selectedEbookPdfFile.value = file
}

const handleCreateEbookFromCourses = async () => {
  if (!newEbook.title?.trim()) return alert('O título do ebook é obrigatório.')
  if (!selectedEbookPdfFile.value) return alert('Selecione o arquivo PDF do ebook.')
  ebookUploading.value = true
  try {
    const token = localStorage.getItem('auth_token')
    if (!token) {
      handleAuthTokenInvalid()
      return
    }

    if (selectedEbookCoverFile.value) {
      const coverFormData = new FormData()
      coverFormData.append('file', selectedEbookCoverFile.value)
      const coverUploadRes = await $fetch(`${apiBase}/upload`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: coverFormData
      })
      newEbook.thumbnail = coverUploadRes.url
    }

    const pdfFormData = new FormData()
    pdfFormData.append('file', selectedEbookPdfFile.value)
    const pdfUploadRes = await $fetch(`${apiBase}/upload/file`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: pdfFormData
    })
    newEbook.fileUrl = pdfUploadRes.url

    await $fetch(`${apiBase}/ebooks`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: { ...newEbook }
    })

    closeCreateEbookModal()
    await fetchEbooks()
  } catch (err) {
    alert(err?.data?.message || err?.message || 'Erro ao criar ebook.')
  } finally {
    ebookUploading.value = false
  }
}

const triggerEditEbookCoverUpload = () => {
  const input = editEbookFileInput.value
  if (!input) return
  input.value = ''
  input.click()
}

const triggerEditEbookPdfUpload = () => {
  const input = editEbookPdfInput.value
  if (!input) return
  input.value = ''
  input.click()
}

const handleEditEbookCoverSelect = (e) => {
  const file = e.target.files?.[0]
  if (!file) return
  selectedEditEbookCoverFile.value = file
  if (editEbookPreviewUrl.value && String(editEbookPreviewUrl.value).startsWith('blob:')) {
    URL.revokeObjectURL(editEbookPreviewUrl.value)
  }
  editEbookPreviewUrl.value = URL.createObjectURL(file)
}

const handleEditEbookPdfSelect = (e) => {
  const file = e.target.files?.[0]
  if (!file) return
  if (file.type !== 'application/pdf') {
    alert('Selecione um arquivo PDF válido.')
    return
  }
  selectedEditEbookPdfFile.value = file
}

const handleUpdateEbookFromCourses = async () => {
  if (!editingEbook.id) return
  if (!editingEbook.title?.trim()) return alert('O título do ebook é obrigatório.')
  ebookUploading.value = true
  try {
    const token = localStorage.getItem('auth_token')
    if (!token) {
      handleAuthTokenInvalid()
      return
    }

    const payload = {
      title: editingEbook.title,
      description: editingEbook.description || '',
      fileUrl: editingEbook.fileUrl || '',
      thumbnail: editingEbook.thumbnail || null
    }

    if (selectedEditEbookCoverFile.value) {
      const coverFormData = new FormData()
      coverFormData.append('file', selectedEditEbookCoverFile.value)
      const coverUploadRes = await $fetch(`${apiBase}/upload`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: coverFormData
      })
      payload.thumbnail = coverUploadRes.url
    }

    if (selectedEditEbookPdfFile.value) {
      const pdfFormData = new FormData()
      pdfFormData.append('file', selectedEditEbookPdfFile.value)
      const pdfUploadRes = await $fetch(`${apiBase}/upload/file`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: pdfFormData
      })
      payload.fileUrl = pdfUploadRes.url
    }

    await $fetch(`${apiBase}/ebooks/${editingEbook.id}`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}` },
      body: payload
    })

    closeEditEbookModal()
    await fetchEbooks()
  } catch (err) {
    alert(err?.data?.message || err?.message || 'Erro ao atualizar ebook.')
  } finally {
    ebookUploading.value = false
  }
}

const handleCreateCourse = async () => {
  if (!newCourse.title) return alert('Informe o título do curso.')
  uploading.value = true
  try {
    const token = localStorage.getItem('auth_token')

    // Upload local da capa desktop
    if (courseFile.value) {
      const formData = new FormData()
      formData.append('file', courseFile.value)
      try {
        const uploadRes = await $fetch(`${apiBase}/upload`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: formData
        })
        newCourse.thumbnail = uploadRes.url
      } catch (e) {
        console.warn('Falha no upload da imagem (curso continuará sem capa):', e?.data?.message || e)
      }
    }

    // No modal de criação usamos apenas uma capa principal.
    newCourse.thumbnailMobile = ''

    try {
      await $fetch(`${apiBase}/courses`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(buildCoursePayload(newCourse))
      })
    } catch (err) {
      if (!shouldFallbackLegacyPayload(err)) throw err
      await $fetch(`${apiBase}/courses`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(buildLegacyCoursePayload(newCourse))
      })
    }
    closeCreateCourseModal()
    fetchCourses()
  } catch (err) {
    let msg = 'Erro desconhecido ao criar curso.'
    
    if (err.message?.includes('Failed to fetch')) {
      msg = 'Não foi possível conectar ao servidor. O backend (porta 3001) está rodando?'
    } else {
      msg = err?.data?.message || err?.message || msg
    }
    
    alert(`Erro ao criar curso: ${msg}`)
    console.error('[Frontend] Detalhes do erro:', err)
  } finally {
    uploading.value = false
  }
}

const handleUpdateCourse = async () => {
  if (!editingCourse.title) return alert('Informe o título do curso.')
  uploading.value = true
  try {
    const token = localStorage.getItem('auth_token')
    
    if (courseFile.value) {
      const formData = new FormData()
      formData.append('file', courseFile.value)
      const uploadRes = await $fetch(`${apiBase}/upload`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData
      })
      if (!uploadRes?.url) {
        throw new Error('Upload da capa desktop não retornou URL válida.')
      }
      if (editCourseMode.value === 'banner') {
        editingCourse.bannerImage = uploadRes.url
      } else {
        editingCourse.thumbnail = uploadRes.url
      }
    }

    if (courseMobileFile.value) {
      const formData = new FormData()
      formData.append('file', courseMobileFile.value)
      const uploadRes = await $fetch(`${apiBase}/upload`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData
      })
      if (!uploadRes?.url) {
        throw new Error('Upload da capa mobile não retornou URL válida.')
      }
      if (editCourseMode.value === 'banner') {
        editingCourse.bannerImageMobile = uploadRes.url
      } else {
        editingCourse.thumbnailMobile = uploadRes.url
      }
    }

    try {
      await $fetch(`${apiBase}/courses/${editingCourse.id}`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(buildCoursePayload(editingCourse))
      })
    } catch (err) {
      if (!shouldFallbackLegacyPayload(err)) throw err
      await $fetch(`${apiBase}/courses/${editingCourse.id}`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(buildLegacyCoursePayload(editingCourse))
      })
    }
    
    showEditCourseModal.value = false
    courseFile.value = null
    courseMobileFile.value = null
    coursePreview.value = null
    courseMobilePreview.value = null
    fetchCourses()
  } catch (err) {
    alert(`Erro ao atualizar curso: ${err?.data?.message || err?.message || 'Falha ao salvar alterações.'}`)
  } finally {
    uploading.value = false
  }
}

const handleCreateModule = async () => {
  if (!newModule.title) return alert('Informe o título do módulo.')
  try {
    const token = localStorage.getItem('auth_token')
    await $fetch(`${apiBase}/courses/${selectedCourse.value.id}/modules`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: newModule
    })
    showModuleModal.value = false
    await fetchCourses()
    if (selectedCourseDetails.value && selectedCourseDetails.value.id === selectedCourse.value.id) {
        selectedCourseDetails.value = courses.value.find(c => c.id === selectedCourseDetails.value.id)
    }
  } catch (err) {
    alert('Erro ao criar módulo.')
  }
}

const handleDeleteCourse = async (id) => {
  if (!confirm('Tem certeza que deseja excluir este curso e todos os seus módulos?')) return
  try {
    const token = localStorage.getItem('auth_token')
    await $fetch(`${apiBase}/courses/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` }
    })
    fetchCourses()
  } catch (err) {
    console.error('Erro ao excluir curso:', err)
    alert(err?.data?.message || 'Erro ao excluir curso.')
  }
}

const triggerLessonThumbUpload = () => {
  lessonThumbInput.value?.click()
}

const handleLessonThumbSelect = (e) => {
  const file = e.target.files?.[0]
  if (!file) return
  lessonThumbFile.value = file
  lessonThumbPreview.value = URL.createObjectURL(file)
}

const triggerVideoUpload = () => {
  videoFileInput.value?.click()
}

const inferLessonTitleFromFileName = (fileName) => {
  const baseName = String(fileName || '')
    .replace(/\.[^.]+$/, '')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  if (!baseName) return ''
  return baseName.charAt(0).toUpperCase() + baseName.slice(1)
}

const applySelectedVideoFile = (file) => {
  if (!file) return
  // Garantir que a UI fique no modo correto ao selecionar arquivo.
  videoSourceTab.value = 'upload'
  videoFileLocal.value = file
  // Criar URL para preview e frame capture
  if (frameVideoObjectUrl.value) URL.revokeObjectURL(frameVideoObjectUrl.value)
  frameVideoObjectUrl.value = URL.createObjectURL(file)
  frameSeekTime.value = 0
  frameVideoDuration.value = 0
  // Auto-mudar aba de thumbnail para 'frame' quando tem vídeo local
  thumbSourceTab.value = 'frame'

  const inferredTitle = inferLessonTitleFromFileName(file.name)
  if (showEditLessonModal.value) {
    if (!editingLesson.title?.trim() && inferredTitle) {
      editingLesson.title = inferredTitle
    }
  } else if (!newLesson.title?.trim() && inferredTitle) {
    newLesson.title = inferredTitle
  }
}

const handleVideoFileSelect = (e) => {
  const file = e.target.files?.[0]
  applySelectedVideoFile(file)
}

const handleVideoDrop = (e) => {
  const file = e.dataTransfer?.files?.[0]
  applySelectedVideoFile(file)
}

const formatSecondsToDuration = (totalSeconds) => {
  if (!totalSeconds) return ""
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = Math.floor(totalSeconds % 60)
  const formattedSeconds = seconds < 10 ? `0${seconds}` : seconds
  return `${minutes}:${formattedSeconds} min`
}

const onFrameVideoLoaded = () => {
  if (frameVideoRef.value) {
    const duration = frameVideoRef.value.duration || 0
    frameVideoDuration.value = duration
    
    // Sugerir duraÃ§Ã£o automaticamente se o campo estiver vazio ou for novo vÃ­deo
    const formatted = formatSecondsToDuration(duration)
    if (showEditLessonModal.value) {
      if (!editingLesson.duration || editingLesson.duration === "-- min") {
        editingLesson.duration = formatted
      }
    } else {
      if (!newLesson.duration) {
        newLesson.duration = formatted
      }
    }
  }
}

const onFrameSeekInput = (e) => {
  const time = parseFloat(e.target.value)
  frameSeekTime.value = time
  if (frameVideoRef.value) {
    frameVideoRef.value.currentTime = time
  }
}

const captureVideoFrame = () => {
  const video = frameVideoRef.value
  if (!video) return
  const canvas = document.createElement('canvas')
  canvas.width = video.videoWidth || 640
  canvas.height = video.videoHeight || 360
  const ctx = canvas.getContext('2d')
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
  canvas.toBlob((blob) => {
    if (!blob) return
    const file = new File([blob], 'frame_capture.jpg', { type: 'image/jpeg' })
    lessonThumbFile.value = file
    lessonThumbPreview.value = URL.createObjectURL(blob)
  }, 'image/jpeg', 0.92)
}

const handleVideoUpload = async () => {
  if (!videoFileLocal.value) return
  const token = localStorage.getItem('auth_token')
  videoUploadStatus.value = 'uploading'
  videoUploadProgress.value = 0

  return new Promise((resolve, reject) => {
    const formData = new FormData()
    formData.append('file', videoFileLocal.value)
    const xhr = new XMLHttpRequest()
    xhr.open('POST', `${apiBase}/upload/video`)
    xhr.setRequestHeader('Authorization', `Bearer ${token}`)
    // Upload de vídeo grande pode demorar no Cloudinary (upload_large).
    xhr.timeout = 1000 * 60 * 30 // 30min
    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable) {
        videoUploadProgress.value = Math.round((e.loaded / e.total) * 100)
      }
    })
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        const data = JSON.parse(xhr.responseText || '{}')
        if (!data?.url) {
          videoUploadStatus.value = 'error'
          reject(new Error('Upload concluído, mas não retornou URL do Cloudinary.'))
          return
        }
        videoUploadStatus.value = 'done'
        if (showEditLessonModal.value) {
          editingLesson.videoUrl = data.url
        } else {
          newLesson.videoUrl = data.url
        }
        resolve(data.url)
      } else {
        videoUploadStatus.value = 'error'
        let message = 'Erro no upload do vídeo.'
        try {
          const errData = JSON.parse(xhr.responseText || '{}')
          message = errData?.message || message
        } catch {}
        reject(new Error(message))
      }
    }
    xhr.onerror = () => {
      videoUploadStatus.value = 'error'
      reject(new Error('Erro de rede no upload'))
    }
    xhr.ontimeout = () => {
      videoUploadStatus.value = 'error'
      reject(new Error('Timeout no upload do vídeo. Tente novamente.'))
    }
    xhr.send(formData)
  })
}

const resetLessonVideoState = () => {
  videoSourceTab.value = 'link'
  thumbSourceTab.value = 'upload'
  videoFileLocal.value = null
  videoUploadProgress.value = 0
  videoUploadStatus.value = ''
  frameSeekTime.value = 0
  frameVideoDuration.value = 0
  if (frameVideoObjectUrl.value) {
    URL.revokeObjectURL(frameVideoObjectUrl.value)
    frameVideoObjectUrl.value = null
  }
}

const openAddLesson = (moduleId) => {
  currentModuleIdForLesson.value = moduleId
  newLesson.title = ''
  newLesson.videoUrl = ''
  newLesson.duration = ''
  newLesson.thumbnail = ''
  lessonThumbPreview.value = null
  lessonThumbFile.value = null
  resetLessonVideoState()
  showLessonModal.value = true
}


const handleCreateLesson = async () => {
  // Se fonte é upload de vídeo, o videoUrl precisa ser preenchido pelo upload
  if (!newLesson.title) return alert('Título é obrigatório.')
  if (videoSourceTab.value === 'link' && !newLesson.videoUrl) return alert('Informe o link do vídeo.')
  if (videoSourceTab.value === 'upload' && !videoFileLocal.value && !newLesson.videoUrl) return alert('Selecione um vídeo para fazer upload.')
  try {
    uploading.value = true
    const token = localStorage.getItem('auth_token')
    
    // 1. Upload do vÃ­deo local (se necessÃ¡rio)
    if (videoSourceTab.value === 'upload' && videoFileLocal.value && !newLesson.videoUrl) {
      await handleVideoUpload()
    }
    if (!newLesson.videoUrl) throw new Error('Não foi possível obter URL do vídeo (Cloudinary).')

    // 2. Upload da miniatura (se existir arquivo)
    let finalThumbnail = newLesson.thumbnail
    if (lessonThumbFile.value) {
      const formData = new FormData()
      formData.append('file', lessonThumbFile.value)
      const uploadRes = await $fetch(`${apiBase}/upload`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData
      })
      finalThumbnail = uploadRes.url
    }

    await $fetch(`${apiBase}/courses/lessons`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: {
        title: newLesson.title,
        videoUrl: newLesson.videoUrl,
        duration: newLesson.duration,
        thumbnail: finalThumbnail,
        moduleId: currentModuleIdForLesson.value,
        order: 0
      }
    })
    showLessonModal.value = false
    uploading.value = false
    resetLessonVideoState()
    await fetchCourses()
    if (selectedCourseDetails.value) {
      selectedCourseDetails.value = courses.value.find(c => c.id === selectedCourseDetails.value.id)
    }
  } catch (err) {
    uploading.value = false
    console.error(err)
    alert('Erro ao criar aula: ' + (err?.data?.message || err?.message || 'Tente novamente.'))
  }
}

const openEditLesson = (lesson) => {
  editingLesson.id = lesson.id
  editingLesson.title = lesson.title
  editingLesson.videoUrl = lesson.videoUrl
  editingLesson.duration = lesson.duration || ''
  editingLesson.thumbnail = lesson.thumbnail || ''
  lessonThumbPreview.value = lesson.thumbnail || null
  lessonThumbFile.value = null
  resetLessonVideoState()
  // Se o link atual nÃ£o Ã© YouTube, mostrar como link externo
  if (lesson.videoUrl && !isYoutube(lesson.videoUrl)) {
    videoSourceTab.value = 'link'
  }
  // Se hÃ¡ thumbnail, mudar aba para upload
  thumbSourceTab.value = lesson.thumbnail ? 'upload' : 'upload'
  showEditLessonModal.value = true
}

const handleUpdateLesson = async () => {
  if (!editingLesson.title) return alert('Título é obrigatório.')
  if (videoSourceTab.value === 'upload' && videoFileLocal.value) {
    // Upload do novo vÃ­deo primeiro
    await handleVideoUpload()
  }
  if (!editingLesson.videoUrl) return alert('Informe o link ou faça upload de um vídeo.')
  try {
    uploading.value = true
    const token = localStorage.getItem('auth_token')

    let finalThumbnail = editingLesson.thumbnail
    if (lessonThumbFile.value) {
      const formData = new FormData()
      formData.append('file', lessonThumbFile.value)
      const uploadRes = await $fetch(`${apiBase}/upload`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData
      })
      finalThumbnail = uploadRes.url
    }

    await $fetch(`${apiBase}/courses/lessons/${editingLesson.id}`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}` },
      body: {
        title: editingLesson.title,
        videoUrl: editingLesson.videoUrl,
        duration: editingLesson.duration,
        thumbnail: finalThumbnail,
        order: 0
      }
    })
    showEditLessonModal.value = false
    uploading.value = false
    resetLessonVideoState()
    await fetchCourses()
    if (selectedCourseDetails.value) {
      selectedCourseDetails.value = courses.value.find(c => c.id === selectedCourseDetails.value.id)
    }
  } catch (err) {
    uploading.value = false
    alert('Erro ao atualizar aula.')
  }
}

const applyYoutubeThumb = () => {
  const url = showEditLessonModal.value ? editingLesson.videoUrl : newLesson.videoUrl
  let videoId = ''
  if (url.includes('v=')) {
    videoId = url.split('v=')[1].split('&')[0]
  } else if (url.includes('youtu.be/')) {
    videoId = url.split('youtu.be/')[1].split('?')[0]
  }
  
  if (videoId) {
    const thumbUrl = `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`
    lessonThumbPreview.value = thumbUrl
    if (showEditLessonModal.value) {
      editingLesson.thumbnail = thumbUrl
    } else {
      newLesson.thumbnail = thumbUrl
    }
    lessonThumbFile.value = null 
  }
}

const isYoutube = (url) => {
  if (!url) return false
  return url.includes('youtube.com') || url.includes('youtu.be')
}


const handleDeleteLesson = async (lessonId, moduleId) => {
  if (!confirm('Deseja excluir esta aula?')) return
  try {
    const token = localStorage.getItem('auth_token')
    await $fetch(`${apiBase}/courses/lessons/${lessonId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` }
    })
    await fetchCourses()
    if (selectedCourseDetails.value) {
        selectedCourseDetails.value = courses.value.find(c => c.id === selectedCourseDetails.value.id)
    }
  } catch (err) {
    alert('Erro ao excluir aula.')
  }
}

const handleDeleteModule = async (moduleId, courseId) => {
  if (!confirm('Deseja excluir este módulo? Todas as aulas vinculadas também serão removidas.')) return
  try {
    const token = localStorage.getItem('auth_token')
    await $fetch(`${apiBase}/courses/${courseId}/modules/${moduleId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` }
    })
    fetchCourses()
  } catch (err) {
    alert('Erro ao excluir módulo.')
  }
}

onMounted(() => {
  if (!localStorage.getItem('auth_token')) {
    handleAuthTokenInvalid()
    return
  }
  isNutri.value = localStorage.getItem('user_role') === 'NUTRICIONISTA'
  fetchCourses()
  fetchEbooks()
})
</script>

<style scoped>
.courses-container {
  min-height: 100%;
  background-color: #fcfcfc;
}

.courses-page {
  padding: 3rem;
  width: 100%;
  max-width: 1440px; /* Expande mais a largura, mas mantÃ©m limite para TVs 4K */
  margin: 0 auto;
}

/* Header */
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  margin-bottom: 3rem;
}

.page-header h1 {
  font-size: 2.2rem;
  font-weight: 800;
  color: #111;
  margin-bottom: 0.5rem;
  letter-spacing: -0.02em;
}

.page-header p {
  font-size: 1rem;
  color: #666;
}

/* Buttons */
.btn-primary {
  display: flex;
  align-items: center;
  gap: 8px;
  background: var(--primary);
  color: white;
  border: none;
  padding: 0.8rem 1.6rem;
  border-radius: 10px;
  cursor: pointer;
  font-weight: 700;
  font-size: 1rem;
  font-family: 'Figtree', sans-serif;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.btn-primary:hover {
  background: var(--primary-light);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(45, 90, 39, 0.2);
}

.btn-primary:active {
  transform: translateY(0);
}

.btn-primary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none !important;
  box-shadow: none !important;
}

/* Dashboard Netflix Grid */
.courses-gallery {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 1.5rem;
  padding-bottom: 2rem;
}

@media (min-width: 1400px) {
  .courses-gallery {
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  }
}

.netflix-card {
  position: relative;
  width: 100%;
  border-radius: 20px;
  overflow: hidden;
  cursor: pointer;
  background: white;
  box-shadow: 0 4px 12px rgba(0,0,0,0.05);
  transition: transform 0.3s cubic-bezier(0.25, 0.8, 0.25, 1), box-shadow 0.3s ease;
}

.netflix-card:hover {
  box-shadow: 0 12px 24px rgba(0,0,0,0.12);
  z-index: 10;
}

.card-image-wrapper {
  position: relative;
  width: 100%;
  aspect-ratio: 3/4; /* PÃ´ster vertical */
  background: #f4f6f8;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 20px;
  overflow: hidden;
}

.card-image-wrapper img {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
}


.card-placeholder {
  color: #cdd4d9;
}
.placeholder-icon { width: 48px; height: 48px; }

.card-gradient {
  position: absolute;
  inset: 0;
  background: linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.2) 50%, transparent 100%);
  opacity: 0.9;
  z-index: 1;
}

.card-content {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 1.25rem;
  z-index: 2;
  color: white;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
}

.card-content h3 {
  font-size: 1.35rem;
  font-weight: 800;
  margin-bottom: 4px;
  text-shadow: 0 2px 4px rgba(0,0,0,0.4);
  line-height: 1.1;
}

.card-content p {
  font-size: 0.85rem;
  font-weight: 600;
  color: rgba(255,255,255,0.8);
  margin: 0;
}

.card-hover-actions {
  position: absolute;
  top: 1rem;
  right: 1rem;
  z-index: 3;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  opacity: 0;
  transform: translateX(10px);
  transition: all 0.3s ease;
}

.netflix-card:hover .card-hover-actions {
  opacity: 1;
  transform: translateX(0);
}

.action-btn-circle {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.9);
  color: #333;
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  box-shadow: 0 4px 8px rgba(0,0,0,0.15);
  transition: all 0.2s;
}

.action-btn-circle svg { width: 18px; height: 18px; }
.action-btn-circle:hover { background: white; transform: scale(1.1); color: var(--primary); }
.action-btn-circle.danger { color: #e63946; }
.action-btn-circle.danger:hover { background: #ffebeb; }

/* --------- NETFLIX EXACT LIGHT MODAL STYLES --------- */
.netflix-modal-overlay {
  background: rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(8px);
  padding: 2rem 0;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  overflow: hidden;
}

.netflix-theme {
  background: #ffffff !important;
  color: #111 !important;
  border-radius: 12px !important;
  overflow: hidden;
  max-width: 850px !important;
  max-height: 90vh; /* Limitar altura do modal */
  min-height: 100px;
  padding: 0 !important;
  box-shadow: 0 10px 40px rgba(0,0,0,0.15);
  position: relative;
  display: flex;
  flex-direction: column;
}

.netflix-modal-body {
  padding: 1rem 3rem 3rem 3rem;
  overflow-y: auto; /* Scroll no corpo do modal */
  flex: 1;
  scrollbar-width: thin;
  scrollbar-color: #ddd transparent;
}

.netflix-modal-body::-webkit-scrollbar {
  width: 6px;
}
.netflix-modal-body::-webkit-scrollbar-thumb {
  background: #ddd;
  border-radius: 10px;
}
.btn-close-floating {
  position: absolute;
  top: 1rem;
  right: 1.5rem;
  z-index: 50;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.9);
  color: #000;
  border: 1px solid rgba(0,0,0,0.1);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}
.btn-close-floating:hover {
  background: #eee;
  transform: scale(1.1);
}
.btn-close-floating svg { width: 18px; height: 18px; }

.netflix-hero {
  height: 450px;
  background: #f0f0f0;
  position: relative;
  width: 100%;
}

.netflix-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: top;
  mask-image: linear-gradient(to top, transparent 0%, black 70%);
  -webkit-mask-image: linear-gradient(to top, transparent 0%, black 70%);
}

.dark-bg { background: #f0f0f0; display: flex; align-items: center; justify-content: center; height: 100%; }

.netflix-vignette {
  position: absolute;
  inset: 0;
  background: linear-gradient(to top, #ffffff 0%, transparent 60%);
  pointer-events: none;
}

.netflix-hero-content {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 0 3rem 2rem 3rem;
  z-index: 5;
}

.netflix-serie-title {
  font-size: 3.5rem;
  font-weight: 900;
  color: #111;
  margin-bottom: 1.2rem;
  text-shadow: 0 2px 10px rgba(255,255,255,0.8);
  font-family: 'Arial Black', sans-serif;
  line-height: 1.1;
  letter-spacing: -1px;
}

.netflix-hero-actions {
  display: flex;
  gap: 1rem;
  align-items: center;
}

.btn-netflix-play {
  background: var(--primary);
  color: #fff;
  border: none;
  padding: 0.6rem 2rem;
  font-size: 1.15rem;
  font-weight: 800;
  border-radius: 4px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  transition: opacity 0.2s;
  box-shadow: 0 4px 12px rgba(45, 90, 39, 0.2);
}
.btn-netflix-play:hover { opacity: 0.9; }
.play-fill { width: 24px; height: 24px; }

.btn-netflix-icon {
  width: 44px;
  height: 44px;
  border: 1px solid #ddd;
  background: rgba(255,255,255,0.8);
  color: #333;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s;
}
.btn-netflix-icon:hover { border-color: var(--primary); color: var(--primary); background: #f9fdf9; }

.netflix-modal-body {
  padding: 1rem 3rem 3rem 3rem;
}

.netflix-metadata {
  display: flex;
  gap: 1rem;
  align-items: center;
  font-size: 0.95rem;
  font-weight: 600;
  margin-bottom: 1rem;
  color: #555;
}

.match-score { color: var(--primary); font-weight: 800; }
.year { color: #888; }
.age-rating { border: 1px solid #ccc; padding: 0.1rem 0.4rem; border-radius: 3px; font-size: 0.85rem;}
.seasons { color: #888; }

.netflix-description {
  font-size: 1.05rem;
  line-height: 1.5;
  color: #444;
  max-width: 85%;
  margin-bottom: 2.5rem;
}

.episodes-section {
  display: flex;
  flex-direction: column;
}

.episodes-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
}
.episodes-header h3 { font-size: 1.5rem; font-weight: 800; color: #111; margin: 0; }

.season-select {
  background: #fff;
  color: #111;
  border: 1px solid #ddd;
  padding: 0.5rem 1rem;
  border-radius: 4px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  outline: none;
}
.season-select:focus { border-color: var(--primary); }

.module-edit-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: #f8f8f8;
  padding: 0.75rem 1rem;
  border-radius: 4px;
  margin-bottom: 1rem;
  border: 1px solid #eee;
}
.module-selected-title { font-weight: 600; font-size: 0.9rem; color: #777; }

.btn-text-netflix {
  display: flex; align-items: center; gap: 0.3rem;
  background: transparent; color: #777; border: none; font-weight: 600; cursor: pointer;
  font-size: 0.85rem; padding: 0.3rem 0.6rem; border-radius: 4px;
  transition: all 0.2s;
}
.btn-text-netflix:hover { background: #eee; color: #111; }
.btn-text-netflix.danger:hover { background: #fff0f0; color: #e50914; }

.empty-episodes { color: #999; text-align: center; padding: 2rem; font-size: 1.1rem; }

.episodes-list {
  display: flex;
  flex-direction: column;
  border-top: 1px solid #eee;
  max-height: 550px;
  overflow-y: auto;
  padding-right: 0.5rem;
  scrollbar-width: thin;
  scrollbar-color: #ddd transparent;
}

.episodes-list::-webkit-scrollbar {
  width: 6px;
}

.episodes-list::-webkit-scrollbar-thumb {
  background: #ddd;
  border-radius: 10px;
}

.episode-row {
  display: flex;
  align-items: center;
  padding: 1.5rem 1.5rem;
  border-bottom: 1px solid #eee;
  transition: background 0.2s;
  cursor: pointer;
  border-radius: 8px;
  width: 100%;
}
.episode-row:hover { background: #f2f2f2; }

.episode-number { 
  width: 30px; 
  font-size: 1.5rem; 
  font-weight: 500; 
  color: #888; 
  text-align: center; 
  flex-shrink: 0;
}

.episode-thumb {
  width: 150px;
  height: 84px;
  background: #ddd;
  border-radius: 4px;
  margin: 0 1.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  overflow: hidden;
  flex-shrink: 0;
  box-shadow: 0 2px 10px rgba(0,0,0,0.1);
}
.ep-thumb-img { width: 100%; height: 100%; object-fit: cover; }
.ep-icon { color: #fff; width: 32px; height: 32px; opacity: 0.8; }

.ep-play-btn {
  position: absolute;
  inset: 0;
  background: rgba(0,0,0,0.1);
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: 0.2s;
}
.episode-row:hover .ep-play-btn { opacity: 1; }

.episode-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
}
.ep-title-row {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 0.5rem;
}
.ep-title { font-size: 1.1rem; font-weight: 700; color: #111; margin: 0; }
.ep-duration { font-size: 1rem; font-weight: 600; color: #333; margin-left: auto; }

.ep-desc { font-size: 0.95rem; color: #555; line-height: 1.4; margin: 0; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }

.ep-actions-row { margin-top: 0.5rem; display: flex; gap: 0.5rem; opacity: 0; transition: 0.2s; }
.episode-row:hover .ep-actions-row { opacity: 1; }

.ep-trash {
  background: transparent; border: none; color: #888; cursor: pointer; border-radius: 50%;
  width: 28px; height: 28px; display: flex; align-items: center; justify-content: center;
}
.ep-trash:hover { background: #fff0f0; color: #e50914; }

.xs-icon { width: 14px; height: 14px; }

.fast-fade { animation: fadeIn 0.15s ease-out; }
@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }


/* Modal and Upload Styles (Same as previous but polished) */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 200;
}

.modal-card {
  background: white;
  padding: 2.5rem;
  border-radius: 24px;
  width: 100%;
  max-width: 520px;
  box-shadow: 0 20px 40px rgba(0,0,0,0.1);
  max-height: calc(100vh - 2rem);
  overflow-y: auto;
  scrollbar-width: thin;
  scrollbar-color: #d6d6d6 transparent;
}

.modal-card::-webkit-scrollbar {
  width: 6px;
}

.modal-card::-webkit-scrollbar-thumb {
  background: #d6d6d6;
  border-radius: 999px;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
}

.modal-header h2 {
  font-size: 1.5rem;
  font-weight: 800;
  color: #111;
  letter-spacing: -0.02em;
}

.btn-close {
  width: 36px;
  height: 36px;
  background: #f5f5f5;
  border: none;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: #666;
  transition: all 0.2s;
  flex-shrink: 0;
}

.btn-close:hover {
  background: #eee;
  color: #111;
}

.btn-close svg {
  width: 16px;
  height: 16px;
}

.modal-subtitle {
  font-size: 0.9rem;
  color: #777;
  margin-bottom: 1.5rem;
  margin-top: -1rem;
}

.form-group {
  margin-bottom: 1.5rem;
}

.form-group label {
  display: block;
  font-size: 0.85rem;
  font-weight: 800;
  color: #444;
  margin-bottom: 0.6rem;
  letter-spacing: 0.01em;
}

.form-group.floating-field {
  position: relative;
  margin-top: 1.05rem;
}

.form-group.floating-field label {
  position: absolute;
  top: -0.62rem;
  left: 0.78rem;
  margin-bottom: 0;
  padding: 0 0.42rem;
  background: #fff;
  z-index: 2;
  line-height: 1;
}

.form-group.floating-field input,
.form-group.floating-field textarea {
  padding-top: 1rem;
}

.form-hint {
  display: block;
  margin: -0.2rem 0 0.6rem;
  font-size: 0.78rem;
  color: #64748b;
  font-weight: 600;
}

.form-group input,
.form-group textarea {
  width: 100%;
  padding: 0.85rem 1rem;
  border: 1.5px solid #eee;
  border-radius: 12px;
  font-family: inherit;
  font-size: 0.95rem;
  color: #111;
  background: #fafafa;
  outline: none;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  box-sizing: border-box;
  resize: vertical;
}

.form-group input:hover,
.form-group textarea:hover {
  border-color: #ddd;
}

.form-group input:focus,
.form-group textarea:focus {
  border-color: var(--primary);
  background: white;
  box-shadow: 0 0 0 4px rgba(45, 90, 39, 0.08);
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  margin-top: 2rem;
  padding-top: 1.5rem;
  border-top: 1px solid #f3f3f3;
}

.btn-cancel {
  background: #fdfdfd;
  border: 1.5px solid #eee;
  color: #666;
  padding: 0.75rem 1.5rem;
  border-radius: 14px;
  cursor: pointer;
  font-weight: 700;
  font-size: 0.95rem;
  transition: all 0.2s;
}

.btn-cancel:hover {
  background: #f7f7f7;
  border-color: #e0e0e0;
  color: #333;
}

.btn-primary {
  background: var(--primary);
  color: white;
  border: none;
  padding: 0.75rem 2rem;
  border-radius: 14px;
  font-weight: 700;
  font-size: 0.95rem;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 140px;
}

.btn-primary:hover:not(:disabled) {
  background: #254a20;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(45, 90, 39, 0.2);
}

.btn-primary:active:not(:disabled) {
  transform: translateY(0);
}

.btn-primary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  filter: grayscale(0.5);
}

.upload-area {
  border: 2px dashed #eee;
  border-radius: 16px;
  height: 160px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  overflow: hidden;
  position: relative;
  transition: all 0.3s;
  background: #fafafa;
}

.upload-area:hover {
  border-color: var(--primary);
  background: #f8fbf8;
}

.upload-preview {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.upload-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.8rem;
  color: #aaa;
  font-size: 0.9rem;
}

.file-input-hidden {
  display: none;
}

.pdf-upload-box {
  border: 2px dashed #dfe3e8;
  border-radius: 12px;
  min-height: 110px;
  padding: 1rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  cursor: pointer;
  background: #fafafa;
  color: #64748b;
  text-align: center;
}

.pdf-upload-box:hover {
  border-color: var(--primary);
  color: var(--primary);
  background: #f8fbf8;
}

.pdf-upload-box.has-file {
  border-color: #2d5a27;
  background: #f0fdf4;
  color: #166534;
}

.pdf-icon-big {
  width: 26px;
  height: 26px;
}

.empty-state {
  text-align: center;
  padding: 6rem 2rem;
  background: #fff;
  border-radius: 24px;
  border: 1px solid #eee;
}

.empty-state-icon {
  width: 64px;
  height: 64px;
  color: #eee;
  margin-bottom: 2rem;
}

.empty-state h3 {
  font-size: 1.5rem;
  font-weight: 700;
  color: #333;
  margin-bottom: 0.5rem;
}

.mt-4 { margin-top: 1.5rem; }

.lesson-thumb-container {
  display: flex;
  flex-direction: column;
  gap: 0.8rem;
}

.lesson-upload-area {
  width: 100%;
  height: 140px;
  background: #f8f9fa;
  border: 2px dashed #e0e0e0;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  overflow: hidden;
  position: relative;
  transition: all 0.2s ease;
}

.lesson-upload-area:hover {
  border-color: #64b5f6;
  background: #f1f8ff;
}

.lesson-upload-area.has-image {
  border-style: solid;
  border-color: #eee;
}

.thumb-helpers {
  display: flex;
  gap: 0.5rem;
}

.btn-mini-netflix {
  background: #f0f0f0;
  border: none;
  border-radius: 6px;
  padding: 0.4rem 0.8rem;
  font-size: 0.75rem;
  font-weight: 700;
  color: #444;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.4rem;
  transition: transform 0.1s;
}

.btn-mini-netflix:hover {
  background: #e0e0e0;
}

.btn-mini-netflix:active {
  transform: scale(0.95);
}

/* â”€â”€ Modal LiÃ§Ã£o (maior para caber os controles) â”€â”€ */
.modal-card--lesson {
  max-width: 620px;
  max-height: 90vh;
  overflow-y: auto;
  scrollbar-width: thin;
  scrollbar-color: #eee transparent;
}
.modal-card--lesson::-webkit-scrollbar { width: 4px; }
.modal-card--lesson::-webkit-scrollbar-thumb { background: #ddd; border-radius: 4px; }

/* â”€â”€ Tab Pills â”€â”€ */
.tab-pills {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 0.75rem;
  background: #f5f5f5;
  border-radius: 10px;
  padding: 4px;
}

.tab-pill {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 8px;
  font-size: 0.82rem;
  font-weight: 700;
  font-family: inherit;
  cursor: pointer;
  background: transparent;
  color: #888;
  transition: all 0.2s;
}

.tab-pill:hover:not(:disabled) {
  background: #ececec;
  color: #444;
}

.tab-pill.active {
  background: white;
  color: #111;
  box-shadow: 0 1px 4px rgba(0,0,0,0.1);
}

.tab-pill:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.tab-pill svg {
  width: 14px;
  height: 14px;
}

.tab-content {
  margin-top: 0;
}

/* â”€â”€ Ãrea de Upload de VÃ­deo â”€â”€ */
.video-upload-area {
  border: 2px dashed #d8d8d8;
  border-radius: 12px;
  padding: 2rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.6rem;
  cursor: pointer;
  background: #fafafa;
  color: #999;
  font-size: 0.88rem;
  transition: all 0.2s;
  text-align: center;
}

.video-upload-area:hover {
  border-color: var(--primary);
  background: #f4faf4;
  color: #555;
}

.upload-hint {
  font-size: 0.75rem;
  color: #bbb;
}

.video-selected-info {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  padding: 0.75rem 1rem;
  background: #f0f9f0;
  border: 1.5px solid #c8e6c9;
  border-radius: 10px;
  font-size: 0.85rem;
  color: #2e7d32;
  font-weight: 600;
}

.video-selected-info span:first-of-type {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.video-url-preview {
  color: #666;
  font-style: italic;
}

.btn-mini {
  background: white;
  border: 1.5px solid #ddd;
  border-radius: 6px;
  padding: 0.3rem 0.7rem;
  font-size: 0.75rem;
  font-weight: 700;
  font-family: inherit;
  cursor: pointer;
  color: #555;
  transition: all 0.2s;
  flex-shrink: 0;
}

.btn-mini:hover {
  border-color: #bbb;
  color: #111;
}

/* â”€â”€ Barra de Progresso de Upload â”€â”€ */
.upload-progress-bar {
  margin-top: 0.75rem;
  border-radius: 8px;
  background: #eee;
  height: 8px;
  overflow: hidden;
  position: relative;
  display: flex;
  align-items: center;
}

.upload-progress-bar span {
  position: absolute;
  right: 0;
  top: -18px;
  font-size: 0.75rem;
  color: var(--primary);
  font-weight: 700;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, var(--primary), #6ab04c);
  border-radius: 8px;
  transition: width 0.3s ease;
}

.upload-done {
  margin-top: 0.5rem;
  font-size: 0.82rem;
  color: #2e7d32;
  font-weight: 700;
  display: flex;
  align-items: center;
  gap: 0.3rem;
}

.upload-error {
  margin-top: 0.5rem;
  font-size: 0.82rem;
  color: #c62828;
  font-weight: 700;
}

/* â”€â”€ Frame Capture â”€â”€ */
.frame-capture-area {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.frame-video-preview {
  width: 100%;
  border-radius: 10px;
  max-height: 200px;
  object-fit: cover;
  background: #111;
}

.frame-controls {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
}

.frame-slider {
  width: 100%;
  accent-color: var(--primary);
  cursor: pointer;
  height: 4px;
}

.btn-capture {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.6rem 1.2rem;
  background: #111;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 0.85rem;
  font-weight: 700;
  font-family: inherit;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-capture:hover {
  background: #333;
  transform: translateY(-1px);
}

.btn-capture:active {
  transform: translateY(0);
}

.btn-capture svg {
  width: 14px;
  height: 14px;
}

.frame-preview-box {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  font-size: 0.8rem;
  color: #888;
  font-weight: 600;
}

.frame-preview-box .upload-preview {
  height: 100px;
  border-radius: 8px;
  object-fit: cover;
}

.thumb-hint {
  font-size: 0.8rem;
  color: #aaa;
  margin-top: 0.5rem;
  text-align: center;
}

.upload-icon {
  width: 32px;
  height: 32px;
  color: #ccc;
}

/* --- Paciente: visual editorial/streaming --- */
.courses-container.patient-view {
  background:
    radial-gradient(circle at 12% 5%, rgba(76, 175, 80, 0.12), transparent 42%),
    linear-gradient(180deg, #f7f9fc 0%, #f1f5fb 100%) !important;
  min-height: 100vh;
  padding: 0;
}

.courses-page.patient-page {
  background: transparent !important;
  max-width: none;
  margin: 0;
  padding: 0 2.5rem 2.25rem;
}

.patient-banner {
  position: relative;
  min-height: 640px;
  border-radius: 10px;
  overflow: hidden;
  margin: 0 -2.5rem 2.2rem;
  background-image: var(--patient-banner-desktop);
  background-size: cover;
  background-position: center center;
  border: none;
  box-shadow: none;
  -webkit-mask-image: linear-gradient(to bottom, #000 0%, #000 58%, rgba(0, 0, 0, 0.78) 76%, rgba(0, 0, 0, 0.32) 90%, rgba(0, 0, 0, 0) 100%);
  mask-image: linear-gradient(to bottom, #000 0%, #000 58%, rgba(0, 0, 0, 0.78) 76%, rgba(0, 0, 0, 0.32) 90%, rgba(0, 0, 0, 0) 100%);
}

.patient-banner-bottom-blur {
  display: none;
}

.patient-banner::before {
  content: '';
  position: absolute;
  inset: 0;
  z-index: 0;
  background: linear-gradient(
    90deg,
    rgba(255, 255, 255, 0.36) 0%,
    rgba(255, 255, 255, 0.18) 24%,
    rgba(255, 255, 255, 0.04) 46%,
    rgba(255, 255, 255, 0) 62%
  );
}

.patient-banner::after {
  content: none;
}

.banner-edit-btn {
  position: absolute;
  top: 5.2rem;
  right: 1rem;
  z-index: 3;
  width: 38px;
  height: 38px;
  border-radius: 999px;
  border: 1px solid rgba(15, 23, 42, 0.14);
  background: rgba(255, 255, 255, 0.88);
  color: #0f172a;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  opacity: 0;
  transform: translateY(-4px);
  transition: opacity 0.18s ease, transform 0.18s ease, background 0.18s ease;
}

.banner-edit-btn svg {
  width: 16px;
  height: 16px;
}

.patient-banner:hover .banner-edit-btn {
  opacity: 1;
  transform: translateY(0);
}

.banner-edit-btn:hover {
  background: #ffffff;
}

.patient-banner-content {
  position: absolute;
  z-index: 2;
  left: 10rem;
  top: 7.4rem;
  max-width: 440px;
  padding: 0;
  color: #0f172a;
  text-shadow: none;
}

.patient-banner-kicker {
  display: inline-flex;
  margin-bottom: 0.85rem;
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  border-radius: 999px;
  padding: 0.35rem 0.65rem;
  border: 1px solid rgba(15, 23, 42, 0.18);
  background: rgba(255, 255, 255, 0.78);
  color: #0f172a;
}

.patient-banner h2 {
  font-size: clamp(2.15rem, 3vw, 3rem);
  line-height: 1.1;
  margin-bottom: 0.85rem;
  font-weight: 800;
}

.patient-banner p {
  max-width: 48ch;
  color: rgba(15, 23, 42, 0.86);
  line-height: 1.52;
  font-size: 0.95rem;
  margin: 0;
}

.patient-banner-btn {
  margin-top: 1.15rem;
  border: none;
  border-radius: 10px;
  background: #fff;
  color: #111318;
  font-weight: 700;
  padding: 0.65rem 1rem;
  cursor: pointer;
  transition: transform 0.2s ease;
}

.patient-banner-btn:hover {
  transform: translateY(-1px);
}

.patient-banner-btn.ghost {
  margin-left: 0.6rem;
  background: rgba(255, 255, 255, 0.76);
  color: #0f172a;
  border: 1px solid rgba(15, 23, 42, 0.12);
}

.patient-header h1,
.patient-header p {
  color: #f5f5f5;
}

.patient-header p {
  opacity: 0.78;
}

.course-row-block {
  margin-bottom: 2rem;
}

.course-row-title {
  color: #0f172a;
  font-size: 1.4rem;
  font-weight: 800;
  margin: 0 0 0.9rem;
}

.course-row-title-link {
  cursor: pointer;
  width: fit-content;
}

.course-row-title-link:hover {
  opacity: 0.88;
}

.courses-gallery.patient-gallery {
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 1.8rem;
}

.netflix-card.patient-card {
  border-radius: 8px;
  background: #ffffff;
  border: 1px solid rgba(15, 23, 42, 0.08);
  box-shadow: none;
  transform: none;
  transition: box-shadow 0.25s ease, border-color 0.25s ease;
}

.netflix-card.patient-card:hover {
  transform: none;
  box-shadow: none;
}

.patient-card .card-image-wrapper {
  aspect-ratio: 3 / 4.1;
  border-radius: 8px;
  overflow: hidden;
}

.patient-card .card-gradient {
  background: none;
}

.patient-card .card-content h3 {
  font-size: 1.18rem;
  font-weight: 600;
  letter-spacing: -0.01em;
  color: #ffffff;
  text-shadow: 0 2px 8px rgba(0, 0, 0, 0.45);
  line-height: 1.08;
}

.patient-card .card-content p {
  color: rgba(255, 255, 255, 0.9);
  font-size: 0.82rem;
  text-shadow: 0 1px 6px rgba(0, 0, 0, 0.45);
}

.netflix-card.patient-card.add-course-card {
  aspect-ratio: 3 / 4.1;
  width: 100%;
  background: transparent !important;
  border: 2px dashed rgba(15, 23, 42, 0.28) !important;
  box-shadow: none !important;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

.netflix-card.patient-card.add-course-card:hover {
  border-color: rgba(15, 23, 42, 0.42) !important;
  background: transparent !important;
  box-shadow: none !important;
}

.add-course-icon {
  width: 38px;
  height: 38px;
  color: rgba(15, 23, 42, 0.62);
}

.card-tag-patient {
  position: absolute;
  left: 1rem;
  top: 1rem;
  z-index: 3;
  text-transform: lowercase;
  letter-spacing: 0.08em;
  font-size: 0.72rem;
  font-weight: 700;
  color: rgba(15, 23, 42, 0.88);
  padding: 0.28rem 0.5rem;
  border-radius: 8px;
  border: 1px solid rgba(15, 23, 42, 0.22);
  background: rgba(255, 255, 255, 0.74);
  backdrop-filter: blur(4px);
}

.card-tag-ebook {
  background: rgba(17, 24, 39, 0.62);
}

@media (max-width: 900px) {
  .courses-gallery.patient-gallery {
    grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
    gap: 1rem;
  }
}

@media (max-width: 640px) {
  .courses-page.patient-page {
    padding: 0 1.2rem 1.2rem;
  }

  .patient-banner {
    min-height: 500px;
    margin: 0 -1.2rem 1.5rem;
    background-image: var(--patient-banner-mobile);
  }

  .patient-banner-content {
    left: 1.2rem;
    right: 1.2rem;
    top: auto;
    bottom: 1.2rem;
    max-width: 92%;
    color: #0f172a;
    text-shadow: none;
  }

  .patient-banner-bottom-blur {
    height: 160px;
  }

  .patient-banner h2,
  .patient-banner p {
    color: #0f172a;
  }

  .banner-edit-btn {
    top: 4.2rem;
    right: 0.85rem;
    opacity: 1;
    transform: none;
  }

  .modal-overlay {
    padding: 0.75rem;
    align-items: flex-start;
  }

  .modal-card {
    max-width: 100%;
    max-height: calc(100vh - 1.5rem);
    padding: 1.15rem;
    border-radius: 16px;
  }

  .modal-header {
    margin-bottom: 1rem;
  }
}

</style>


