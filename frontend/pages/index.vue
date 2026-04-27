<template>
  <div class="auth-container">
    <!-- Lado Esquerdo: Visual Elite -->
    <div class="auth-visual">
      <div class="visual-overlay"></div>
      <img src="https://images.unsplash.com/photo-1543362906-acfc16c623a2?q=80&w=1974&auto=format&fit=crop" alt="Botanical Background" />
      <div class="visual-content">
        <div class="brand-badge">Clube Florescer</div>
        <h1>Nutrição que <br/><span>Floresce</span> de dentro <br/>para fora.</h1>
        <p>Acesse sua plataforma exclusiva de acompanhamento nutricional e conteúdo premium.</p>
      </div>
    </div>

    <!-- Lado Direito: Formulário -->
    <main class="auth-main">
      <div class="auth-card">
        <header class="auth-header">
          <h2>Bem-vindo de volta</h2>
          <p>Insira suas credenciais para acessar o portal.</p>
        </header>

        <form @submit.prevent="handleLogin" class="auth-form">
          <div class="form-group" :class="{ 'focused': focusedField === 'email' }">
            <label>E-mail</label>
            <div class="input-wrapper">
              <Mail class="input-icon" />
              <input 
                type="email" 
                v-model="form.email" 
                placeholder="exemplo@florescer.com" 
                required 
                @focus="focusedField = 'email'" 
                @blur="focusedField = ''"
              >
            </div>
          </div>

          <div class="form-group" :class="{ 'focused': focusedField === 'password' }">
            <div class="label-row">
              <label>Senha</label>
              <a href="#" class="forgot-link">Esqueci a senha</a>
            </div>
            <div class="input-wrapper">
              <Lock class="input-icon" />
              <input 
                type="password" 
                v-model="form.password" 
                placeholder="••••••••" 
                required
                @focus="focusedField = 'password'" 
                @blur="focusedField = ''"
              >
            </div>
          </div>

          <button type="submit" :disabled="loading" class="btn-auth-submit">
            <span v-if="loading">Validando...</span>
            <span v-else>Entrar na plataforma</span>
          </button>

          <p v-if="error" class="error-banner">
            <AlertCircle class="error-icon" />
            {{ error }}
          </p>

          <div class="auth-footer">
            <p>Ainda não é membro? <NuxtLink to="/register">Solicitar acesso</NuxtLink></p>
          </div>
        </form>
      </div>

      <footer class="main-footer">
        &copy; 2026 Clube Florescer. Design de Elite.
      </footer>
    </main>
  </div>
</template>

<script setup>
import { Mail, Lock, AlertCircle } from 'lucide-vue-next'

definePageMeta({
  layout: false
})

const form = reactive({
  email: '',
  password: ''
})
const loading = ref(false)
const error = ref('')
const focusedField = ref('')

const handleLogin = async () => {
  loading.value = true
  error.value = ''
  try {
    const data = await $fetch('http://localhost:3001/api/auth/login', {
      method: 'POST',
      body: form
    })
    
    // Salva no localStorage como fallback ou para persistência simples
    localStorage.setItem('auth_token', data.token)
    localStorage.setItem('user_role', data.user.role)
    localStorage.setItem('user_name', data.user.name)
    localStorage.setItem('user_id', data.user.id)
    
    navigateTo('/dashboard')
  } catch (err) {
    console.error("Erro completo:", err);
    if (err.data && err.data.message) {
      error.value = err.data.message; // Erro vindo do backend (ex: senha incorreta)
    } else {
      error.value = 'Erro de conexão com o servidor. O backend está rodando na porta 3001?';
    }
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

.visual-content h1 span {
  color: #a8d5a2;
}

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

.auth-header {
  margin-bottom: 3rem;
}

.auth-header h2 {
  font-size: 2rem;
  font-weight: 800;
  color: #111;
  margin-bottom: 0.8rem;
}

.auth-header p {
  color: #777;
  font-size: 1rem;
}

.auth-form {
  display: flex;
  flex-direction: column;
  gap: 1.8rem;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
}

.label-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.form-group label {
  font-size: 0.85rem;
  font-weight: 700;
  color: #444;
}

.forgot-link {
  font-size: 0.8rem;
  font-weight: 700;
  color: var(--primary);
  text-decoration: none;
}

.input-wrapper {
  display: flex;
  align-items: center;
  background: white;
  border: 1.5px solid #eee;
  border-radius: 12px;
  padding: 0 1rem;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.input-icon {
  width: 20px;
  height: 20px;
  color: #ccc;
  transition: color 0.3s;
}

.input-wrapper input {
  flex: 1;
  border: none;
  background: transparent;
  padding: 1.1rem 0.8rem;
  font-family: 'Figtree', sans-serif;
  font-size: 1rem;
  color: #111;
  outline: none;
}

.form-group.focused .input-wrapper {
  border-color: var(--primary);
  box-shadow: 0 0 0 4px rgba(45, 90, 39, 0.05);
}

.form-group.focused .input-icon {
  color: var(--primary);
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
  margin-top: 0.5rem;
}

.btn-auth-submit:hover:not(:disabled) {
  background: var(--primary-light);
  transform: translateY(-2px);
  box-shadow: 0 10px 20px rgba(45, 90, 39, 0.15);
}

.btn-auth-submit:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.error-banner {
  background: #fff5f5;
  border: 1px solid #fed7d7;
  color: #c53030;
  padding: 1rem;
  border-radius: 10px;
  font-size: 0.9rem;
  display: flex;
  align-items: center;
  gap: 10px;
  font-weight: 600;
}

.error-icon { width: 18px; height: 18px; }

.auth-footer {
  margin-top: 2rem;
  text-align: center;
  padding-top: 2rem;
  border-top: 1px solid #f0f0f0;
}

.auth-footer p {
  font-size: 0.95rem;
  color: #888;
}

.auth-footer a {
  color: var(--primary);
  text-decoration: none;
  font-weight: 800;
}

.main-footer {
  margin-top: 4rem;
  font-size: 0.8rem;
  color: #ccc;
  font-weight: 600;
}
</style>
