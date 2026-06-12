<script setup>
definePageMeta({ layout: 'patient', middleware: 'patient-only' })

await navigateTo('/bella/chat/general', { replace: true })
</script>
