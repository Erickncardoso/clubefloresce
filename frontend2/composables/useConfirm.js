const confirmState = reactive({
  open: false,
  title: 'Confirmar',
  message: '',
  confirmLabel: 'Confirmar',
  cancelLabel: 'Cancelar',
  variant: 'danger',
  loading: false,
  _resolve: null,
})

export function useConfirm() {
  const confirm = (options = {}) => {
    if (typeof options === 'string') {
      options = { message: options }
    }

    return new Promise((resolve) => {
      confirmState.open = true
      confirmState.title = options.title || 'Confirmar'
      confirmState.message = options.message || ''
      confirmState.confirmLabel = options.confirmLabel || 'Confirmar'
      confirmState.cancelLabel = options.cancelLabel || 'Cancelar'
      confirmState.variant = options.variant || 'danger'
      confirmState.loading = false
      confirmState._resolve = resolve
    })
  }

  const accept = () => {
    if (confirmState.loading) return
    confirmState.open = false
    confirmState._resolve?.(true)
    confirmState._resolve = null
  }

  const cancel = () => {
    if (confirmState.loading) return
    confirmState.open = false
    confirmState._resolve?.(false)
    confirmState._resolve = null
  }

  const setLoading = (value) => {
    confirmState.loading = value
  }

  return {
    state: confirmState,
    confirm,
    accept,
    cancel,
    setLoading,
  }
}
