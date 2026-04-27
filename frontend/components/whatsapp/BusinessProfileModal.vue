<template>
  <div v-if="open" class="business-profile-modal-backdrop" @click.self="$emit('close')">
    <div class="business-profile-modal">
      <div class="business-profile-header">
        <h4>Dados do contato</h4>
        <button type="button" class="business-profile-close" @click="$emit('close')">✕</button>
      </div>

      <div v-if="loading" class="business-profile-loading">
        <Loader class="spin icon-small" />
        <span>Carregando dados da empresa...</span>
      </div>

      <div v-else-if="profile" class="business-profile-content">
        <div class="business-profile-hero">
          <div class="business-profile-cover"></div>
          <div class="business-profile-avatar">
            <img v-if="avatarUrl" :src="avatarUrl" :alt="displayName" />
            <User v-else class="icon-xl" />
          </div>
        </div>

        <div class="business-profile-identity">
          <h5>{{ displayName }}</h5>
          <p class="business-profile-phone">{{ phoneLabel }}</p>
          <p v-if="primaryCategory" class="business-profile-category">{{ primaryCategory }}</p>
          <p v-if="profile.description" class="business-profile-description">{{ profile.description }}</p>

          <div v-if="openingLabel || hoursLabel" class="business-profile-hours-block">
            <button
              type="button"
              class="business-profile-hours-toggle"
              @click="hoursExpanded = !hoursExpanded"
            >
              <span
                v-if="openingLabel"
                :class="['business-profile-open-state', profile.openNow === true ? 'is-open' : 'is-closed']"
              >
                {{ openingLabel }}
              </span>
              <span v-if="hoursLabel" class="business-profile-hours">{{ hoursLabel }}</span>
              <span class="business-profile-hours-caret">{{ hoursExpanded ? '▲' : '▼' }}</span>
            </button>
            <ul v-if="hoursExpanded && weeklySchedule.length" class="business-profile-hours-list">
              <li v-for="row in weeklySchedule" :key="row.dayKey" class="business-profile-hours-item">
                <span>{{ row.dayLabel }}</span>
                <span>{{ row.value }}</span>
              </li>
            </ul>
          </div>

          <p v-if="addressLine" class="business-profile-address">{{ addressLine }}</p>
        </div>

        <div class="business-profile-actions-row">
          <button type="button" class="business-profile-action-btn"><span>Catálogo</span></button>
          <button type="button" class="business-profile-action-btn"><span>Compartilhar</span></button>
        </div>

        <div class="business-profile-section">
          <h6>Conta comercial</h6>
          <p v-if="openingLabel"><strong>Status:</strong> {{ openingLabel }}</p>
          <p v-if="hoursLabel"><strong>Horário:</strong> {{ hoursLabel }}</p>
          <p v-if="addressLine"><strong>Endereço:</strong> {{ addressLine }}</p>
          <p v-if="emailLabel"><strong>Email:</strong> {{ emailLabel }}</p>
          <p v-if="primaryWebsite"><strong>Site:</strong> {{ primaryWebsite }}</p>
          <p v-if="categoriesLabel"><strong>Categoria:</strong> {{ categoriesLabel }}</p>
          <p v-if="profile.description"><strong>Descrição:</strong> {{ profile.description }}</p>
          <p
            v-if="!openingLabel && !hoursLabel && !addressLine && !emailLabel && !primaryWebsite && !categoriesLabel && !profile.description"
            class="business-profile-empty-note"
          >
            Esta conta não retornou detalhes comerciais adicionais na UAZAPI.
          </p>
        </div>

        <div v-if="catalog.length" class="business-profile-catalog">
          <h6>Catálogo</h6>
          <ul class="business-products-grid">
            <li v-for="product in catalog" :key="product.id || product.retailerId || product.name">
              <div class="business-product-row">
                <div class="business-product-main">
                  <div class="business-product-thumb">
                    <img v-if="product.imageUrl" :src="product.imageUrl" :alt="product.name || 'Produto'" />
                    <span v-else>Sem imagem</span>
                  </div>
                  <span class="business-product-name">{{ product.name || 'Produto sem nome' }}</span>
                </div>
              </div>
            </li>
          </ul>
        </div>

        <div class="business-profile-section business-profile-section-muted">
          <h6>Recado e número de telefone</h6>
          <p>{{ phoneLabel }}</p>
        </div>
      </div>

      <div v-else class="business-profile-empty">
        Não foi possível carregar o perfil comercial.
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { Loader, User } from 'lucide-vue-next'

const props = defineProps({
  open: { type: Boolean, default: false },
  loading: { type: Boolean, default: false },
  profile: { type: Object, default: null },
  catalog: { type: Array, default: () => [] },
  avatarUrl: { type: String, default: '' },
  displayName: { type: String, default: 'Empresa' },
  phoneLabel: { type: String, default: '' },
  primaryCategory: { type: String, default: '' },
  primaryWebsite: { type: String, default: '' },
  openingLabel: { type: String, default: '' },
  hoursLabel: { type: String, default: '' },
  weeklySchedule: { type: Array, default: () => [] },
  addressLine: { type: String, default: '' },
  emailLabel: { type: String, default: '' },
  categoriesLabel: { type: String, default: '' }
})

defineEmits(['close'])

const hoursExpanded = ref(false)
</script>
