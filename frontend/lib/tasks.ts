import { apiFetch } from './api'

export type TaskPriority = 'URGENTE' | 'IMPORTANTE' | 'NORMAL' | 'SOMEDAY'

export interface Task {
  id: string
  title: string
  description?: string | null
  priority: TaskPriority
  color?: string | null
  done: boolean
  position: number
  createdAt: string
  updatedAt: string
}

export async function fetchTasks(): Promise<Task[]> {
  const data = await apiFetch<{ tasks: Task[] }>('/tasks')
  return data.tasks ?? []
}

export async function createTask(data: {
  title: string
  priority: TaskPriority
  description?: string
  color?: string
}): Promise<Task> {
  const res = await apiFetch<{ task: Task }>('/tasks', {
    method: 'POST',
    body: JSON.stringify(data),
  })
  return res.task
}

export async function updateTask(
  id: string,
  data: Partial<{ title: string; priority: TaskPriority; color: string | null; done: boolean; position: number }>,
): Promise<Task> {
  const res = await apiFetch<{ task: Task }>(`/tasks/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  })
  return res.task
}

export async function deleteTask(id: string): Promise<void> {
  await apiFetch(`/tasks/${id}`, { method: 'DELETE' })
}
