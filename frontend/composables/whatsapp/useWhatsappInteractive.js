/**
 * Normalização de mensagens interativas UAZAPI / WhatsApp proto.
 * Cobre: button, list, carousel, template/hydrated, nativeFlow, payment/pix.
 */
import { strTrim, parseListMessageTextVote } from './useWhatsappUtils.js'
import { showChatFeedback } from './useWhatsappState.js'

const pickFirstMenuText = (...values) => {
  for (const value of values) {
    const text = strTrim(value)
    if (text) return text
  }
  return ''
}

const parseLooseNode = (raw) => {
  if (raw == null) return null
  if (typeof raw === 'object') return raw
  const text = strTrim(raw)
  if (!text) return null
  try {
    const parsed = JSON.parse(text)
    return parsed && typeof parsed === 'object' ? parsed : null
  } catch {
    return null
  }
}

const readInteractiveButtonLabel = (node) => {
  if (!node) return ''
  if (typeof node === 'string') return strTrim(node)
  if (typeof node !== 'object') return ''
  return strTrim(
    node.displayText || node.DisplayText || node.text || node.title || node.name || node.ID || node.id ||
    node.buttonText?.displayText || node.buttonText?.Text || node.buttonText
  )
}

const unwrapHydratedButtonNode = (btn) => {
  if (!btn || typeof btn !== 'object') return btn
  return btn.HydratedButton || btn.hydratedButton || btn
}

const mapProtoButtonType = (raw) => {
  const numeric = Number(raw)
  const text = String(raw || '').toUpperCase()
  if (text === 'URL' || numeric === 1) return 'URL'
  if (text === 'CALL' || numeric === 2) return 'CALL'
  if (text === 'COPY') return 'COPY'
  return 'REPLY'
}

const inferChoiceIdAndType = (idRaw, label) => {
  const id = strTrim(idRaw)
  if (!id) return { id: label, buttonType: 'REPLY' }
  const lower = id.toLowerCase()
  if (lower.startsWith('copy:')) return { id: id.slice(5).trim() || label, buttonType: 'COPY' }
  if (lower.startsWith('call:')) return { id: id.slice(5).trim(), buttonType: 'CALL' }
  if (lower.startsWith('url:')) return { id: id.slice(4).trim(), buttonType: 'URL' }
  if (/^https?:\/\//i.test(id)) return { id, buttonType: 'URL' }
  if (['REPLY', 'URL', 'COPY', 'CALL'].includes(id.toUpperCase())) return { id: label, buttonType: id.toUpperCase() }
  return { id, buttonType: 'REPLY' }
}

const UAZAPI_BUTTON_TYPES = ['REPLY', 'URL', 'COPY', 'CALL']

const isUazapiPrefixedId = (id) => {
  const value = strTrim(id)
  if (!value) return false
  const lower = value.toLowerCase()
  return lower.startsWith('copy:') || lower.startsWith('call:') || lower.startsWith('url:') || /^https?:\/\//i.test(value)
}

/** Formato UAZAPI send/menu: texto|copy:código, texto|call:+55..., texto|https://... */
export const formatUazapiButtonChoice = (label, id, type) => {
  const safeLabel = strTrim(label)
  const safeId = strTrim(id) || safeLabel
  const safeType = String(type || 'REPLY').toUpperCase()

  if (safeType === 'COPY') {
    const code = safeId.toLowerCase().startsWith('copy:') ? safeId.slice(5).trim() : safeId
    return `${safeLabel}|copy:${code || safeLabel}`
  }
  if (safeType === 'CALL') {
    const phone = safeId.toLowerCase().startsWith('call:') ? safeId.slice(5).trim() : safeId
    return `${safeLabel}|call:${phone}`
  }
  if (safeType === 'URL') {
    if (/^https?:\/\//i.test(safeId)) return `${safeLabel}|${safeId}`
    const href = safeId.toLowerCase().startsWith('url:') ? safeId.slice(4).trim() : safeId
    return `${safeLabel}|${/^https?:\/\//i.test(href) ? href : `url:${href}`}`
  }
  if (!safeId || safeId === safeLabel) return safeLabel
  return `${safeLabel}|${safeId}`
}

const formatUazapiChoiceId = (id, type) => {
  const safeId = strTrim(id)
  const safeType = String(type || 'REPLY').toUpperCase()
  if (safeType === 'COPY') return `copy:${safeId.replace(/^copy:/i, '')}`
  if (safeType === 'CALL') return `call:${safeId.replace(/^call:/i, '')}`
  if (safeType === 'URL') {
    if (/^https?:\/\//i.test(safeId)) return safeId
    return safeId.toLowerCase().startsWith('url:') ? safeId : `url:${safeId}`
  }
  return safeId
}

/** Converte linha do builder (texto|id|TIPO) para formato UAZAPI send/menu */
export const formatBuilderChoiceToUazapi = (line, menuType = 'button') => {
  const raw = strTrim(line)
  if (!raw) return ''
  if (raw.startsWith('[') && raw.endsWith(']')) return raw
  if ((raw.startsWith('{') && raw.endsWith('}')) || (raw.startsWith('(') && raw.endsWith(')'))) return raw

  const parts = raw.split('|').map((v) => strTrim(v))
  const label = parts[0] || ''
  if (!label) return raw

  if (menuType === 'poll') return label

  const typeIdx = parts.findIndex((part, idx) => idx >= 2 && UAZAPI_BUTTON_TYPES.includes(strTrim(part).toUpperCase()))
  const explicitType = typeIdx >= 0 ? strTrim(parts[typeIdx]).toUpperCase() : ''

  if (menuType === 'list') {
    if (explicitType) {
      const id = parts[1] || label
      const desc = parts.slice(typeIdx + 1).join('|').trim()
      const formattedId = formatUazapiChoiceId(id, explicitType)
      return desc ? `${label}|${formattedId}|${desc}` : `${label}|${formattedId}`
    }
    return raw
  }

  if (explicitType) {
    return formatUazapiButtonChoice(label, parts[1] || label, explicitType)
  }

  if (parts.length >= 2 && isUazapiPrefixedId(parts[1])) return raw
  if (parts.length >= 2 && /^https?:\/\//i.test(parts[1])) return raw
  if (parts.length === 1) return label
  if (parts.length === 2) return `${label}|${parts[1] || label}`
  return raw
}

export const formatBuilderChoicesToUazapi = (choicesText, menuType = 'button') => (
  String(choicesText || '')
    .split('\n')
    .map((line) => strTrim(line))
    .filter(Boolean)
    .map((line) => formatBuilderChoiceToUazapi(line, menuType))
    .filter(Boolean)
)

/** UAZAPI choices: [Seção], texto|id|tipo, copy:/call:/url:, quebra de linha */
export const parseUazapiChoiceString = (choice, index) => {
  let raw = strTrim(choice)
  if (!raw) return null
  raw = raw.replace(/^(Btn|Button|List|Carousel|Poll)\|/i, '')

  if (raw.startsWith('[') && raw.endsWith(']')) {
    return { isSection: true, label: raw.slice(1, -1).trim(), id: `section-${index}` }
  }
  if ((raw.startsWith('{') && raw.endsWith('}')) || (raw.startsWith('(') && raw.endsWith(')'))) {
    return null
  }

  const parts = raw.includes('|')
    ? raw.split('|').map((v) => strTrim(v))
    : raw.includes('\n')
      ? raw.split('\n').map((v) => strTrim(v))
      : [raw]

  const label = parts[0] || ''
  if (!label) return null
  if (label.startsWith('[') && label.endsWith(']')) {
    return { isSection: true, label: label.slice(1, -1).trim(), id: `section-${index}` }
  }

  const idPart = parts[1] || label
  const typePart = strTrim(parts[2] || '').toUpperCase()
  const { id, buttonType: inferredType } = inferChoiceIdAndType(idPart, label)
  const buttonType = ['REPLY', 'URL', 'COPY', 'CALL'].includes(typePart) ? typePart : inferredType
  const description = parts[2] && !['REPLY', 'URL', 'COPY', 'CALL'].includes(typePart)
    ? parts[2]
    : (parts[3] || '')

  return { isSection: false, label, id, description: strTrim(description), buttonType }
}

const buildHydratedTemplateBodyText = (hydrated) => {
  if (!hydrated || typeof hydrated !== 'object') return ''
  const headerTitle = pickFirstMenuText(
    hydrated?.Title?.HydratedTitleText,
    hydrated?.title?.hydratedTitleText,
    hydrated?.hydratedTitleText
  )
  const body = pickFirstMenuText(hydrated?.hydratedContentText, hydrated?.HydratedContentText)
  if (headerTitle && body) return `${headerTitle}\n${body}`
  return headerTitle || body
}

const parseHydratedTemplateButtons = (buttons = []) => {
  const out = []
  for (const [index, btn] of (Array.isArray(buttons) ? buttons : []).entries()) {
    if (!btn || typeof btn !== 'object') continue
    const node = unwrapHydratedButtonNode(btn)
    const quick = node?.quickReplyButton || node?.QuickReplyButton
    const url = node?.urlButton || node?.URLButton || node?.UrlButton
    const call = node?.callButton || node?.CallButton
    const copy = node?.copyCodeButton || node?.CopyCodeButton || node?.copyButton || node?.CopyButton
    if (quick) {
      const label = readInteractiveButtonLabel(quick)
      if (label) out.push({ isSection: false, label, id: strTrim(quick.id || quick.ID) || label, description: '', buttonType: 'REPLY' })
    } else if (url) {
      const label = readInteractiveButtonLabel(url)
      const href = strTrim(url.url || url.URL)
      if (label) out.push({ isSection: false, label, id: href || label, description: href, buttonType: 'URL' })
    } else if (call) {
      const label = readInteractiveButtonLabel(call)
      if (label) out.push({ isSection: false, label, id: strTrim(call.phoneNumber || call.PhoneNumber) || label, description: '', buttonType: 'CALL' })
    } else if (copy) {
      const label = readInteractiveButtonLabel(copy)
      const code = strTrim(copy.copyCode || copy.CopyCode || copy.code)
      if (label) out.push({ isSection: false, label, id: code || label, description: code, buttonType: 'COPY' })
    } else {
      const label = readInteractiveButtonLabel(node)
      if (label) out.push({ isSection: false, label, id: strTrim(node?.id || node?.ID) || `btn-${index}`, description: '', buttonType: 'REPLY' })
    }
  }
  return out
}

const parseButtonsMessageButtons = (buttons = []) => {
  return (Array.isArray(buttons) ? buttons : []).map((btn, index) => {
    const label = readInteractiveButtonLabel(btn?.buttonText) || readInteractiveButtonLabel(btn)
    if (!label) return null

    const url = btn?.urlButton || btn?.URLButton || btn?.UrlButton
    const call = btn?.callButton || btn?.CallButton
    const copy = btn?.copyCodeButton || btn?.CopyCodeButton || btn?.copyButton || btn?.CopyButton
    if (url) {
      const href = strTrim(url.url || url.URL)
      return { isSection: false, label, id: href || label, description: href, buttonType: 'URL' }
    }
    if (call) {
      return {
        isSection: false,
        label,
        id: strTrim(call.phoneNumber || call.PhoneNumber) || label,
        description: '',
        buttonType: 'CALL',
      }
    }
    if (copy) {
      const code = strTrim(copy.copyCode || copy.CopyCode || copy.code)
      return { isSection: false, label, id: code || label, description: code, buttonType: 'COPY' }
    }

    return {
      isSection: false,
      label,
      id: strTrim(btn?.buttonId || btn?.ButtonId) || label || `btn-${index}`,
      description: '',
      buttonType: mapProtoButtonType(btn?.type || btn?.Type),
    }
  }).filter(Boolean)
}

const parseInteractiveMessageButtons = (interactiveMessage = {}) => {
  const action = interactiveMessage?.action || interactiveMessage?.Action || {}
  const buttons = action?.buttons || action?.Buttons || []
  const parsed = parseButtonsMessageButtons(buttons)
  if (parsed.length) return parsed
  return parseHydratedTemplateButtons(buttons)
}

export const extractListMessagePayload = (content) => {
  if (!content || typeof content !== 'object') return null
  const nested = [
    content.listMessage,
    content.ListMessage,
    content.message?.listMessage,
    content.message?.ListMessage,
    content.ephemeralMessage?.message?.listMessage,
    content.ephemeralMessage?.message?.ListMessage,
    content.viewOnceMessage?.message?.listMessage,
    content.viewOnceMessage?.message?.ListMessage,
    content.viewOnceMessageV2?.message?.listMessage,
    content.viewOnceMessageV2?.message?.ListMessage,
    content.interactiveMessage?.action?.listAction,
    content.interactiveMessage?.Action?.ListAction
  ].find(Boolean)
  if (nested && typeof nested === 'object') return nested
  if (Array.isArray(content.sections) || strTrim(content.buttonText) || strTrim(content.ButtonText)) return content
  return null
}

const findListSectionsNode = (root) => {
  const seen = new Set()
  const walk = (node, depth = 0) => {
    if (!node || typeof node !== 'object' || depth > 12) return null
    if (seen.has(node)) return null
    seen.add(node)
    const sections = node.sections || node.Sections
    if (Array.isArray(sections) && sections.some((section) => {
      const rows = section?.rows || section?.Rows
      return Array.isArray(rows) && rows.length > 0
    })) return node
    for (const value of Object.values(node)) {
      if (value && typeof value === 'object') {
        const found = walk(value, depth + 1)
        if (found) return found
      }
    }
    return null
  }
  return walk(root)
}

const parseListMessageSections = (listMessage = {}) => {
  const options = []
  const appendRow = (row, index) => {
    const label = strTrim(row?.title || row?.name || row?.Title || row?.Name)
    if (!label) return
    options.push({
      isSection: false,
      label,
      id: strTrim(row?.rowId || row?.RowId || row?.id || row?.ID) || label || `row-${index}`,
      description: strTrim(row?.description || row?.Description),
      buttonType: 'REPLY'
    })
  }

  for (const section of (Array.isArray(listMessage?.sections) ? listMessage.sections : Array.isArray(listMessage?.Sections) ? listMessage.Sections : [])) {
    const sectionTitle = strTrim(section?.title || section?.Title)
    if (sectionTitle) options.push({ isSection: true, label: sectionTitle, id: `section-${options.length}` })
    const rows = section?.rows || section?.Rows || []
    for (const [index, row] of (Array.isArray(rows) ? rows : []).entries()) appendRow(row, index)
  }

  if (!options.length) {
    for (const [index, row] of (Array.isArray(listMessage?.rows) ? listMessage.rows : Array.isArray(listMessage?.Rows) ? listMessage.Rows : []).entries()) {
      appendRow(row, index)
    }
  }

  return options
}

const parseMenuChoiceObjects = (choices = []) => {
  const options = []
  for (const [index, choice] of (Array.isArray(choices) ? choices : []).entries()) {
    if (!choice || typeof choice !== 'object') continue
    if (Array.isArray(choice.sections) || Array.isArray(choice.Sections)) {
      options.push(...parseListMessageSections(choice))
      continue
    }
    const label = strTrim(choice.title || choice.Title || choice.label || choice.name || choice.text || choice.displayText)
    if (!label) continue
    const idRaw = strTrim(choice.rowId || choice.RowId || choice.id || choice.ID || choice.optionId)
    const { id, buttonType } = inferChoiceIdAndType(idRaw || label, label)
    options.push({
      isSection: false,
      label,
      id,
      description: strTrim(choice.description || choice.Description),
      buttonType
    })
  }
  return options
}

const findHydratedTemplate = (content) => {
  if (!content || typeof content !== 'object') return null
  const direct = [
    content.hydratedTemplate,
    content.HydratedTemplate,
    content.templateMessage?.hydratedTemplate,
    content.templateMessage?.HydratedTemplate,
    content.templateMessage?.fourRowTemplate?.hydratedTemplate,
    content.templateMessage?.hydratedFourRowTemplate,
    content.message?.templateMessage?.hydratedTemplate,
    content.message?.templateMessage?.HydratedTemplate,
    content.ephemeralMessage?.message?.templateMessage?.hydratedTemplate,
    content.viewOnceMessage?.message?.templateMessage?.hydratedTemplate,
    content.viewOnceMessageV2?.message?.templateMessage?.hydratedTemplate
  ].find(Boolean)
  if (direct) return direct
  return findListSectionsNode(content)?.hydratedButtons ? null : null
}

const findButtonsMessage = (content) => {
  if (!content || typeof content !== 'object') return null
  return [
    content.buttonsMessage,
    content.ButtonsMessage,
    content.message?.buttonsMessage,
    content.message?.ButtonsMessage,
    content.ephemeralMessage?.message?.buttonsMessage,
    content.viewOnceMessage?.message?.buttonsMessage,
    content.viewOnceMessageV2?.message?.buttonsMessage
  ].find(Boolean) || null
}

const findInteractiveMessage = (content) => {
  if (!content || typeof content !== 'object') return null
  return [
    content.interactiveMessage,
    content.InteractiveMessage,
    content.nativeFlowMessage,
    content.NativeFlowMessage,
    content.message?.interactiveMessage,
    content.message?.InteractiveMessage,
    content.message?.nativeFlowMessage,
    content.ephemeralMessage?.message?.interactiveMessage,
    content.viewOnceMessage?.message?.interactiveMessage,
    content.viewOnceMessageV2?.message?.interactiveMessage
  ].find(Boolean) || null
}

const collectChoiceSources = (msg, content, convertOptions) => {
  const sendPayload = parseLooseNode(msg?.sendPayload) || (typeof msg?.sendPayload === 'object' ? msg.sendPayload : null)
  const objectSources = [
    ...(Array.isArray(msg?.choices) ? msg.choices : []),
    ...(Array.isArray(msg?.options) ? msg.options : []),
    ...(Array.isArray(sendPayload?.choices) ? sendPayload.choices : []),
    ...(Array.isArray(convertOptions?.choices) ? convertOptions.choices : []),
    ...(Array.isArray(content?.choices) ? content.choices : []),
    ...(Array.isArray(content?.options) ? content.options : [])
  ]
  const stringChoices = objectSources
    .flatMap((value) => {
      if (typeof value === 'string') return [value]
      if (value && typeof value === 'object') {
        const asText = strTrim(value.label || value.text || value.name || value.title || value.displayText)
        return asText ? [asText] : []
      }
      return []
    })
    .filter(Boolean)

  return { objectSources, stringChoices }
}

const parseCarouselFromChoices = (choices = []) => {
  const cards = []
  let current = null

  const pushCurrent = () => {
    if (!current) return
    if (!current.actions.length && current.title) {
      current.actions.push({ label: 'Ver mais', type: 'REPLY', id: current.title })
    }
    cards.push(current)
    current = null
  }

  for (const [index, choice] of choices.entries()) {
    const raw = typeof choice === 'string' ? strTrim(choice) : strTrim(choice?.label || choice?.text || choice?.title)
    if (!raw) continue

    if (raw.startsWith('[') && raw.endsWith(']')) {
      pushCurrent()
      current = { title: raw.slice(1, -1).trim(), image: '', actions: [] }
      continue
    }
    if (raw.startsWith('{') && raw.endsWith('}')) {
      if (!current) current = { title: '', image: '', actions: [] }
      current.image = raw.slice(1, -1).trim()
      continue
    }

    const btn = parseUazapiChoiceString(raw, index)
    if (btn && !btn.isSection) {
      if (!current) current = { title: '', image: '', actions: [] }
      current.actions.push({ label: btn.label, type: btn.buttonType, id: btn.id })
    }
  }
  pushCurrent()
  return cards
}

const parseCarouselFromPayload = (msg, content, convertOptions, stringChoices) => {
  const fromContent = Array.isArray(content?.carousel) ? content.carousel
    : Array.isArray(content?.cards) ? content.cards
    : Array.isArray(convertOptions?.carousel) ? convertOptions.carousel
    : Array.isArray(msg?.sendPayload?.carousel) ? msg.sendPayload.carousel
    : Array.isArray(msg?.carousel) ? msg.carousel
    : []

  if (fromContent.length) {
    return fromContent.map((card) => ({
      title: strTrim(card?.title || card?.text || card?.body) || 'Cartão',
      image: strTrim(card?.image || card?.imageUrl || card?.mediaUrl || card?.url) || '',
      actions: (Array.isArray(card?.buttons) ? card.buttons : []).map((btn, index) => {
        const label = strTrim(btn?.text || btn?.Text) || readInteractiveButtonLabel(btn?.buttonText) || readInteractiveButtonLabel(btn)
        if (!label) return null
        const explicitType = strTrim(btn?.type || btn?.Type || '').toUpperCase()
        const idRaw = strTrim(btn?.id || btn?.buttonId || btn?.url || btn?.phoneNumber || label)
        const { id, buttonType } = inferChoiceIdAndType(idRaw, label)
        const type = UAZAPI_BUTTON_TYPES.includes(explicitType) ? explicitType : buttonType
        return { label, type, id: type === 'COPY' ? (id || label) : id }
      }).filter(Boolean)
    })).filter((card) => card.title || card.actions.length)
  }

  return parseCarouselFromChoices(stringChoices)
}

const inferPixTypeFromKey = (pixKey) => {
  const raw = strTrim(pixKey)
  if (!raw) return 'EVP'
  if (/@/.test(raw)) return 'EMAIL'
  const digits = raw.replace(/\D/g, '')
  if (digits.length === 11) return 'CPF'
  if (digits.length === 14) return 'CNPJ'
  if (digits.length >= 10 && digits.length <= 13) return 'PHONE'
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(raw)) return 'EVP'
  return 'EVP'
}

const findNativeFlowMessage = (content) => {
  if (!content || typeof content !== 'object') return null
  return [
    content.nativeFlowMessage,
    content.NativeFlowMessage,
    content.message?.nativeFlowMessage,
    content.message?.NativeFlowMessage,
    content.ephemeralMessage?.message?.nativeFlowMessage,
    content.viewOnceMessage?.message?.nativeFlowMessage,
    content.viewOnceMessageV2?.message?.nativeFlowMessage
  ].find(Boolean) || null
}

const extractPixFromNativeFlow = (content) => {
  const nativeFlow = findNativeFlowMessage(content)
  if (!nativeFlow || typeof nativeFlow !== 'object') return null

  const params = parseLooseNode(nativeFlow.messageParamsJson || nativeFlow.MessageParamsJson)
  const paymentSettings = params?.payment_settings || params?.paymentSettings || []
  for (const setting of (Array.isArray(paymentSettings) ? paymentSettings : [])) {
    const pix = setting?.pix_static_code || setting?.pixStaticCode
    if (!pix || typeof pix !== 'object') continue
    const pixKey = strTrim(pix.key || pix.pixKey || pix.pix_key)
    if (!pixKey) continue
    const totalAmount = params?.total_amount || params?.totalAmount
    const amountValue = Number(totalAmount?.value || 0)
    const amountOffset = Number(totalAmount?.offset || 100)
    const amount = amountValue > 0 && amountOffset > 0 ? amountValue / amountOffset : 0
    return {
      pixKey,
      pixType: strTrim(pix.key_type || pix.keyType || pix.key_type || inferPixTypeFromKey(pixKey)).toUpperCase(),
      pixName: strTrim(pix.merchant_name || pix.merchantName || pix.name) || 'Pix',
      amount
    }
  }

  const buttons = nativeFlow.buttons || nativeFlow.Buttons || []
  for (const btn of (Array.isArray(buttons) ? buttons : [])) {
    const btnParams = parseLooseNode(btn?.buttonParamsJson || btn?.ButtonParamsJson)
    const copyCode = strTrim(btnParams?.copy_code || btnParams?.copyCode || btnParams?.id)
    const displayText = strTrim(btnParams?.display_text || btnParams?.displayText || btn?.name)
    if (!copyCode) continue
    if (/copiar.*pix|pix.*copiar|cta_copy/i.test(`${displayText} ${btn?.name || ''}`)) {
      return {
        pixKey: copyCode,
        pixType: inferPixTypeFromKey(copyCode),
        pixName: 'Pix',
        amount: 0
      }
    }
  }

  return null
}

const extractPixPayload = (msg, content, convertOptions, sendPayload = null) => {
  const payload = sendPayload || parseLooseNode(msg?.sendPayload) || null
  const fromNative = extractPixFromNativeFlow(content)
  const pixKey = strTrim(
    msg?.pixKey || payload?.pixKey || convertOptions?.pixKey || content?.pixKey || fromNative?.pixKey
  )
  const pixName = strTrim(
    msg?.pixName || payload?.pixName || convertOptions?.pixName || content?.pixName || fromNative?.pixName
  ) || 'Pix'
  const pixType = strTrim(
    msg?.pixType || payload?.pixType || convertOptions?.pixType || content?.pixType || fromNative?.pixType
  ).toUpperCase() || inferPixTypeFromKey(pixKey)
  const amount = Number(
    msg?.amount || payload?.amount || convertOptions?.amount || content?.amount || fromNative?.amount || 0
  )
  const paymentLink = strTrim(
    msg?.paymentLink || payload?.paymentLink || convertOptions?.paymentLink || content?.paymentLink || ''
  )

  const sendFunction = strTrim(msg?.sendFunction).toLowerCase()
  const explicitPixType = [
    msg?.type,
    msg?.messageType,
    msg?.typeInteractive,
    msg?.interactiveType,
    payload?.type,
    convertOptions?.type
  ].map((value) => strTrim(value).toLowerCase()).find(Boolean) || ''

  const looksLikePix = Boolean(
    pixKey ||
    explicitPixType === 'pix-button' ||
    explicitPixType === 'pix_button' ||
    sendFunction.includes('pix-button') ||
    sendFunction.includes('pixbutton') ||
    fromNative
  )

  if (!looksLikePix) return null

  return {
    pixKey,
    pixType: pixType || inferPixTypeFromKey(pixKey),
    pixName,
    amount: Number.isFinite(amount) ? amount : 0,
    paymentLink,
    isRequestPayment: Boolean(
      explicitPixType.includes('request-payment') ||
      explicitPixType.includes('request_payment') ||
      sendFunction.includes('request-payment') ||
      sendFunction.includes('requestpayment') ||
      (amount > 0 && pixKey)
    )
  }
}

const detectIncomingMenuType = (msg, content, convertOptions, sendPayload = null) => {
  const payload = sendPayload || parseLooseNode(msg?.sendPayload) || null
  const pixPayload = extractPixPayload(msg, content, convertOptions, payload)
  if (pixPayload?.pixKey) {
    return pixPayload.isRequestPayment ? 'request-payment' : 'pix-button'
  }
  if (pixPayload && (
    strTrim(msg?.sendFunction).toLowerCase().includes('pix') ||
    strTrim(payload?.type).toLowerCase() === 'pix-button'
  )) {
    return 'pix-button'
  }

  const typeCandidates = [
    msg?.type,
    msg?.messageType,
    msg?.MessageType,
    msg?.typeInteractive,
    msg?.interactiveType,
    msg?.sendFunction,
    payload?.type,
    convertOptions?.type,
    content?.interactiveMessage?.type,
    content?.buttonsMessage?.type,
    content?.listMessage?.type,
    content?.templateMessage?.type,
    content?.nativeFlowMessage ? 'nativeflow' : ''
  ].map((value) => strTrim(value).toLowerCase()).filter(Boolean)

  if (typeCandidates.some((value) => /request.?payment/.test(value))) return 'request-payment'
  if (typeCandidates.some((value) => /pix.?button|pixbutton/.test(value))) return 'pix-button'
  if (typeCandidates.some((value) => /pix/.test(value) && !/request/.test(value))) return 'pix-button'
  if (typeCandidates.some((value) => value.includes('carousel'))) return 'carousel'
  if (typeCandidates.some((value) => value.includes('list')) || extractListMessagePayload(content)) return 'list'
  if (
    typeCandidates.some((value) => /button|interactive|template|native|cta|flow|hydrated/.test(value)) ||
    findButtonsMessage(content) ||
    findHydratedTemplate(content) ||
    content?.templateMessage ||
    findInteractiveMessage(content)
  ) return 'button'
  return ''
}

const buildMenuOptions = (msg, content, convertOptions, stringChoices, objectSources, hydrated, buttonsMessage, listMessage, interactiveMessage) => {
  let menuOptions = stringChoices
    .map((choice, index) => parseUazapiChoiceString(choice, index))
    .filter(Boolean)

  if (!menuOptions.length) menuOptions = parseButtonsMessageButtons(buttonsMessage?.buttons || buttonsMessage?.Buttons)
  if (!menuOptions.length) menuOptions = parseHydratedTemplateButtons(hydrated?.hydratedButtons || hydrated?.HydratedButtons)
  if (!menuOptions.length) menuOptions = parseInteractiveMessageButtons(interactiveMessage)
  if (!menuOptions.length && listMessage) menuOptions = parseListMessageSections(listMessage)
  if (!menuOptions.length && convertOptions && typeof convertOptions === 'object') {
    menuOptions = parseListMessageSections(convertOptions)
  }
  if (!menuOptions.length) menuOptions = parseMenuChoiceObjects(objectSources)

  return menuOptions
}

export const extractIncomingMenuInteractive = (msg, content, contentText, convertOptions = null) => {
  const sendPayload = parseLooseNode(msg?.sendPayload) || (typeof msg?.sendPayload === 'object' ? msg.sendPayload : null)
  const parsedConvertOptions = convertOptions || parseLooseNode(msg?.convertOptions)
  const { objectSources, stringChoices } = collectChoiceSources(msg, content, parsedConvertOptions)

  let menuType = detectIncomingMenuType(msg, content, parsedConvertOptions, sendPayload)
  if (!menuType && stringChoices.length > 0) {
    const flatType = strTrim(
      msg?.type || msg?.messageType || sendPayload?.type || parsedConvertOptions?.type
    ).toLowerCase()
    menuType = ['button', 'list', 'carousel', 'pix-button', 'request-payment'].includes(flatType) ? flatType : 'button'
  }
  if (!menuType) return null

  const hydrated = findHydratedTemplate(content)
  const buttonsMessage = findButtonsMessage(content)
  const listMessage = extractListMessagePayload(content) ||
    findListSectionsNode(content) ||
    findListSectionsNode(msg?.content) ||
    findListSectionsNode(msg)
  const interactiveMessage = findInteractiveMessage(content)
  const listTextParts = menuType === 'list'
    ? parseListMessageTextVote(contentText || msg?.text || msg?.body || msg?.wa_lastMessageTextVote)
    : { body: '', listButton: '' }

  const hydratedBodyText = buildHydratedTemplateBodyText(hydrated)
  const title = pickFirstMenuText(
    hydratedBodyText,
    sendPayload?.text,
    sendPayload?.title,
    parsedConvertOptions?.text,
    parsedConvertOptions?.title,
    buttonsMessage?.contentText,
    buttonsMessage?.ContentText,
    listMessage?.description,
    listMessage?.Description,
    listMessage?.title,
    listMessage?.Title,
    interactiveMessage?.body?.text,
    interactiveMessage?.header?.title,
    interactiveMessage?.header?.text,
    listTextParts.body,
    contentText,
    msg?.text,
    msg?.body
  )

  const footerText = pickFirstMenuText(
    sendPayload?.footerText,
    parsedConvertOptions?.footerText,
    buttonsMessage?.footerText,
    buttonsMessage?.FooterText,
    hydrated?.hydratedFooterText,
    hydrated?.HydratedFooterText,
    interactiveMessage?.footer?.text,
    listMessage?.footerText,
    listMessage?.FooterText
  )

  const listButton = pickFirstMenuText(
    sendPayload?.listButton,
    parsedConvertOptions?.listButton,
    parsedConvertOptions?.buttonText,
    listMessage?.buttonText,
    listMessage?.ButtonText,
    interactiveMessage?.action?.listAction?.buttonText,
    listTextParts.listButton
  )

  const imageButton = pickFirstMenuText(
    sendPayload?.imageButton,
    msg?.imageButton,
    parsedConvertOptions?.imageButton,
    content?.imageButton
  )

  const menuOptions = buildMenuOptions(
    msg, content, parsedConvertOptions, stringChoices, objectSources,
    hydrated, buttonsMessage, listMessage, interactiveMessage
  )

  const carouselCards = menuType === 'carousel'
    ? parseCarouselFromPayload(msg, content, parsedConvertOptions, stringChoices)
    : []

  if (menuType === 'pix-button' || menuType === 'request-payment') {
    const pix = extractPixPayload(msg, content, parsedConvertOptions, sendPayload) || {
      pixKey: '',
      pixType: 'EVP',
      pixName: 'Pix',
      amount: 0,
      paymentLink: ''
    }
    return {
      kind: 'menu',
      menuType: menuType === 'request-payment' ? 'request-payment' : 'pix-button',
      title: title || pix.pixName || 'Pagamento PIX',
      footerText,
      pixType: pix.pixType || 'EVP',
      pixName: pix.pixName || 'Pix',
      pixKey: pix.pixKey || '',
      amount: pix.amount || 0,
      paymentLink: pix.paymentLink || '',
      options: menuOptions
    }
  }

  if (menuType === 'carousel' && (carouselCards.length || title)) {
    return {
      kind: 'menu',
      menuType: 'carousel',
      title: title || 'Carrossel',
      footerText,
      carouselCards,
      options: menuOptions
    }
  }

  if (!menuOptions.length && menuType === 'list' && (title || listButton)) {
    return {
      kind: 'menu',
      menuType: 'list',
      title: title || listButton || 'Lista',
      footerText,
      listButton: listButton || 'Ver opções',
      imageButton,
      options: []
    }
  }

  if (!menuOptions.length && menuType === 'button' && title) {
    return {
      kind: 'menu',
      menuType: 'button',
      title,
      footerText,
      imageButton,
      options: []
    }
  }

  if (!menuOptions.length) return null

  return {
    kind: 'menu',
    menuType,
    title: title || 'Mensagem interativa',
    footerText,
    listButton: menuType === 'list' ? (listButton || 'Ver opções') : listButton,
    imageButton,
    carouselCards: menuType === 'carousel' ? carouselCards : undefined,
    options: menuOptions
  }
}

export const extractInteractiveBodyText = (content) => {
  if (!content || typeof content !== 'object') return ''
  const hydrated = findHydratedTemplate(content)
  const buttonsMessage = findButtonsMessage(content)
  const listNode = extractListMessagePayload(content)
  return pickFirstMenuText(
    buildHydratedTemplateBodyText(hydrated),
    buttonsMessage?.contentText,
    buttonsMessage?.ContentText,
    listNode?.description,
    listNode?.Description,
    listNode?.title,
    listNode?.Title,
    content?.description,
    content?.title
  )
}

export const formatPixKeyDisplay = (pixType, pixKey) => {
  const type = String(pixType || 'EVP').trim().toUpperCase()
  const raw = String(pixKey || '').trim()
  if (!raw) return ''
  const digits = raw.replace(/\D/g, '')
  if (type === 'CPF' && digits.length === 11) {
    return digits.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
  }
  if (type === 'CNPJ' && digits.length === 14) {
    return digits.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5')
  }
  if (type === 'PHONE') {
    const local = digits.length > 11 ? digits.slice(-11) : digits
    if (local.length === 11) return local.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3')
    if (local.length === 10) return local.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3')
  }
  return raw
}

export const pixTypeDisplayLabel = (pixType) => {
  const type = String(pixType || 'EVP').trim().toUpperCase()
  if (type === 'PHONE') return 'Celular'
  if (type === 'EMAIL') return 'E-mail'
  return type
}

export const handleInteractiveMenuOptionClick = (opt) => {
  if (!opt || opt.isSection) return false
  const type = String(opt.buttonType || opt.type || 'REPLY').toUpperCase()
  const target = strTrim(opt.id || opt.description || opt.label)
  if (type === 'URL' && /^https?:\/\//i.test(target)) {
    window.open(target, '_blank', 'noopener,noreferrer')
    return true
  }
  if (type === 'COPY' && target && typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    const label = strTrim(opt.label)
    const feedback = /pix/i.test(label) ? 'Chave Pix copiada' : 'Copiado'
    navigator.clipboard.writeText(target)
      .then(() => showChatFeedback(feedback))
      .catch(() => showChatFeedback('Não foi possível copiar'))
    return true
  }
  if (type === 'CALL' && target) {
    window.open(`tel:${target.replace(/[^\d+]/g, '')}`, '_self')
    return true
  }
  return false
}
