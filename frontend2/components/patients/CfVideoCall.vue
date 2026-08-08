<template>
  <div
    ref="rootEl"
    class="cfvc"
    :class="{
      'cfvc--guest': !showToolbar,
      'cfvc--panel-open': panelOpen && status === 'live',
      'cfvc--live': status === 'live',
      'cfvc--mobile': isMobileUi,
      'cfvc--pip': pipActive,
      'cfvc--compact': compactMode,
    }"
    @pointerdown="onRootPointerDown"
  >
    <div
      class="cfvc-stage"
      :class="{
        'cfvc-stage--solo': !remoteParticipants.length || status !== 'live',
        'cfvc-stage--paired': status === 'live' && remoteParticipants.length > 0,
        'cfvc-stage--portrait': status === 'live' && remoteParticipants.length > 0 && !hasRemoteVideo(remoteParticipants[0]?.id),
      }"
    >
      <template v-if="status === 'live'">
        <div
          v-for="p in remoteParticipants"
          :key="p.id"
          class="cfvc-tile cfvc-tile--main"
          :class="{
            'cfvc-tile--hand': p.handRaised,
            'cfvc-tile--portrait': !hasRemoteVideo(p.id),
            'cfvc-tile--landscape': hasRemoteVideo(p.id),
            'cfvc-tile--speaking': !hasRemoteVideo(p.id) && !p.audioMuted && peerSpeaking(p.id),
          }"
          :style="!hasRemoteVideo(p.id) ? speakStyle(p.id) : undefined"
        >
          <video
            :ref="(el) => bindRemoteVideo(p.id, el)"
            class="cfvc-video"
            autoplay
            playsinline
          />
          <audio
            :ref="(el) => bindRemoteAudio(p.id, el)"
            autoplay
            playsinline
          />
          <div
            v-if="!hasRemoteVideo(p.id)"
            class="cfvc-avatar"
            :class="{ 'cfvc-avatar--speaking': !p.audioMuted && peerSpeaking(p.id) }"
          >
            <span class="cfvc-avatar-ring cfvc-avatar-ring--outer" aria-hidden="true" />
            <span class="cfvc-avatar-ring cfvc-avatar-ring--inner" aria-hidden="true" />
            <span class="cfvc-avatar-face">{{ initials(p.name) }}</span>
          </div>
          <div
            v-if="p.handRaised"
            class="cfvc-hand-pill"
            title="Mão levantada"
            aria-label="Mão levantada"
          >
            <span class="cfvc-hand-pill-ico" aria-hidden="true">
              <Hand :size="14" :stroke-width="2.5" />
            </span>
            <strong>{{ p.name || 'Participante' }}</strong>
          </div>
          <div
            v-if="!p.audioMuted && peerSpeaking(p.id) && !isMobileUi"
            class="cfvc-audio-badge"
            :style="speakStyle(p.id)"
            title="Falando"
            aria-hidden="true"
          >
            <span class="cfvc-speak-bars" aria-hidden="true">
              <i /><i /><i />
            </span>
          </div>
          <div
            v-else-if="p.audioMuted && !isMobileUi"
            class="cfvc-mic-off-badge"
            title="Microfone desligado"
            aria-hidden="true"
          >
            <MicOff :size="14" :stroke-width="2.4" />
          </div>
          <div
            v-if="!p.handRaised"
            class="cfvc-tile-meta"
            :class="{ 'cfvc-tile-meta--m': isMobileUi }"
          >
            <span v-if="p.audioMuted && isMobileUi" class="cfvc-name-mic" aria-hidden="true">
              <MicOff :size="12" :stroke-width="2.6" />
            </span>
            <span
              v-else-if="!p.audioMuted && isMobileUi && peerSpeaking(p.id)"
              class="cfvc-name-wave is-speaking"
              :style="speakStyle(p.id)"
              aria-hidden="true"
            >
              <span class="cfvc-speak-bars cfvc-speak-bars--sm" aria-hidden="true">
                <i /><i /><i />
              </span>
            </span>
            <span class="cfvc-name">{{ shortName(p.name) }}</span>
          </div>
        </div>
      </template>

      <div v-if="status === 'connecting' || status === 'idle'" class="cfvc-waiting">
        <div class="cfvc-spinner" aria-hidden="true" />
        <p>Conectando à consulta…</p>
      </div>

      <div v-else-if="status === 'lobby' || inLobby" class="cfvc-waiting">
        <div class="cfvc-spinner" aria-hidden="true" />
        <p>Aguarde a nutricionista aprovar sua entrada</p>
        <p class="cfvc-hint">Você já está na sala de espera. Assim que ela aprovar, a consulta começa.</p>
      </div>

      <div v-else-if="status === 'error'" class="cfvc-waiting cfvc-waiting--error">
        <p>{{ error || 'Falha na videochamada.' }}</p>
        <button type="button" class="cfvc-retry" @click="retry">Tentar de novo</button>
      </div>

      <div
        v-else-if="status === 'live' && !remoteParticipants.length"
        class="cfvc-waiting cfvc-waiting--solo"
      >
        <p>Aguardando o outro participante…</p>
        <p v-if="mediaWarning" class="cfvc-hint">{{ mediaWarning }}</p>
      </div>

      <div
        class="cfvc-tile cfvc-tile--self"
        :class="{
          'cfvc-tile--self-guest': !showToolbar,
          'cfvc-tile--hand': handRaised && status === 'live',
          'cfvc-tile--bg-fx': backgroundMode !== 'none' && !isSharingScreen,
          'cfvc-tile--speaking': (localVideoMuted || status !== 'live') && localSpeaking,
        }"
        :style="(localVideoMuted || status !== 'live') ? speakStyle(localParticipantId) : undefined"
      >
        <video
          ref="localVideoEl"
          class="cfvc-video"
          autoplay
          playsinline
          muted
        />
        <div
          v-if="localVideoMuted || status !== 'live'"
          class="cfvc-avatar cfvc-avatar--sm"
          :class="{ 'cfvc-avatar--speaking': localSpeaking }"
        >
          <span class="cfvc-avatar-ring cfvc-avatar-ring--outer" aria-hidden="true" />
          <span class="cfvc-avatar-ring cfvc-avatar-ring--inner" aria-hidden="true" />
          <span class="cfvc-avatar-face">{{ initials(displayName) }}</span>
        </div>
        <div
          v-if="handRaised && status === 'live'"
          class="cfvc-hand-pill cfvc-hand-pill--self"
          title="Mão levantada"
          aria-label="Mão levantada"
        >
          <span class="cfvc-hand-pill-ico" aria-hidden="true">
            <Hand :size="12" :stroke-width="2.5" />
          </span>
          <strong>{{ displayName || 'Você' }}</strong>
        </div>
        <div
          v-if="!localAudioMuted && status === 'live' && localSpeaking"
          class="cfvc-audio-badge cfvc-audio-badge--self"
          :style="speakStyle(localParticipantId)"
          aria-hidden="true"
        >
          <span class="cfvc-speak-bars cfvc-speak-bars--sm" aria-hidden="true">
            <i /><i /><i />
          </span>
        </div>
        <div
          v-if="!handRaised"
          class="cfvc-tile-meta"
          :class="{ 'cfvc-tile-meta--m-self': isMobileUi }"
        >
          <span v-if="!isMobileUi" class="cfvc-name">{{ displayName || 'Você' }}</span>
        </div>
        <div v-if="isMobileUi && status === 'live'" class="cfvc-self-tools" @pointerdown.stop>
          <button
            type="button"
            class="cfvc-self-tool"
            title="Inverter câmera"
            aria-label="Inverter câmera"
            :disabled="isSharingScreen || localVideoMuted || status !== 'live'"
            @click.stop="onFlipCamera"
          >
            <SwitchCamera :size="15" />
          </button>
          <button
            type="button"
            class="cfvc-self-tool"
            :class="{ 'is-on': backgroundMode === 'blur' }"
            title="Desfoque de fundo"
            aria-label="Alternar desfoque de fundo"
            @click="onSetBackground(backgroundMode === 'blur' ? 'none' : 'blur')"
          >
            <Image :size="14" />
          </button>
        </div>
      </div>

      <div class="cfvc-reactions-float" aria-hidden="true">
        <span
          v-for="r in floatingReactions"
          :key="r.id"
          class="cfvc-reaction-emoji"
          :style="{ left: `${r.left}%` }"
        >
          {{ r.emoji }}
        </span>
      </div>
    </div>

    <!-- Top bar desktop: timer + mão levantada + admitir -->
    <div v-if="status === 'live' && !isMobileUi" class="cfvc-topbar" @pointerdown.stop>
      <div class="cfvc-topbar-left">
        <span class="cfvc-timer">{{ callTimerLabel }}</span>
        <span v-if="roomCodeLabel" class="cfvc-topbar-sep" aria-hidden="true">|</span>
        <span v-if="roomCodeLabel" class="cfvc-room-code">{{ roomCodeLabel }}</span>
        <Info :size="14" class="cfvc-topbar-info" aria-hidden="true" />
      </div>
      <div class="cfvc-topbar-center">
        <div
          v-if="raisedHandPerson"
          class="cfvc-raise-top"
          :title="`${raisedHandPerson.name} levantou a mão`"
          aria-label="Mão levantada"
        >
          <span class="cfvc-raise-top-ico" aria-hidden="true">
            <Hand :size="16" :stroke-width="2.4" />
          </span>
          <strong>{{ raisedHandPerson.name }}</strong>
        </div>
      </div>
      <div class="cfvc-topbar-right">
        <button
          v-if="showHostSecurity && lobbyPending.length"
          type="button"
          class="cfvc-admit-pill"
          @click="openLobbyPopup"
        >
          <UserRoundPlus :size="16" :stroke-width="2.4" />
          Permitir {{ lobbyPending.length }}
          {{ lobbyPending.length === 1 ? 'convidado' : 'convidados' }}
        </button>
        <button
          v-if="showHostSecurity"
          type="button"
          class="cfvc-top-avatar"
          :class="{ 'is-active': peopleOpen }"
          title="Pessoas"
          aria-label="Abrir pessoas"
          @click="togglePeoplePanel"
        >
          <span>{{ initials(displayName) }}</span>
          <em>{{ peopleCount }}</em>
        </button>
      </div>
    </div>

    <!-- Top bar mobile Meet -->
    <div v-if="status === 'live' && isMobileUi" class="cfvc-m-top" @pointerdown.stop>
      <div class="cfvc-m-top-left">
        <div class="cfvc-m-people-pill" aria-label="Participantes">
          <span
            v-for="(p, idx) in mobileTopAvatars"
            :key="`${p.id || idx}`"
            class="cfvc-m-people-av"
            :style="{ zIndex: 3 - idx }"
          >
            {{ initials(p.name) }}
          </span>
          <strong>{{ mobilePeopleLabel }}</strong>
        </div>
      </div>
      <div class="cfvc-m-top-actions">
        <button
          type="button"
          class="cfvc-m-icon"
          title="Inverter câmera"
          aria-label="Inverter câmera"
          :disabled="status !== 'live' || isSharingScreen"
          @click.stop="onFlipCamera"
        >
          <SwitchCamera :size="20" />
        </button>
        <button
          type="button"
          class="cfvc-m-icon"
          :class="{ 'is-off': speakerMuted }"
          :title="speakerMuted ? 'Ativar áudio' : 'Silenciar áudio'"
          :aria-label="speakerMuted ? 'Ativar áudio' : 'Silenciar áudio'"
          @click="onToggleSpeaker"
        >
          <VolumeX v-if="speakerMuted" :size="20" />
          <Volume2 v-else :size="20" />
        </button>
      </div>
    </div>

    <!-- Mobile: pill de mão levantada embaixo (acima da toolbar) -->
    <div
      v-if="status === 'live' && isMobileUi && raisedHandPerson"
      class="cfvc-m-raise"
      aria-label="Mão levantada"
    >
      <span class="cfvc-raise-top-ico" aria-hidden="true">
        <Hand :size="15" :stroke-width="2.4" />
      </span>
      <strong>{{ raisedHandPerson.name }}</strong>
    </div>

    <div v-if="showStatusToasts" class="cfvc-toasts" aria-live="polite">
      <TransitionGroup name="cfvc-toast">
        <div
          v-for="t in statusToasts"
          :key="t.id"
          class="cfvc-toast"
          :class="[`cfvc-toast--${toastTone(t)}`, { 'cfvc-toast--compact': !t.body }]"
          role="status"
        >
          <div class="cfvc-toast-icon" aria-hidden="true">
            <Hand v-if="t.kind === 'hand'" :size="16" :stroke-width="2.4" />
            <UserRoundPlus v-else-if="t.kind === 'join'" :size="16" :stroke-width="2.4" />
            <Check v-else-if="toastTone(t) === 'success'" :size="16" :stroke-width="2.6" />
            <AlertTriangle v-else-if="toastTone(t) === 'error'" :size="16" :stroke-width="2.4" />
            <Info v-else :size="16" :stroke-width="2.4" />
          </div>
          <div class="cfvc-toast-copy">
            <strong>{{ t.title }}</strong>
            <span v-if="t.body">{{ t.body }}</span>
          </div>
          <button
            type="button"
            class="cfvc-toast-close"
            aria-label="Fechar"
            @click="dismissToast(t.id)"
          >
            <X :size="15" :stroke-width="2.4" />
          </button>
          <span class="cfvc-toast-progress" aria-hidden="true" />
        </div>
      </TransitionGroup>
    </div>

    <div
      v-if="props.role === 'host'"
      class="cfvc-chat-previews"
      aria-live="polite"
    >
      <TransitionGroup name="cfvc-chat-preview">
        <button
          v-for="t in chatToasts"
          :key="t.id"
          type="button"
          class="cfvc-chat-preview"
          @click="openChatFromPreview(t.id)"
        >
          <span class="cfvc-chat-preview-av" aria-hidden="true">{{ initials(t.title) }}</span>
          <span class="cfvc-chat-preview-copy">
            <strong>{{ t.title }}</strong>
            <em>{{ t.body }}</em>
          </span>
          <span class="cfvc-chat-preview-reply" aria-hidden="true">
            <Reply :size="18" :stroke-width="2.2" />
          </span>
        </button>
      </TransitionGroup>
    </div>

    <!-- Popup compacto sala de espera (estilo Meet) -->
    <Transition name="cfvc-lobby-pop">
      <div
        v-if="showHostSecurity && lobbyPopupOpen && lobbyPending.length && status === 'live'"
        class="cfvc-lobby-pop"
        role="dialog"
        aria-label="Aguardando participantes"
        @pointerdown.stop
      >
        <header class="cfvc-lobby-pop-head">
          <strong>Aguardando participantes</strong>
          <span class="cfvc-lobby-pop-badge">Visível para organizadores</span>
        </header>
        <div class="cfvc-lobby-pop-actions">
          <button type="button" class="cfvc-lobby-outline" @click="approveAllLobby">
            Permitir
          </button>
          <button type="button" class="cfvc-lobby-outline" @click="denyLobbyUser(lobbyPending[0].id)">
            Negar
          </button>
        </div>
        <div class="cfvc-lobby-pop-card">
          <span class="cfvc-lobby-pop-av" aria-hidden="true">
            {{ initials(lobbyPending[0].name || 'P') }}
          </span>
          <div class="cfvc-lobby-pop-card-copy">
            <strong>
              {{ lobbyPending.length }}
              {{ lobbyPending.length === 1 ? 'usuário não confirmado' : 'usuários não confirmados' }}
            </strong>
            <span>{{ lobbyPending[0].name || 'Participante' }}</span>
          </div>
        </div>
        <button type="button" class="cfvc-lobby-pop-more" @click="openPeopleFromLobby">
          Ver tudo ({{ lobbyPending.length }})
          <ChevronRight :size="14" />
        </button>
      </div>
    </Transition>

    <Transition name="cfvc-chat">
      <aside
        v-if="chatOpen && status === 'live'"
        class="cfvc-chat"
        aria-label="Mensagens na chamada"
      >
        <header class="cfvc-chat-head">
          <strong>Mensagens na chamada</strong>
          <button type="button" class="cfvc-chat-close" aria-label="Fechar chat" @click="closeChat">
            <X :size="16" />
          </button>
        </header>
        <div ref="chatListEl" class="cfvc-chat-list">
          <p v-if="!chatMessages.length" class="cfvc-chat-empty">
            Ainda sem mensagens de bate-papo
          </p>
          <div
            v-for="m in chatMessages"
            :key="m.id"
            class="cfvc-chat-bubble"
            :class="{ 'cfvc-chat-bubble--mine': m.isLocal }"
          >
            <span class="cfvc-chat-from">{{ m.isLocal ? 'Você' : m.from }}</span>
            <p>{{ m.text }}</p>
          </div>
        </div>
        <form class="cfvc-chat-form" @submit.prevent="submitChat">
          <input
            v-model="chatDraft"
            type="text"
            class="cfvc-chat-input"
            maxlength="1000"
            placeholder="Enviar uma mensagem"
            autocomplete="off"
            enterkeyhint="send"
          >
          <button
            type="submit"
            class="cfvc-chat-send"
            :disabled="!chatDraft.trim()"
            aria-label="Enviar"
          >
            <Send :size="16" />
          </button>
        </form>
      </aside>
    </Transition>

    <!-- Painel Pessoas (estilo Meet) -->
    <Transition name="cfvc-chat">
      <aside
        v-if="peopleOpen && status === 'live'"
        class="cfvc-chat cfvc-people"
        aria-label="Pessoas"
        @pointerdown.stop
      >
        <header class="cfvc-chat-head">
          <strong>Pessoas</strong>
          <button type="button" class="cfvc-chat-close" aria-label="Fechar pessoas" @click="closePeople">
            <X :size="16" />
          </button>
        </header>
        <div class="cfvc-people-body">
          <section v-if="showHostSecurity && lobbyPending.length" class="cfvc-people-section">
            <div class="cfvc-people-section-head">
              <span>Aguardando permissão</span>
              <span>{{ lobbyPending.length }}</span>
            </div>
            <button
              v-if="lobbyPending.length > 1"
              type="button"
              class="cfvc-people-link"
              @click="approveAllLobby"
            >
              Permitir todos
            </button>
            <div
              v-for="u in lobbyPending"
              :key="u.id"
              class="cfvc-people-row"
            >
              <span class="cfvc-people-av">{{ initials(u.name || 'P') }}</span>
              <div class="cfvc-people-copy">
                <strong>{{ u.name || 'Participante' }}</strong>
              </div>
              <button type="button" class="cfvc-people-link" @click="approveLobbyUser(u.id)">
                Permitir
              </button>
              <button
                type="button"
                class="cfvc-people-deny"
                title="Negar"
                @click="denyLobbyUser(u.id)"
              >
                <Ban :size="14" />
              </button>
            </div>
          </section>

          <section class="cfvc-people-section">
            <div class="cfvc-people-section-head">
              <span>Na reunião</span>
              <span>{{ inMeetingParticipants.length }}</span>
            </div>
            <div
              v-for="p in inMeetingParticipants"
              :key="p.id"
              class="cfvc-people-row"
            >
              <span class="cfvc-people-av">{{ initials(p.name) }}</span>
              <div class="cfvc-people-copy">
                <strong>{{ p.isLocal ? `${p.name} (Você)` : p.name }}</strong>
                <span v-if="p.isLocal && showHostSecurity">Organizador da reunião</span>
              </div>
            </div>
          </section>

          <section v-if="showHostSecurity" class="cfvc-people-section cfvc-people-section--security">
            <button
              type="button"
              class="cfvc-menu-row"
              role="menuitemcheckbox"
              :aria-checked="lobbyEnabled"
              :disabled="!lobbySupported && !lobbyEnabled"
              @click="onToggleLobby"
            >
              <span>Habilitar sala de espera</span>
              <span class="cfvc-switch" :class="{ 'is-on': lobbyEnabled }" aria-hidden="true" />
            </button>
          </section>
        </div>
      </aside>
    </Transition>

    <!-- Side rail desktop: chat + pessoas + segurança -->
    <div
      v-if="showToolbar"
      class="cfvc-side-rail"
      @pointerdown.stop
    >
      <button
        type="button"
        class="cfvc-btn cfvc-btn--rail"
        :class="{ 'is-active': chatOpen }"
        :disabled="status !== 'live'"
        title="Chat"
        aria-label="Abrir chat"
        @click="toggleChatPanel"
      >
        <MessageCircle :size="20" />
        <span v-if="unreadChat" class="cfvc-btn-dot" aria-hidden="true" />
      </button>

      <button
        v-if="showHostSecurity"
        type="button"
        class="cfvc-btn cfvc-btn--rail"
        :class="{ 'is-active': peopleOpen }"
        :disabled="status !== 'live'"
        title="Pessoas"
        aria-label="Abrir pessoas"
        @click="togglePeoplePanel"
      >
        <Users :size="20" />
        <span v-if="lobbyPending.length" class="cfvc-btn-badge">
          {{ lobbyPending.length > 9 ? '9+' : lobbyPending.length }}
        </span>
      </button>

      <div v-if="showHostSecurity" class="cfvc-ctrl cfvc-ctrl--rail">
        <button
          type="button"
          class="cfvc-btn cfvc-btn--rail"
          :class="{
            'is-open': openMenu === 'security',
            'is-active': lobbyEnabled || lobbyPending.length,
          }"
          :disabled="status !== 'live'"
          title="Opções de segurança"
          aria-label="Opções de segurança"
          @click="toggleMenu('security')"
        >
          <Shield :size="20" />
        </button>
        <div
          v-if="openMenu === 'security'"
          class="cfvc-menu cfvc-menu--security cfvc-menu--rail"
          role="dialog"
          aria-label="Opções de segurança"
        >
          <div class="cfvc-menu-title">Opções de segurança</div>
          <p class="cfvc-menu-desc">
            Com a sala de espera ativa, novos participantes aguardam sua aprovação antes de entrar na consulta.
          </p>
          <button
            type="button"
            class="cfvc-menu-row"
            role="menuitemcheckbox"
            :aria-checked="lobbyEnabled"
            :disabled="!lobbySupported && !lobbyEnabled"
            @click="onToggleLobby"
          >
            <span>Habilitar sala de espera</span>
            <span class="cfvc-switch" :class="{ 'is-on': lobbyEnabled }" aria-hidden="true" />
          </button>
          <p v-if="lobbyEnabled && !lobbyPending.length" class="cfvc-menu-hint">Ninguém na sala de espera.</p>
          <button
            v-if="lobbyPending.length"
            type="button"
            class="cfvc-people-link"
            style="margin-top: 0.5rem"
            @click="openPeopleFromLobby"
          >
            Ver aguardando ({{ lobbyPending.length }})
          </button>
        </div>
      </div>
    </div>

    <div v-if="showToolbar" class="cfvc-toolbar" :class="{ 'cfvc-toolbar--mobile': isMobileUi }" @pointerdown.stop @click.stop>
      <template v-if="isMobileUi">
        <!-- Mic + menu -->
        <div class="cfvc-ctrl">
          <div class="cfvc-btn-group">
            <button
              type="button"
              class="cfvc-btn cfvc-btn--split-main"
              :class="{ 'is-off': localAudioMuted }"
              :disabled="status !== 'live'"
              :title="localAudioMuted ? 'Ativar microfone' : 'Silenciar'"
              @click.stop="toggleAudio"
            >
              <MicOff v-if="localAudioMuted" :size="20" />
              <Mic v-else :size="20" />
            </button>
            <button
              type="button"
              class="cfvc-btn cfvc-btn--caret"
              :disabled="status !== 'live'"
              :class="{ 'is-open': openMenu === 'audio' }"
              title="Opções de áudio"
              aria-label="Opções de áudio"
              @click.stop="toggleMenu('audio')"
            >
              <ChevronUp :size="14" />
            </button>
          </div>
          <div v-if="openMenu === 'audio'" class="cfvc-menu cfvc-menu--toolbar" role="menu" @pointerdown.stop @click.stop>
            <button
              type="button"
              class="cfvc-menu-row"
              role="menuitemcheckbox"
              :aria-checked="noiseSuppression"
              @click.stop="onToggleNoise"
            >
              <span>Supressão de ruído</span>
              <span class="cfvc-switch" :class="{ 'is-on': noiseSuppression }" aria-hidden="true" />
            </button>
            <button
              type="button"
              class="cfvc-menu-row"
              role="menuitem"
              @click.stop="openSettings('audio'); closeMenus()"
            >
              <Settings :size="16" />
              Configurações de áudio
            </button>
          </div>
        </div>

        <!-- Camera + menu -->
        <div class="cfvc-ctrl">
          <div class="cfvc-btn-group">
            <button
              type="button"
              class="cfvc-btn cfvc-btn--split-main"
              :class="{ 'is-off': localVideoMuted }"
              :disabled="status !== 'live'"
              :title="localVideoMuted ? 'Ligar câmera' : 'Desligar câmera'"
              @click.stop="toggleVideo"
            >
              <VideoOff v-if="localVideoMuted" :size="20" />
              <Video v-else :size="20" />
            </button>
            <button
              type="button"
              class="cfvc-btn cfvc-btn--caret"
              :disabled="status !== 'live'"
              :class="{ 'is-open': openMenu === 'video' }"
              title="Opções de vídeo"
              aria-label="Opções de vídeo"
              @click.stop="toggleMenu('video')"
            >
              <ChevronUp :size="14" />
            </button>
          </div>
          <div v-if="openMenu === 'video'" class="cfvc-menu cfvc-menu--toolbar" role="menu" @pointerdown.stop @click.stop>
            <div class="cfvc-menu-label">Vídeo</div>
            <button
              type="button"
              class="cfvc-menu-row"
              @click.stop="openEffectsPanel(); closeMenus()"
            >
              <Sparkles :size="16" />
              Planos de fundo e efeitos
            </button>
            <button
              type="button"
              class="cfvc-menu-row"
              @click.stop="openSettings('video'); closeMenus()"
            >
              <Settings :size="16" />
              Configurações de vídeo
            </button>
            <button
              type="button"
              class="cfvc-menu-row"
              :class="{ 'is-selected': backgroundMode === 'none' }"
              role="menuitemradio"
              :aria-checked="backgroundMode === 'none'"
              @click.stop="onSetBackground('none')"
            >
              Nenhum efeito
            </button>
            <button
              type="button"
              class="cfvc-menu-row"
              :class="{ 'is-selected': backgroundMode === 'blur' }"
              role="menuitemradio"
              :aria-checked="backgroundMode === 'blur'"
              @click.stop="onSetBackground('blur')"
            >
              Desfoque forte
            </button>
            <button
              type="button"
              class="cfvc-menu-row"
              :class="{ 'is-selected': backgroundMode === 'soft' }"
              role="menuitemradio"
              :aria-checked="backgroundMode === 'soft'"
              @click.stop="onSetBackground('soft')"
            >
              Desfoque suave
            </button>
            <button
              type="button"
              class="cfvc-menu-row"
              @click.stop="onFlipCamera(); closeMenus()"
            >
              Inverter câmera
            </button>
          </div>
        </div>

        <div class="cfvc-ctrl">
          <button
            type="button"
            class="cfvc-btn"
            :class="{ 'is-active': openMenu === 'reactions' }"
            :disabled="status !== 'live'"
            title="Reações"
            aria-label="Reações"
            @click.stop="toggleMenu('reactions')"
          >
            <Smile :size="22" />
          </button>
          <div
            v-if="openMenu === 'reactions'"
            class="cfvc-reactions-bar cfvc-reactions-bar--m"
            role="menu"
            @pointerdown.stop
            @click.stop
          >
            <button
              v-for="emoji in reactionEmojis"
              :key="emoji"
              type="button"
              class="cfvc-reaction-btn"
              role="menuitem"
              :title="emoji"
              @click.stop="onSendReaction(emoji)"
            >
              {{ emoji }}
            </button>
          </div>
        </div>

        <button
          type="button"
          class="cfvc-btn"
          :class="{ 'is-active': moreOpen }"
          :disabled="status !== 'live'"
          title="Mais"
          aria-label="Mais opções"
          @click.stop="openMoreSheet"
        >
          <MoreVertical :size="22" />
        </button>

        <button
          type="button"
          class="cfvc-btn cfvc-btn--hang"
          :title="hangupTitle"
          :aria-label="hangupTitle"
          @click.stop="onHangup"
        >
          <PhoneOff :size="20" />
        </button>
      </template>

      <template v-else>
        <!-- Mic + audio menu -->
        <div class="cfvc-ctrl">
          <div class="cfvc-btn-group">
            <button
              type="button"
              class="cfvc-btn cfvc-btn--split-main"
              :class="{ 'is-off': localAudioMuted }"
              :disabled="status !== 'live'"
              :title="localAudioMuted ? 'Ativar microfone' : 'Silenciar'"
              @click.stop="toggleAudio"
            >
              <MicOff v-if="localAudioMuted" :size="20" />
              <Mic v-else :size="20" />
            </button>
            <button
              type="button"
              class="cfvc-btn cfvc-btn--caret"
              :disabled="status !== 'live'"
              :class="{ 'is-open': openMenu === 'audio' }"
              title="Opções de áudio"
              aria-label="Opções de áudio"
              @click.stop="toggleMenu('audio')"
            >
              <ChevronUp :size="14" />
            </button>
          </div>
          <div v-if="openMenu === 'audio'" class="cfvc-menu cfvc-menu--toolbar" role="menu" @pointerdown.stop @click.stop>
            <button
              type="button"
              class="cfvc-menu-row"
              role="menuitemcheckbox"
              :aria-checked="noiseSuppression"
              @click.stop="onToggleNoise"
            >
              <span>Supressão de ruído</span>
              <span class="cfvc-switch" :class="{ 'is-on': noiseSuppression }" aria-hidden="true" />
            </button>
            <button
              type="button"
              class="cfvc-menu-row"
              role="menuitem"
              @click.stop="openSettings('audio'); closeMenus()"
            >
              <Settings :size="16" />
              Configurações de áudio
            </button>
          </div>
        </div>

        <!-- Camera + video menu -->
        <div class="cfvc-ctrl">
          <div class="cfvc-btn-group">
            <button
              type="button"
              class="cfvc-btn cfvc-btn--split-main"
              :class="{ 'is-off': localVideoMuted }"
              :disabled="status !== 'live'"
              :title="localVideoMuted ? 'Ligar câmera' : 'Desligar câmera'"
              @click.stop="toggleVideo"
            >
              <VideoOff v-if="localVideoMuted" :size="20" />
              <Video v-else :size="20" />
            </button>
            <button
              type="button"
              class="cfvc-btn cfvc-btn--caret"
              :disabled="status !== 'live'"
              :class="{ 'is-open': openMenu === 'video' }"
              title="Opções de vídeo"
              aria-label="Opções de vídeo"
              @click.stop="toggleMenu('video')"
            >
              <ChevronUp :size="14" />
            </button>
          </div>
          <div v-if="openMenu === 'video'" class="cfvc-menu cfvc-menu--toolbar" role="menu" @pointerdown.stop @click.stop>
            <div class="cfvc-menu-label">Vídeo</div>
            <button
              type="button"
              class="cfvc-menu-row"
              @click.stop="openEffectsPanel(); closeMenus()"
            >
              <Sparkles :size="16" />
              Planos de fundo e efeitos
            </button>
            <button
              type="button"
              class="cfvc-menu-row"
              @click.stop="openSettings('video'); closeMenus()"
            >
              <Settings :size="16" />
              Configurações de vídeo
            </button>
            <button
              type="button"
              class="cfvc-menu-row"
              :class="{ 'is-selected': backgroundMode === 'none' }"
              role="menuitemradio"
              :aria-checked="backgroundMode === 'none'"
              @click.stop="onSetBackground('none')"
            >
              Nenhum efeito
            </button>
            <button
              type="button"
              class="cfvc-menu-row"
              :class="{ 'is-selected': backgroundMode === 'blur' }"
              role="menuitemradio"
              :aria-checked="backgroundMode === 'blur'"
              @click.stop="onSetBackground('blur')"
            >
              Desfoque forte
            </button>
            <button
              type="button"
              class="cfvc-menu-row"
              :class="{ 'is-selected': backgroundMode === 'soft' }"
              role="menuitemradio"
              :aria-checked="backgroundMode === 'soft'"
              @click.stop="onSetBackground('soft')"
            >
              Desfoque suave
            </button>
          </div>
        </div>

        <button
          type="button"
          class="cfvc-btn"
          :class="{ 'is-active': isSharingScreen }"
          :disabled="status !== 'live'"
          :title="isSharingScreen ? 'Parar compart. de tela' : 'Iniciar compart. de tela'"
          @click.stop="toggleScreenShare"
        >
          <MonitorUp :size="20" />
        </button>

        <button
          type="button"
          class="cfvc-btn"
          :class="{ 'is-active': handRaised }"
          :disabled="status !== 'live'"
          title="Levantar a mão"
          @click.stop="toggleHand"
        >
          <Hand :size="20" />
        </button>

        <div class="cfvc-ctrl">
          <button
            type="button"
            class="cfvc-btn"
            :class="{ 'is-open': openMenu === 'reactions', 'is-active': openMenu === 'reactions' }"
            :disabled="status !== 'live'"
            title="Reações"
            aria-label="Reações"
            @click.stop="toggleMenu('reactions')"
          >
            <Smile :size="20" />
          </button>
          <div
            v-if="openMenu === 'reactions'"
            class="cfvc-reactions-bar"
            role="menu"
            @pointerdown.stop
            @click.stop
          >
            <button
              v-for="emoji in reactionEmojis"
              :key="emoji"
              type="button"
              class="cfvc-reaction-btn"
              role="menuitem"
              :title="emoji"
              @click.stop="onSendReaction(emoji)"
            >
              {{ emoji }}
            </button>
          </div>
        </div>

        <button
          type="button"
          class="cfvc-btn cfvc-btn--chat-bar"
          :class="{ 'is-active': chatOpen }"
          :disabled="status !== 'live'"
          title="Chat"
          aria-label="Abrir chat"
          @click.stop="toggleChatPanel"
        >
          <MessageCircle :size="20" />
          <span v-if="unreadChat" class="cfvc-btn-dot" aria-hidden="true" />
        </button>

        <button
          v-if="showHostSecurity"
          type="button"
          class="cfvc-btn cfvc-btn--chat-bar"
          :class="{ 'is-active': peopleOpen }"
          :disabled="status !== 'live'"
          title="Pessoas"
          aria-label="Abrir pessoas"
          @click.stop="togglePeoplePanel"
        >
          <Users :size="20" />
          <span v-if="lobbyPending.length" class="cfvc-btn-badge">
            {{ lobbyPending.length > 9 ? '9+' : lobbyPending.length }}
          </span>
        </button>

        <div class="cfvc-ctrl">
          <button
            type="button"
            class="cfvc-btn"
            :class="{ 'is-open': openMenu === 'more', 'is-active': openMenu === 'more' }"
            :disabled="status !== 'live'"
            title="Mais opções"
            aria-label="Mais opções"
            @click.stop="toggleMenu('more')"
          >
            <MoreVertical :size="20" />
          </button>
          <div
            v-if="openMenu === 'more'"
            class="cfvc-menu cfvc-menu--toolbar cfvc-menu--more"
            :class="{ 'cfvc-menu--more-host': showHostSecurity && !isMobileUi }"
            role="menu"
            @pointerdown.stop
            @click.stop
          >
            <!-- Nutricionista desktop: menu completo estilo Jitsi Meet -->
            <template v-if="showHostSecurity && !isMobileUi">
              <div class="cfvc-menu-user">
                <span class="cfvc-menu-user-avatar">{{ hostInitials }}</span>
                <span class="cfvc-menu-user-name">{{ displayName }}</span>
              </div>
              <button type="button" class="cfvc-menu-row" role="menuitem" @click.stop="onMorePerformance">
                <Gauge :size="16" />
                Configurações de performance
              </button>
              <button
                type="button"
                class="cfvc-menu-row"
                :class="{ 'is-selected': isFullscreen }"
                role="menuitem"
                @click.stop="onMoreFullscreen"
              >
                <Maximize2 :size="16" />
                {{ isFullscreen ? 'Sair da tela cheia' : 'Tela cheia' }}
              </button>
              <button type="button" class="cfvc-menu-row" role="menuitem" @click.stop="onMoreSecurity">
                <Shield :size="16" />
                Opções de segurança
              </button>
              <button type="button" class="cfvc-menu-row" role="menuitem" @click.stop="onMorePolls">
                <ListChecks :size="16" />
                Sondagens
              </button>
              <button
                type="button"
                class="cfvc-menu-row"
                :class="{ 'is-selected': isRecording }"
                role="menuitem"
                @click.stop="onMoreRecording"
              >
                <Circle :size="16" />
                {{ isRecording ? 'Parar gravação' : 'Iniciar gravação' }}
              </button>

              <div class="cfvc-menu-divider" role="separator" />

              <button type="button" class="cfvc-menu-row" role="menuitem" @click.stop="onMoreShareVideo">
                <Play :size="16" />
                Compartilhar um vídeo
              </button>
              <button type="button" class="cfvc-menu-row" role="menuitem" @click.stop="onMoreShareAudio">
                <Volume2 :size="16" />
                Compartilhar áudio
              </button>
              <button
                type="button"
                class="cfvc-menu-row"
                role="menuitemcheckbox"
                :aria-checked="noiseSuppression"
                @click.stop="onToggleNoise"
              >
                <AudioLines :size="16" />
                <span>Supressão de ruído</span>
                <span class="cfvc-switch" :class="{ 'is-on': noiseSuppression }" aria-hidden="true" />
              </button>
              <button type="button" class="cfvc-menu-row" role="menuitem" @click.stop="onMoreEffects">
                <Image :size="16" />
                Selecionar fundo
              </button>
              <button type="button" class="cfvc-menu-row" role="menuitem" @click.stop="openSpeakerStats">
                <BarChart3 :size="16" />
                Estatísticas do Apresentador
              </button>

              <div class="cfvc-menu-divider" role="separator" />

              <button type="button" class="cfvc-menu-row" role="menuitem" @click.stop="onMoreSettings">
                <Settings :size="16" />
                Configurações
              </button>
              <button type="button" class="cfvc-menu-row" role="menuitem" @click.stop="openShortcuts">
                <Keyboard :size="16" />
                Ver atalhos
              </button>
              <button
                type="button"
                class="cfvc-menu-row"
                :class="{ 'is-selected': compactMode }"
                role="menuitem"
                @click.stop="toggleCompactMode"
              >
                <PanelLeftClose :size="16" />
                Reunião em formato compacto
              </button>
              <button
                type="button"
                class="cfvc-menu-row"
                :class="{ 'is-selected': pipActive }"
                role="menuitem"
                @click.stop="onMorePip"
              >
                <PictureInPicture2 :size="16" />
                {{ pipActive ? 'Fechar picture-in-picture' : 'Abrir picture-in-picture' }}
              </button>
            </template>

            <!-- Paciente / mobile: menu enxuto -->
            <template v-else>
              <button
                type="button"
                class="cfvc-menu-row"
                :class="{ 'is-selected': pipActive }"
                role="menuitem"
                @click.stop="onMorePip"
              >
                <PictureInPicture2 :size="16" />
                {{ pipActive ? 'Fechar picture-in-picture' : 'Abrir picture-in-picture' }}
              </button>
              <button
                type="button"
                class="cfvc-menu-row"
                :class="{ 'is-selected': isFullscreen }"
                role="menuitem"
                @click.stop="onMoreFullscreen"
              >
                <Maximize2 :size="16" />
                {{ isFullscreen ? 'Sair da tela cheia' : 'Tela cheia' }}
              </button>
              <button type="button" class="cfvc-menu-row" role="menuitem" @click.stop="onMoreEffects">
                <Sparkles :size="16" />
                Planos de fundo e efeitos
              </button>
              <button type="button" class="cfvc-menu-row" role="menuitem" @click.stop="onMoreSettings">
                <Settings :size="16" />
                Configurações
              </button>
              <button
                type="button"
                class="cfvc-menu-row"
                role="menuitem"
                :disabled="localVideoMuted || isSharingScreen"
                @click.stop="onMoreFlip"
              >
                <SwitchCamera :size="16" />
                Inverter câmera
              </button>
            </template>
          </div>
        </div>

        <button
          type="button"
          class="cfvc-btn cfvc-btn--hang"
          :title="hangupTitle"
          :aria-label="hangupTitle"
          @click.stop="onHangup"
        >
          <PhoneOff :size="20" />
        </button>
      </template>
    </div>


    <!-- Estatísticas do apresentador -->
    <Transition name="cfvc-fx">
      <div v-if="speakerStatsOpen && status === 'live'" class="cfvc-fx-root" @pointerdown.stop>
        <button type="button" class="cfvc-fx-scrim" aria-label="Fechar" @click="closeSpeakerStats" />
        <div class="cfvc-stats-panel" role="dialog" aria-label="Estatísticas do Apresentador">
          <header class="cfvc-fx-head">
            <strong>Estatísticas do Apresentador</strong>
            <button type="button" class="cfvc-fx-close" aria-label="Fechar" @click="closeSpeakerStats">
              <X :size="18" />
            </button>
          </header>
          <ul class="cfvc-stats-list">
            <li v-for="p in statsParticipants" :key="p.id" class="cfvc-stats-row">
              <div class="cfvc-stats-name">
                <span>{{ p.name }}</span>
                <em v-if="p.isLocal">(você)</em>
              </div>
              <div class="cfvc-stats-meta">
                <span v-if="p.audioMuted" class="cfvc-stats-muted">Silenciado</span>
                <span v-else-if="peerSpeaking(p.id)" class="cfvc-stats-speaking">Falando</span>
                <span v-else class="cfvc-stats-idle">Ativo</span>
              </div>
              <div class="cfvc-stats-meter" aria-hidden="true">
                <span
                  v-for="i in 8"
                  :key="i"
                  class="cfvc-stats-bar"
                  :class="{ 'is-on': statsLevel(p.id) * 8 >= i }"
                />
              </div>
            </li>
          </ul>
        </div>
      </div>
    </Transition>

    <!-- Atalhos de teclado -->
    <Transition name="cfvc-fx">
      <div v-if="shortcutsOpen && status === 'live'" class="cfvc-fx-root" @pointerdown.stop>
        <button type="button" class="cfvc-fx-scrim" aria-label="Fechar" @click="closeShortcuts" />
        <div class="cfvc-shortcuts-panel" role="dialog" aria-label="Atalhos de teclado">
          <header class="cfvc-fx-head">
            <strong>Ver atalhos</strong>
            <button type="button" class="cfvc-fx-close" aria-label="Fechar" @click="closeShortcuts">
              <X :size="18" />
            </button>
          </header>
          <ul class="cfvc-shortcuts-list">
            <li v-for="s in keyboardShortcuts" :key="s.keys">
              <kbd>{{ s.keys }}</kbd>
              <span>{{ s.label }}</span>
            </li>
          </ul>
        </div>
      </div>
    </Transition>

    <!-- Configurações (estilo Jitsi Meet) -->
    <CfVideoCallSettings
      :open="settingsOpen && status === 'live'"
      :initial-tab="settingsTab"
      :audio-inputs="audioInputDevices"
      :video-inputs="videoInputDevices"
      :audio-outputs="audioOutputDevices"
      :selected-mic-id="selectedMicId"
      :selected-cam-id="selectedCamId"
      :selected-speaker-id="selectedSpeakerId"
      :audio-output-supported="audioOutputSupported"
      :noise-suppression="noiseSuppression"
      :mic-level="settingsMicLevel"
      :background-mode="backgroundMode"
      :presets="backgroundPresets"
      :is-sharing-screen="isSharingScreen"
      :camera-off="localVideoMuted"
      :preview-stream="settingsPreviewStream"
      :show-moderator="showHostSecurity"
      :lobby-enabled="lobbyEnabled"
      :lobby-supported="lobbySupported"
      :lobby-pending-count="lobbyPending.length"
      @close="closeSettings"
      @set-mic="onSettingsSetMic"
      @set-cam="onSettingsSetCam"
      @set-speaker="onSettingsSetSpeaker"
      @toggle-noise="onSettingsToggleNoise"
      @test-sound="playTestSound"
      @flip-camera="onFlipCamera"
      @set-background="onSetBackground"
      @set-background-image="onSetBackgroundImage"
      @toggle-lobby="onSettingsToggleLobby"
    />

    <!-- Bottom sheet mobile: Mais -->
    <Transition name="cfvc-sheet">
      <div
        v-if="moreOpen && isMobileUi && status === 'live'"
        class="cfvc-sheet-root"
        @pointerdown.stop
      >
        <button type="button" class="cfvc-sheet-scrim" aria-label="Fechar" @click="closeMoreSheet" />
        <div class="cfvc-sheet" role="dialog" aria-label="Mais opções">
          <div class="cfvc-sheet-handle" aria-hidden="true" />
          <button
            type="button"
            class="cfvc-sheet-wide"
            :class="{ 'is-active': handRaised }"
            @click="onSheetHand"
          >
            <Hand :size="22" />
            <span>{{ handRaised ? 'Abaixar a mão' : 'Levantar a mão' }}</span>
          </button>
          <div class="cfvc-sheet-row3">
            <button
              type="button"
              class="cfvc-sheet-tile"
              :class="{ 'is-active': isSharingScreen }"
              @click="onSheetShare"
            >
              <MonitorUp :size="22" />
            </button>
            <button
              type="button"
              class="cfvc-sheet-tile"
              :class="{ 'is-off': localAudioMuted }"
              @click="toggleAudio"
            >
              <MicOff v-if="localAudioMuted" :size="22" />
              <Mic v-else :size="22" />
            </button>
            <button
              type="button"
              class="cfvc-sheet-tile"
              :class="{ 'is-off': localVideoMuted }"
              @click="toggleVideo"
            >
              <VideoOff v-if="localVideoMuted" :size="22" />
              <Video v-else :size="22" />
            </button>
          </div>
          <div class="cfvc-sheet-row2">
            <button type="button" class="cfvc-sheet-card" @click="onSheetChat">
              <MessageCircle :size="20" />
              <span>Mensagens na chamada</span>
              <em v-if="unreadChat">{{ unreadChat }}</em>
            </button>
            <button type="button" class="cfvc-sheet-card" @click="openSettings('audio'); closeMoreSheet()">
              <Settings :size="20" />
              <span>Configurações</span>
            </button>
          </div>
          <div class="cfvc-sheet-row2">
            <button type="button" class="cfvc-sheet-card" @click="openSettings('backgrounds'); closeMoreSheet()">
              <Sparkles :size="20" />
              <span>Planos de fundo e efeitos</span>
            </button>
            <button type="button" class="cfvc-sheet-card" @click="onFlipCamera(); closeMoreSheet()">
              <SwitchCamera :size="20" />
              <span>Inverter câmera</span>
            </button>
          </div>
          <div class="cfvc-sheet-row2">
            <button type="button" class="cfvc-sheet-card" @click="onSheetNoise">
              <AudioLines :size="20" />
              <span>{{ noiseSuppression ? 'Ruído: ligado' : 'Supressão de ruído' }}</span>
            </button>
            <button type="button" class="cfvc-sheet-card" :class="{ 'is-active': isFullscreen }" @click="onMoreFullscreen(); closeMoreSheet()">
              <Maximize2 :size="20" />
              <span>{{ isFullscreen ? 'Sair da tela cheia' : 'Tela cheia' }}</span>
            </button>
          </div>
          <button
            type="button"
            class="cfvc-sheet-wide"
            :class="{ 'is-active': pipActive }"
            @click="onMorePip(); closeMoreSheet()"
          >
            <PictureInPicture2 :size="20" />
            <span>{{ pipActive ? 'Fechar picture-in-picture' : 'Abrir picture-in-picture' }}</span>
          </button>
          <button type="button" class="cfvc-sheet-wide cfvc-sheet-wide--hang" @click="closeMoreSheet(); onHangup()">
            <PhoneOff :size="20" />
            <span>{{ hangupSheetLabel }}</span>
          </button>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup>
import {
  AlertTriangle,
  AudioLines,
  Ban,
  BarChart3,
  Check,
  ChevronRight,
  ChevronUp,
  Circle,
  Gauge,
  Hand,
  Image,
  Info,
  Keyboard,
  ListChecks,
  Maximize2,
  MessageCircle,
  Mic,
  MicOff,
  MonitorUp,
  MoreVertical,
  PanelLeftClose,
  PhoneOff,
  PictureInPicture2,
  Play,
  Reply,
  Send,
  Settings,
  Shield,
  Smile,
  Sparkles,
  SwitchCamera,
  UserRoundPlus,
  Users,
  Video,
  VideoOff,
  Volume2,
  VolumeX,
  X,
} from 'lucide-vue-next'
import { useJitsiMediaCall } from '~/composables/useJitsiMediaCall.js'
import { CF_BACKGROUND_PRESETS, resolveBackgroundPresetUrl } from '~/utils/jitsi-background-blur.js'
import CfVideoCallSettings from '~/components/patients/CfVideoCallSettings.vue'

const props = defineProps({
  roomUrl: { type: String, required: true },
  roomName: { type: String, default: '' },
  jitsiDomain: { type: String, default: 'meet.nutrisabellajardim.com.br' },
  displayName: { type: String, default: 'Participante' },
  role: { type: String, default: 'guest' },
  autoJoin: { type: Boolean, default: true },
  showToolbar: { type: Boolean, default: true },
  /** Tracks já criadas no toque do usuário (mobile). */
  preparedTracks: { type: Array, default: () => null },
  preparedWarning: { type: String, default: '' },
})

const emit = defineEmits(['ready', 'error', 'left', 'end'])

const {
  status,
  error,
  participants,
  localAudioMuted,
  localVideoMuted,
  handRaised,
  toasts,
  trackTick,
  mediaWarning,
  chatMessages,
  unreadChat,
  chatOpen,
  setChatOpen,
  sendChatMessage,
  isSharingScreen,
  noiseSuppression,
  isRecording,
  backgroundMode,
  backgroundImageUrl,
  lobbyEnabled,
  lobbySupported,
  isModerator,
  lobbyPending,
  floatingReactions,
  inLobby,
  cameraFacing,
  speakerMuted,
  sendReaction,
  toggleScreenShare,
  toggleRecording,
  setNoiseSuppression,
  pushToast,
  setBackground,
  refreshMediaDevices,
  setMicrophone,
  setCamera,
  setSpeaker,
  playTestSound,
  getLocalMicLevel,
  audioInputDevices,
  videoInputDevices,
  audioOutputDevices,
  selectedMicId,
  selectedCamId,
  selectedSpeakerId,
  audioOutputSupported,
  setLobbyEnabled,
  approveLobbyUser,
  denyLobbyUser,
  join,
  leave,
  toggleAudio,
  toggleVideo,
  flipCamera,
  toggleSpeaker,
  toggleHand,
  dismissToast,
  getLocalTrack,
  getRemoteTrack,
  attachTrackToEl,
  audioLevels,
  getAudioLevel,
  isSpeaking,
} = useJitsiMediaCall()

const localVideoEl = ref(null)
const chatListEl = ref(null)
const chatDraft = ref('')
const openMenu = ref(null)
const peopleOpen = ref(false)
const lobbyPopupOpen = ref(false)
const moreOpen = ref(false)
const effectsOpen = ref(false)
const settingsOpen = ref(false)
const settingsTab = ref('audio')
const settingsMicLevel = ref(0)
const compactMode = ref(false)
const speakerStatsOpen = ref(false)
const shortcutsOpen = ref(false)
const pipActive = ref(false)
const isFullscreen = ref(false)
const rootEl = ref(null)
/** Vídeo auxiliar só para PiP — não mexe nos tiles da UI */
let pipHelperEl = null
let onPipLeave = null
let onDocumentPipLeave = null
let onFsChange = null
let settingsMeterRaf = 0

function detectMobileUi() {
  if (typeof window === 'undefined') return false
  try {
    const narrow = !!window.matchMedia?.('(max-width: 899px)').matches
    const standalone = !!window.matchMedia?.('(display-mode: standalone)').matches
      || !!window.navigator?.standalone
    const coarse = !!window.matchMedia?.('(pointer: coarse)').matches
    const ua = String(window.navigator?.userAgent || '')
    const mobileUa = /iPhone|iPad|iPod|Android|Mobile/i.test(ua)
    // PWA instalado no celular: prioriza UA/touch mesmo se a viewport mentir
    if (mobileUa || (standalone && coarse)) return true
    return narrow
  } catch {
    return false
  }
}

/** Detecta mobile já no setup (PWA/iPhone) — não espera onMounted. */
const isMobileUi = ref(detectMobileUi())
const callStartedAt = ref(null)
const callElapsedSec = ref(0)
const remoteVideoEls = new Map()
const remoteAudioEls = new Map()
let started = false
let leaving = false
let consumedPreparedTracks = false
let mobileMq = null
let onMobileMqChange = null

const reactionEmojis = ['💖', '👍', '🎉', '👏', '😂', '😮', '😢', '🤔']

const remoteParticipants = computed(() => participants.value.filter((p) => !p.isLocal))

const primaryPeer = computed(() => remoteParticipants.value[0] || null)

const primaryPeerName = computed(() => primaryPeer.value?.name || props.displayName || 'Consulta')

const primaryPeerMuted = computed(() => !!primaryPeer.value?.audioMuted)

const mobileTopAvatars = computed(() => {
  const list = []
  if (primaryPeer.value) list.push({ id: primaryPeer.value.id, name: primaryPeer.value.name })
  list.push({ id: 'local', name: props.displayName || 'Você' })
  return list.slice(0, 2)
})

const mobilePeopleLabel = computed(() => {
  const names = mobileTopAvatars.value.map((p) => shortName(p.name))
  return names.join(', ')
})

const raisedHandPerson = computed(() => {
  const remote = remoteParticipants.value.find((p) => p.handRaised)
  if (remote) return { id: remote.id, name: remote.name || 'Participante' }
  if (handRaised.value) return { id: 'local', name: props.displayName || 'Você' }
  return null
})

const localParticipantId = computed(() => {
  const local = participants.value.find((p) => p.isLocal)
  return local?.id || 'local'
})

const localSpeaking = computed(() => {
  void audioLevels.value
  void trackTick.value
  return !localAudioMuted.value && isSpeaking(localParticipantId.value)
})

function peerSpeaking(id) {
  void audioLevels.value
  void trackTick.value
  return isSpeaking(id)
}

function speakStyle(id) {
  const level = getAudioLevel(id)
  // 0.55–1.25 escala conforme volume da fala
  const scale = 0.55 + Math.min(1, Math.max(0, level) * 4) * 0.7
  return { '--cfvc-speak': String(scale.toFixed(3)) }
}

void backgroundImageUrl
void primaryPeerName
void primaryPeerMuted

const inMeetingParticipants = computed(() => {
  const list = participants.value.length
    ? [...participants.value]
    : [{ id: 'local', name: props.displayName, isLocal: true }]
  return list
})

const peopleCount = computed(() => Math.max(1, participants.value.length || 1))

const panelOpen = computed(() => chatOpen.value || peopleOpen.value)

const showHostSecurity = computed(() => props.role === 'host')

const isHostRole = computed(() => props.role === 'host')
const hangupTitle = computed(() => (isHostRole.value ? 'Encerrar chamada' : 'Sair da chamada'))
const hangupSheetLabel = computed(() => hangupTitle.value)

const displayName = computed(() => String(props.displayName || 'Participante').trim() || 'Participante')

const hostInitials = computed(() => initials(displayName.value))

const statsParticipants = computed(() => participants.value)

const keyboardShortcuts = [
  { keys: 'M', label: 'Silenciar / ativar microfone' },
  { keys: 'V', label: 'Ligar / desligar câmera' },
  { keys: 'D', label: 'Compartilhar tela' },
  { keys: 'F', label: 'Tela cheia' },
  { keys: 'C', label: 'Abrir chat' },
  { keys: 'R', label: 'Levantar / abaixar mão' },
  { keys: 'Esc', label: 'Fechar painéis abertos' },
]

function statsLevel(id) {
  void trackTick.value
  return getAudioLevel(id)
}

const statusToasts = computed(() => toasts.value.filter((t) => t.kind !== 'chat'))

/** Toasts de status só no host — no PWA do paciente cobrem o topo. */
const showStatusToasts = computed(() => props.role === 'host' && statusToasts.value.length > 0)

const chatToasts = computed(() => toasts.value.filter((t) => t.kind === 'chat'))

function toastTone(t) {
  if (!t) return 'info'
  if (t.kind === 'join' || t.kind === 'success') return 'success'
  if (t.kind === 'hand') return 'hand'
  if (t.kind === 'error') return 'error'
  const blob = `${t.title || ''} ${t.body || ''}`.toLowerCase()
  if (/não|nao|falha|erro|indispon|negad|ocupad|imposs/.test(blob)) return 'error'
  if (/ativad|desativad|ligado|permit|aprov|sucesso|pronto/.test(blob)) return 'success'
  return 'info'
}

const roomCodeLabel = computed(() => {
  const name = resolveRoomName()
  if (!name) return ''
  return name.length > 18 ? `${name.slice(0, 16)}…` : name
})

const callTimerLabel = computed(() => {
  const total = callElapsedSec.value
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  const mm = String(m).padStart(2, '0')
  const ss = String(s).padStart(2, '0')
  if (h > 0) return `${h}:${mm}:${ss}`
  return `${mm}:${ss}`
})

function hasRemoteVideo(id) {
  // trackTick força reavaliação quando tracks mudam
  void trackTick.value
  const track = getRemoteTrack(id, 'video')
  return !!track && !track.isMuted?.()
}

function initials(name) {
  const parts = String(name || '').trim().split(/\s+/).filter(Boolean)
  if (!parts.length) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return `${parts[0][0] || ''}${parts[1][0] || ''}`.toUpperCase()
}

function shortName(name) {
  const first = String(name || '').trim().split(/\s+/)[0]
  return first || 'Participante'
}

function resolveRoomName() {
  const fromProp = String(props.roomName || '').trim()
  if (fromProp) return fromProp
  try {
    return decodeURIComponent(new URL(props.roomUrl).pathname.replace(/^\/+/, '').split('/')[0] || '')
  } catch {
    return ''
  }
}

function resolveDomain() {
  return String(props.jitsiDomain || '')
    .replace(/^https?:\/\//, '')
    .replace(/\/+$/, '')
    || 'meet.nutrisabellajardim.com.br'
}

function resolveCallRole() {
  return props.role === 'host' ? 'host' : 'guest'
}

function toggleMenu(name) {
  moreOpen.value = false
  openMenu.value = openMenu.value === name ? null : name
}

function closeMenus() {
  openMenu.value = null
}

function onRootPointerDown(event) {
  // Não fecha se o toque veio da toolbar / menus / sheet
  const target = event?.target
  if (target?.closest?.('.cfvc-toolbar, .cfvc-menu, .cfvc-reactions-bar, .cfvc-sheet-root, .cfvc-side-rail, .cfvc-fx-root, .cfvc-stats-panel, .cfvc-shortcuts-panel')) {
    return
  }
  if (openMenu.value) closeMenus()
  if (lobbyPopupOpen.value) lobbyPopupOpen.value = false
  if (effectsOpen.value) closeEffectsPanel()
  if (settingsOpen.value) closeSettings()
  if (speakerStatsOpen.value) closeSpeakerStats()
  if (shortcutsOpen.value) closeShortcuts()
}

function openMoreSheet() {
  closeMenus()
  moreOpen.value = true
}

function closeMoreSheet() {
  moreOpen.value = false
}

const backgroundPresets = computed(() =>
  CF_BACKGROUND_PRESETS.map((p) => ({
    ...p,
    url: resolveBackgroundPresetUrl(p),
  })),
)

const settingsPreviewStream = computed(() => {
  void trackTick.value
  if (localVideoMuted.value || isSharingScreen.value) return null
  const track = getLocalTrack('video')
  if (!track) return null
  try {
    if (typeof track.stream !== 'undefined' && track.stream) return track.stream
    const media = track.getTrack?.()
    if (media) return new MediaStream([media])
  } catch { /* ignore */ }
  return null
})

function stopSettingsMeter() {
  if (settingsMeterRaf) {
    cancelAnimationFrame(settingsMeterRaf)
    settingsMeterRaf = 0
  }
  settingsMicLevel.value = 0
}

function tickSettingsMeter() {
  if (!settingsOpen.value) {
    stopSettingsMeter()
    return
  }
  settingsMicLevel.value = getLocalMicLevel()
  settingsMeterRaf = requestAnimationFrame(tickSettingsMeter)
}

async function openSettings(tab = 'audio') {
  closeMenus()
  moreOpen.value = false
  peopleOpen.value = false
  effectsOpen.value = false
  setChatOpen(false)
  settingsTab.value = tab
  settingsOpen.value = true
  await refreshMediaDevices()
  stopSettingsMeter()
  settingsMeterRaf = requestAnimationFrame(tickSettingsMeter)
}

function closeSettings() {
  settingsOpen.value = false
  stopSettingsMeter()
}

function openEffectsPanel() {
  void openSettings('backgrounds')
}

function closeEffectsPanel() {
  effectsOpen.value = false
}

async function ensureCameraForEffects() {
  if (localVideoMuted.value && status.value === 'live') {
    await toggleVideo()
  }
}

function onSetBackground(mode) {
  void (async () => {
    if (mode && mode !== 'none') await ensureCameraForEffects()
    await setBackground(mode)
  })()
  closeMenus()
}

function onSetBackgroundImage(bg) {
  if (!bg?.id) return
  const url = resolveBackgroundPresetUrl(bg)
  if (!url) return
  void (async () => {
    await ensureCameraForEffects()
    await setBackground(`image:${bg.id}`, url)
  })()
  closeMenus()
}

function onSettingsSetMic(id) {
  void setMicrophone(id)
}

function onSettingsSetCam(id) {
  void setCamera(id)
}

function onSettingsSetSpeaker(id) {
  void setSpeaker(id)
}

function onSettingsToggleNoise(enabled) {
  void setNoiseSuppression(!!enabled)
}

function onSettingsToggleLobby(enabled) {
  void setLobbyEnabled(!!enabled)
}

function getStreamFromJitsiTrack(jitsiTrack) {
  if (!jitsiTrack) return null
  try {
    const stream = jitsiTrack.stream
    if (stream?.getVideoTracks?.()?.some((t) => t.readyState === 'live')) return stream
    const mt = jitsiTrack.getTrack?.()
    if (mt?.kind === 'video' && mt.readyState === 'live') {
      return new MediaStream([mt])
    }
  } catch { /* ignore */ }
  return null
}

function pickPipSourceTrack() {
  void trackTick.value
  for (const p of remoteParticipants.value) {
    const t = getRemoteTrack(p.id, 'video')
    if (t && !t.isMuted?.()) {
      return { track: t, name: p.name || 'Participante' }
    }
  }
  const local = getLocalTrack('video')
  if (local && !local.isMuted?.()) {
    return { track: local, name: displayName.value || 'Você' }
  }
  return null
}

function ensurePipHelper() {
  if (typeof document === 'undefined') return null
  if (!pipHelperEl) {
    pipHelperEl = document.createElement('video')
    pipHelperEl.autoplay = true
    pipHelperEl.playsInline = true
    pipHelperEl.muted = true
    pipHelperEl.removeAttribute('disablePictureInPicture')
    pipHelperEl.style.cssText = 'position:fixed;left:0;top:0;width:2px;height:2px;opacity:0.01;pointer-events:none;z-index:-1'
    document.body.appendChild(pipHelperEl)
  }
  pipHelperEl.removeAttribute('disablePictureInPicture')
  return pipHelperEl
}

function cleanupPipHelper() {
  if (!pipHelperEl) return
  if (document.pictureInPictureElement === pipHelperEl) return
  try {
    pipHelperEl.pause()
    pipHelperEl.srcObject = null
  } catch { /* ignore */ }
}

async function waitVideoFrame(video, ms = 4500) {
  if (video.readyState >= 2 && video.videoWidth > 0) return
  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Sem imagem de vídeo para PiP.')), ms)
    const done = () => {
      clearTimeout(timer)
      resolve()
    }
    if (video.readyState >= 2 && video.videoWidth > 0) {
      done()
      return
    }
    video.addEventListener('loadeddata', done, { once: true })
    video.addEventListener('resize', done, { once: true })
  })
}

function onDocumentPipLeaveEvent() {
  pipActive.value = false
  cleanupPipHelper()
}

async function togglePictureInPicture() {
  if (typeof document === 'undefined') return
  try {
    if (document.pictureInPictureElement) {
      await document.exitPictureInPicture()
      pipActive.value = false
      cleanupPipHelper()
      return
    }

    if (document.pictureInPictureEnabled === false) {
      pushToast({
        title: 'Picture-in-picture',
        body: 'Seu navegador não suporta picture-in-picture nesta página.',
        kind: 'error',
      })
      return
    }

    const picked = pickPipSourceTrack()
    if (!picked) {
      pushToast({
        title: 'Picture-in-picture',
        body: 'Ligue a câmera (sua ou do participante) para usar PiP.',
        kind: 'error',
      })
      return
    }

    const stream = getStreamFromJitsiTrack(picked.track)
    if (!stream) {
      pushToast({
        title: 'Picture-in-picture',
        body: 'Vídeo indisponível no momento.',
        kind: 'error',
      })
      return
    }

    const visibleEl = picked.track?.containers?.find?.((c) => c instanceof HTMLVideoElement) || null
    const el = visibleEl || ensurePipHelper()
    if (!el) return

    if (!visibleEl) {
      if (el.srcObject !== stream) {
        el.srcObject = stream
      }
    }

    el.removeAttribute('disablePictureInPicture')
    if ('disablePictureInPicture' in el) {
      el.disablePictureInPicture = false
    }

    try {
      await el.play()
    } catch { /* ignore */ }

    await waitVideoFrame(el)

    if (!onPipLeave) {
      onPipLeave = () => {
        pipActive.value = false
        cleanupPipHelper()
      }
    }
    el.removeEventListener('leavepictureinpicture', onPipLeave)
    el.addEventListener('leavepictureinpicture', onPipLeave)

    if (!onDocumentPipLeave) {
      onDocumentPipLeave = onDocumentPipLeaveEvent
    }
    document.removeEventListener('leavepictureinpicture', onDocumentPipLeave)
    document.addEventListener('leavepictureinpicture', onDocumentPipLeave)

    await el.requestPictureInPicture()
    pipActive.value = true
    closeMenus()
  } catch (err) {
    pipActive.value = false
    cleanupPipHelper()
    console.warn('[cfvc] PiP failed', err)
    pushToast({
      title: 'Picture-in-picture',
      body: String(err?.message || 'Não foi possível abrir picture-in-picture.'),
      kind: 'error',
    })
  }
}

async function toggleFullscreen() {
  if (typeof document === 'undefined') return
  try {
    const node = rootEl.value
    if (!node) return
    if (document.fullscreenElement) {
      await document.exitFullscreen()
      isFullscreen.value = false
      return
    }
    await node.requestFullscreen?.()
    isFullscreen.value = true
    closeMenus()
  } catch (err) {
    isFullscreen.value = false
    console.warn('[cfvc] fullscreen failed', err)
  }
}

function onFlipCamera() {
  void flipCamera()
}

function onMorePip() {
  closeMenus()
  void togglePictureInPicture()
}

function onMoreFullscreen() {
  closeMenus()
  void toggleFullscreen()
}

function onMoreEffects() {
  closeMenus()
  void openSettings('backgrounds')
}

function onMoreSettings() {
  closeMenus()
  void openSettings('audio')
}

function onMoreFlip() {
  closeMenus()
  void flipCamera()
}

function onMorePerformance() {
  closeMenus()
  void openSettings('video')
}

function onMoreSecurity() {
  closeMenus()
  void openSettings('moderator')
}

function onMorePolls() {
  closeMenus()
  pushToast({
    title: 'Sondagens',
    body: 'Crie enquetes pelo chat ou use o meet completo para sondagens avançadas.',
    kind: 'info',
  })
}

function onMoreRecording() {
  closeMenus()
  void toggleRecording()
}

function onMoreShareVideo() {
  closeMenus()
  void toggleScreenShare()
  pushToast({
    title: 'Compartilhar vídeo',
    body: 'Escolha uma janela ou aba com o vídeo. Marque “Compartilhar áudio da aba” se precisar.',
    kind: 'info',
  })
}

function onMoreShareAudio() {
  closeMenus()
  void toggleScreenShare()
  pushToast({
    title: 'Compartilhar áudio',
    body: 'No Chrome, selecione uma aba e marque “Compartilhar áudio da aba”.',
    kind: 'info',
  })
}

function toggleCompactMode() {
  compactMode.value = !compactMode.value
  closeMenus()
}

function openSpeakerStats() {
  closeMenus()
  speakerStatsOpen.value = true
}

function closeSpeakerStats() {
  speakerStatsOpen.value = false
}

function openShortcuts() {
  closeMenus()
  shortcutsOpen.value = true
}

function closeShortcuts() {
  shortcutsOpen.value = false
}

function onCallKeydown(ev) {
  if (status.value !== 'live' || leaving) return
  const tag = String(ev.target?.tagName || '').toLowerCase()
  if (tag === 'input' || tag === 'textarea' || tag === 'select' || ev.target?.isContentEditable) return
  const key = String(ev.key || '').toLowerCase()
  if (key === 'escape') {
    closeMenus()
    closeSettings()
    closeSpeakerStats()
    closeShortcuts()
    closeMoreSheet()
    return
  }
  if (ev.ctrlKey || ev.metaKey || ev.altKey) return
  if (key === 'm') { ev.preventDefault(); void toggleAudio() }
  else if (key === 'v') { ev.preventDefault(); void toggleVideo() }
  else if (key === 'd' && showHostSecurity.value) { ev.preventDefault(); void toggleScreenShare() }
  else if (key === 'f') { ev.preventDefault(); void toggleFullscreen() }
  else if (key === 'c') { ev.preventDefault(); toggleChatPanel() }
  else if (key === 'r') { ev.preventDefault(); void toggleHand() }
}

function onToggleSpeaker() {
  toggleSpeaker()
}

function onSheetHand() {
  toggleHand()
  closeMoreSheet()
}

function onSheetShare() {
  void toggleScreenShare()
  closeMoreSheet()
}

function onSheetChat() {
  closeMoreSheet()
  toggleChatPanel()
}

function onSheetNoise() {
  void setNoiseSuppression(!noiseSuppression.value)
}

function onToggleNoise() {
  void setNoiseSuppression(!noiseSuppression.value)
}

function onSendReaction(emoji) {
  sendReaction(emoji)
  closeMenus()
}

function onToggleLobby() {
  void setLobbyEnabled(!lobbyEnabled.value)
}

function openLobbyPopup() {
  lobbyPopupOpen.value = true
  peopleOpen.value = false
  setChatOpen(false)
  closeMenus()
}

function openPeopleFromLobby() {
  lobbyPopupOpen.value = false
  peopleOpen.value = true
  setChatOpen(false)
  closeMenus()
}

function togglePeoplePanel() {
  closeMenus()
  lobbyPopupOpen.value = false
  const next = !peopleOpen.value
  peopleOpen.value = next
  if (next) setChatOpen(false)
}

function closePeople() {
  peopleOpen.value = false
}

function approveAllLobby() {
  for (const u of [...lobbyPending.value]) {
    void approveLobbyUser(u.id)
  }
  lobbyPopupOpen.value = false
}

function startCallTimer() {
  stopCallTimer()
  callStartedAt.value = Date.now()
  callElapsedSec.value = 0
  callTimerId = setInterval(() => {
    if (!callStartedAt.value) return
    callElapsedSec.value = Math.floor((Date.now() - callStartedAt.value) / 1000)
  }, 1000)
}

function stopCallTimer() {
  if (callTimerId) {
    clearInterval(callTimerId)
    callTimerId = null
  }
}

function bindRemoteVideo(id, el) {
  if (!el) {
    remoteVideoEls.delete(id)
    return
  }
  remoteVideoEls.set(id, el)
  el.removeAttribute?.('disablePictureInPicture')
  const track = getRemoteTrack(id, 'video')
  if (track) attachTrackToEl(track, el)
}

function bindRemoteAudio(id, el) {
  if (!el) {
    remoteAudioEls.delete(id)
    return
  }
  remoteAudioEls.set(id, el)
  const track = getRemoteTrack(id, 'audio')
  if (track) attachTrackToEl(track, el)
}

function refreshMedia() {
  const localVideo = getLocalTrack('video')
  if (localVideo && localVideoEl.value) {
    localVideoEl.value.removeAttribute?.('disablePictureInPicture')
    attachTrackToEl(localVideo, localVideoEl.value)
  }

  for (const [id, el] of remoteVideoEls) {
    const track = getRemoteTrack(id, 'video')
    if (track) attachTrackToEl(track, el)
  }
  for (const [id, el] of remoteAudioEls) {
    const track = getRemoteTrack(id, 'audio')
    if (track) attachTrackToEl(track, el)
  }
}

let refreshMediaRaf = 0
function scheduleRefreshMedia() {
  if (refreshMediaRaf) return
  refreshMediaRaf = requestAnimationFrame(() => {
    refreshMediaRaf = 0
    refreshMedia()
  })
}

watch([status, localVideoEl, () => participants.value.map((p) => p.id).join('|')], async () => {
  if (status.value !== 'live') return
  await nextTick()
  scheduleRefreshMedia()
})

watch(trackTick, async () => {
  if (status.value !== 'live') return
  await nextTick()
  scheduleRefreshMedia()
})

watch(
  () => chatMessages.value.length,
  async () => {
    await nextTick()
    const el = chatListEl.value
    if (el) el.scrollTop = el.scrollHeight
  },
)

watch(
  () => lobbyPending.value.length,
  (count, prev) => {
    if (!showHostSecurity.value) return
    if (count > (prev || 0)) {
      lobbyPopupOpen.value = true
    }
    if (count === 0) lobbyPopupOpen.value = false
  },
)

watch(status, (s) => {
  if (s === 'live') {
    emit('ready')
    startCallTimer()
  } else {
    stopCallTimer()
  }
  if (s === 'left' && !leaving) emit('left')
  if (s !== 'live') {
    closeMenus()
    peopleOpen.value = false
    lobbyPopupOpen.value = false
    moreOpen.value = false
    closeSettings()
    closeSpeakerStats()
    closeShortcuts()
  }
})

function toggleChatPanel() {
  closeMenus()
  lobbyPopupOpen.value = false
  peopleOpen.value = false
  moreOpen.value = false
  setChatOpen(!chatOpen.value)
}

function openChatFromPreview(toastId) {
  if (toastId != null) dismissToast(toastId)
  closeMenus()
  lobbyPopupOpen.value = false
  peopleOpen.value = false
  setChatOpen(true)
}

function closeChat() {
  setChatOpen(false)
}

function submitChat() {
  const text = chatDraft.value
  if (!sendChatMessage(text)) return
  chatDraft.value = ''
}

async function start() {
  started = true
  const usePrepared = !consumedPreparedTracks
    && Array.isArray(props.preparedTracks)
    && props.preparedTracks.length > 0
  if (usePrepared) consumedPreparedTracks = true
  try {
    await join({
      domain: resolveDomain(),
      roomName: resolveRoomName(),
      displayName: props.displayName,
      callRole: resolveCallRole(),
      preparedTracks: usePrepared ? props.preparedTracks : null,
      preparedWarning: usePrepared ? props.preparedWarning : '',
    })
    await nextTick()
    refreshMedia()
  } catch (err) {
    const msg = String(err?.message || err || '').trim()
    emit('error', (!msg || msg === 'undefined')
      ? 'Falha ao entrar na chamada.'
      : msg)
  }
}

async function retry() {
  started = false
  consumedPreparedTracks = true
  await leave()
  void start()
}

function leaveWithTimeout(ms = 5000) {
  return Promise.race([
    Promise.resolve(leave()).catch((err) => console.warn('[cfvc] leave failed', err)),
    new Promise((r) => setTimeout(r, ms)),
  ])
}

async function onHangup() {
  if (leaving) return
  leaving = true
  closeMenus()
  closeEffectsPanel()
  closeMoreSheet()
  closeSettings()
  closeSpeakerStats()
  closeShortcuts()
  peopleOpen.value = false
  lobbyPopupOpen.value = false
  stopCallTimer()
  try {
    if (document.pictureInPictureElement) {
      await document.exitPictureInPicture?.().catch(() => {})
    }
  } catch { /* ignore */ }
  await leaveWithTimeout()
  if (props.role === 'host') {
    emit('end')
  } else {
    emit('left')
  }
}

async function leaveLocally() {
  if (leaving) {
    await leaveWithTimeout()
    return
  }
  leaving = true
  closeMenus()
  closeEffectsPanel()
  closeMoreSheet()
  closeSettings()
  closeSpeakerStats()
  closeShortcuts()
  peopleOpen.value = false
  lobbyPopupOpen.value = false
  stopCallTimer()
  try {
    if (document.pictureInPictureElement) {
      await document.exitPictureInPicture?.().catch(() => {})
    }
  } catch { /* ignore */ }
  await leaveWithTimeout()
}

onMounted(() => {
  isMobileUi.value = detectMobileUi()
  if (typeof window !== 'undefined' && window.matchMedia) {
    mobileMq = window.matchMedia('(max-width: 899px)')
    onMobileMqChange = () => { isMobileUi.value = detectMobileUi() }
    onMobileMqChange()
    mobileMq.addEventListener?.('change', onMobileMqChange)
    mobileMq.addListener?.(onMobileMqChange)
  }
  onFsChange = () => {
    isFullscreen.value = !!document.fullscreenElement
  }
  document.addEventListener?.('fullscreenchange', onFsChange)
  document.addEventListener?.('keydown', onCallKeydown)
  if (props.autoJoin) void start()
})

onBeforeUnmount(() => {
  leaving = true
  stopCallTimer()
  stopSettingsMeter()
  document.removeEventListener?.('keydown', onCallKeydown)
  if (mobileMq && onMobileMqChange) {
    mobileMq.removeEventListener?.('change', onMobileMqChange)
    mobileMq.removeListener?.(onMobileMqChange)
  }
  if (onFsChange) document.removeEventListener?.('fullscreenchange', onFsChange)
  if (onDocumentPipLeave) {
    document.removeEventListener('leavepictureinpicture', onDocumentPipLeave)
  }
  if (document.pictureInPictureElement) {
    void document.exitPictureInPicture?.().catch(() => {})
  }
  cleanupPipHelper()
  if (pipHelperEl?.parentNode) {
    try { pipHelperEl.parentNode.removeChild(pipHelperEl) } catch { /* ignore */ }
    pipHelperEl = null
  }
  void leave()
})

defineExpose({ leaveLocally, remount: start })
</script>

<style scoped>
.cfvc {
  position: relative;
  width: 100%;
  height: 100%;
  min-height: 0;
  background: #000;
  color: #e8eaed;
  overflow: visible;
}

.cfvc-stage {
  position: absolute;
  inset: 0;
  padding: 1rem 1rem 5.75rem;
  transition: right 0.22s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.cfvc--guest .cfvc-stage {
  padding-bottom: 1rem;
}

.cfvc-tile {
  position: relative;
  overflow: hidden;
  background: #1e1f20;
  border-radius: 24px;
}

/* Remoto com câmera maior: stage paisagem estilo Meet */
.cfvc-tile--main {
  width: 100%;
  height: 100%;
  max-width: 100%;
  max-height: 100%;
  aspect-ratio: auto;
  background: #1e1f20;
  border-radius: 20px;
  box-shadow: none;
}

.cfvc-stage--solo {
  align-items: stretch;
  justify-content: stretch;
}

.cfvc-stage--solo .cfvc-waiting,
.cfvc-stage--solo .cfvc-waiting--solo {
  width: 100%;
  height: 100%;
  max-width: none;
  max-height: none;
  aspect-ratio: auto;
  flex: 1;
}

.cfvc-stage--paired {
  align-items: stretch;
  justify-content: stretch;
}

.cfvc-stage--paired.cfvc-stage--portrait {
  align-items: stretch;
  justify-content: stretch;
}

.cfvc-stage--paired .cfvc-tile--main {
  flex: 1;
  min-width: 0;
  min-height: 0;
}

/* Sem câmera remota: tile largo (paisagem), não o retângulo estreito */
.cfvc-tile--main.cfvc-tile--portrait {
  flex: 1;
  width: 100%;
  height: 100%;
  max-height: 100%;
  aspect-ratio: auto;
  border-radius: 20px;
  box-shadow: none;
}

.cfvc-tile--main.cfvc-tile--landscape .cfvc-video {
  object-fit: cover;
}

.cfvc-tile--self {
  position: absolute;
  right: 1.25rem;
  bottom: 1.25rem;
  width: min(240px, 28vw);
  aspect-ratio: 16 / 10;
  border-radius: 14px;
  border: 2px solid #8ab4f8;
  box-shadow: 0 8px 28px rgba(0, 0, 0, 0.45);
  z-index: 3;
  background: #1e1f20;
}

.cfvc-tile--self-guest {
  bottom: 1rem;
}

.cfvc-video {
  width: 100%;
  height: 100%;
  object-fit: cover;
  background: #000;
  transform: scaleX(-1);
  image-rendering: auto;
}

.cfvc-tile--main .cfvc-video {
  transform: none;
  object-fit: cover;
}

.cfvc-avatar {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  background: linear-gradient(160deg, #1a3a3a 0%, #0d1114 55%, #000 100%);
}

.cfvc-avatar-face {
  position: relative;
  z-index: 2;
  width: 5.5rem;
  height: 5.5rem;
  border-radius: 999px;
  display: grid;
  place-items: center;
  background: #5f6368;
  color: #e8eaed;
  font-size: 1.6rem;
  font-weight: 700;
  overflow: hidden;
  box-shadow: 0 0 0 0 transparent;
}

.cfvc-avatar--sm .cfvc-avatar-face {
  width: 3.25rem;
  height: 3.25rem;
  font-size: 0.95rem;
}

.cfvc-avatar-ring {
  position: absolute;
  left: 50%;
  top: 50%;
  width: 5.5rem;
  height: 5.5rem;
  border-radius: 999px;
  transform: translate(-50%, -50%) scale(1);
  pointer-events: none;
  opacity: 0;
  z-index: 1;
  transition: opacity 0.15s ease;
}

.cfvc-avatar--sm .cfvc-avatar-ring {
  width: 3.25rem;
  height: 3.25rem;
}

.cfvc-avatar-ring--inner {
  box-shadow: 0 0 0 3px #8ab4f8;
}

.cfvc-avatar-ring--outer {
  box-shadow: 0 0 0 2px rgba(138, 180, 248, 0.45);
}

.cfvc-avatar--speaking .cfvc-avatar-ring {
  opacity: 1;
}

.cfvc-avatar--speaking .cfvc-avatar-ring--inner {
  transform: translate(-50%, -50%) scale(calc(1 + (var(--cfvc-speak, 0.7) - 0.55) * 0.22));
  transition: transform 70ms linear;
}

.cfvc-avatar--speaking .cfvc-avatar-ring--outer {
  transform: translate(-50%, -50%) scale(calc(1.18 + (var(--cfvc-speak, 0.7) - 0.55) * 0.55));
  opacity: calc(0.35 + (var(--cfvc-speak, 0.7) - 0.55) * 0.7);
  transition: transform 70ms linear, opacity 70ms linear;
}

.cfvc-avatar--speaking .cfvc-avatar-face {
  box-shadow: 0 0 0 3px #8ab4f8;
}

.cfvc-tile--speaking {
  box-shadow: inset 0 0 0 3px #8ab4f8 !important;
}

.cfvc-tile-meta {
  position: absolute;
  left: 0.75rem;
  bottom: 0.75rem;
  display: flex;
  align-items: center;
  gap: 0.35rem;
  max-width: calc(100% - 1.4rem);
}

.cfvc-name {
  padding: 0;
  border-radius: 0;
  background: transparent;
  font-size: 0.82rem;
  font-weight: 500;
  color: #fff;
  text-shadow: 0 1px 4px rgba(0, 0, 0, 0.65);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.cfvc-pill {
  padding: 0.2rem 0.45rem;
  border-radius: 6px;
  background: rgba(32, 33, 36, 0.78);
  font-size: 0.68rem;
  font-weight: 600;
  color: #dadce0;
}

.cfvc-mic-off-badge {
  position: absolute;
  top: 0.85rem;
  right: 0.85rem;
  z-index: 4;
  width: 2rem;
  height: 2rem;
  display: grid;
  place-items: center;
  border-radius: 999px;
  background: rgba(60, 64, 67, 0.92);
  color: #e8eaed;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.35);
}

.cfvc-audio-badge {
  position: absolute;
  top: 0.85rem;
  right: 0.85rem;
  z-index: 4;
  width: 2rem;
  height: 2rem;
  display: grid;
  place-items: center;
  border-radius: 999px;
  background: #8ab4f8;
  color: #202124;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.35);
  transform: scale(var(--cfvc-speak, 1));
  transform-origin: center;
  transition: transform 80ms linear;
}

.cfvc-speak-bars {
  display: inline-flex;
  align-items: flex-end;
  justify-content: center;
  gap: 2px;
  height: 0.85rem;
  width: 0.95rem;
}

.cfvc-speak-bars i {
  display: block;
  width: 2.5px;
  border-radius: 2px;
  background: currentColor;
  height: calc(0.28rem + (var(--cfvc-speak, 1) - 0.55) * 0.55rem);
  animation: cfvc-speak-bounce 0.55s ease-in-out infinite;
  transform-origin: bottom;
}

.cfvc-speak-bars i:nth-child(1) { animation-delay: 0ms; height: calc(0.22rem + (var(--cfvc-speak, 1) - 0.55) * 0.4rem); }
.cfvc-speak-bars i:nth-child(2) { animation-delay: 90ms; }
.cfvc-speak-bars i:nth-child(3) { animation-delay: 180ms; height: calc(0.2rem + (var(--cfvc-speak, 1) - 0.55) * 0.5rem); }

.cfvc-speak-bars--sm {
  height: 0.7rem;
  width: 0.78rem;
  gap: 1.5px;
}

.cfvc-speak-bars--sm i {
  width: 2px;
}

@keyframes cfvc-speak-bounce {
  0%, 100% { transform: scaleY(0.55); }
  50% { transform: scaleY(1); }
}

.cfvc-tile--hand {
  box-shadow: none;
}

/* Pill verde no canto inferior do tile (estilo Meet) */
.cfvc-hand-pill {
  position: absolute;
  left: 0.65rem;
  bottom: 0.65rem;
  z-index: 5;
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  max-width: calc(100% - 1.3rem);
  min-height: 1.85rem;
  padding: 0.2rem 0.7rem 0.2rem 0.25rem;
  border-radius: 999px;
  background: #81c995;
  color: #0d652d;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.28);
  animation: cfvc-hand-pop 0.35s ease-out;
  pointer-events: none;
}

.cfvc-hand-pill-ico {
  width: 1.45rem;
  height: 1.45rem;
  border-radius: 999px;
  display: grid;
  place-items: center;
  background: #137333;
  color: #fff;
  flex-shrink: 0;
}

.cfvc-hand-pill strong {
  font-size: 0.8rem;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  color: #0d652d;
}

.cfvc-hand-pill--self {
  left: 0.4rem;
  bottom: 0.4rem;
  min-height: 1.55rem;
  padding: 0.15rem 0.55rem 0.15rem 0.2rem;
}

.cfvc-hand-pill--self .cfvc-hand-pill-ico {
  width: 1.2rem;
  height: 1.2rem;
}

.cfvc-hand-pill--self strong {
  font-size: 0.68rem;
}

@keyframes cfvc-hand-pop {
  0% { transform: scale(0.6); opacity: 0; }
  70% { transform: scale(1.08); opacity: 1; }
  100% { transform: scale(1); opacity: 1; }
}

.cfvc-waiting {
  width: min(920px, 100%);
  height: min(520px, 100%);
  max-width: 100%;
  max-height: 100%;
  aspect-ratio: 16 / 10;
  display: grid;
  place-content: center;
  gap: 0.65rem;
  text-align: center;
  color: #bdc1c6;
  font-size: 0.95rem;
  padding: 1.5rem;
  background: #1e1f20;
  border-radius: 20px;
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.35);
}

.cfvc-waiting--solo {
  width: 100%;
  height: 100%;
  max-height: 100%;
  aspect-ratio: auto;
  border-radius: 20px;
}

.cfvc-waiting--solo p {
  margin: 0;
}

.cfvc-waiting--error {
  color: #f28b82;
}

.cfvc-hint {
  margin: 0;
  max-width: 28rem;
  color: #fdd663;
  font-size: 0.84rem;
}

.cfvc-retry {
  justify-self: center;
  min-height: 2.4rem;
  padding: 0.4rem 1rem;
  border: 0;
  border-radius: 999px;
  background: #8ab4f8;
  color: #202124;
  font-weight: 700;
  cursor: pointer;
}

.cfvc-spinner {
  width: 2rem;
  height: 2rem;
  margin: 0 auto;
  border-radius: 999px;
  border: 2px solid rgba(232, 234, 237, 0.2);
  border-top-color: #e8eaed;
  animation: cfvc-spin 0.8s linear infinite;
}

@keyframes cfvc-spin {
  to { transform: rotate(360deg); }
}

.cfvc-toasts {
  position: absolute;
  left: 50%;
  bottom: max(5.6rem, calc(env(safe-area-inset-bottom) + 4.85rem));
  transform: translateX(-50%);
  z-index: 28;
  display: flex;
  flex-direction: column-reverse;
  align-items: center;
  gap: 0.45rem;
  width: min(420px, calc(100% - 1.5rem));
  pointer-events: none;
}

.cfvc-toast {
  --cfvc-toast-accent: #8ab4f8;
  --cfvc-toast-icon-bg: rgba(138, 180, 248, 0.18);
  --cfvc-toast-icon-fg: #aecbfa;
  position: relative;
  pointer-events: auto;
  overflow: hidden;
  display: grid;
  grid-template-columns: auto 1fr auto;
  gap: 0.7rem;
  align-items: center;
  width: 100%;
  padding: 0.72rem 0.8rem 0.78rem;
  border-radius: 14px;
  background: rgba(32, 33, 36, 0.94);
  color: #e8eaed;
  border: 1px solid rgba(255, 255, 255, 0.08);
  box-shadow:
    0 10px 28px rgba(0, 0, 0, 0.42),
    0 0 0 1px rgba(0, 0, 0, 0.2);
  backdrop-filter: blur(14px);
  -webkit-backdrop-filter: blur(14px);
}

.cfvc-toast--compact {
  padding-top: 0.78rem;
  padding-bottom: 0.84rem;
}

.cfvc-toast--success {
  --cfvc-toast-accent: #81c995;
  --cfvc-toast-icon-bg: rgba(129, 201, 149, 0.18);
  --cfvc-toast-icon-fg: #81c995;
}

.cfvc-toast--error {
  --cfvc-toast-accent: #f28b82;
  --cfvc-toast-icon-bg: rgba(242, 139, 130, 0.18);
  --cfvc-toast-icon-fg: #f28b82;
}

.cfvc-toast--join,
.cfvc-toast--hand {
  --cfvc-toast-accent: #81c995;
  --cfvc-toast-icon-bg: rgba(129, 201, 149, 0.18);
  --cfvc-toast-icon-fg: #81c995;
}

.cfvc-toast-icon {
  width: 2rem;
  height: 2rem;
  border-radius: 999px;
  display: grid;
  place-items: center;
  background: var(--cfvc-toast-icon-bg);
  color: var(--cfvc-toast-icon-fg);
  flex-shrink: 0;
}

.cfvc-toast-copy {
  display: flex;
  flex-direction: column;
  gap: 0.12rem;
  min-width: 0;
}

.cfvc-toast-copy strong {
  font-size: 0.9rem;
  font-weight: 600;
  line-height: 1.25;
  letter-spacing: -0.01em;
  color: #f1f3f4;
}

.cfvc-toast-copy span {
  font-size: 0.8rem;
  color: #bdc1c6;
  line-height: 1.35;
}

.cfvc-toast-close {
  border: 0;
  background: transparent;
  color: #9aa0a6;
  cursor: pointer;
  width: 1.7rem;
  height: 1.7rem;
  border-radius: 999px;
  display: grid;
  place-items: center;
  padding: 0;
  transition: background 0.15s ease, color 0.15s ease;
}

.cfvc-toast-close:hover {
  background: rgba(255, 255, 255, 0.08);
  color: #e8eaed;
}

.cfvc-toast-progress {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  height: 2px;
  background: var(--cfvc-toast-accent);
  transform-origin: left center;
  animation: cfvc-toast-progress 3.6s linear forwards;
  opacity: 0.85;
}

@keyframes cfvc-toast-progress {
  from { transform: scaleX(1); }
  to { transform: scaleX(0); }
}

.cfvc-toast-enter-active,
.cfvc-toast-leave-active {
  transition: opacity 0.22s ease, transform 0.22s cubic-bezier(0.2, 0.8, 0.2, 1);
}

.cfvc-toast-enter-from,
.cfvc-toast-leave-to {
  opacity: 0;
  transform: translateY(12px) scale(0.96);
}

.cfvc--panel-open .cfvc-toasts {
  left: calc(50% - 190px);
}

@media (max-width: 899px) {
  .cfvc-toasts {
    bottom: max(5.9rem, calc(env(safe-area-inset-bottom) + 5.2rem));
    width: min(100%, calc(100% - 1.2rem));
  }

  .cfvc--panel-open .cfvc-toasts {
    left: 50%;
  }
}

/* —— Chat preview toast (Meet style, bottom-right) —— */

.cfvc-chat-previews {
  position: absolute;
  right: 1.15rem;
  bottom: 5.35rem;
  z-index: 8;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 0.45rem;
  width: min(300px, calc(100% - 2.3rem));
  pointer-events: none;
}

.cfvc-chat-preview {
  pointer-events: auto;
  width: 100%;
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: 0.7rem;
  padding: 0.7rem 0.85rem;
  border: 0;
  border-radius: 18px;
  background: #292a2d;
  color: #e8eaed;
  text-align: left;
  cursor: pointer;
  box-shadow: 0 10px 28px rgba(0, 0, 0, 0.4);
}

.cfvc-chat-preview:hover {
  background: #303134;
}

.cfvc-chat-preview-av {
  width: 2.35rem;
  height: 2.35rem;
  border-radius: 999px;
  display: grid;
  place-items: center;
  background: #8ab4f8;
  color: #202124;
  font-size: 0.72rem;
  font-weight: 700;
  flex-shrink: 0;
}

.cfvc-chat-preview-copy {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 0.12rem;
}

.cfvc-chat-preview-copy strong {
  font-size: 0.88rem;
  font-weight: 600;
  line-height: 1.2;
  color: #e8eaed;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.cfvc-chat-preview-copy em {
  font-style: normal;
  font-size: 0.8rem;
  line-height: 1.25;
  color: #9aa0a6;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.cfvc-chat-preview-reply {
  width: 1.85rem;
  height: 1.85rem;
  display: grid;
  place-items: center;
  color: #8ab4f8;
  flex-shrink: 0;
}

.cfvc-chat-preview-enter-active,
.cfvc-chat-preview-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}

.cfvc-chat-preview-enter-from,
.cfvc-chat-preview-leave-to {
  opacity: 0;
  transform: translateY(10px);
}

@media (min-width: 900px) {
  .cfvc-chat-previews {
    right: 5.5rem;
    bottom: 5.5rem;
  }

  .cfvc--panel-open .cfvc-chat-previews {
    right: calc(380px + 1.25rem);
  }
}

@media (max-width: 899px) {
  .cfvc-chat-previews {
    right: 0.75rem;
    left: 0.75rem;
    width: auto;
    bottom: 5.1rem;
  }
}

/* —— Toolbar (Meet-style floating center) —— */

.cfvc-toolbar {
  position: absolute;
  left: 50%;
  bottom: 1.15rem;
  transform: translateX(-50%);
  z-index: 30;
  display: flex;
  align-items: center;
  gap: 0.55rem;
  padding: 0.55rem 0.7rem;
  border-radius: 999px;
  background: #3c4043;
  border: 0;
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.35);
  transition: left 0.22s ease;
  overflow: visible;
}

.cfvc-btn {
  position: relative;
  width: 3rem;
  height: 3rem;
  border: 0;
  border-radius: 999px;
  display: grid;
  place-items: center;
  background: transparent;
  color: #e8eaed;
  cursor: pointer;
  transition: background 0.15s ease, box-shadow 0.15s ease, color 0.15s ease;
}

.cfvc-btn-badge {
  position: absolute;
  top: -0.1rem;
  right: -0.1rem;
  min-width: 1.05rem;
  height: 1.05rem;
  padding: 0 0.25rem;
  border-radius: 999px;
  background: #ea4335;
  color: #fff;
  font-size: 0.62rem;
  font-weight: 800;
  line-height: 1.05rem;
  text-align: center;
}

.cfvc-btn-dot {
  position: absolute;
  top: 0.35rem;
  right: 0.35rem;
  width: 0.55rem;
  height: 0.55rem;
  border-radius: 999px;
  background: #8ab4f8;
  box-shadow: 0 0 0 2px #3c4043;
}

.cfvc-btn:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.1);
}

.cfvc-btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.cfvc-btn.is-off {
  background: #f2b8b5;
  color: #601410;
  border-radius: 12px;
}

.cfvc-btn.is-active {
  background: #e8eaed;
  color: #202124;
}

.cfvc-btn--hang {
  width: 3.5rem;
  border-radius: 999px;
  background: #ea4335;
  color: #fff;
}

.cfvc-btn--hang:hover {
  background: #d93025;
}

.cfvc-btn--rail {
  width: 3rem;
  height: 3rem;
  background: #3c4043;
}

.cfvc-btn--rail:hover:not(:disabled) {
  background: #5f6368;
}

.cfvc-btn--rail.is-active {
  background: #e8eaed;
  color: #202124;
}

/* —— Side rail (bottom-right, outside toolbar) —— */

.cfvc-side-rail {
  position: absolute;
  right: 1.15rem;
  bottom: 1.15rem;
  z-index: 6;
  display: flex;
  align-items: center;
  gap: 0.65rem;
  transition: right 0.22s ease;
}

.cfvc-ctrl--rail {
  position: relative;
}

.cfvc-menu--rail {
  left: auto;
  right: 0;
  transform: none;
}

/* —— Chat sidebar —— */

.cfvc-chat {
  position: absolute;
  top: 0.85rem;
  right: 0.85rem;
  bottom: 0.85rem;
  z-index: 7;
  width: 360px;
  max-width: calc(100% - 1.7rem);
  display: flex;
  flex-direction: column;
  border-radius: 16px;
  background: #292a2d;
  border: 0;
  box-shadow: none;
  overflow: hidden;
}

.cfvc-chat-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  padding: 1rem 1rem 0.85rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}

.cfvc-chat-head strong {
  font-size: 1rem;
  font-weight: 500;
  color: #e8eaed;
}

.cfvc-chat-close {
  width: 2rem;
  height: 2rem;
  border: 0;
  border-radius: 999px;
  display: grid;
  place-items: center;
  background: transparent;
  color: #e8eaed;
  cursor: pointer;
}

.cfvc-chat-close:hover {
  background: rgba(255, 255, 255, 0.08);
}

.cfvc-chat-list {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.65rem;
}

.cfvc-chat-empty {
  margin: auto;
  color: #9aa0a6;
  font-size: 0.88rem;
  text-align: center;
  max-width: 14rem;
  line-height: 1.4;
}

.cfvc-chat-bubble {
  align-self: flex-start;
  max-width: 88%;
  padding: 0.5rem 0.7rem;
  border-radius: 12px;
  background: #3c4043;
}

.cfvc-chat-bubble--mine {
  align-self: flex-end;
  background: #174ea6;
}

.cfvc-chat-from {
  display: block;
  margin-bottom: 0.15rem;
  font-size: 0.68rem;
  font-weight: 700;
  color: #bdc1c6;
}

.cfvc-chat-bubble p {
  margin: 0;
  font-size: 0.86rem;
  line-height: 1.35;
  word-break: break-word;
}

.cfvc-chat-form {
  display: flex;
  gap: 0.45rem;
  padding: 0.75rem 1rem 1rem;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
}

.cfvc-chat-input {
  flex: 1;
  min-width: 0;
  min-height: 2.5rem;
  padding: 0.5rem 0.85rem;
  border: 0;
  border-radius: 999px;
  background: #3c4043;
  color: #e8eaed;
  font-size: 0.88rem;
  outline: none;
}

.cfvc-chat-input::placeholder {
  color: #9aa0a6;
}

.cfvc-chat-send {
  width: 2.5rem;
  height: 2.5rem;
  border: 0;
  border-radius: 999px;
  display: grid;
  place-items: center;
  background: #8ab4f8;
  color: #202124;
  cursor: pointer;
}

.cfvc-chat-send:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.cfvc-chat-enter-active,
.cfvc-chat-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}

.cfvc-chat-enter-from,
.cfvc-chat-leave-to {
  opacity: 0;
  transform: translateX(12px);
}

/* —— Desktop Meet layout (≥900px) —— */

@media (min-width: 900px) {
  /* Mesmo tamanho; centraliza com chat fechado, desloca com chat aberto */
  .cfvc-stage {
    top: 2.75rem;
    left: 50%;
    right: auto;
    bottom: 5.5rem;
    width: min(1100px, calc(100% - 7.5rem));
    height: auto;
    padding: 0;
    transform: translateX(-50%);
  }

  .cfvc--panel-open .cfvc-stage {
    left: calc(50% - 190px);
    width: min(1100px, calc(100% - 420px));
    transform: translateX(-50%);
  }

  .cfvc--guest .cfvc-stage {
    top: 2.25rem;
    bottom: 1.25rem;
    left: 50%;
    width: min(1100px, calc(100% - 4rem));
    transform: translateX(-50%);
  }

  .cfvc--guest.cfvc--panel-open .cfvc-stage {
    left: calc(50% - 190px);
    width: min(1100px, calc(100% - 420px));
  }

  .cfvc-side-rail {
    right: 1.25rem;
    bottom: 1.1rem;
  }

  .cfvc--panel-open .cfvc-side-rail {
    right: 380px;
  }

  .cfvc-toolbar {
    left: 50%;
    bottom: 1.1rem;
    transform: translateX(-50%);
  }

  .cfvc--panel-open .cfvc-toolbar {
    left: calc((100% - 360px) / 2);
    transform: translateX(-50%);
  }

  .cfvc-stage--paired .cfvc-tile--main.cfvc-tile--landscape,
  .cfvc-stage--paired .cfvc-tile--main.cfvc-tile--portrait {
    width: 100%;
    height: 100%;
    aspect-ratio: auto;
    border-radius: 20px;
  }

  .cfvc-stage--paired .cfvc-tile--main.cfvc-tile--landscape .cfvc-video {
    object-fit: contain;
    background: #000;
  }

  .cfvc-waiting {
    width: 100%;
    height: 100%;
    max-height: 100%;
    aspect-ratio: auto;
    border-radius: 20px;
    background: #1e1f20;
  }

  .cfvc-waiting--solo {
    width: 100%;
    height: 100%;
    aspect-ratio: auto;
  }

  .cfvc-tile--self:not(.cfvc-tile--self-main) {
    right: 1.35rem;
    bottom: 1.15rem;
    width: min(280px, 24vw);
    aspect-ratio: 16 / 10;
    border-radius: 14px;
    border: 2px solid #8ab4f8;
  }

  .cfvc-chat {
    top: 0.85rem;
    right: 0.85rem;
    bottom: 0.85rem;
    width: 360px;
    border-radius: 24px;
  }

  .cfvc-btn--chat-bar {
    display: none;
  }
}

@media (min-width: 1280px) {
  .cfvc-stage {
    top: 3rem;
    bottom: 5.75rem;
    width: min(1240px, calc(100% - 9rem));
  }

  .cfvc--panel-open .cfvc-stage {
    left: calc(50% - 200px);
    width: min(1240px, calc(100% - 460px));
  }

  .cfvc--guest .cfvc-stage {
    width: min(1240px, calc(100% - 5rem));
  }

  .cfvc--guest.cfvc--panel-open .cfvc-stage {
    left: calc(50% - 200px);
    width: min(1240px, calc(100% - 460px));
  }

  .cfvc--panel-open .cfvc-side-rail {
    right: 400px;
  }

  .cfvc--panel-open .cfvc-toolbar {
    left: calc((100% - 380px) / 2);
  }

  .cfvc-tile--self:not(.cfvc-tile--self-main) {
    width: min(300px, 22vw);
  }
}

@media (max-width: 899px) {
  .cfvc-stage {
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    padding:
      max(3.6rem, calc(env(safe-area-inset-top) + 2.85rem))
      0.7rem
      max(5.85rem, calc(env(safe-area-inset-bottom) + 5.1rem));
    align-items: stretch;
    justify-content: flex-start;
    gap: 0.55rem;
    flex-direction: column;
  }

  .cfvc--guest .cfvc-stage {
    padding-bottom: max(5.85rem, calc(env(safe-area-inset-bottom) + 5.1rem));
  }

  .cfvc--panel-open .cfvc-stage {
    right: 0;
  }

  .cfvc-stage--paired {
    align-items: stretch;
    justify-content: flex-start;
  }

  .cfvc-stage--paired .cfvc-tile--main.cfvc-tile--landscape,
  .cfvc-stage--paired .cfvc-tile--main.cfvc-tile--portrait {
    position: relative;
    width: 100%;
    height: auto;
    flex: 1 1 0;
    min-height: 0;
    max-height: none;
    aspect-ratio: auto;
    border-radius: 18px;
    box-shadow: none;
  }

  .cfvc-stage--paired .cfvc-tile--main .cfvc-hand-pill {
    left: 0.7rem;
    bottom: 0.7rem;
  }

  .cfvc-waiting,
  .cfvc-waiting--solo {
    width: 100%;
    height: 100%;
    min-height: 0;
    flex: 1;
    aspect-ratio: auto;
    border-radius: 18px;
  }

  .cfvc-avatar {
    background: #1e1f20;
  }

  .cfvc-avatar-face {
    width: min(34vw, 7.5rem);
    height: min(34vw, 7.5rem);
    font-size: 2rem;
    background: #5f6368;
  }

  .cfvc-avatar-ring {
    width: min(34vw, 7.5rem);
    height: min(34vw, 7.5rem);
  }

  .cfvc-avatar--sm .cfvc-avatar-face {
    width: 3.25rem;
    height: 3.25rem;
    font-size: 0.95rem;
  }

  .cfvc-avatar--sm .cfvc-avatar-ring {
    width: 3.25rem;
    height: 3.25rem;
  }

  .cfvc-tile-meta--m {
    left: 0.65rem;
    bottom: 0.65rem;
    max-width: calc(100% - 1.3rem);
  }

  .cfvc-tile-meta--m .cfvc-name {
    display: inline-flex;
    align-items: center;
    gap: 0.3rem;
    padding: 0.32rem 0.65rem;
    border-radius: 999px;
    background: rgba(32, 33, 36, 0.82);
    font-size: 0.8rem;
    font-weight: 500;
    text-shadow: none;
  }

  .cfvc-name-wave,
  .cfvc-name-mic {
    display: inline-grid;
    place-items: center;
    width: 1.15rem;
    height: 1.15rem;
    border-radius: 999px;
    flex-shrink: 0;
  }

  .cfvc-name-wave {
    background: #8ab4f8;
    color: #202124;
  }

  .cfvc-name-wave.is-speaking {
    transform: scale(var(--cfvc-speak, 1));
    transition: transform 80ms linear;
  }

  .cfvc-name-wave .cfvc-speak-bars {
    color: #202124;
  }

  .cfvc-name-mic {
    background: transparent;
    color: #e8eaed;
  }

  /* No mobile a mão levantada fica na pill inferior (cfvc-m-raise), não no topo */
  .cfvc-hand-pill {
    left: 0.7rem;
    bottom: 0.7rem;
  }

  .cfvc-hand-pill--self {
    display: none;
  }

  .cfvc-tile--self:not(.cfvc-tile--self-main) {
    width: min(30vw, 118px);
    right: 0.75rem;
    bottom: max(5.7rem, calc(env(safe-area-inset-bottom) + 4.95rem));
    aspect-ratio: 3 / 4;
    border-radius: 14px;
    border: 0;
    overflow: hidden;
  }

  .cfvc--guest .cfvc-tile--self:not(.cfvc-tile--self-main) {
    bottom: max(5.7rem, calc(env(safe-area-inset-bottom) + 4.95rem));
  }

  .cfvc-audio-badge--self {
    top: 0.45rem;
    right: 0.45rem;
    width: 1.45rem;
    height: 1.45rem;
  }

  .cfvc-self-tools {
    position: absolute;
    left: 0.35rem;
    right: 0.35rem;
    bottom: 0.35rem;
    z-index: 4;
    display: flex;
    align-items: center;
    justify-content: space-between;
    pointer-events: none;
  }

  .cfvc-self-tool {
    pointer-events: auto;
    width: 1.85rem;
    height: 1.85rem;
    border: 0;
    border-radius: 999px;
    display: grid;
    place-items: center;
    background: rgba(32, 33, 36, 0.82);
    color: #e8eaed;
    cursor: pointer;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.35);
  }

  .cfvc-self-tool.is-on {
    background: #8ab4f8;
    color: #202124;
  }

  .cfvc-self-tool:disabled {
    opacity: 0.4;
  }

  .cfvc-m-top {
    position: absolute;
    top: max(0.55rem, env(safe-area-inset-top));
    left: 0.7rem;
    right: 0.7rem;
    z-index: 12;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.5rem;
  }

  .cfvc-m-top-left {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    min-width: 0;
    flex: 1;
  }

  .cfvc-m-people-pill {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    min-height: 2.15rem;
    padding: 0.2rem 0.65rem 0.2rem 0.25rem;
    border-radius: 999px;
    background: rgba(32, 33, 36, 0.88);
    color: #e8eaed;
    max-width: 100%;
  }

  .cfvc-m-people-av {
    width: 1.55rem;
    height: 1.55rem;
    border-radius: 999px;
    display: grid;
    place-items: center;
    background: #8ab4f8;
    color: #202124;
    font-size: 0.58rem;
    font-weight: 700;
    flex-shrink: 0;
    margin-left: -0.35rem;
    border: 1.5px solid #292a2d;
  }

  .cfvc-m-people-av:first-child {
    margin-left: 0;
  }

  .cfvc-m-people-pill strong {
    font-size: 0.8rem;
    font-weight: 500;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .cfvc-m-top-actions {
    display: flex;
    align-items: center;
    gap: 0.15rem;
    flex-shrink: 0;
  }

  .cfvc-m-icon {
    width: 2.4rem;
    height: 2.4rem;
    border: 0;
    border-radius: 999px;
    display: grid;
    place-items: center;
    background: rgba(32, 33, 36, 0.82);
    color: #e8eaed;
    cursor: pointer;
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.35);
  }

  .cfvc-m-icon.is-off {
    color: #f28b82;
  }

  .cfvc-m-icon:disabled {
    opacity: 0.4;
  }

  .cfvc-lobby-pop {
    top: 4rem;
    right: 0.65rem;
    left: 0.65rem;
    width: auto;
  }

  .cfvc-chat {
    top: auto;
    right: 0.65rem;
    bottom: 5.6rem;
    left: 0.65rem;
    width: auto;
    height: min(52vh, 420px);
    border-radius: 18px;
  }

  .cfvc-chat-enter-from,
  .cfvc-chat-leave-to {
    transform: translateY(10px);
  }

  .cfvc-side-rail {
    display: none;
  }

  .cfvc-toolbar--mobile,
  .cfvc-toolbar {
    left: 50%;
    right: auto;
    transform: translateX(-50%);
    bottom: max(0.85rem, calc(env(safe-area-inset-bottom) + 0.35rem));
    gap: 0.45rem;
    max-width: calc(100% - 1.4rem);
    width: auto;
    padding: 0.5rem 0.65rem;
    border-radius: 999px;
    background: #3c4043;
    overflow: visible;
    box-shadow: 0 8px 28px rgba(0, 0, 0, 0.4);
    z-index: 30;
  }

  .cfvc-toolbar--mobile .cfvc-btn {
    width: 2.75rem;
    height: 2.75rem;
    flex-shrink: 0;
  }

  .cfvc-toolbar--mobile .cfvc-btn-group {
    height: 2.75rem;
    background: transparent;
  }

  .cfvc-toolbar--mobile .cfvc-btn--split-main {
    width: 2.35rem;
    height: 2.75rem;
  }

  .cfvc-toolbar--mobile .cfvc-btn--caret {
    width: 1.25rem;
    height: 2.75rem;
  }

  .cfvc-toolbar--mobile .cfvc-btn.is-active {
    background: #aecbfa;
    color: #041e49;
    border-radius: 14px;
  }

  .cfvc-toolbar--mobile .cfvc-btn--hang {
    width: 3.2rem;
    background: #ea4335;
    color: #fff;
  }

  .cfvc-toolbar--mobile .cfvc-menu,
  .cfvc-toolbar--mobile .cfvc-reactions-bar {
    z-index: 60;
  }

  .cfvc-reactions-bar--m {
    left: 50%;
    bottom: calc(100% + 0.75rem);
    transform: translateX(-50%);
    gap: 0.15rem;
    padding: 0.45rem 0.55rem;
    width: max-content;
    max-width: calc(100vw - 1.5rem);
  }

  .cfvc-ctrl {
    flex-shrink: 0;
    overflow: visible;
  }
}

/* —— Controls / overlays —— */

/* Desfoque real é aplicado no track (MediaPipe) — não embaçar a pessoa via CSS. */
.cfvc-tile--bg-fx .cfvc-video {
  filter: none;
}

.cfvc-reactions-float {
  position: absolute;
  inset: 0;
  z-index: 4;
  pointer-events: none;
  overflow: hidden;
}

.cfvc-reaction-emoji {
  position: absolute;
  bottom: 18%;
  font-size: 2rem;
  line-height: 1;
  animation: cfvc-float-up 2.5s ease-out forwards;
  filter: drop-shadow(0 4px 10px rgba(0, 0, 0, 0.35));
}

@keyframes cfvc-float-up {
  0% {
    opacity: 0;
    transform: translateY(24px) scale(0.7);
  }
  12% {
    opacity: 1;
    transform: translateY(0) scale(1.05);
  }
  100% {
    opacity: 0;
    transform: translateY(-140px) scale(1);
  }
}

.cfvc-ctrl {
  position: relative;
  z-index: 1;
  overflow: visible;
}

.cfvc-ctrl:has(.cfvc-menu),
.cfvc-ctrl:has(.cfvc-reactions-bar) {
  z-index: 40;
}

.cfvc-btn-group {
  display: flex;
  align-items: stretch;
  border-radius: 999px;
  overflow: hidden;
  background: transparent;
}

.cfvc-btn-group .cfvc-btn {
  background: transparent;
  border-radius: 0;
}

.cfvc-btn--split-main {
  width: 2.65rem;
}

.cfvc-btn--caret {
  width: 1.4rem;
  height: 3rem;
  border-left: 1px solid rgba(255, 255, 255, 0.12);
  opacity: 0.9;
}

.cfvc-btn--caret.is-open,
.cfvc-btn.is-open {
  background: rgba(255, 255, 255, 0.14);
}

.cfvc-btn-group:hover .cfvc-btn:not(:disabled) {
  background: rgba(255, 255, 255, 0.06);
}

.cfvc-btn-group .cfvc-btn.is-off {
  background: #f2b8b5;
  color: #601410;
  border-radius: 10px;
}

.cfvc-btn-group .cfvc-btn.is-active {
  background: #e8eaed;
  color: #202124;
}

.cfvc-menu {
  position: absolute;
  left: 50%;
  bottom: calc(100% + 0.65rem);
  transform: translateX(-50%);
  z-index: 50;
  min-width: 13.5rem;
  padding: 0.4rem;
  border-radius: 12px;
  background: #292a2d;
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: 0 14px 36px rgba(0, 0, 0, 0.45);
  color: #e8eaed;
  pointer-events: auto;
}

.cfvc-menu--toolbar {
  z-index: 50;
}

.cfvc-menu--security {
  min-width: 17.5rem;
  max-width: min(20rem, calc(100vw - 2rem));
  left: auto;
  right: 0;
  transform: none;
}

.cfvc-menu-title {
  padding: 0.45rem 0.55rem 0.2rem;
  font-size: 0.88rem;
  font-weight: 700;
}

.cfvc-menu-desc {
  margin: 0;
  padding: 0.15rem 0.55rem 0.55rem;
  font-size: 0.75rem;
  line-height: 1.4;
  color: #9aa0a6;
}

.cfvc-menu-label {
  padding: 0.35rem 0.55rem 0.2rem;
  font-size: 0.68rem;
  font-weight: 700;
  letter-spacing: 0.02em;
  text-transform: uppercase;
  color: #9aa0a6;
}

.cfvc-menu-hint {
  margin: 0;
  padding: 0.35rem 0.55rem 0.5rem;
  font-size: 0.75rem;
  color: #9aa0a6;
}

.cfvc-menu-row {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: flex-start;
  gap: 0.65rem;
  padding: 0.55rem 0.6rem;
  border: 0;
  border-radius: 8px;
  background: transparent;
  color: inherit;
  font-size: 0.86rem;
  font-weight: 600;
  text-align: left;
  cursor: pointer;
}

.cfvc-menu--more {
  min-width: 250px;
  right: 0;
  left: auto;
}

.cfvc-menu--more-host {
  min-width: 19.5rem;
  max-height: min(70vh, 32rem);
  overflow-y: auto;
  padding-top: 0.35rem;
}

.cfvc-menu-user {
  display: flex;
  align-items: center;
  gap: 0.55rem;
  padding: 0.45rem 0.6rem 0.65rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  margin-bottom: 0.25rem;
}

.cfvc-menu-user-avatar {
  width: 1.75rem;
  height: 1.75rem;
  border-radius: 999px;
  background: #8ab4f8;
  color: #202124;
  display: grid;
  place-items: center;
  font-size: 0.72rem;
  font-weight: 800;
}

.cfvc-menu-user-name {
  font-size: 0.88rem;
  font-weight: 600;
  color: #e8eaed;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.cfvc-menu-divider {
  height: 1px;
  margin: 0.25rem 0.35rem;
  background: rgba(255, 255, 255, 0.1);
}

.cfvc-menu-row svg {
  flex-shrink: 0;
  opacity: 0.92;
}

.cfvc-menu-row .cfvc-switch {
  margin-left: auto;
}

.cfvc--compact .cfvc-side-rail {
  display: none;
}

.cfvc--compact.cfvc--panel-open .cfvc-stage {
  right: 0;
}

.cfvc-stats-panel,
.cfvc-shortcuts-panel {
  position: relative;
  z-index: 1;
  width: min(420px, calc(100vw - 2rem));
  max-height: min(70vh, 28rem);
  overflow: auto;
  border-radius: 12px;
  background: #292a2d;
  color: #e8eaed;
  box-shadow: 0 16px 48px rgba(0, 0, 0, 0.45);
}

.cfvc-stats-list,
.cfvc-shortcuts-list {
  list-style: none;
  margin: 0;
  padding: 0.35rem 0.85rem 1rem;
}

.cfvc-stats-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 0.35rem 0.75rem;
  padding: 0.65rem 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}

.cfvc-stats-row:last-child {
  border-bottom: 0;
}

.cfvc-stats-name {
  font-size: 0.9rem;
  font-weight: 600;
}

.cfvc-stats-name em {
  font-style: normal;
  color: #9aa0a6;
  font-weight: 500;
  margin-left: 0.25rem;
}

.cfvc-stats-meta {
  font-size: 0.75rem;
  color: #9aa0a6;
  align-self: center;
}

.cfvc-stats-speaking {
  color: #81c995;
}

.cfvc-stats-muted {
  color: #f2b8b5;
}

.cfvc-stats-meter {
  grid-column: 1 / -1;
  display: flex;
  gap: 3px;
  height: 8px;
}

.cfvc-stats-bar {
  flex: 1;
  border-radius: 2px;
  background: #5f6368;
  opacity: 0.35;
}

.cfvc-stats-bar.is-on {
  background: #81c995;
  opacity: 1;
}

.cfvc-shortcuts-list li {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.55rem 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  font-size: 0.88rem;
}

.cfvc-shortcuts-list li:last-child {
  border-bottom: 0;
}

.cfvc-shortcuts-list kbd {
  min-width: 2rem;
  padding: 0.2rem 0.45rem;
  border-radius: 6px;
  background: #3c4043;
  border: 1px solid #5f6368;
  font-size: 0.78rem;
  font-family: inherit;
  text-align: center;
}

.cfvc-menu-row:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.08);
}

.cfvc-menu-row.is-selected {
  background: rgba(138, 180, 248, 0.18);
}

.cfvc-menu-row:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.cfvc-switch {
  flex-shrink: 0;
  width: 2.1rem;
  height: 1.2rem;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.18);
  position: relative;
  transition: background 0.15s ease;
}

.cfvc-switch::after {
  content: '';
  position: absolute;
  top: 0.15rem;
  left: 0.15rem;
  width: 0.9rem;
  height: 0.9rem;
  border-radius: 999px;
  background: #fff;
  transition: transform 0.15s ease;
}

.cfvc-switch.is-on {
  background: #8ab4f8;
}

.cfvc-switch.is-on::after {
  transform: translateX(0.9rem);
}

.cfvc-reactions-bar {
  position: absolute;
  left: 50%;
  bottom: calc(100% + 0.65rem);
  transform: translateX(-50%);
  z-index: 50;
  display: flex;
  align-items: center;
  gap: 0.2rem;
  padding: 0.4rem 0.5rem;
  border-radius: 999px;
  background: #292a2d;
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: 0 14px 36px rgba(0, 0, 0, 0.45);
  pointer-events: auto;
}

.cfvc-reaction-btn {
  width: 2.2rem;
  height: 2.2rem;
  border: 0;
  border-radius: 999px;
  background: transparent;
  font-size: 1.2rem;
  line-height: 1;
  cursor: pointer;
  transition: background 0.12s ease, transform 0.12s ease;
}

.cfvc-reaction-btn:hover {
  background: rgba(255, 255, 255, 0.1);
  transform: scale(1.12);
}

/* —— Top bar / lobby Meet —— */

.cfvc-topbar {
  position: absolute;
  top: 0.85rem;
  left: 1rem;
  right: 1rem;
  z-index: 9;
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
  gap: 0.75rem;
  pointer-events: none;
}

.cfvc-topbar-left,
.cfvc-topbar-right {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  pointer-events: auto;
}

.cfvc-topbar-right {
  justify-content: flex-end;
}

.cfvc-topbar-center {
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: none;
  min-width: 0;
}

/* Pill verde no topo (desktop Meet) */
.cfvc-raise-top,
.cfvc-m-raise {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  max-width: min(360px, 70vw);
  min-height: 2.35rem;
  padding: 0.25rem 0.9rem 0.25rem 0.3rem;
  border-radius: 999px;
  background: #81c995;
  color: #0d652d;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.28);
  animation: cfvc-hand-pop 0.35s ease-out;
  pointer-events: none;
}

.cfvc-raise-top-ico {
  width: 1.7rem;
  height: 1.7rem;
  border-radius: 999px;
  display: grid;
  place-items: center;
  background: #137333;
  color: #fff;
  flex-shrink: 0;
}

.cfvc-raise-top strong,
.cfvc-m-raise strong {
  font-size: 0.9rem;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  color: #0d652d;
}

.cfvc-m-raise {
  position: absolute;
  left: 50%;
  bottom: max(5.85rem, calc(env(safe-area-inset-bottom) + 5.15rem));
  transform: translateX(-50%);
  z-index: 14;
  max-width: calc(100% - 1.5rem);
}

.cfvc-timer,
.cfvc-room-code {
  color: #e8eaed;
  font-size: 0.88rem;
  font-weight: 400;
  text-shadow: 0 1px 4px rgba(0, 0, 0, 0.45);
}

.cfvc-topbar-sep {
  color: rgba(232, 234, 237, 0.55);
  font-size: 0.88rem;
}

.cfvc-topbar-info {
  color: rgba(232, 234, 237, 0.7);
  flex-shrink: 0;
}

.cfvc-room-code {
  opacity: 0.85;
  font-weight: 400;
}

.cfvc-admit-pill {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  min-height: 2.35rem;
  padding: 0.45rem 0.95rem;
  border: 0;
  border-radius: 999px;
  background: #1e8e3e;
  color: #fff;
  font-size: 0.86rem;
  font-weight: 600;
  cursor: pointer;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.28);
}

.cfvc-admit-pill:hover {
  background: #188038;
}

.cfvc-top-avatar {
  position: relative;
  width: 2.35rem;
  height: 2.35rem;
  border: 0;
  border-radius: 999px;
  background: #8ab4f8;
  color: #202124;
  font-size: 0.72rem;
  font-weight: 700;
  cursor: pointer;
  display: grid;
  place-items: center;
}

.cfvc-top-avatar.is-active {
  outline: 2px solid #e8eaed;
  outline-offset: 2px;
}

.cfvc-top-avatar em {
  position: absolute;
  right: -0.2rem;
  bottom: -0.15rem;
  min-width: 1rem;
  height: 1rem;
  padding: 0 0.2rem;
  border-radius: 999px;
  background: #3c4043;
  color: #e8eaed;
  font-size: 0.62rem;
  font-style: normal;
  font-weight: 700;
  line-height: 1rem;
  text-align: center;
  border: 1px solid #202124;
}

.cfvc-lobby-pop {
  position: absolute;
  top: 3.6rem;
  right: 1rem;
  z-index: 10;
  width: min(320px, calc(100% - 2rem));
  padding: 0.85rem;
  border-radius: 18px;
  background: #2d2e31;
  color: #e8eaed;
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.45);
}

.cfvc-lobby-pop-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.5rem;
  margin-bottom: 0.7rem;
}

.cfvc-lobby-pop-head strong {
  font-size: 0.95rem;
  font-weight: 500;
}

.cfvc-lobby-pop-badge {
  flex-shrink: 0;
  padding: 0.2rem 0.5rem;
  border-radius: 999px;
  background: #3c4043;
  color: #bdc1c6;
  font-size: 0.62rem;
  font-weight: 500;
  white-space: nowrap;
}

.cfvc-lobby-pop-actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.5rem;
  margin-bottom: 0.7rem;
}

.cfvc-lobby-outline {
  min-height: 2.2rem;
  border: 1px solid rgba(255, 255, 255, 0.28);
  border-radius: 999px;
  background: transparent;
  color: #e8eaed;
  font-size: 0.84rem;
  font-weight: 500;
  cursor: pointer;
}

.cfvc-lobby-outline:hover {
  background: rgba(255, 255, 255, 0.06);
}

.cfvc-lobby-pop-card {
  display: flex;
  align-items: center;
  gap: 0.7rem;
  padding: 0.7rem 0.75rem;
  border-radius: 14px;
  background: #3c4043;
  margin-bottom: 0.55rem;
}

.cfvc-lobby-pop-av,
.cfvc-people-av {
  width: 2.35rem;
  height: 2.35rem;
  border-radius: 999px;
  display: grid;
  place-items: center;
  background: #a142f4;
  color: #fff;
  font-size: 0.85rem;
  font-weight: 700;
  flex-shrink: 0;
}

.cfvc-lobby-pop-card-copy,
.cfvc-people-copy {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 0.1rem;
}

.cfvc-lobby-pop-card-copy strong,
.cfvc-people-copy strong {
  font-size: 0.86rem;
  font-weight: 600;
}

.cfvc-lobby-pop-card-copy span,
.cfvc-people-copy span {
  font-size: 0.75rem;
  color: #9aa0a6;
}

.cfvc-lobby-pop-more {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.2rem;
  width: 100%;
  border: 0;
  background: transparent;
  color: #8ab4f8;
  font-size: 0.82rem;
  font-weight: 500;
  cursor: pointer;
  padding: 0.25rem;
}

.cfvc-lobby-pop-more:hover {
  text-decoration: underline;
}

.cfvc-lobby-pop-enter-active,
.cfvc-lobby-pop-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}

.cfvc-lobby-pop-enter-from,
.cfvc-lobby-pop-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}

.cfvc-people-body {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 0.75rem 1rem 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
}

.cfvc-people-section {
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 14px;
  padding: 0.7rem 0.75rem;
}

.cfvc-people-section--security {
  border: 0;
  padding: 0;
}

.cfvc-people-section-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.55rem;
  color: #9aa0a6;
  font-size: 0.72rem;
  font-weight: 600;
  text-transform: none;
}

.cfvc-people-row {
  display: flex;
  align-items: center;
  gap: 0.55rem;
  padding: 0.35rem 0;
}

.cfvc-people-copy {
  flex: 1;
}

.cfvc-people-link {
  border: 0;
  background: transparent;
  color: #8ab4f8;
  font-size: 0.82rem;
  font-weight: 600;
  cursor: pointer;
  padding: 0.2rem 0.15rem;
  white-space: nowrap;
}

.cfvc-people-link:hover {
  text-decoration: underline;
}

.cfvc-people-deny {
  width: 1.85rem;
  height: 1.85rem;
  border: 0;
  border-radius: 999px;
  display: grid;
  place-items: center;
  background: transparent;
  color: #f28b82;
  cursor: pointer;
}

.cfvc-people-deny:hover {
  background: rgba(242, 139, 130, 0.12);
}

@media (min-width: 900px) {
  .cfvc-lobby-pop {
    right: 1rem;
  }

  .cfvc--panel-open .cfvc-lobby-pop {
    right: 380px;
  }
}

/* —— Mobile Meet bottom sheet —— */

.cfvc-sheet-root {
  position: absolute;
  inset: 0;
  z-index: 20;
  display: flex;
  align-items: flex-end;
  justify-content: center;
}

.cfvc-sheet-scrim {
  position: absolute;
  inset: 0;
  border: 0;
  background: rgba(0, 0, 0, 0.45);
  cursor: pointer;
}

.cfvc-sheet {
  position: relative;
  z-index: 1;
  width: 100%;
  max-height: min(78vh, 640px);
  overflow-y: auto;
  padding: 0.55rem 1rem calc(1.15rem + env(safe-area-inset-bottom));
  border-radius: 28px 28px 0 0;
  background: #292a2d;
  color: #e8eaed;
  box-shadow: 0 -12px 40px rgba(0, 0, 0, 0.4);
}

.cfvc-sheet-handle {
  width: 2.4rem;
  height: 0.28rem;
  margin: 0.15rem auto 0.95rem;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.28);
}

.cfvc-sheet-wide {
  width: 100%;
  min-height: 3.4rem;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.55rem;
  margin-bottom: 0.65rem;
  border: 0;
  border-radius: 18px;
  background: #3c4043;
  color: #e8eaed;
  font-size: 0.95rem;
  font-weight: 500;
  cursor: pointer;
}

.cfvc-sheet-wide.is-active {
  background: #aecbfa;
  color: #041e49;
}

.cfvc-sheet-wide--hang {
  background: #ea4335;
  color: #fff;
}

.cfvc-sheet-wide--hang:hover {
  background: #d93025;
}

.cfvc-sheet-row3 {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.55rem;
  margin-bottom: 0.65rem;
}

.cfvc-sheet-tile {
  min-height: 3.6rem;
  border: 0;
  border-radius: 18px;
  display: grid;
  place-items: center;
  background: #3c4043;
  color: #e8eaed;
  cursor: pointer;
}

.cfvc-sheet-tile.is-active {
  background: #aecbfa;
  color: #041e49;
}

.cfvc-sheet-tile.is-off {
  background: #f2b8b5;
  color: #601410;
}

.cfvc-sheet-row2 {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.55rem;
  margin-bottom: 0.65rem;
}

.cfvc-sheet-card {
  position: relative;
  min-height: 4.4rem;
  padding: 0.75rem;
  border: 0;
  border-radius: 18px;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.55rem;
  background: #3c4043;
  color: #e8eaed;
  text-align: left;
  font-size: 0.82rem;
  font-weight: 500;
  cursor: pointer;
}

.cfvc-sheet-card em {
  position: absolute;
  top: 0.55rem;
  right: 0.55rem;
  min-width: 1.15rem;
  height: 1.15rem;
  padding: 0 0.25rem;
  border-radius: 999px;
  background: #ea4335;
  color: #fff;
  font-size: 0.68rem;
  font-style: normal;
  font-weight: 700;
  line-height: 1.15rem;
  text-align: center;
}

.cfvc-sheet-enter-active,
.cfvc-sheet-leave-active {
  transition: opacity 0.2s ease;
}

.cfvc-sheet-enter-active .cfvc-sheet,
.cfvc-sheet-leave-active .cfvc-sheet {
  transition: transform 0.22s ease;
}

.cfvc-sheet-enter-from,
.cfvc-sheet-leave-to {
  opacity: 0;
}

.cfvc-sheet-enter-from .cfvc-sheet,
.cfvc-sheet-leave-to .cfvc-sheet {
  transform: translateY(24px);
}

/* —— Planos de fundo e efeitos —— */

.cfvc-fx-root {
  position: absolute;
  inset: 0;
  z-index: 40;
  display: grid;
  place-items: end center;
  pointer-events: none;
}

.cfvc-fx-scrim {
  position: absolute;
  inset: 0;
  border: 0;
  background: rgba(0, 0, 0, 0.45);
  pointer-events: auto;
  cursor: pointer;
}

.cfvc-fx-panel {
  position: relative;
  z-index: 1;
  pointer-events: auto;
  width: min(440px, calc(100% - 1.2rem));
  max-height: min(78vh, 640px);
  margin-bottom: max(5.4rem, calc(env(safe-area-inset-bottom) + 4.6rem));
  overflow: auto;
  border-radius: 18px;
  background: #292a2d;
  color: #e8eaed;
  box-shadow: 0 18px 48px rgba(0, 0, 0, 0.5);
  padding: 0.85rem 0.95rem 1.1rem;
}

.cfvc-fx-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  margin-bottom: 0.75rem;
}

.cfvc-fx-head strong {
  font-size: 1rem;
  font-weight: 600;
}

.cfvc-fx-close {
  width: 2rem;
  height: 2rem;
  border: 0;
  border-radius: 999px;
  display: grid;
  place-items: center;
  background: transparent;
  color: #bdc1c6;
  cursor: pointer;
}

.cfvc-fx-close:hover {
  background: rgba(255, 255, 255, 0.08);
  color: #fff;
}

.cfvc-fx-preview {
  min-height: 4.5rem;
  display: grid;
  place-items: center;
  padding: 0.85rem 1rem;
  margin-bottom: 0.9rem;
  border-radius: 12px;
  background: #1e1f20;
  color: #bdc1c6;
  font-size: 0.84rem;
  text-align: center;
  line-height: 1.4;
}

.cfvc-fx-preview p,
.cfvc-fx-preview-note {
  margin: 0;
}

.cfvc-fx-section {
  margin-bottom: 0.95rem;
}

.cfvc-fx-section h4 {
  margin: 0 0 0.55rem;
  font-size: 0.78rem;
  font-weight: 600;
  color: #9aa0a6;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.cfvc-fx-row {
  display: flex;
  flex-wrap: wrap;
  gap: 0.45rem;
}

.cfvc-fx-chip {
  min-height: 2.2rem;
  padding: 0.35rem 0.85rem;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 999px;
  background: #3c4043;
  color: #e8eaed;
  font-size: 0.84rem;
  font-weight: 500;
  cursor: pointer;
}

.cfvc-fx-chip.is-on {
  border-color: #8ab4f8;
  background: rgba(138, 180, 248, 0.18);
  color: #aecbfa;
}

.cfvc-fx-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.55rem;
}

.cfvc-fx-thumb {
  position: relative;
  aspect-ratio: 16 / 10;
  border: 2px solid transparent;
  border-radius: 12px;
  overflow: hidden;
  background: #3c4043 center / cover no-repeat;
  cursor: pointer;
  padding: 0;
}

.cfvc-fx-thumb span {
  position: absolute;
  left: 0.45rem;
  bottom: 0.4rem;
  padding: 0.15rem 0.45rem;
  border-radius: 999px;
  background: rgba(32, 33, 36, 0.82);
  color: #e8eaed;
  font-size: 0.68rem;
  font-weight: 600;
}

.cfvc-fx-thumb.is-on {
  border-color: #8ab4f8;
  box-shadow: 0 0 0 1px #8ab4f8;
}

.cfvc-fx-enter-active,
.cfvc-fx-leave-active {
  transition: opacity 0.2s ease;
}

.cfvc-fx-enter-active .cfvc-fx-panel,
.cfvc-fx-leave-active .cfvc-fx-panel {
  transition: transform 0.22s ease;
}

.cfvc-fx-enter-from,
.cfvc-fx-leave-to {
  opacity: 0;
}

.cfvc-fx-enter-from .cfvc-fx-panel,
.cfvc-fx-leave-to .cfvc-fx-panel {
  transform: translateY(18px);
}

.cfvc--pip::after {
  content: 'Picture-in-picture ativo';
  position: absolute;
  left: 50%;
  top: 0.85rem;
  transform: translateX(-50%);
  z-index: 20;
  padding: 0.35rem 0.75rem;
  border-radius: 999px;
  background: rgba(32, 33, 36, 0.9);
  color: #e8eaed;
  font-size: 0.75rem;
  font-weight: 500;
  pointer-events: none;
}
</style>
