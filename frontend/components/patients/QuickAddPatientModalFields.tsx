'use client'

import type { ChangeEvent, RefObject } from 'react'
import { ChevronDown, HelpCircle } from 'lucide-react'
import { CfDateInput } from '@/components/ui/CfDateInput'
import { CfPhoneInput } from '@/components/ui/CfPhoneInput'
import { CfSelect } from '@/components/ui/CfSelect'
import { PatientAvatar } from '@/components/patients/PatientAvatar'
import {
  PatientTagPicker,
  type PatientTagPickerHandle,
} from '@/components/patients/PatientTagPicker'
import { PatientProfileExtraSections } from '@/components/patients/PatientProfileExtraSections'
import type { QuickAddForm } from '@/lib/quick-add-patient'
import { QUICK_ADD_OPTIONS } from '@/lib/quick-add-patient'
import styles from './QuickAddPatientModal.module.scss'

type Props = {
  form: QuickAddForm
  patchForm: (partial: Partial<QuickAddForm>) => void
  isEdit: boolean
  isApprove: boolean
  moreOpen: boolean
  setMoreOpen: (v: boolean) => void
  accessOpen: boolean
  setAccessOpen: (v: boolean) => void
  avatarPreview: string
  avatarInputRef: RefObject<HTMLInputElement | null>
  tagPickerRef: RefObject<PatientTagPickerHandle | null>
  lookingUpCep: boolean
  cepLookupError: string
  accessHint: string
  minAccessDate: string
  error: string
  onCpfChange: (value: string) => void
  onRgChange: (value: string) => void
  onCepChange: (value: string) => void
  onAvatarPick: (file: File | null) => void
  clearAvatar: () => void
  applyAccessDuration: (days: number | null) => void
  editUserId?: string
}

export function QuickAddPatientModalFields({
  form,
  patchForm,
  isEdit,
  isApprove,
  moreOpen,
  setMoreOpen,
  accessOpen,
  setAccessOpen,
  avatarPreview,
  avatarInputRef,
  tagPickerRef,
  lookingUpCep,
  cepLookupError,
  accessHint,
  minAccessDate,
  error,
  onCpfChange,
  onRgChange,
  onCepChange,
  onAvatarPick,
  clearAvatar,
  applyAccessDuration,
  editUserId = '',
}: Props) {
  const {
    planOptions,
    accessDurationPresets,
    paymentMethodOptions,
    maritalOptions,
    modalityOptions,
    referralSourceOptions,
  } = QUICK_ADD_OPTIONS

  function onFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] || null
    onAvatarPick(file)
    e.target.value = ''
  }

  return (
    <div className={`${styles.body} modal-fields admin-form-fields`}>
      <div className={styles.top}>
        <div className={styles.photo}>
          <div className={styles.photoBox}>
            <div className={styles.photoAvatarWrap}>
              <PatientAvatar
                src={avatarPreview || form.avatarUrl}
                name={form.name || 'Paciente'}
                size="xl"
                ring={false}
              />
            </div>
            <p className={styles.photoText}>Selecione um arquivo JPG ou PNG do seu dispositivo</p>
            <button
              type="button"
              className={styles.photoBtn}
              onClick={() => avatarInputRef.current?.click()}
            >
              Escolher foto
            </button>
            {avatarPreview || form.avatarUrl ? (
              <button type="button" className={styles.photoClear} onClick={clearAvatar}>
                Remover foto
              </button>
            ) : null}
          </div>
          <input
            ref={avatarInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            className={styles.photoInput}
            onChange={onFileChange}
          />
        </div>

        <div className={`field field--float ${styles.topName}`}>
          <label htmlFor="qap-name">
            Nome <span className={styles.req}>*</span>
          </label>
          <input
            id="qap-name"
            value={form.name}
            onChange={(e) => patchForm({ name: e.target.value })}
            required
            placeholder="Nome completo"
            autoComplete="name"
          />
        </div>
        <div className={`field field--float ${styles.topEmail}`}>
          <label htmlFor="qap-email">E-mail</label>
          <input
            id="qap-email"
            value={form.email}
            onChange={(e) => patchForm({ email: e.target.value })}
            type="email"
            required={!isEdit}
            readOnly={isEdit}
            placeholder="email@exemplo.com"
            autoComplete="email"
          />
        </div>
      </div>

      <div className={`${styles.row} ${styles.row2} ${styles.rowControls}`}>
        <CfPhoneInput
          id="qap-phone"
          label="Telefone"
          className={styles.phone}
          value={form.phone}
          onChange={(phone) => patchForm({ phone })}
        />
        <div className={`field field--float ${styles.controlField}`}>
          <label htmlFor="qap-birth">Data de nascimento</label>
          <CfDateInput
            id="qap-birth"
            value={form.birthDate}
            onChange={(birthDate) => patchForm({ birthDate })}
          />
        </div>
      </div>

      <div className={`${styles.row} ${styles.row2}`}>
        <div className="field field--float">
          <label htmlFor="qap-cpf">CPF</label>
          <input
            id="qap-cpf"
            value={form.cpf}
            inputMode="numeric"
            placeholder="000.000.000-00"
            maxLength={14}
            onChange={(e) => onCpfChange(e.target.value)}
          />
        </div>
        <div className="field field--float">
          <label htmlFor="qap-rg">RG</label>
          <input
            id="qap-rg"
            value={form.rg}
            inputMode="text"
            placeholder="00.000.000-0"
            maxLength={14}
            onChange={(e) => onRgChange(e.target.value)}
          />
        </div>
      </div>

      <div className={`${styles.row} ${styles.row2} ${styles.rowAlignStart}`}>
        <div className={styles.genderBlock}>
          <span className={styles.blockLabel}>Sexo</span>
          <div className={styles.segment} role="group" aria-label="Sexo">
            <button
              type="button"
              className={`${styles.segmentBtn} ${form.gender === 'female' ? styles.segmentBtnActive : ''}`}
              onClick={() => patchForm({ gender: 'female' })}
            >
              Feminino
            </button>
            <button
              type="button"
              className={`${styles.segmentBtn} ${form.gender === 'male' ? styles.segmentBtnActive : ''}`}
              onClick={() => patchForm({ gender: 'male' })}
            >
              Masculino
            </button>
          </div>
          {isEdit ? (
            <div className={styles.activeRow}>
              <label className={styles.activeToggle}>
                <input
                  type="checkbox"
                  className={styles.activeInput}
                  checked={form.status === 'ATIVO'}
                  onChange={(e) =>
                    patchForm({ status: e.target.checked ? 'ATIVO' : 'INATIVO' })
                  }
                />
                <span className={styles.activeTrack} aria-hidden />
              </label>
              <span className={styles.activeLabel}>Ativo</span>
              <span className={styles.tipWrap}>
                <button
                  type="button"
                  className={styles.tipTrigger}
                  aria-label="Informação sobre status ativo"
                >
                  <HelpCircle className={styles.tipIcon} aria-hidden />
                </button>
                <span role="tooltip" className={styles.tip}>
                  Ao inativar um contato, ele deixará de aparecer como opção para novos cadastros
                </span>
              </span>
            </div>
          ) : null}
        </div>

        <div className={styles.tagsField}>
          <div className={styles.tagsHead}>
            <span className={styles.blockLabel}>
              Etiquetas
              <span className={`${styles.tipWrap} ${styles.tipWrapInline}`}>
                <button
                  type="button"
                  className={styles.tipTrigger}
                  aria-label="Informação sobre etiquetas"
                >
                  <HelpCircle className={styles.tipIcon} aria-hidden />
                </button>
                <span role="tooltip" className={styles.tip}>
                  Organize pacientes com etiquetas coloridas para filtros e buscas rápidas
                </span>
              </span>
            </span>
            <button
              type="button"
              className={styles.tagsAdd}
              onClick={() => tagPickerRef.current?.openMenu()}
            >
              + Adicionar
            </button>
          </div>
          <PatientTagPicker
            ref={tagPickerRef}
            value={form.tagItems}
            onChange={(tagItems) => patchForm({ tagItems })}
          />
        </div>
      </div>

      <div className={styles.divider} />

      <section className={styles.section}>
        <h4 className={styles.sectionTitle}>Informações adicionais</h4>
        <div className="field field--float">
          <label htmlFor="qap-origin">Origem</label>
          <CfSelect
            id="qap-origin"
            value={form.referralSource}
            onChange={(referralSource) => patchForm({ referralSource })}
            options={referralSourceOptions}
            placeholder="Selecione a origem"
          />
        </div>
        <div className={`${styles.row} ${styles.row2}`}>
          <div className="field field--float">
            <label htmlFor="qap-occupation">Profissão</label>
            <input
              id="qap-occupation"
              value={form.occupation}
              onChange={(e) => patchForm({ occupation: e.target.value })}
              placeholder="Profissão"
            />
          </div>
          <div className="field field--float">
            <label htmlFor="qap-marital">Estado civil</label>
            <CfSelect
              id="qap-marital"
              value={form.maritalStatus}
              onChange={(maritalStatus) => patchForm({ maritalStatus })}
              options={maritalOptions}
            />
          </div>
        </div>
        <div className="field field--float">
          <label htmlFor="qap-notes">Observações</label>
          <input
            id="qap-notes"
            value={form.notes}
            onChange={(e) => patchForm({ notes: e.target.value })}
            placeholder="Observações gerais"
          />
        </div>
      </section>

      <div className={styles.divider} />

      <PatientProfileExtraSections
        form={form}
        onChange={patchForm}
        excludeUserId={isEdit ? editUserId : ''}
        lookingUpCep={lookingUpCep}
        cepLookupError={cepLookupError}
        onCepChange={onCepChange}
      />

      <section className={styles.more}>
        <button
          type="button"
          className={styles.moreToggle}
          aria-expanded={moreOpen}
          onClick={() => setMoreOpen(!moreOpen)}
        >
          <span>Mais informações</span>
          <ChevronDown
            className={`${styles.moreChevron} ${moreOpen ? styles.moreChevronOpen : ''}`}
          />
        </button>
        {moreOpen ? (
          <div className={styles.moreBody}>
            <div className="field field--float">
              <label htmlFor="qap-nickname">Apelido</label>
              <input
                id="qap-nickname"
                value={form.nickname}
                onChange={(e) => patchForm({ nickname: e.target.value })}
                placeholder="Como prefere ser chamada"
              />
            </div>
            <div className={`${styles.row} ${styles.row2}`}>
              <div className="field field--float">
                <label htmlFor="qap-modality">Modalidade</label>
                <CfSelect
                  id="qap-modality"
                  value={form.modality}
                  onChange={(modality) => patchForm({ modality })}
                  options={modalityOptions}
                />
              </div>
              <div className={styles.flags}>
                <label className={styles.check}>
                  <input
                    type="checkbox"
                    checked={form.athlete}
                    onChange={(e) => patchForm({ athlete: e.target.checked })}
                  />
                  <span>Atleta</span>
                </label>
                <label className={styles.check}>
                  <input
                    type="checkbox"
                    checked={form.pregnant}
                    onChange={(e) => patchForm({ pregnant: e.target.checked })}
                  />
                  <span>Gestante</span>
                </label>
                <label className={styles.check}>
                  <input
                    type="checkbox"
                    checked={form.lactating}
                    onChange={(e) => patchForm({ lactating: e.target.checked })}
                  />
                  <span>Lactante</span>
                </label>
              </div>
            </div>
            <div className="field field--float">
              <label htmlFor="qap-objective">Objetivo</label>
              <input
                id="qap-objective"
                value={form.objective}
                onChange={(e) => patchForm({ objective: e.target.value })}
                placeholder="Objetivo nutricional"
              />
            </div>
          </div>
        ) : null}
      </section>

      <section className={styles.more}>
        {isEdit ? (
          <button
            type="button"
            className={styles.moreToggle}
            aria-expanded={accessOpen}
            onClick={() => setAccessOpen(!accessOpen)}
          >
            <span>Plano e acesso</span>
            <ChevronDown
              className={`${styles.moreChevron} ${accessOpen ? styles.moreChevronOpen : ''}`}
            />
          </button>
        ) : null}
        {!isEdit || accessOpen ? (
          <div className={`${styles.moreBody} ${styles.moreBodyFlat}`}>
            <div className={`${styles.row} ${styles.row2}`}>
              <div className="field field--float">
                <label htmlFor="qap-plan">Plano</label>
                <CfSelect
                  id="qap-plan"
                  value={form.plan}
                  onChange={(plan) => patchForm({ plan })}
                  options={planOptions}
                />
              </div>
              <div className="field field--float">
                <label htmlFor="qap-payment">Forma de pagamento</label>
                <CfSelect
                  id="qap-payment"
                  value={form.billingPaymentMethod}
                  onChange={(billingPaymentMethod) => patchForm({ billingPaymentMethod })}
                  options={paymentMethodOptions}
                />
              </div>
            </div>
            <div className={`${styles.row} ${styles.row2}`}>
              <div className="field field--float">
                <label htmlFor="qap-expires">
                  Acesso válido até
                  {isApprove && form.plan !== 'FREE' ? (
                    <span className={styles.req}> *</span>
                  ) : null}
                </label>
                <CfDateInput
                  id="qap-expires"
                  value={form.accessExpiresAt}
                  onChange={(accessExpiresAt) => patchForm({ accessExpiresAt })}
                  min={minAccessDate}
                  required={isApprove && form.plan !== 'FREE'}
                />
              </div>
              {!isApprove && !isEdit ? (
                <div className="field field--float">
                  <label htmlFor="qap-password">
                    Senha inicial <span className={styles.req}>*</span>
                  </label>
                  <input
                    id="qap-password"
                    value={form.password}
                    onChange={(e) => patchForm({ password: e.target.value })}
                    type="password"
                    required
                    minLength={8}
                    placeholder="Mínimo 8 caracteres"
                    autoComplete="new-password"
                  />
                </div>
              ) : null}
            </div>
            <div className={styles.durationRow}>
              {accessDurationPresets.map((preset) => (
                <button
                  key={String(preset.days)}
                  type="button"
                  className={styles.durationChip}
                  onClick={() => applyAccessDuration(preset.days)}
                >
                  {preset.label}
                </button>
              ))}
            </div>
            <p className={styles.fieldHint}>{accessHint}</p>
          </div>
        ) : null}
      </section>

      {!isApprove && !isEdit ? (
        <section className={styles.welcome}>
          <div className={styles.welcomeHead}>
            <div>
              <h4>Boas-vindas no WhatsApp</h4>
              <p className={styles.fieldHint}>Envia mensagem após cadastrar (precisa de celular).</p>
            </div>
            <label className={`${styles.activeRow} ${styles.activeRowCompact}`}>
              <input
                type="checkbox"
                className={styles.activeInput}
                checked={form.sendWelcomeWhatsapp}
                onChange={(e) => patchForm({ sendWelcomeWhatsapp: e.target.checked })}
              />
              <span className={styles.activeTrack} aria-hidden />
            </label>
          </div>
          {form.sendWelcomeWhatsapp ? (
            <div className="field field--float">
              <label htmlFor="qap-welcome-msg">Mensagem</label>
              <textarea
                id="qap-welcome-msg"
                value={form.welcomeMessageOverride}
                onChange={(e) => patchForm({ welcomeMessageOverride: e.target.value })}
                rows={5}
                placeholder="Carregando modelo…"
              />
            </div>
          ) : null}
        </section>
      ) : null}

      {isApprove ? (
        <section className={styles.welcome}>
          <h4>Mensagem de aprovação</h4>
          <p className={styles.fieldHint}>E-mail e WhatsApp são enviados automaticamente ao aprovar.</p>
          <div className="field field--float">
            <label htmlFor="qap-welcome-msg-approve">Mensagem WhatsApp</label>
            <textarea
              id="qap-welcome-msg-approve"
              value={form.welcomeMessageOverride}
              onChange={(e) => patchForm({ welcomeMessageOverride: e.target.value })}
              rows={5}
              placeholder="Carregando modelo…"
            />
          </div>
        </section>
      ) : null}

      {error ? <p className={styles.error}>{error}</p> : null}
    </div>
  )
}
