<template>
  <div class="setup-page">
    <main class="setup-card">
      <h1>Setup Inicial do Nutricionista</h1>
      <p class="subtitle">
        Esta página funciona apenas uma vez. Após o primeiro cadastro, ela será desativada.
      </p>

      <div v-if="loadingStatus" class="status">Verificando status do setup...</div>

      <div v-else-if="!setupEnabled" class="status status--disabled">
        Setup já utilizado. Já existe um nutricionista cadastrado.
      </div>

      <form v-else class="form" @submit.prevent="handleSubmit">
        <label class="field">
          <span>Nome</span>
          <input v-model="form.name" type="text" required placeholder="Nome do nutricionista" />
        </label>

        <label class="field">
          <span>E-mail</span>
          <input v-model="form.email" type="email" required placeholder="nutri@exemplo.com" />
        </label>

        <label class="field">
          <span>Senha</span>
          <input v-model="form.password" type="password" required minlength="6" placeholder="Mínimo 6 caracteres" />
        </label>

        <label class="field">
          <span>Chave de setup</span>
          <input
            v-model="setupKey"
            type="text"
            placeholder="Obrigatória em produção"
          />
        </label>

        <button class="btn" type="submit" :disabled="submitting">
          {{ submitting ? "Criando..." : "Criar nutricionista" }}
        </button>

        <p v-if="error" class="message message--error">{{ error }}</p>
        <p v-if="success" class="message message--success">{{ success }}</p>
      </form>
    </main>
  </div>
</template>

<script setup>
definePageMeta({
  layout: false
})

const config = useRuntimeConfig()
const apiBase = `${config.public.apiBase}/auth`

const loadingStatus = ref(true)
const setupEnabled = ref(false)
const submitting = ref(false)
const error = ref("")
const success = ref("")
const setupKey = ref("")

const form = reactive({
  name: "",
  email: "",
  password: ""
})

const fetchStatus = async () => {
  loadingStatus.value = true
  try {
    const response = await $fetch(`${apiBase}/setup/nutricionista/status`)
    setupEnabled.value = Boolean(response?.enabled)
  } catch (err) {
    error.value = "Não foi possível validar o status do setup."
    setupEnabled.value = false
  } finally {
    loadingStatus.value = false
  }
}

const handleSubmit = async () => {
  error.value = ""
  success.value = ""
  submitting.value = true

  try {
    await $fetch(`${apiBase}/setup/nutricionista`, {
      method: "POST",
      body: form,
      headers: setupKey.value ? { "x-setup-key": setupKey.value } : undefined
    })

    success.value = "Nutricionista criado com sucesso. Esta página foi desativada."
    setupEnabled.value = false
    form.name = ""
    form.email = ""
    form.password = ""
  } catch (err) {
    error.value = err?.data?.message || "Não foi possível criar o nutricionista."
  } finally {
    submitting.value = false
  }
}

onMounted(fetchStatus)
</script>

<style scoped>
.setup-page {
  min-height: 100vh;
  display: grid;
  place-items: center;
  padding: 24px;
  background: #f4f7f5;
}

.setup-card {
  width: 100%;
  max-width: 460px;
  background: #fff;
  border: 1px solid #e4e9e6;
  border-radius: 16px;
  padding: 24px;
  box-shadow: 0 8px 30px rgba(12, 30, 20, 0.08);
}

h1 {
  margin: 0 0 8px;
  color: #163225;
  font-size: 1.4rem;
}

.subtitle {
  margin: 0 0 20px;
  color: #4d5e55;
  font-size: 0.95rem;
}

.form {
  display: grid;
  gap: 12px;
}

.field {
  display: grid;
  gap: 6px;
}

.field span {
  font-size: 0.88rem;
  color: #2c4337;
  font-weight: 600;
}

.field input {
  width: 100%;
  border: 1px solid #d5ddd8;
  border-radius: 10px;
  padding: 10px 12px;
  font-size: 0.95rem;
  color: #1b2a23;
  outline: none;
}

.field input:focus {
  border-color: #2e6749;
  box-shadow: 0 0 0 3px rgba(46, 103, 73, 0.12);
}

.btn {
  margin-top: 4px;
  border: none;
  border-radius: 10px;
  padding: 11px 12px;
  background: #2e6749;
  color: #fff;
  font-weight: 700;
  cursor: pointer;
}

.btn:disabled {
  opacity: 0.65;
  cursor: not-allowed;
}

.status {
  padding: 12px;
  border-radius: 10px;
  background: #eef3f0;
  color: #2f4a3d;
}

.status--disabled {
  background: #f5efef;
  color: #6f2a2a;
}

.message {
  margin: 2px 0 0;
  font-size: 0.9rem;
}

.message--error {
  color: #b23333;
}

.message--success {
  color: #2e6749;
}
</style>
