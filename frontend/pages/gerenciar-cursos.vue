<template>
  <NuxtLayout name="dashboard">
    <div class="manage-courses">
      <div class="page-header">
        <h1>Gerenciar Cursos</h1>
        <button @click="showCreateModal = true" class="btn-primary">Criar Novo Curso</button>
      </div>

      <div class="courses-list">
        <div v-for="course in courses" :key="course.id" class="course-item">
          <div class="course-info">
            <h3>{{ course.title }}</h3>
            <p>{{ course.description }}</p>
          </div>
          <div class="course-actions">
            <button @click="handleDeleteCourse(course.id)" class="btn-delete">Excluir</button>
          </div>
        </div>
      </div>

      <!-- Create Course Modal -->
      <div v-if="showCreateModal" class="modal-overlay">
        <div class="modal-card">
          <h2>Novo Curso</h2>
          <div class="form-group">
            <label>Título</label>
            <input v-model="newCourse.title" placeholder="Nome do curso" />
          </div>
          <div class="form-group">
            <label>Descrição</label>
            <textarea v-model="newCourse.description" placeholder="Breve descrição"></textarea>
          </div>
          <div class="modal-actions">
            <button @click="showCreateModal = false" class="btn-cancel">Cancelar</button>
            <button @click="handleCreateCourse" class="btn-primary">Criar</button>
          </div>
        </div>
      </div>
    </div>
  </NuxtLayout>
</template>

<script setup>
const courses = ref([])
const showCreateModal = ref(false)
const newCourse = reactive({ title: '', description: '' })

const fetchCourses = async () => {
  try {
    const token = localStorage.getItem('auth_token')
    const data = await $fetch('http://localhost:3001/api/courses', {
      headers: { Authorization: `Bearer ${token}` }
    })
    courses.value = data
  } catch (err) {
    console.error('Erro:', err)
  }
}

const handleCreateCourse = async () => {
  try {
    const token = localStorage.getItem('auth_token')
    await $fetch('http://localhost:3001/api/courses', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: newCourse
    })
    showCreateModal.value = false
    fetchCourses()
  } catch (err) {
    alert('Erro ao criar curso.')
  }
}

const handleDeleteCourse = async (id) => {
  if (!confirm('Deseja excluir este curso?')) return
  try {
    const token = localStorage.getItem('auth_token')
    await $fetch(`http://localhost:3001/api/courses/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` }
    })
    fetchCourses()
  } catch (err) {
    alert('Erro ao excluir.')
  }
}

onMounted(fetchPosts) // Reutilizando a lógica de montagem
onMounted(fetchCourses)
</script>

<style scoped>
.manage-courses {
  max-width: 1000px;
  margin: 0 auto;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
}

.course-item {
  background: white;
  padding: 1.5rem;
  border-radius: 12px;
  margin-bottom: 1rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  box-shadow: 0 2px 10px rgba(0,0,0,0.05);
}

.btn-primary {
  background: var(--primary);
  color: white;
  border: none;
  padding: 0.8rem 1.5rem;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 600;
}

.btn-delete {
  color: var(--error);
  background: transparent;
  border: 1px solid var(--error);
  padding: 0.5rem 1rem;
  border-radius: 6px;
  cursor: pointer;
}

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0,0,0,0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 100;
}

.modal-card {
  background: white;
  padding: 2rem;
  border-radius: 12px;
  width: 400px;
}

.form-group {
  margin-bottom: 1.2rem;
}

.form-group input, .form-group textarea {
  width: 100%;
  padding: 0.7rem;
  border: 1px solid #ddd;
  border-radius: 8px;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
  margin-top: 2rem;
}

.btn-cancel {
  background: transparent;
  border: none;
  cursor: pointer;
}
</style>
