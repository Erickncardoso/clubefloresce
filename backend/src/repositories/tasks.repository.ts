import { TaskPriority } from "@prisma/client";
import { prisma } from "../lib/prisma";

export async function listTasks(userId: string) {
  return prisma.task.findMany({
    where: { userId },
    orderBy: [{ priority: "asc" }, { position: "asc" }, { createdAt: "asc" }],
  });
}

export async function createTask(
  userId: string,
  data: { title: string; description?: string; priority?: TaskPriority; color?: string },
) {
  const priority = data.priority || "NORMAL";
  const count = await prisma.task.count({ where: { userId, priority } });
  return prisma.task.create({
    data: {
      userId,
      title: data.title.trim(),
      description: data.description?.trim() || null,
      priority,
      color: data.color || null,
      position: count,
    },
  });
}

export async function updateTask(
  userId: string,
  id: string,
  data: Partial<{
    title: string;
    description: string | null;
    priority: TaskPriority;
    color: string | null;
    done: boolean;
    position: number;
  }>,
) {
  const result = await prisma.task.updateMany({
    where: { id, userId },
    data,
  });
  if (result.count === 0) return null;
  return prisma.task.findUnique({ where: { id } });
}

export async function deleteTask(userId: string, id: string) {
  return prisma.task.deleteMany({ where: { id, userId } });
}
