<template>
  <div class="auth-container">
    <!-- Lado Esquerdo: Visual Elite (Diferente do Login para variar) -->
    <div class="auth-visual">
      <div class="visual-overlay"></div>
      <img src="https://images.unsplash.com/photo-1466692476868-aef1dfb1e735?q=80&w=2070&auto=format&fit=crop" alt="Nature Background" />
      <div class="visual-content">
        <div class="brand-badge">Junte-se a nós</div>
        <h1>Plante hoje a sua melhor <br/><span>versão</span>.</h1>
        <p>Faça parte de uma comunidade focada em resultados reais e saúde duradoura. Sua transformação começa com um clique.</p>
      </div>
    </div>

    <!-- Lado Direito: Formulário de Cadastro -->
    <main class="auth-main">
      <div class="auth-card">
        <header class="auth-header">
          <h2>Criar sua conta</h2>
          <p>Preencha os dados abaixo para iniciar sua jornada.</p>
        </header>

        <form @submit.prevent="handleRegister" class="auth-form">
          <div class="form-group" :class="{ 'focused': focusedField === 'name' }">
            <label>Nome Completo</label>
            <div class="input-wrapper">
              <User class="input-icon" />
              <input 
                type="text" 
                v-model="form.name" 
                placeholder="Seu nome completo" 
                required 
                @focus="focusedField = 'name'" 
                @blur="focusedField = ''"
              >
            </div>
          </div>

          <div class="form-group" :class="{ 'focused': focusedField === 'email' }">
            <label>E-mail</label>
            <div class="input-wrapper">
              <Mail class="input-icon" />
              <input 
                type="email" 
                v-model="form.email" 
                placeholder="seu@exemplo.com" 
                required 
                @focus="focusedField = 'email'" 
                @blur="focusedField = ''"
              >
            </div>
          </div>

          <div class="form-group" :class="{ 'focused': focusedField === 'password' }">
            <label>Senha de acesso</label>
            <div class="input-wrapper">
              <Lock class="input-icon" />
              <input 
                type="password" 
                v-model="form.password" 
                placeholder="Mínimo 8 caracteres" 
                required
                @focus="focusedField = 'password'" 
                @blur="focusedField = ''"
              >
            </div>
          </div>

          <div class="form-group">
            <label>Tipo de Acesso</label>
            <div class="role-selector">
              <button 
                type="button" 
                class="role-btn" 
                :class="{ active: form.role === 'PACIENTE' }"
                @click="form.role = 'PACIENTE'"
              >
                Paciente
              </button>
              <button 
                type="button" 
                class="role-btn" 
                :class="{ active: form.role === 'NUTRICIONISTA' }"
                @click="form.role = 'NUTRICIONISTA'"
              >
                Nutricionista
              </button>
            </div>
          </div>

          <button type="submit" :disabled="loading" class="btn-auth-submit">
            <span v-if="loading">Criando sua conta...</span>
            <span v-else>Cadastrar agora</span>
          </button>

          <p v-if="error" class="error-banner">
            <AlertCircle class="error-icon" />
            {{ error }}
          </p>

          <div class="auth-footer">
            <p>Já possui uma conta? <NuxtLink to="/">Fazer login</NuxtLink></p>
          </div>
        </form>
      </div>

      <footer class="main-footer">
        &copy; 2026 Clube Florescer. Elite Membership.
      </footer>
    </main>
  </div>
</template>

<script setup>
import { Mail, Lock, User, AlertCircle } from 'lucide-vue-next'

definePageMeta({
  layout: false
})

const form = reactive({
  name: '',
  email: '',
  password: '',
  role: 'PACIENTE'
})
const loading = ref(false)
const error = ref('')
const focusedField = ref('')

const handleRegister = async () => {
  loading.value = true
  error.value = ''
  try {
    await $fetch('http://localhost:3001/api/auth/register', {
      method: 'POST',
      body: form
    })
    alert('Conta criada com sucesso! Redirecionando para o login...')
    navigateTo('/')
  } catch (err) {
    error.value = 'Não foi possível completar o cadastro. Verifique os dados.'
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.auth-container {
  display: flex;
  min-height: 100vh;
  width: 100%;
  background: white;
  font-family: 'Figtree', sans-serif;
}

/* LADO VISUAL (LEFT) */
.auth-visual {
  flex: 1.2;
  position: relative;
  overflow: hidden;
  display: flex;
  align-items: center;
  padding: 5rem;
}

@media (max-width: 1024px) {
  .auth-visual { display: none; }
}

.auth-visual img {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  z-index: 1;
}

.visual-overlay {
  position: absolute;
  inset: 0;
  background: linear-gradient(135deg, rgba(45, 90, 39, 0.9) 0%, rgba(20, 40, 18, 0.7) 100%);
  z-index: 2;
}

.visual-content {
  position: relative;
  z-index: 3;
  color: white;
  max-width: 500px;
}

.brand-badge {
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  padding: 0.6rem 1.2rem;
  border-radius: 50px;
  display: inline-block;
  font-weight: 700;
  font-size: 0.9rem;
  margin-bottom: 2.5rem;
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.visual-content h1 {
  font-size: 3.5rem;
  line-height: 1.1;
  font-weight: 800;
  letter-spacing: -0.03em;
  margin-bottom: 2rem;
}

.visual-content h1 span { color: #a8d5a2; }

.visual-content p {
  font-size: 1.15rem;
  line-height: 1.6;
  opacity: 0.9;
}

/* LADO FORMULÁRIO (RIGHT) */
.auth-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  padding: 4rem;
  background: #fcfcfc;
}

.auth-card {
  width: 100%;
  max-width: 420px;
}

.auth-header { margin-bottom: 2.5rem; }
.auth-header h2 { font-size: 2rem; font-weight: 800; color: #111; margin-bottom: 0.5rem; }
.auth-header p { color: #777; font-size: 1rem; }

.auth-form {
  display: flex;
  flex-direction: column;
  gap: 1.4rem;
}

.form-group { display: flex; flex-direction: column; gap: 0.5rem; }
.form-group label { font-size: 0.85rem; font-weight: 700; color: #444; }

.input-wrapper {
  display: flex;
  align-items: center;
  background: white;
  border: 1.5px solid #eee;
  border-radius: 12px;
  padding: 0 1rem;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.input-icon { width: 18px; height: 18px; color: #ccc; transition: color 0.3s; }

.input-wrapper input {
  flex: 1;
  border: none;
  background: transparent;
  padding: 0.9rem 0.8rem;
  font-family: 'Figtree', sans-serif;
  font-size: 0.95rem;
  color: #111;
  outline: none;
}

.form-group.focused .input-wrapper {
  border-color: var(--primary);
  box-shadow: 0 0 0 4px rgba(45, 90, 39, 0.05);
}
.form-group.focused .input-icon { color: var(--primary); }

/* ROLE SELECTOR */
.role-selector {
  display: flex;
  gap: 10px;
  background: #f0f0f0;
  padding: 4px;
  border-radius: 12px;
}

.role-btn {
  flex: 1;
  border: none;
  background: transparent;
  padding: 0.6rem;
  border-radius: 10px;
  font-size: 0.85rem;
  font-weight: 700;
  color: #777;
  cursor: pointer;
  transition: 0.3s;
}

.role-btn.active {
  background: white;
  color: var(--primary);
  box-shadow: 0 2px 8px rgba(0,0,0,0.05);
}

.btn-auth-submit {
  background: var(--primary);
  color: white;
  border: none;
  padding: 1.1rem;
  border-radius: 12px;
  font-size: 1rem;
  font-weight: 800;
  cursor: pointer;
  transition: all 0.3s;
  margin-top: 1rem;
}

.btn-auth-submit:hover:not(:disabled) {
  background: var(--primary-light);
  transform: translateY(-2px);
  box-shadow: 0 10px 20px rgba(45, 90, 39, 0.15);
}

.btn-auth-submit:disabled { opacity: 0.6; cursor: not-allowed; }

.error-banner {
  background: #fff5f5;
  border: 1px solid #fed7d7;
  color: #c53030;
  padding: 1rem;
  border-radius: 10px;
  font-size: 0.85rem;
  display: flex;
  align-items: center;
  gap: 10px;
  font-weight: 600;
}

.auth-footer {
  margin-top: 1.5rem;
  text-align: center;
  padding-top: 1.5rem;
  border-top: 1px solid #f0f0f0;
}

.auth-footer p { font-size: 0.95rem; color: #888; }
.auth-footer a { color: var(--primary); text-decoration: none; font-weight: 800; }

.main-footer {
  margin-top: 3rem;
  font-size: 0.8rem;
  color: #ccc;
  font-weight: 600;
}
</style>
