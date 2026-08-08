import { computed, reactive, ref } from 'vue'
import {
  PATIENT_LIST_FILTER_GROUPS,
  buildEngagementZoneMap,
  collectPatientTagOptions,
  countActivePatientListFilters,
  countPatientsForFilterOption,
  createEmptyPatientListFilters,
  filterPatientList,
} from '~/utils/patient-list-filters.js'

export function usePatientListFilters(usersRef, options = {}) {
  const filters = reactive(createEmptyPatientListFilters())
  const tagCatalog = ref([])
  const engagementZoneMap = reactive({
    danger: new Set(),
    attention: new Set(),
    success: new Set(),
  })

  const filterContext = computed(() => ({
    engagementZoneMap,
    searchQuery: options.searchQuery?.value ?? options.searchQuery ?? '',
  }))

  const filteredUsers = computed(() =>
    filterPatientList(usersRef.value || [], filters, filterContext.value),
  )

  const activeFilterCount = computed(() => countActivePatientListFilters(filters))

  const hasActiveFilters = computed(() => activeFilterCount.value > 0)

  const filterGroups = computed(() => {
    const tagOptions = collectPatientTagOptions(usersRef.value || [], tagCatalog.value || [])
    const groups = [...PATIENT_LIST_FILTER_GROUPS]

    if (tagOptions.length) {
      groups.push({
        key: 'tags',
        label: 'Tags',
        options: tagOptions.map((tag) => ({
          value: tag.value,
          label: tag.label,
          color: tag.color,
        })),
      })
    }

    return groups.map((group) => ({
      ...group,
      options: group.options.map((option) => ({
        ...option,
        count: countPatientsForFilterOption(
          usersRef.value || [],
          filters,
          group.key,
          option.value,
          filterContext.value,
        ),
        active: (filters[group.key] || []).includes(option.value),
      })),
    }))
  })

  function toggleFilter(groupKey, value) {
    const current = filters[groupKey] || []
    if (current.includes(value)) {
      filters[groupKey] = current.filter((entry) => entry !== value)
      return
    }
    filters[groupKey] = [...current, value]
  }

  function clearFilters() {
    Object.assign(filters, createEmptyPatientListFilters())
  }

  function setEngagementZones(payload) {
    const map = buildEngagementZoneMap(payload)
    engagementZoneMap.danger = map.danger
    engagementZoneMap.attention = map.attention
    engagementZoneMap.success = map.success
  }

  function setTagCatalog(tags) {
    tagCatalog.value = Array.isArray(tags) ? tags : []
  }

  return {
    filters,
    filteredUsers,
    filterGroups,
    activeFilterCount,
    hasActiveFilters,
    toggleFilter,
    clearFilters,
    setEngagementZones,
    setTagCatalog,
    tagCatalog,
  }
}
