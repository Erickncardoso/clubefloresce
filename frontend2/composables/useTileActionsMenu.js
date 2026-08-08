const openMenuKey = ref(null)

export function useTileActionsMenu(menuKey) {
  const open = computed(() => openMenuKey.value === menuKey)

  function toggle() {
    openMenuKey.value = open.value ? null : menuKey
  }

  function close() {
    if (openMenuKey.value === menuKey) {
      openMenuKey.value = null
    }
  }

  return { open, toggle, close }
}

export function closeAllTileActionMenus() {
  openMenuKey.value = null
}
