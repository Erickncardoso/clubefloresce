<script setup>
definePageMeta({ layout: 'patient', middleware: 'patient-only' })

const route = useRoute()

onMounted(() => {
  const templateId = route.query.template
  if (templateId) {
    navigateTo({ path: '/check-in', query: { template: templateId } }, { replace: true })
    return
  }
  navigateTo('/check-in', { replace: true })
})
</script>
