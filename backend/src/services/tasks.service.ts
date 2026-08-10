import { TaskPriority } from "@prisma/client";
import { listTasks, createTask, updateTask, deleteTask } from "../repositories/tasks.repository";

export { listTasks, createTask, updateTask, deleteTask };

const VALID_PRIORITIES: TaskPriority[] = ["URGENTE", "IMPORTANTE", "NORMAL", "SOMEDAY"];

export function isValidPriority(p: unknown): p is TaskPriority {
  return typeof p === "string" && VALID_PRIORITIES.includes(p as TaskPriority);
}
