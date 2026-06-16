<template>
  <NuxtLayout :name="layoutName">
    <div
      class="courses-container"
      :class="{
        'patient-view': isPacienteView,
        'admin-with-banner': showCourseBanner && !isPacienteView,
        'streaming-layout': useStreamingLayout,
      }"
    >
      <div
        class="courses-page"
        :class="{
          'patient-page': isPacienteView,
          'has-featured-banner': showCourseBanner && !isPacienteView,
          'streaming-page': useStreamingLayout && !isPacienteView,
        }"
      >
        <section
          v-if="showCourseBanner"
          class="patient-banner"
          :class="{ 'patient-banner--admin': !isPacienteView }"
          :style="patientBannerThemeStyle"
        >
          <div class="patient-banner-bg" :style="patientBannerStyle" aria-hidden="true" />
          <button
            v-if="isNutri && featuredCourse"
            type="button"
            class="banner-edit-btn"
            title="Editar capa do destaque"
            @click.stop="openEditCourseById(featuredCourse?.id, 'banner')"
          >
            <Edit2 class="banner-edit-btn-icon" />
            <span class="banner-edit-btn-label">Editar capa</span>
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

        <!-- Header admin (só sem capa de destaque) -->
        <div v-if="!showCourseBanner && !isPacienteView" class="page-header">
          <div>
            <h1>Meus Cursos</h1>
            <p>Acesse suas aulas e trilhas de conhecimento.</p>
          </div>
          <button v-if="isNutri" @click="openCreateCourseModal" class="btn-primary">
            <Plus class="btn-icon" />
            Novo Curso
          </button>
        </div>

        <!-- Lista de Cursos (carrossel) -->
        <div v-if="courses.length || (useStreamingLayout && (ebooks.length || isNutri))">
          <section
            v-for="row in patientCourseRows"
            :key="row.key"
            class="course-row-block"
          >
            <h2 class="course-row-title">{{ row.title }}</h2>
            <SharedCfTileCarousel
              :items="patientCourseTiles"
              :aria-label="row.title"
              @select="onCourseTileSelect"
            >
              <template v-if="isNutri" #actions="{ item }">
                <SharedCfTileActionsMenu :menu-key="`course-${item.id}`">
                  <button
                    type="button"
                    class="cf-tile-actions-item"
                    role="menuitem"
                    @click="openAddLessonFromCourse(item.raw)"
                  >
                    <Plus />
                    Adicionar videoaula
                  </button>
                  <button
                    type="button"
                    class="cf-tile-actions-item cf-tile-actions-item--edit"
                    role="menuitem"
                    @click="openEditCourseById(item.raw.id, 'card')"
                  >
                    <Edit2 />
                    Editar curso
                  </button>
                  <button
                    type="button"
                    class="cf-tile-actions-item cf-tile-actions-item--danger"
                    role="menuitem"
                    @click="handleDeleteCourse(item.raw.id)"
                  >
                    <Trash2 />
                    Excluir curso
                  </button>
                </SharedCfTileActionsMenu>
              </template>
            </SharedCfTileCarousel>
          </section>

          <section v-if="useStreamingLayout && (ebooks.length || isNutri)" id="patient-ebooks" class="course-row-block">
            <h2 class="course-row-title course-row-title-link" @click="openEbooksPage">Ebooks</h2>
            <SharedCfTileCarousel
              :items="patientEbookTiles"
              aria-label="Ebooks"
              @select="onEbookTileSelect"
            >
              <template v-if="isNutri" #actions="{ item }">
                <SharedCfTileActionsMenu :menu-key="`ebook-${item.id}`">
                  <button
                    type="button"
                    class="cf-tile-actions-item"
                    role="menuitem"
                    @click="openCreateEbookFromCourses"
                  >
                    <Plus />
                    Adicionar PDF
                  </button>
                  <button
                    type="button"
                    class="cf-tile-actions-item cf-tile-actions-item--edit"
                    role="menuitem"
                    @click="openEditEbookFromCourses(item.raw)"
                  >
                    <Edit2 />
                    Editar ebook
                  </button>
                  <button
                    type="button"
                    class="cf-tile-actions-item cf-tile-actions-item--danger"
                    role="menuitem"
                    @click="handleDeleteEbookFromCourses(item.raw.id)"
                  >
                    <Trash2 />
                    Excluir ebook
                  </button>
                </SharedCfTileActionsMenu>
              </template>
            </SharedCfTileCarousel>
          </section>
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

        <ClientOnly>
        <Teleport to="body">
        <!-- Modal: Detalhes do Curso (Aulas) - Estilo Netflix Drawer -->
        <div v-if="showDetailsModal && selectedCourseDetails" class="modal-overlay fast-fade netflix-modal-overlay courses-modal-overlay" @click.self="closeDetailsModal">
          <div class="modal-card wide-modal course-detail-modal netflix-theme">
            <button @click="closeDetailsModal" class="btn-close-floating dark-close"><X /></button>
            
            <div class="modal-cover-section netflix-hero">
               <img v-if="selectedCourseDetails.thumbnail" :src="selectedCourseDetails.thumbnail" class="netflix-img" />
               <div v-else class="cover-placeholder-large dark-bg"><BookOpen class="lg-icon" /></div>
               <div class="modal-cover-gradient netflix-vignette"></div>
               <div class="modal-cover-content netflix-hero-content">
                  <h2 class="netflix-serie-title">{{ selectedCourseDetails.title }}</h2>
                  <div class="netflix-hero-actions">
                    <button class="btn-netflix-play" @click="navigateTo(buildModuleUrl(selectedCourseDetails.modules?.[0], null, null, selectedCourseDetails.id))">
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
                    <button
                      v-if="isNutri"
                      type="button"
                      class="btn-text-netflix"
                      @click="openAddLesson(selectedModuleDropId)"
                    >
                      <Plus class="xs-icon" /> Adicionar primeira aula
                    </button>
                 </div>
                 <div v-else class="episodes-list">
                    <div v-for="(lesson, idx) in currentDropModule.lessons" :key="lesson.id" class="episode-row" @click="navigateTo(buildModuleUrl(currentDropModule, lesson, currentDropModule.lessons, selectedCourseDetails.id))">
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
        <div v-if="showCreateCourseModal" class="modal-overlay courses-modal-overlay" @click.self="closeCreateCourseModal">
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

        <!-- Modal: Editar Curso / Capa -->
        <div v-if="showEditCourseModal" class="modal-overlay courses-modal-overlay" @click.self="showEditCourseModal = false">
          <div class="modal-card" :class="{ 'modal-card--banner': isBannerEditMode }">
            <div class="modal-header" :class="{ 'modal-header--banner': isBannerEditMode }">
              <div>
                <h2>{{ isBannerEditMode ? 'Personalizar capa' : 'Editar curso' }}</h2>
                <p v-if="isBannerEditMode" class="modal-subtitle">Prévia ao vivo. Use as abas para ajustar cada parte.</p>
              </div>
              <button type="button" @click="showEditCourseModal = false" class="btn-close" aria-label="Fechar"><X /></button>
            </div>

            <template v-if="isBannerEditMode">
              <div class="banner-editor-preview" :style="bannerEditorThemeStyle">
                <div class="banner-editor-preview-bg" :style="bannerEditorBgStyle" />
                <div class="banner-editor-preview-fade" />
                <div class="banner-editor-preview-content">
                  <span class="banner-editor-kicker">{{ editingCourse.bannerKicker || 'Etiqueta' }}</span>
                  <h3>{{ editingCourse.bannerTitle || 'Título do destaque' }}</h3>
                  <p>{{ editingCourse.bannerSubtitle || 'Subtítulo do banner' }}</p>
                  <span class="banner-editor-cta">{{ editingCourse.bannerCtaText || 'Continuar agora' }}</span>
                </div>
              </div>

              <nav class="banner-editor-tabs" aria-label="Seções da capa">
                <button
                  v-for="tab in bannerEditTabs"
                  :key="tab.id"
                  type="button"
                  class="banner-editor-tab"
                  :class="{ 'banner-editor-tab--active': bannerEditTab === tab.id }"
                  @click="bannerEditTab = tab.id"
                >
                  {{ tab.label }}
                </button>
              </nav>

              <div class="banner-editor-panel">
                <section v-show="bannerEditTab === 'imagens'" class="banner-editor-section">
                  <div class="banner-upload-grid">
                    <div class="banner-upload-card">
                      <div class="banner-upload-card-head">
                        <Monitor class="banner-upload-device-icon" aria-hidden="true" />
                        <div>
                          <strong>Desktop</strong>
                          <span>1920 × 640 px</span>
                        </div>
                      </div>
                      <button type="button" class="banner-upload-frame banner-upload-frame--desktop" @click="triggerCourseUpload">
                        <img v-if="coursePreview" :src="coursePreview" alt="Prévia desktop">
                        <span v-else class="banner-upload-empty"><ImageIcon /> Enviar imagem</span>
                      </button>
                      <input ref="courseFileInput" type="file" accept="image/*" class="file-input-hidden" @change="handleCourseImageSelect">
                    </div>
                    <div class="banner-upload-card">
                      <div class="banner-upload-card-head">
                        <Smartphone class="banner-upload-device-icon" aria-hidden="true" />
                        <div>
                          <strong>Mobile</strong>
                          <span>1080 × 1350 px</span>
                        </div>
                      </div>
                      <button type="button" class="banner-upload-frame banner-upload-frame--mobile" @click="triggerCourseMobileUpload">
                        <img v-if="courseMobilePreview" :src="courseMobilePreview" alt="Prévia mobile">
                        <span v-else class="banner-upload-empty"><ImageIcon /> Enviar imagem</span>
                      </button>
                      <input ref="courseMobileFileInput" type="file" accept="image/*" class="file-input-hidden" @change="handleCourseMobileImageSelect">
                    </div>
                  </div>
                </section>

                <section v-show="bannerEditTab === 'texto'" class="banner-editor-section">
                  <div class="banner-field-grid">
                    <div class="form-group">
                      <label for="banner-kicker">Etiqueta</label>
                      <input id="banner-kicker" v-model="editingCourse.bannerKicker" placeholder="Ex: Vídeos e ebooks">
                    </div>
                    <div class="form-group">
                      <label for="banner-title">Título</label>
                      <input id="banner-title" v-model="editingCourse.bannerTitle" placeholder="Ex: Boas-vindas">
                    </div>
                    <div class="form-group banner-field-full">
                      <label for="banner-subtitle">Subtítulo</label>
                      <textarea id="banner-subtitle" v-model="editingCourse.bannerSubtitle" rows="3" placeholder="Ex: Assista às aulas e mantenha consistência no seu processo." />
                    </div>
                    <div class="form-group">
                      <label for="banner-cta">Botão principal</label>
                      <input id="banner-cta" v-model="editingCourse.bannerCtaText" placeholder="Ex: Continuar agora">
                    </div>
                  </div>
                </section>

                <section v-show="bannerEditTab === 'cores'" class="banner-editor-section">
                  <div class="banner-color-groups">
                    <div
                      v-for="group in bannerColorFieldGroups"
                      :key="group.title"
                      class="banner-color-group"
                    >
                      <h4>{{ group.title }}</h4>
                      <div class="banner-color-row">
                        <div
                          v-for="field in group.fields"
                          :key="field.key"
                          class="color-field"
                        >
                          <span class="color-field-label">{{ field.label }}</span>
                          <div class="color-field-controls">
                            <label class="color-swatch-btn" :style="{ background: editingCourse[field.key] }" :title="`Escolher ${field.label.toLowerCase()}`">
                              <input v-model="editingCourse[field.key]" type="color" :aria-label="`Cor de ${field.label}`">
                            </label>
                            <input
                              class="color-hex-input"
                              type="text"
                              inputmode="text"
                              maxlength="7"
                              spellcheck="false"
                              autocomplete="off"
                              :value="editingCourse[field.key]"
                              placeholder="#000000"
                              :aria-label="`Código hex de ${field.label}`"
                              @input="onBannerColorHexInput(field.key, $event)"
                              @blur="onBannerColorHexBlur(field.key, $event)"
                            >
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </section>

                <section v-show="bannerEditTab === 'enquadramento'" class="banner-editor-section">
                  <div class="banner-device-toggle" role="tablist" aria-label="Dispositivo">
                    <button type="button" role="tab" class="banner-device-btn" :class="{ active: bannerPositionVariant === 'desktop' }" :aria-selected="bannerPositionVariant === 'desktop'" @click="bannerPositionVariant = 'desktop'">
                      <Monitor class="banner-device-btn-icon" /> Desktop
                    </button>
                    <button type="button" role="tab" class="banner-device-btn" :class="{ active: bannerPositionVariant === 'mobile' }" :aria-selected="bannerPositionVariant === 'mobile'" @click="bannerPositionVariant = 'mobile'">
                      <Smartphone class="banner-device-btn-icon" /> Mobile
                    </button>
                  </div>
                  <p class="banner-editor-hint">Arraste no preview ou use os controles para definir o foco da imagem.</p>
                  <div
                    v-if="bannerPositionVariant === 'desktop' ? coursePreview : (courseMobilePreview || coursePreview)"
                    class="banner-position-preview"
                    :class="{ 'banner-position-preview--mobile': bannerPositionVariant === 'mobile' }"
                    :style="bannerPositionVariant === 'mobile' ? bannerMobilePreviewStyle : bannerDesktopPreviewStyle"
                    @pointerdown.prevent="onActiveBannerPositionDrag"
                  >
                    <span class="banner-position-marker" :style="bannerPositionVariant === 'mobile' ? bannerMobileMarkerStyle : bannerDesktopMarkerStyle" />
                  </div>
                  <div v-else class="banner-position-empty">Envie uma imagem na aba Imagens para ajustar o enquadramento.</div>
                  <div class="banner-position-sliders">
                    <label class="banner-position-slider">
                      <span>Horizontal</span>
                      <input v-if="bannerPositionVariant === 'desktop'" v-model.number="bannerPosDesktop.x" type="range" min="0" max="100">
                      <input v-else v-model.number="bannerPosMobile.x" type="range" min="0" max="100">
                    </label>
                    <label class="banner-position-slider">
                      <span>Vertical</span>
                      <input v-if="bannerPositionVariant === 'desktop'" v-model.number="bannerPosDesktop.y" type="range" min="0" max="100">
                      <input v-else v-model.number="bannerPosMobile.y" type="range" min="0" max="100">
                    </label>
                  </div>
                  <div class="banner-position-presets">
                    <button v-for="preset in bannerPositionPresets" :key="preset.id" type="button" class="banner-position-preset" @click="applyActiveBannerPreset(preset.id)">{{ preset.label }}</button>
                  </div>
                </section>
              </div>
            </template>

            <template v-else>
              <div class="form-group">
                <label>Imagem de capa (desktop)</label>
                <small class="form-hint">Recomendado 1080 × 1350 px</small>
                <div class="upload-area" @click="triggerCourseUpload" :class="{ 'has-image': coursePreview }">
                  <img v-if="coursePreview" :src="coursePreview" class="upload-preview" alt="">
                  <div v-else class="upload-placeholder">
                    <ImageIcon class="upload-icon" />
                    <span>Selecionar imagem</span>
                  </div>
                  <input ref="courseFileInput" type="file" accept="image/*" class="file-input-hidden" @change="handleCourseImageSelect">
                </div>
              </div>
              <div class="form-group">
                <label>Imagem de capa (mobile)</label>
                <div class="upload-area" @click="triggerCourseMobileUpload" :class="{ 'has-image': courseMobilePreview }">
                  <img v-if="courseMobilePreview" :src="courseMobilePreview" class="upload-preview" alt="">
                  <div v-else class="upload-placeholder">
                    <ImageIcon class="upload-icon" />
                    <span>Selecionar imagem</span>
                  </div>
                  <input ref="courseMobileFileInput" type="file" accept="image/*" class="file-input-hidden" @change="handleCourseMobileImageSelect">
                </div>
              </div>
              <div class="form-group">
                <label for="course-title">Título do curso</label>
                <input id="course-title" v-model="editingCourse.title" placeholder="Ex: Nutrição para hipertrofia">
              </div>
              <div class="form-group">
                <label for="course-desc">Descrição</label>
                <textarea id="course-desc" v-model="editingCourse.description" rows="3" placeholder="Objetivos do curso" />
              </div>
            </template>

            <div class="modal-actions" :class="{ 'modal-actions--banner': isBannerEditMode }">
              <button type="button" @click="showEditCourseModal = false" class="btn-cancel">Cancelar</button>
              <button type="button" @click="handleUpdateCourse" class="btn-primary" :disabled="uploading">
                <span v-if="uploading">Salvando...</span>
                <span v-else>Salvar alterações</span>
              </button>
            </div>
          </div>
        </div>

        <!-- Modal: Criar Módulo -->
        <div v-if="showModuleModal" class="modal-overlay courses-modal-overlay" @click.self="showModuleModal = false">
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
        <CoursesLessonFormModal
          v-model:open="lessonModalOpen"
          :mode="lessonModalMode"
          :module-id="currentModuleIdForLesson || ''"
          :lesson="lessonModalLesson"
          :context="lessonFormContext"
          @saved="onLessonSaved"
        />

        <!-- Modal: Novo Ebook -->
        <div v-if="showCreateEbookModal" class="modal-overlay courses-modal-overlay" @click.self="closeCreateEbookModal">
          <div class="modal-card modal-card--ebook">
            <div class="modal-header">
              <h2>Novo Ebook</h2>
              <button @click="closeCreateEbookModal" class="btn-close"><X /></button>
            </div>
            <p class="modal-subtitle">Adicione capa, título, descrição e o arquivo PDF.</p>

            <div class="ebook-modal-grid">
              <div class="form-group ebook-modal-cover">
                <label>Capa do Ebook (Opcional)</label>
                <div class="upload-area upload-area--ebook" @click="triggerEbookCoverUpload" :class="{ 'has-image': ebookPreviewUrl }">
                  <img v-if="ebookPreviewUrl" :src="ebookPreviewUrl" class="upload-preview" />
                  <div v-else class="upload-placeholder">
                    <ImageIcon class="upload-icon" />
                    <span>Selecionar capa</span>
                  </div>
                  <input ref="ebookFileInput" type="file" accept="image/*" class="file-input-hidden" @change="handleEbookCoverSelect" />
                </div>
              </div>

              <div class="ebook-modal-fields">
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
                  <div class="pdf-upload-box pdf-upload-box--ebook" @click="triggerEbookPdfUpload" :class="{ 'has-file': selectedEbookPdfFile }">
                    <FileText class="pdf-icon-big" />
                    <span v-if="selectedEbookPdfFile">{{ selectedEbookPdfFile.name }}</span>
                    <span v-else>Clique para selecionar o PDF</span>
                    <small v-if="!selectedEbookPdfFile" class="pdf-upload-hint">{{ documentUploadHint }}</small>
                    <input ref="ebookPdfInput" type="file" accept="application/pdf" class="file-input-hidden" @change="handleEbookPdfSelect" />
                  </div>
                </div>
              </div>
            </div>

            <div class="modal-actions">
              <button @click="closeCreateEbookModal" class="btn-cancel">Cancelar</button>
              <button
                @click="handleCreateEbookFromCourses"
                class="btn-primary"
                :disabled="ebookUploading"
                :aria-busy="ebookUploading"
                :aria-label="ebookUploading ? 'Enviando ebook' : undefined"
              >
                <span v-if="ebookUploading" class="btn-spinner" aria-hidden="true" />
                <span v-else>Salvar Ebook</span>
              </button>
            </div>
          </div>
        </div>

        <!-- Modal: Editar Ebook -->
        <div v-if="showEditEbookModal" class="modal-overlay courses-modal-overlay" @click.self="closeEditEbookModal">
          <div class="modal-card modal-card--ebook">
            <div class="modal-header">
              <h2>Editar Ebook</h2>
              <button @click="closeEditEbookModal" class="btn-close"><X /></button>
            </div>
            <p class="modal-subtitle">Altere imagem, título, descrição e arquivo PDF se quiser.</p>

            <div class="ebook-modal-grid">
              <div class="form-group ebook-modal-cover">
                <label>Capa do Ebook (Opcional)</label>
                <div class="upload-area upload-area--ebook" @click="triggerEditEbookCoverUpload" :class="{ 'has-image': editEbookPreviewUrl }">
                  <img v-if="editEbookPreviewUrl" :src="editEbookPreviewUrl" class="upload-preview" />
                  <div v-else class="upload-placeholder">
                    <ImageIcon class="upload-icon" />
                    <span>Nova capa</span>
                  </div>
                  <input ref="editEbookFileInput" type="file" accept="image/*" class="file-input-hidden" @change="handleEditEbookCoverSelect" />
                </div>
              </div>

              <div class="ebook-modal-fields">
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
                  <div class="pdf-upload-box pdf-upload-box--ebook" @click="triggerEditEbookPdfUpload" :class="{ 'has-file': selectedEditEbookPdfFile }">
                    <FileText class="pdf-icon-big" />
                    <span v-if="selectedEditEbookPdfFile">{{ selectedEditEbookPdfFile.name }}</span>
                    <span v-else>Selecionar novo PDF (opcional)</span>
                    <small v-if="!selectedEditEbookPdfFile" class="pdf-upload-hint">{{ documentUploadHint }}</small>
                    <input ref="editEbookPdfInput" type="file" accept="application/pdf" class="file-input-hidden" @change="handleEditEbookPdfSelect" />
                  </div>
                </div>
              </div>
            </div>

            <div class="modal-actions">
              <button @click="closeEditEbookModal" class="btn-cancel">Cancelar</button>
              <button
                @click="handleUpdateEbookFromCourses"
                class="btn-primary"
                :disabled="ebookUploading"
                :aria-busy="ebookUploading"
                :aria-label="ebookUploading ? 'Salvando alterações' : undefined"
              >
                <span v-if="ebookUploading" class="btn-spinner" aria-hidden="true" />
                <span v-else>Salvar Alterações</span>
              </button>
            </div>
          </div>
        </div>
        </Teleport>
        </ClientOnly>
      </div>
    </div>
  </NuxtLayout>
</template>

<script setup>
import { BookOpen, Plus, ChevronDown, Layers, PlayCircle, Trash2, X, Image as ImageIcon, Play, Info, Edit2, Upload, Film, Link, Camera, FileText, Monitor, Smartphone } from 'lucide-vue-next'
import { mapCourseToTile, mapEbookToTile } from '~/utils/course-tile'
import { buildModuleUrl } from '~/utils/course-slug'
import { isPdfFile } from '~/utils/upload-file-kind'
import { useDocumentUploadLimits } from '~/composables/useUploadConfig'
import { normalizeFileUploadError, resolveUploadApiUrl } from '~/utils/resolve-api-base.mjs'

const config = useRuntimeConfig()
const layoutName = computed(() => 'dashboard')
const apiBase = config.public.apiBase
const whatsappApiBase = config.public.whatsappApiBase
const { documentMaxBytes, documentMaxLabel, documentUploadHint } = useDocumentUploadLimits()

async function uploadImageToCloudinary(file, token) {
  const formData = new FormData()
  formData.append('file', file)
  return $fetch(resolveUploadApiUrl('/upload', apiBase), {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  })
}

async function uploadDocumentToCloudinary(file, token) {
  const formData = new FormData()
  formData.append('file', file)
  return $fetch(resolveUploadApiUrl('/upload/file', apiBase), {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  })
}
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

const DEFAULT_BANNER_POSITION = '50% 35%'

const DEFAULT_BANNER_THEME = {
  bannerKickerColor: '#0f172a',
  bannerKickerBg: '#ffffff',
  bannerTitleColor: '#0f172a',
  bannerSubtitleColor: '#334155',
  bannerCtaBg: '#ffffff',
  bannerCtaColor: '#111318',
  bannerSecondaryBtnBg: '#f1f5f9',
  bannerSecondaryBtnColor: '#0f172a',
}

const newCourse = reactive({
  title: '', description: '', thumbnail: '', thumbnailMobile: '',
  bannerImage: '', bannerImageMobile: '',
  bannerImagePosition: DEFAULT_BANNER_POSITION,
  bannerImageMobilePosition: DEFAULT_BANNER_POSITION,
  bannerKicker: '', bannerTitle: '', bannerSubtitle: '', bannerCtaText: '',
  ...DEFAULT_BANNER_THEME,
})
const showEditCourseModal = ref(false)
const editingCourse = reactive({
  id: '', title: '', description: '', thumbnail: '', thumbnailMobile: '',
  bannerImage: '', bannerImageMobile: '',
  bannerImagePosition: DEFAULT_BANNER_POSITION,
  bannerImageMobilePosition: DEFAULT_BANNER_POSITION,
  bannerKicker: '', bannerTitle: '', bannerSubtitle: '', bannerCtaText: '',
  ...DEFAULT_BANNER_THEME,
})
const bannerPosDesktop = reactive({ x: 50, y: 35 })
const bannerPosMobile = reactive({ x: 50, y: 35 })
const editCourseMode = ref('card')
const isBannerEditMode = computed(() => editCourseMode.value === 'banner')
const isCardEditMode = computed(() => editCourseMode.value !== 'banner')
const bannerEditTab = ref('imagens')
const bannerPositionVariant = ref('desktop')
const bannerEditTabs = [
  { id: 'imagens', label: 'Imagens' },
  { id: 'texto', label: 'Textos' },
  { id: 'cores', label: 'Cores' },
  { id: 'enquadramento', label: 'Enquadramento' },
]
const bannerPositionPresets = [
  { id: 'left', label: 'Esquerda' },
  { id: 'center', label: 'Centro' },
  { id: 'right', label: 'Direita' },
  { id: 'face', label: 'Rosto' },
  { id: 'top', label: 'Topo' },
  { id: 'bottom', label: 'Base' },
]
const bannerColorFieldGroups = [
  {
    title: 'Etiqueta',
    fields: [
      { key: 'bannerKickerColor', label: 'Texto' },
      { key: 'bannerKickerBg', label: 'Fundo' },
    ],
  },
  {
    title: 'Textos',
    fields: [
      { key: 'bannerTitleColor', label: 'Título' },
      { key: 'bannerSubtitleColor', label: 'Subtítulo' },
    ],
  },
  {
    title: 'Botões',
    fields: [
      { key: 'bannerCtaBg', label: 'Principal' },
      { key: 'bannerCtaColor', label: 'Texto principal' },
      { key: 'bannerSecondaryBtnBg', label: 'Secundário' },
      { key: 'bannerSecondaryBtnColor', label: 'Texto secundário' },
    ],
  },
]
const newModule = reactive({ title: '', description: '' })

const showDetailsModal = ref(false)
const lessonModalOpen = ref(false)
const lessonModalMode = ref('create')
const lessonModalLesson = ref(null)
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

const lessonFormContext = computed(() => {
  const ctx = { courseTitle: '', moduleTitle: '', lessonCount: 0 }
  const moduleId = currentModuleIdForLesson.value || selectedModuleDropId.value
  if (!moduleId) return ctx

  const course = selectedCourseDetails.value
    || courses.value.find((c) => c.modules?.some((m) => m.id === moduleId))
  const mod = course?.modules?.find((m) => m.id === moduleId)
  if (course) ctx.courseTitle = course.title
  if (mod) {
    ctx.moduleTitle = mod.title
    ctx.lessonCount = mod.lessons?.length || 0
  }
  return ctx
})
const isPacienteView = computed(() => false)
/** Capa de destaque no painel admin — sempre ativa nesta página. */
const showCourseBanner = computed(() => true)
/** Carrossel de tiles (Cursos + Ebooks) — sempre ativo no admin. */
const useStreamingLayout = computed(() => true)
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

const patientCourseTiles = computed(() => {
  const tiles = courses.value.map((course) => mapCourseToTile(course, { getCover: getCourseCover }))
  if (isNutri.value) {
    tiles.push({
      id: 'add-course',
      isAdd: true,
      tone: 'blue',
      label: 'Novo curso',
      value: 'Adicionar conteúdo',
      meta: '',
      icon: Plus,
      className: 'cf-tile-card--add',
      ariaLabel: 'Adicionar novo curso',
    })
  }
  return tiles
})

const patientEbookTiles = computed(() => {
  const tiles = ebooks.value.map((ebook) => mapEbookToTile(ebook))
  if (isNutri.value) {
    tiles.push({
      id: 'add-ebook',
      isAdd: true,
      tone: 'purple',
      label: 'Novo ebook',
      value: 'Adicionar PDF',
      meta: '',
      icon: Plus,
      className: 'cf-tile-card--add',
      ariaLabel: 'Adicionar novo ebook',
    })
  }
  return tiles
})

function onCourseTileSelect(item) {
  if (item?.isAdd) {
    openCreateCourseModal()
    return
  }
  openCoursePlayerPage(item.raw)
}

function onEbookTileSelect(item) {
  if (item?.isAdd) {
    openCreateEbookFromCourses()
    return
  }
  const ebook = item?.raw
  if (ebook?.fileUrl) {
    window.open(ebook.fileUrl, '_blank', 'noopener,noreferrer')
    return
  }
  openEbooksPage()
}

function scrollToPatientEbooks() {
  nextTick(() => {
    requestAnimationFrame(() => {
      document.getElementById('patient-ebooks')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })
  })
}

const openEbooksPage = () => {
  if (config.public.mobileApp) {
    if (route.path === '/cursos') {
      scrollToPatientEbooks()
      return
    }
    navigateTo('/cursos#ebooks')
    return
  }
  navigateTo('/ebooks')
}

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

const parseBannerPosition = (value, fallback = DEFAULT_BANNER_POSITION) => {
  const raw = String(value || fallback).trim()
  const [xRaw, yRaw] = raw.split(/\s+/)
  const x = Math.min(100, Math.max(0, Number.parseFloat(xRaw) || 50))
  let y = 35
  if (yRaw === 'top') y = 0
  else if (yRaw === 'center') y = 50
  else if (yRaw === 'bottom') y = 100
  else y = Math.min(100, Math.max(0, Number.parseFloat(yRaw) || 35))
  return { x, y }
}

const formatBannerPosition = ({ x, y }) => `${Math.round(x)}% ${Math.round(y)}%`

const getCourseBannerPosition = (course, variant = 'desktop') => {
  if (!course) return DEFAULT_BANNER_POSITION
  if (variant === 'mobile') {
    return course.bannerImageMobilePosition || course.bannerImagePosition || DEFAULT_BANNER_POSITION
  }
  return course.bannerImagePosition || DEFAULT_BANNER_POSITION
}

const syncBannerPositionFromCourse = (course) => {
  const desktop = parseBannerPosition(course?.bannerImagePosition)
  const mobile = parseBannerPosition(course?.bannerImageMobilePosition || course?.bannerImagePosition)
  bannerPosDesktop.x = desktop.x
  bannerPosDesktop.y = desktop.y
  bannerPosMobile.x = mobile.x
  bannerPosMobile.y = mobile.y
  editingCourse.bannerImagePosition = formatBannerPosition(bannerPosDesktop)
  editingCourse.bannerImageMobilePosition = formatBannerPosition(bannerPosMobile)
}

const applyBannerPreset = (variant, preset) => {
  const target = variant === 'mobile' ? bannerPosMobile : bannerPosDesktop
  if (preset === 'top') {
    target.x = 50
    target.y = 8
  } else if (preset === 'center') {
    target.x = 50
    target.y = 50
  } else if (preset === 'face') {
    target.x = 50
    target.y = 28
  } else if (preset === 'bottom') {
    target.x = 50
    target.y = 82
  } else if (preset === 'left') {
    target.y = target.y || 35
    target.x = 12
  } else if (preset === 'right') {
    target.y = target.y || 35
    target.x = 88
  }
}

const toPickerColor = (value, fallback) => {
  return normalizeHexColor(value, fallback)
}

function normalizeHexColor(raw, fallback = '#000000') {
  let value = String(raw || '').trim()
  if (!value) return fallback
  if (!value.startsWith('#')) value = `#${value}`
  if (/^#[0-9a-fA-F]{6}$/.test(value)) return value.toLowerCase()
  if (/^#[0-9a-fA-F]{3}$/.test(value)) {
    const [, r, g, b] = value
    return `#${r}${r}${g}${g}${b}${b}`.toLowerCase()
  }
  return fallback
}

function onBannerColorHexInput(key, event) {
  let value = String(event.target.value || '').replace(/[^#0-9a-fA-F]/g, '')
  if (value && !value.startsWith('#')) value = `#${value}`
  if (value.length > 7) value = value.slice(0, 7)
  event.target.value = value
  if (/^#[0-9a-fA-F]{6}$/i.test(value)) {
    editingCourse[key] = value.toLowerCase()
  }
}

function onBannerColorHexBlur(key, event) {
  const normalized = normalizeHexColor(event.target.value, editingCourse[key])
  editingCourse[key] = normalized
  event.target.value = normalized
}

const getBannerTheme = (course) => ({
  bannerKickerColor: course?.bannerKickerColor || DEFAULT_BANNER_THEME.bannerKickerColor,
  bannerKickerBg: course?.bannerKickerBg || DEFAULT_BANNER_THEME.bannerKickerBg,
  bannerTitleColor: course?.bannerTitleColor || DEFAULT_BANNER_THEME.bannerTitleColor,
  bannerSubtitleColor: course?.bannerSubtitleColor || DEFAULT_BANNER_THEME.bannerSubtitleColor,
  bannerCtaBg: course?.bannerCtaBg || DEFAULT_BANNER_THEME.bannerCtaBg,
  bannerCtaColor: course?.bannerCtaColor || DEFAULT_BANNER_THEME.bannerCtaColor,
  bannerSecondaryBtnBg: course?.bannerSecondaryBtnBg || DEFAULT_BANNER_THEME.bannerSecondaryBtnBg,
  bannerSecondaryBtnColor: course?.bannerSecondaryBtnColor || DEFAULT_BANNER_THEME.bannerSecondaryBtnColor,
})

const applyBannerThemeToForm = (course) => {
  const theme = getBannerTheme(course)
  editingCourse.bannerKickerColor = toPickerColor(theme.bannerKickerColor, DEFAULT_BANNER_THEME.bannerKickerColor)
  editingCourse.bannerKickerBg = toPickerColor(theme.bannerKickerBg, DEFAULT_BANNER_THEME.bannerKickerBg)
  editingCourse.bannerTitleColor = toPickerColor(theme.bannerTitleColor, DEFAULT_BANNER_THEME.bannerTitleColor)
  editingCourse.bannerSubtitleColor = toPickerColor(theme.bannerSubtitleColor, DEFAULT_BANNER_THEME.bannerSubtitleColor)
  editingCourse.bannerCtaBg = toPickerColor(theme.bannerCtaBg, DEFAULT_BANNER_THEME.bannerCtaBg)
  editingCourse.bannerCtaColor = toPickerColor(theme.bannerCtaColor, DEFAULT_BANNER_THEME.bannerCtaColor)
  editingCourse.bannerSecondaryBtnBg = toPickerColor(theme.bannerSecondaryBtnBg, DEFAULT_BANNER_THEME.bannerSecondaryBtnBg)
  editingCourse.bannerSecondaryBtnColor = toPickerColor(theme.bannerSecondaryBtnColor, DEFAULT_BANNER_THEME.bannerSecondaryBtnColor)
}

const patientBannerThemeStyle = computed(() => {
  const source = isEditingFeaturedBanner.value ? editingCourse : featuredCourse.value
  return buildBannerThemeStyle(source)
})

const bannerEditorThemeStyle = computed(() => buildBannerThemeStyle(editingCourse))

const bannerEditorBgStyle = computed(() => ({
  backgroundImage: coursePreview.value ? `url('${coursePreview.value}')` : 'none',
  backgroundPosition: formatBannerPosition(bannerPosDesktop),
}))

function buildBannerThemeStyle(source) {
  const theme = getBannerTheme(source)
  return {
    '--banner-kicker-color': theme.bannerKickerColor,
    '--banner-kicker-bg': theme.bannerKickerBg,
    '--banner-title-color': theme.bannerTitleColor,
    '--banner-subtitle-color': theme.bannerSubtitleColor,
    '--banner-cta-bg': theme.bannerCtaBg,
    '--banner-cta-color': theme.bannerCtaColor,
    '--banner-secondary-bg': theme.bannerSecondaryBtnBg,
    '--banner-secondary-color': theme.bannerSecondaryBtnColor,
  }
}

function onActiveBannerPositionDrag(event) {
  onBannerPositionDrag(bannerPositionVariant.value, event)
}

function applyActiveBannerPreset(preset) {
  applyBannerPreset(bannerPositionVariant.value, preset)
}

const onBannerPositionDrag = (variant, event) => {
  const el = event.currentTarget
  if (!(el instanceof HTMLElement)) return

  const update = (clientX, clientY) => {
    const rect = el.getBoundingClientRect()
    const x = Math.min(100, Math.max(0, ((clientX - rect.left) / rect.width) * 100))
    const y = Math.min(100, Math.max(0, ((clientY - rect.top) / rect.height) * 100))
    const target = variant === 'mobile' ? bannerPosMobile : bannerPosDesktop
    target.x = x
    target.y = y
  }

  update(event.clientX, event.clientY)

  const onMove = (moveEvent) => update(moveEvent.clientX, moveEvent.clientY)
  const onUp = () => {
    window.removeEventListener('pointermove', onMove)
    window.removeEventListener('pointerup', onUp)
  }

  window.addEventListener('pointermove', onMove)
  window.addEventListener('pointerup', onUp)
}

watch([bannerPosDesktop, bannerPosMobile], () => {
  if (!showEditCourseModal.value || !isBannerEditMode.value) return
  editingCourse.bannerImagePosition = formatBannerPosition(bannerPosDesktop)
  editingCourse.bannerImageMobilePosition = formatBannerPosition(bannerPosMobile)
}, { deep: true })

const bannerDesktopPreviewStyle = computed(() => ({
  backgroundImage: coursePreview.value ? `url('${coursePreview.value}')` : 'none',
  backgroundPosition: formatBannerPosition(bannerPosDesktop),
}))

const bannerMobilePreviewStyle = computed(() => ({
  backgroundImage: (courseMobilePreview.value || coursePreview.value) ? `url('${courseMobilePreview.value || coursePreview.value}')` : 'none',
  backgroundPosition: formatBannerPosition(bannerPosMobile),
}))

const bannerDesktopMarkerStyle = computed(() => ({
  left: `${bannerPosDesktop.x}%`,
  top: `${bannerPosDesktop.y}%`,
}))

const bannerMobileMarkerStyle = computed(() => ({
  left: `${bannerPosMobile.x}%`,
  top: `${bannerPosMobile.y}%`,
}))

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
  const desktopPos = isEditingFeatured
    ? editingCourse.bannerImagePosition
    : getCourseBannerPosition(featuredCourse.value, 'desktop')
  const mobilePos = isEditingFeatured
    ? editingCourse.bannerImageMobilePosition
    : getCourseBannerPosition(featuredCourse.value, 'mobile')
  return {
    '--patient-banner-desktop': imageUrlDesktop ? `url('${imageUrlDesktop}')` : 'none',
    '--patient-banner-mobile': imageUrlMobile ? `url('${imageUrlMobile}')` : (imageUrlDesktop ? `url('${imageUrlDesktop}')` : 'none'),
    '--patient-banner-pos-desktop': desktopPos || DEFAULT_BANNER_POSITION,
    '--patient-banner-pos-mobile': mobilePos || desktopPos || DEFAULT_BANNER_POSITION,
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
    navigateTo(buildModuleUrl(firstModuleWithLesson, firstLesson, firstModuleWithLesson.lessons, course.id))
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
    const preferredModuleId = selectedCourseDetails.value?.id === course.id
      ? selectedModuleDropId.value
      : course.modules?.[0]?.id

    let moduleId = preferredModuleId
    if (!moduleId) {
      const ensuredModule = await $fetch(`${apiBase}/courses/${course.id}/modules/ensure-first`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      })
      moduleId = ensuredModule?.id
    }

    if (!moduleId) {
      throw new Error('Não foi possível preparar o módulo para nova videoaula.')
    }
    await fetchCourses()
    openAddLesson(moduleId)
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
  editingCourse.bannerImagePosition = course.bannerImagePosition || DEFAULT_BANNER_POSITION
  editingCourse.bannerImageMobilePosition = course.bannerImageMobilePosition || course.bannerImagePosition || DEFAULT_BANNER_POSITION
  applyBannerThemeToForm(course)
  syncBannerPositionFromCourse(course)
  coursePreview.value = mode === 'banner'
    ? (course.bannerImage || null)
    : (course.thumbnail || null)
  courseMobilePreview.value = mode === 'banner'
    ? (course.bannerImageMobile || null)
    : (course.thumbnailMobile || null)
  if (mode === 'banner') {
    bannerEditTab.value = 'imagens'
    bannerPositionVariant.value = 'desktop'
  }
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
    const token = patientAuth.getToken()
    if (!token) {
      coursesLoadError.value = 'Sessão expirada. Faça login novamente.'
      handleAuthTokenInvalid()
      return
    }
    const data = await $fetch(`${apiBase}/courses`, {
      headers: patientAuth.authHeaders(),
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
  bannerImagePosition: courseData.bannerImagePosition || null,
  bannerImageMobilePosition: courseData.bannerImageMobilePosition || null,
  bannerKicker: courseData.bannerKicker || null,
  bannerTitle: courseData.bannerTitle || null,
  bannerSubtitle: courseData.bannerSubtitle || null,
  bannerCtaText: courseData.bannerCtaText || null,
  bannerKickerColor: courseData.bannerKickerColor || null,
  bannerKickerBg: courseData.bannerKickerBg || null,
  bannerTitleColor: courseData.bannerTitleColor || null,
  bannerSubtitleColor: courseData.bannerSubtitleColor || null,
  bannerCtaBg: courseData.bannerCtaBg || null,
  bannerCtaColor: courseData.bannerCtaColor || null,
  bannerSecondaryBtnBg: courseData.bannerSecondaryBtnBg || null,
  bannerSecondaryBtnColor: courseData.bannerSecondaryBtnColor || null,
})

const buildLegacyCoursePayload = (courseData) => ({
  title: courseData.title,
  description: courseData.description || null,
  thumbnail: courseData.thumbnail || null
})

const patientAuth = usePatientAuth()

const handleAuthTokenInvalid = () => {
  patientAuth.clearSession()
  navigateTo('/')
}

const isTokenInvalidError = (err) => patientAuth.isSessionExpiredError(err)

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

const openCreateEbookFromCourses = () => {
  openCreateEbookModal()
}

const handleDeleteEbookFromCourses = async (ebookId) => {
  if (!ebookId) return
  const { confirm } = useConfirm()
  const ok = await confirm({
    title: 'Excluir ebook',
    message: 'Deseja excluir este ebook? Esta ação não pode ser desfeita.',
    confirmLabel: 'Excluir',
    cancelLabel: 'Cancelar',
  })
  if (!ok) return
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
  if (!isPdfFile(file)) {
    alert('Selecione um arquivo PDF válido.')
    return
  }
  if (file.size > documentMaxBytes.value) {
    alert(`O PDF deve ter no máximo ${documentMaxLabel.value}.`)
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
      const coverUploadRes = await uploadImageToCloudinary(selectedEbookCoverFile.value, token)
      newEbook.thumbnail = coverUploadRes.url
    }

    const pdfUploadRes = await uploadDocumentToCloudinary(selectedEbookPdfFile.value, token)
    newEbook.fileUrl = pdfUploadRes.url

    await $fetch(`${apiBase}/ebooks`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: {
        title: newEbook.title.trim(),
        description: newEbook.description?.trim() || '',
        fileUrl: newEbook.fileUrl,
        thumbnail: newEbook.thumbnail || null,
      }
    })

    closeCreateEbookModal()
    await fetchEbooks()
  } catch (err) {
    alert(normalizeFileUploadError(err))
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
  if (!isPdfFile(file)) {
    alert('Selecione um arquivo PDF válido.')
    return
  }
  if (file.size > documentMaxBytes.value) {
    alert(`O PDF deve ter no máximo ${documentMaxLabel.value}.`)
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
      title: editingEbook.title.trim(),
      description: editingEbook.description?.trim() || '',
      fileUrl: editingEbook.fileUrl || '',
      thumbnail: editingEbook.thumbnail || null
    }

    if (selectedEditEbookCoverFile.value) {
      const coverUploadRes = await uploadImageToCloudinary(selectedEditEbookCoverFile.value, token)
      payload.thumbnail = coverUploadRes.url
    }

    if (selectedEditEbookPdfFile.value) {
      const pdfUploadRes = await uploadDocumentToCloudinary(selectedEditEbookPdfFile.value, token)
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
    alert(normalizeFileUploadError(err))
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
        const uploadRes = await $fetch(resolveUploadApiUrl('/upload', apiBase), {
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
      msg = 'Não foi possível conectar ao servidor. Verifique sua conexão e tente novamente.'
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
      const uploadRes = await $fetch(resolveUploadApiUrl('/upload', apiBase), {
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
      const uploadRes = await $fetch(resolveUploadApiUrl('/upload', apiBase), {
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
  const { confirm } = useConfirm()
  const ok = await confirm({
    title: 'Excluir curso',
    message: 'Tem certeza que deseja excluir este curso e todos os seus módulos? Esta ação não pode ser desfeita.',
    confirmLabel: 'Excluir curso',
    cancelLabel: 'Cancelar',
  })
  if (!ok) return
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

const openAddLesson = (moduleId) => {
  currentModuleIdForLesson.value = moduleId
  lessonModalMode.value = 'create'
  lessonModalLesson.value = null
  lessonModalOpen.value = true
}

const openEditLesson = (lesson) => {
  currentModuleIdForLesson.value = lesson.moduleId || selectedModuleDropId.value
  lessonModalMode.value = 'edit'
  lessonModalLesson.value = { ...lesson }
  lessonModalOpen.value = true
}

const onLessonSaved = async () => {
  await fetchCourses()
  if (selectedCourseDetails.value) {
    selectedCourseDetails.value = courses.value.find((c) => c.id === selectedCourseDetails.value.id)
  }
}

const handleDeleteLesson = async (lessonId, moduleId) => {
  const { confirm } = useConfirm()
  const ok = await confirm({
    title: 'Excluir aula',
    message: 'Deseja excluir esta aula? Esta ação não pode ser desfeita.',
    confirmLabel: 'Excluir',
    cancelLabel: 'Cancelar',
  })
  if (!ok) return
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
  const { confirm } = useConfirm()
  const ok = await confirm({
    title: 'Excluir módulo',
    message: 'Deseja excluir este módulo? Todas as aulas vinculadas também serão removidas.',
    confirmLabel: 'Excluir módulo',
    cancelLabel: 'Cancelar',
  })
  if (!ok) return
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

if (import.meta.client) {
  isNutri.value = localStorage.getItem('user_role') === 'NUTRICIONISTA'
}

onMounted(async () => {
  patientAuth.bootstrapToken()
  if (!patientAuth.getToken()) {
    handleAuthTokenInvalid()
    return
  }
  isNutri.value = localStorage.getItem('user_role') === 'NUTRICIONISTA'
  await Promise.all([fetchCourses(), fetchEbooks()])
  if (route.hash === '#ebooks') scrollToPatientEbooks()
})

watch(
  () => route.hash,
  (hash) => {
    if (hash === '#ebooks') scrollToPatientEbooks()
  },
)
</script>

<style scoped>
.courses-container {
  min-height: 100%;
  background-color: #fcfcfc;
}

.courses-page {
  padding: 3rem;
  width: 100%;
  max-width: 1440px; /* Expande mais a largura, mas mantém limite para TVs 4K */
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
  border-radius: var(--cf-radius-pill);
  cursor: pointer;
  font-weight: 700;
  font-size: 1rem;
  font-family: inherit;
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
  border-radius: var(--cf-radius-surface);
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
  aspect-ratio: 3/4; /* Pôster vertical */
  background: #f4f6f8;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--cf-radius-surface);
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
  top: clamp(0.5rem, 3%, 1rem);
  right: clamp(0.5rem, 3%, 1rem);
  z-index: 3;
  opacity: 0;
  transform: translateX(10px);
  transition: all 0.3s ease;
}

@media (hover: none) {
  .card-hover-actions {
    opacity: 1;
    transform: translateX(0);
  }
}

.netflix-card:hover .card-hover-actions {
  opacity: 1;
  transform: translateX(0);
}

/* --------- NETFLIX EXACT LIGHT MODAL STYLES --------- */
.netflix-modal-overlay {
  background: rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(8px);
  padding: 2rem 0;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  overflow: hidden;
  z-index: 5000;
}

.netflix-theme {
  background: #ffffff !important;
  color: #111 !important;
  border-radius: var(--cf-radius-control) !important;
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
  border-radius: var(--cf-radius-control);
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
  border-radius: var(--cf-radius-control);
}

.episode-row {
  display: flex;
  align-items: center;
  padding: 1.5rem 1.5rem;
  border-bottom: 1px solid #eee;
  transition: background 0.2s;
  cursor: pointer;
  border-radius: var(--cf-radius-sm);
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
.modal-overlay,
.courses-modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 5000;
  padding: max(0.75rem, env(safe-area-inset-top)) max(0.75rem, env(safe-area-inset-right)) max(0.75rem, env(safe-area-inset-bottom)) max(0.75rem, env(safe-area-inset-left));
}

.modal-card {
  background: white;
  padding: 1.35rem 1.4rem;
  border-radius: var(--cf-radius-surface);
  width: min(100%, 26rem);
  box-shadow: 0 20px 40px rgba(0,0,0,0.1);
  max-height: min(34rem, calc(100dvh - 1.5rem - env(safe-area-inset-top) - env(safe-area-inset-bottom)));
  overflow-x: hidden;
  overflow-y: auto;
  overscroll-behavior: contain;
  scrollbar-width: thin;
  scrollbar-color: #d6d6d6 transparent;
  -webkit-overflow-scrolling: touch;
}

.modal-card::-webkit-scrollbar {
  width: 6px;
}

.modal-card::-webkit-scrollbar-thumb {
  background: #d6d6d6;
  border-radius: 999px;
}

.modal-card--banner {
  width: min(100%, 42rem);
  max-height: min(92dvh, 52rem);
  padding: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.modal-header--banner {
  padding: 1.2rem 1.35rem 0;
  margin-bottom: 0;
  align-items: flex-start;
}

.modal-header--banner .modal-subtitle {
  margin-top: 0.25rem;
  margin-bottom: 0;
}

.banner-editor-preview {
  position: relative;
  margin: 0.85rem 1.35rem 0;
  border-radius: var(--cf-radius-control);
  overflow: hidden;
  min-height: 9.5rem;
  border: 1px solid rgba(15, 23, 42, 0.08);
  box-shadow: 0 10px 28px rgba(15, 23, 42, 0.08);
}

.banner-editor-preview-bg {
  position: absolute;
  inset: 0;
  background-size: cover;
  background-repeat: no-repeat;
  background-color: #e8edf2;
}

.banner-editor-preview-fade {
  position: absolute;
  inset: 0;
  background: linear-gradient(105deg, rgba(255, 255, 255, 0.92) 0%, rgba(255, 255, 255, 0.55) 38%, rgba(255, 255, 255, 0.08) 62%);
  pointer-events: none;
}

.banner-editor-preview-content {
  position: relative;
  z-index: 1;
  padding: 1.35rem 1.25rem;
  max-width: 62%;
}

.banner-editor-kicker {
  display: inline-flex;
  margin-bottom: 0.55rem;
  font-size: 0.62rem;
  font-weight: 700;
  letter-spacing: 0.07em;
  text-transform: uppercase;
  border-radius: var(--cf-radius-control);
  padding: 0.28rem 0.55rem;
  border: 1px solid rgba(15, 23, 42, 0.12);
  background: var(--banner-kicker-bg, #fff);
  color: var(--banner-kicker-color, #0f172a);
}

.banner-editor-preview-content h3 {
  margin: 0 0 0.35rem;
  font-size: 1.15rem;
  font-weight: 800;
  letter-spacing: -0.02em;
  line-height: 1.15;
  color: var(--banner-title-color, #0f172a);
}

.banner-editor-preview-content p {
  margin: 0 0 0.65rem;
  font-size: 0.78rem;
  line-height: 1.45;
  color: var(--banner-subtitle-color, #334155);
}

.banner-editor-cta {
  display: inline-flex;
  padding: 0.42rem 0.85rem;
  border-radius: var(--cf-radius-control);
  font-size: 0.72rem;
  font-weight: 700;
  background: var(--banner-cta-bg, #fff);
  color: var(--banner-cta-color, #0f172a);
  border: 1px solid rgba(15, 23, 42, 0.08);
}

.banner-editor-tabs {
  display: flex;
  gap: 0.35rem;
  padding: 0.85rem 1.35rem 0;
  overflow-x: auto;
  scrollbar-width: none;
}

.banner-editor-tabs::-webkit-scrollbar {
  display: none;
}

.banner-editor-tab {
  flex-shrink: 0;
  border: none;
  background: #f1f5f4;
  color: #475569;
  font-size: 0.78rem;
  font-weight: 700;
  padding: 0.45rem 0.85rem;
  border-radius: var(--cf-radius-control);
  cursor: pointer;
  transition: background 0.15s ease, color 0.15s ease;
}

.banner-editor-tab--active {
  background: var(--primary, #2d5a27);
  color: #fff;
}

.banner-editor-panel {
  flex: 1 1 auto;
  overflow-y: auto;
  padding: 0.85rem 1.35rem 0.5rem;
  overscroll-behavior: contain;
}

.banner-editor-section {
  animation: bannerEditorFade 0.2s ease;
}

@keyframes bannerEditorFade {
  from { opacity: 0; transform: translateY(4px); }
  to { opacity: 1; transform: translateY(0); }
}

@media (prefers-reduced-motion: reduce) {
  .banner-editor-section {
    animation: none;
  }
}

.banner-upload-grid {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 0.85rem;
  align-items: start;
}

.banner-upload-card {
  display: flex;
  flex-direction: column;
  gap: 0.55rem;
}

.banner-upload-card-head {
  display: flex;
  align-items: center;
  gap: 0.55rem;
}

.banner-upload-card-head strong {
  display: block;
  font-size: 0.82rem;
  color: #0f172a;
}

.banner-upload-card-head span {
  display: block;
  font-size: 0.72rem;
  color: #64748b;
}

.banner-upload-device-icon {
  width: 1.1rem;
  height: 1.1rem;
  color: var(--primary, #2d5a27);
}

.banner-upload-frame {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  padding: 0;
  border: 1.5px dashed #cbd5e1;
  border-radius: var(--cf-radius-control);
  background: #f8fafc;
  overflow: hidden;
  cursor: pointer;
  transition: border-color 0.15s ease, background 0.15s ease;
}

.banner-upload-frame:hover {
  border-color: var(--primary, #2d5a27);
  background: #f3f7f2;
}

.banner-upload-frame img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.banner-upload-frame--desktop {
  aspect-ratio: 3 / 1;
}

.banner-upload-frame--mobile {
  aspect-ratio: 4 / 5;
  width: 7.5rem;
}

.banner-upload-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.35rem;
  padding: 0.75rem;
  font-size: 0.72rem;
  font-weight: 600;
  color: #64748b;
  text-align: center;
}

.banner-upload-empty svg {
  width: 1.25rem;
  height: 1.25rem;
}

.banner-field-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.65rem 0.75rem;
}

.banner-field-full {
  grid-column: 1 / -1;
}

.banner-editor-hint {
  margin: 0 0 0.65rem;
  font-size: 0.78rem;
  color: #64748b;
}

.banner-color-groups {
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
}

.banner-color-group h4 {
  margin: 0 0 0.45rem;
  font-size: 0.78rem;
  font-weight: 800;
  color: #334155;
  letter-spacing: 0.02em;
}

.banner-color-row {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(10.5rem, 1fr));
  gap: 0.55rem;
}

.color-field {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  padding: 0.5rem 0.55rem;
  border-radius: var(--cf-radius-control);
  border: 1px solid #e2e8f0;
  background: #fff;
}

.color-field-label {
  font-size: 0.72rem;
  font-weight: 700;
  color: #475569;
}

.color-field-controls {
  display: flex;
  align-items: center;
  gap: 0.45rem;
}

.color-swatch-btn {
  position: relative;
  display: block;
  width: 2rem;
  height: 2rem;
  flex-shrink: 0;
  border-radius: var(--cf-radius-sm);
  border: 1px solid rgba(15, 23, 42, 0.14);
  cursor: pointer;
  overflow: hidden;
}

.color-swatch-btn input[type='color'] {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  margin: 0;
  padding: 0;
  border: none;
  opacity: 0;
  cursor: pointer;
}

.color-hex-input {
  flex: 1;
  min-width: 0;
  height: 2rem;
  padding: 0 0.5rem;
  border: 1px solid #e2e8f0;
  border-radius: var(--cf-radius-sm);
  background: #f8fafc;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 0.72rem;
  font-weight: 600;
  color: #0f172a;
  letter-spacing: 0.02em;
  text-transform: lowercase;
  outline: none;
  transition: border-color 0.15s ease, background 0.15s ease;
}

.color-hex-input:hover {
  border-color: #cbd5e1;
  background: #fff;
}

.color-hex-input:focus {
  border-color: var(--primary, #2d5a27);
  background: #fff;
  box-shadow: 0 0 0 3px rgba(45, 90, 39, 0.1);
}

.banner-device-toggle {
  display: inline-flex;
  gap: 0.35rem;
  padding: 0.25rem;
  border-radius: var(--cf-radius-control);
  background: #f1f5f4;
  margin-bottom: 0.65rem;
}

.banner-device-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  border: none;
  background: transparent;
  color: #475569;
  font-size: 0.78rem;
  font-weight: 700;
  padding: 0.4rem 0.75rem;
  border-radius: var(--cf-radius-sm);
  cursor: pointer;
}

.banner-device-btn.active {
  background: #fff;
  color: #0f172a;
  box-shadow: 0 1px 4px rgba(15, 23, 42, 0.08);
}

.banner-device-btn-icon {
  width: 0.95rem;
  height: 0.95rem;
}

.banner-position-empty {
  padding: 1.25rem;
  border-radius: var(--cf-radius-control);
  background: #f8fafc;
  border: 1px dashed #cbd5e1;
  font-size: 0.8rem;
  color: #64748b;
  text-align: center;
}

.modal-actions--banner {
  margin-top: 0;
  padding: 0.85rem 1.35rem 1.15rem;
  background: #fafafa;
  border-top: 1px solid #eef2f6;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 1rem;
}

.modal-header h2 {
  font-size: 1.125rem;
  font-weight: 800;
  color: #111;
  letter-spacing: -0.02em;
}

.btn-close {
  width: 36px;
  height: 36px;
  background: #f5f5f5;
  border: none;
  border-radius: var(--cf-radius-control);
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
  font-size: 0.8125rem;
  color: #777;
  margin-bottom: 1rem;
  margin-top: -0.35rem;
}

.form-group {
  margin-bottom: 1rem;
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
  border-radius: var(--cf-radius-control);
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
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-top: 0.85rem;
  padding-top: 0.85rem;
  border-top: 1px solid #f3f3f3;
}

.btn-cancel {
  background: #fdfdfd;
  border: 1.5px solid #eee;
  color: #666;
  padding: 0.75rem 1.5rem;
  border-radius: var(--cf-radius-pill);
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
  border-radius: var(--cf-radius-pill);
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

.btn-spinner {
  width: 1.1rem;
  height: 1.1rem;
  border: 2px solid rgba(255, 255, 255, 0.35);
  border-top-color: #fff;
  border-radius: 50%;
  animation: btn-spin 0.7s linear infinite;
}

@keyframes btn-spin {
  to { transform: rotate(360deg); }
}

.upload-area {
  border: 2px dashed #eee;
  border-radius: var(--cf-radius-control);
  height: 7.25rem;
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
  border-radius: var(--cf-radius-control);
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
  border-radius: var(--cf-radius-surface);
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
  border-radius: var(--cf-radius-control);
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
  border-radius: var(--cf-radius-sm);
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

/* ���� Modal Lição (maior para caber os controles) ���� */
.modal-card--lesson {
  width: min(100%, 28rem);
  max-height: min(36rem, calc(100dvh - 1.5rem - env(safe-area-inset-top) - env(safe-area-inset-bottom)));
  overflow-y: auto;
  scrollbar-width: thin;
  scrollbar-color: #eee transparent;
}
.modal-card--lesson::-webkit-scrollbar { width: 4px; }
.modal-card--lesson::-webkit-scrollbar-thumb { background: #ddd; border-radius: 4px; }

.modal-card--ebook {
  width: min(100%, 28rem);
  padding: 1.25rem 1.35rem;
  max-height: min(34rem, calc(100dvh - 1.5rem - env(safe-area-inset-top) - env(safe-area-inset-bottom)));
  overflow-y: auto;
}

.modal-card--ebook .modal-header {
  margin-bottom: 0.75rem;
}

.modal-card--ebook .modal-subtitle {
  margin-top: 0;
  margin-bottom: 1.25rem;
}

.ebook-modal-grid {
  display: grid;
  grid-template-columns: 10.5rem minmax(0, 1fr);
  gap: 1.25rem;
  align-items: start;
}

.modal-card--ebook .form-group {
  margin-bottom: 1rem;
}

.modal-card--ebook .ebook-modal-fields .form-group:last-child {
  margin-bottom: 0;
}

.modal-card--ebook .upload-area--ebook {
  height: auto;
  aspect-ratio: 3 / 4;
  min-height: 0;
}

.modal-card--ebook .upload-area--ebook .upload-placeholder {
  gap: 0.5rem;
  font-size: 0.78rem;
  text-align: center;
  padding: 0.5rem;
}

.modal-card--ebook .upload-area--ebook .upload-icon {
  width: 1.35rem;
  height: 1.35rem;
}

.modal-card--ebook .pdf-upload-box--ebook {
  min-height: 4.25rem;
  flex-direction: row;
  justify-content: flex-start;
  gap: 0.65rem;
  padding: 0.85rem 1rem;
  text-align: left;
}

.modal-card--ebook .pdf-upload-box--ebook .pdf-icon-big {
  width: 1.25rem;
  height: 1.25rem;
  flex-shrink: 0;
}

.modal-card--ebook .pdf-upload-box--ebook span {
  font-size: 0.85rem;
  line-height: 1.35;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pdf-upload-hint {
  font-size: 0.72rem;
  font-weight: 500;
  color: #94a3b8;
  line-height: 1.3;
}

.modal-card--ebook .pdf-upload-hint {
  white-space: normal;
  text-align: center;
}

.modal-card--ebook .modal-actions {
  margin-top: 1.35rem;
  padding-top: 1.15rem;
}

@media (max-width: 560px) {
  .modal-card--ebook {
    padding: 1.15rem;
    overflow-y: auto;
  }

  .ebook-modal-grid {
    grid-template-columns: 1fr;
  }

  .modal-card--ebook .upload-area--ebook {
    aspect-ratio: auto;
    height: 8.5rem;
  }

  .modal-card--ebook .pdf-upload-box--ebook {
    flex-direction: column;
    text-align: center;
  }

  .modal-card--ebook .pdf-upload-box--ebook span {
    white-space: normal;
  }
}

/* â”€â”€ Tab Pills â”€â”€ */
.tab-pills {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 0.75rem;
  background: #f5f5f5;
  border-radius: var(--cf-radius-control);
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
  border-radius: var(--cf-radius-sm);
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

/* ���� Área de Upload de Vídeo ���� */
.video-upload-area {
  border: 2px dashed #d8d8d8;
  border-radius: var(--cf-radius-control);
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
  border-radius: var(--cf-radius-control);
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
  border-radius: var(--cf-radius-sm);
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
  border-radius: var(--cf-radius-sm);
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
  border-radius: var(--cf-radius-sm);
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
  border-radius: var(--cf-radius-control);
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
  border-radius: var(--cf-radius-sm);
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
  border-radius: var(--cf-radius-sm);
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
  overflow: visible;
}

.courses-page.patient-page {
  background: transparent !important;
  max-width: none;
  margin: 0;
  padding: 0 2.5rem 2.25rem;
  overflow: visible;
}

.course-row-block {
  margin-bottom: 1.35rem;
  overflow: visible;
}

/* Admin: capa em largura total (compensa padding do layout dashboard) */
.courses-container.admin-with-banner {
  margin-left: -2rem;
  margin-right: -2rem;
  width: auto;
}

.courses-page.has-featured-banner {
  max-width: none;
  margin: 0;
  padding: 0;
}

.courses-page.has-featured-banner > :not(.patient-banner) {
  box-sizing: border-box;
  width: 100%;
  max-width: none;
  margin-left: auto;
  margin-right: auto;
  padding-left: 3rem;
  padding-right: 3rem;
}

.courses-page.streaming-page {
  padding-bottom: 2.5rem;
}

.courses-page.streaming-page .course-row-block {
  margin-bottom: 1.75rem;
}

.courses-page.streaming-page .course-row-block :deep(.cf-tile-carousel) {
  scroll-padding-inline: 3rem;
  margin-inline: -3rem;
  padding-inline: 3rem;
}

.patient-banner--admin {
  width: 100%;
  margin: 0 0 2.2rem;
  border-radius: 0;
  box-shadow: none;
}

.patient-banner--admin .banner-edit-btn {
  right: 2rem;
}

.patient-banner {
  position: relative;
  min-height: 640px;
  border-radius: var(--cf-radius-control);
  overflow: hidden;
  margin: 0 -2.5rem 2.2rem;
  border: none;
  box-shadow: none;
}

.patient-banner-bg {
  position: absolute;
  inset: 0;
  z-index: 0;
  background-image: var(--patient-banner-desktop);
  background-size: cover;
  background-position: var(--patient-banner-pos-desktop, 50% 35%);
  background-repeat: no-repeat;
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
  top: 1rem;
  right: 2.5rem;
  left: auto;
  z-index: 20;
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  margin: 0;
  padding: 0.45rem 0.8rem;
  border-radius: var(--cf-radius-control);
  border: 1px solid rgba(15, 23, 42, 0.14);
  background: rgba(255, 255, 255, 0.97);
  color: #0f172a;
  font-family: var(--cf-font);
  font-size: 0.75rem;
  font-weight: 600;
  line-height: 1;
  cursor: pointer;
  box-shadow: 0 2px 12px rgba(15, 23, 42, 0.16);
  transition: background 0.18s ease, box-shadow 0.18s ease;
  -webkit-tap-highlight-color: transparent;
}

.banner-edit-btn-icon {
  width: 15px;
  height: 15px;
  flex-shrink: 0;
}

.banner-edit-btn-label {
  white-space: nowrap;
}

.banner-edit-btn:hover {
  background: #ffffff;
  box-shadow: 0 4px 14px rgba(15, 23, 42, 0.18);
}

.banner-position-group {
  margin-top: 0.35rem;
}

.banner-position-preview {
  position: relative;
  width: 100%;
  aspect-ratio: 3 / 1;
  max-height: 10rem;
  border-radius: var(--cf-radius-control);
  overflow: hidden;
  border: 1px solid rgba(15, 23, 42, 0.12);
  background-color: #f1f5f9;
  background-size: cover;
  background-repeat: no-repeat;
  cursor: crosshair;
  touch-action: none;
}

.banner-position-preview--mobile {
  aspect-ratio: 4 / 5;
  max-height: 14rem;
  max-width: 11rem;
}

.banner-position-marker {
  position: absolute;
  width: 18px;
  height: 18px;
  margin: -9px 0 0 -9px;
  border-radius: 50%;
  border: 2px solid #fff;
  background: var(--cf-pink, #c17b80);
  box-shadow: 0 0 0 2px rgba(193, 123, 128, 0.35);
  pointer-events: none;
}

.banner-position-sliders {
  display: grid;
  gap: 0.55rem;
  margin-top: 0.65rem;
}

.banner-position-slider {
  display: grid;
  grid-template-columns: 5.5rem 1fr;
  align-items: center;
  gap: 0.65rem;
  font-size: 0.78rem;
  color: #475569;
}

.banner-position-slider input[type='range'] {
  width: 100%;
}

.banner-position-presets {
  display: flex;
  flex-wrap: wrap;
  gap: 0.45rem;
  margin-top: 0.55rem;
}

.banner-position-preset {
  border: 1px solid rgba(15, 23, 42, 0.12);
  border-radius: var(--cf-radius-control);
  padding: 0.28rem 0.65rem;
  background: #fff;
  font-size: 0.72rem;
  color: #334155;
  cursor: pointer;
}

.banner-position-preset:hover {
  border-color: rgba(193, 123, 128, 0.45);
  color: #a06267;
}

.patient-banner-content {
  position: absolute;
  z-index: 2;
  left: 10rem;
  top: 7.4rem;
  max-width: 440px;
  padding: 0;
  text-shadow: none;
}

.patient-banner-kicker {
  display: inline-flex;
  margin-bottom: 0.85rem;
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  border-radius: var(--cf-radius-control);
  padding: 0.35rem 0.65rem;
  border: 1px solid rgba(15, 23, 42, 0.18);
  background: var(--banner-kicker-bg, rgba(255, 255, 255, 0.78));
  color: var(--banner-kicker-color, #0f172a);
}

.patient-banner h2 {
  font-size: clamp(2.15rem, 3vw, 3rem);
  line-height: 1.1;
  margin-bottom: 0.85rem;
  font-weight: 800;
  color: var(--banner-title-color, #0f172a);
}

.patient-banner p {
  max-width: 48ch;
  color: var(--banner-subtitle-color, rgba(15, 23, 42, 0.86));
  line-height: 1.52;
  font-size: 0.95rem;
  margin: 0;
}

.patient-banner-btn {
  margin-top: 1.15rem;
  border: none;
  border-radius: var(--cf-radius-control);
  background: var(--banner-cta-bg, #fff);
  color: var(--banner-cta-color, #111318);
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
  background: var(--banner-secondary-bg, rgba(255, 255, 255, 0.76));
  color: var(--banner-secondary-color, #0f172a);
  border: 1px solid rgba(15, 23, 42, 0.12);
}

.banner-colors-group {
  margin-top: 0.25rem;
}

.banner-color-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.55rem 0.75rem;
  margin-top: 0.5rem;
}

.banner-color-field {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  font-size: 0.72rem;
  color: #475569;
}

.banner-color-field input[type='color'] {
  width: 2.25rem;
  height: 1.75rem;
  padding: 0;
  border: 1px solid rgba(15, 23, 42, 0.12);
  border-radius: var(--cf-radius-sm);
  background: transparent;
  cursor: pointer;
}

.patient-header h1,
.patient-header p {
  color: #f5f5f5;
}

.patient-header p {
  opacity: 0.78;
}

.course-row-title {
  margin: 0 0 0.75rem;
  font-size: 1.125rem;
  font-weight: 600;
  letter-spacing: -0.025em;
  color: var(--cf-text, #141414);
}

.course-row-block :deep(.cf-tile-carousel) {
  scroll-padding-inline: 2.5rem;
  margin-inline: -2.5rem;
  padding-inline: 2.5rem;
}

.course-row-block :deep(.cf-tile-carousel-wrap) {
  overflow: visible;
}

.course-row-block :deep(.cf-tile-card-actions) {
  z-index: 6;
}

.course-row-title-link {
  cursor: pointer;
  width: fit-content;
}

.course-row-title-link:hover {
  color: var(--cf-green-dark, #4d7348);
}

@media (max-width: 640px) {
  .courses-container.admin-with-banner {
    margin-left: -1rem;
    margin-right: -1rem;
  }

  .courses-page.has-featured-banner > :not(.patient-banner) {
    padding-left: 1rem;
    padding-right: 1rem;
  }

  .courses-page.streaming-page .course-row-block :deep(.cf-tile-carousel) {
    scroll-padding-inline: 1rem;
    margin-inline: -1rem;
    padding-inline: 1rem;
  }

  .patient-banner--admin .banner-edit-btn {
    right: 1rem;
  }

  .courses-page.patient-page {
    padding: 0 1.2rem 1.2rem;
  }

  .course-row-block :deep(.cf-tile-carousel) {
    scroll-padding-inline: 1.2rem;
    margin-inline: -1.2rem;
    padding-inline: 1.2rem;
  }

  .patient-banner {
    min-height: 500px;
    margin: 0 -1.2rem 1.5rem;
  }

  .patient-banner-bg {
    background-image: var(--patient-banner-mobile);
    background-position: var(--patient-banner-pos-mobile, var(--patient-banner-pos-desktop, 50% 35%));
  }

  .patient-banner-content {
    left: 1.2rem;
    right: 1.2rem;
    top: auto;
    bottom: 1.2rem;
    max-width: 92%;
    text-shadow: none;
  }

  .banner-edit-btn {
    top: 0.85rem;
    right: 1.2rem;
    left: auto;
  }

  .patient-banner-bottom-blur {
    height: 160px;
  }

  .banner-color-grid {
    grid-template-columns: 1fr;
  }

  .banner-upload-grid {
    grid-template-columns: 1fr;
  }

  .banner-upload-frame--mobile {
    width: 100%;
    max-width: 9rem;
  }

  .banner-field-grid {
    grid-template-columns: 1fr;
  }

  .banner-editor-preview-content {
    max-width: 78%;
  }

  .modal-card--banner {
    width: min(100%, 100%);
    max-height: calc(100dvh - 1rem);
    border-radius: var(--cf-radius-control);
  }

  .modal-card {
    width: min(100%, 26rem);
  }
}

</style>


