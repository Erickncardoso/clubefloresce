<script setup>
definePageMeta({ layout: 'patient', middleware: 'patient-only' })

onMounted(() => {
  navigateTo('/check-in', { replace: true })
})
</script>
