import { Request, Response } from "express";
import {
  listTasks,
  createTask,
  updateTask,
  deleteTask,
  isValidPriority,
} from "../services/tasks.service";

export class TasksController {
  async list(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) { res.status(401).json({ message: "Não autenticado." }); return; }
      const tasks = await listTasks(userId);
      res.json({ tasks });
    } catch (err) {
      console.error("[tasks.list]", err);
      res.status(500).json({ message: "Erro ao carregar tarefas." });
    }
  }

  async create(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) { res.status(401).json({ message: "Não autenticado." }); return; }
      const { title, description, priority, color } = req.body || {};
      if (!title || typeof title !== "string" || !title.trim()) {
        res.status(400).json({ message: "Título é obrigatório." });
        return;
      }
      if (priority !== undefined && !isValidPriority(priority)) {
        res.status(400).json({ message: "Prioridade inválida." });
        return;
      }
      const task = await createTask(userId, { title, description, priority, color });
      res.status(201).json({ task });
    } catch (err) {
      console.error("[tasks.create]", err);
      res.status(500).json({ message: "Erro ao criar tarefa." });
    }
  }

  async update(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) { res.status(401).json({ message: "Não autenticado." }); return; }
      const { id } = req.params;
      const { title, description, priority, color, done, position } = req.body || {};
      const patch: Record<string, unknown> = {};
      if (title !== undefined) {
        if (typeof title !== "string" || !title.trim()) {
          res.status(400).json({ message: "Título inválido." }); return;
        }
        patch.title = title.trim();
      }
      if (description !== undefined) patch.description = description || null;
      if (color !== undefined) patch.color = color || null;
      if (priority !== undefined) {
        if (!isValidPriority(priority)) {
          res.status(400).json({ message: "Prioridade inválida." }); return;
        }
        patch.priority = priority;
      }
      if (done !== undefined) patch.done = Boolean(done);
      if (position !== undefined) patch.position = Number(position);
      const task = await updateTask(userId, id, patch as any);
      if (!task) { res.status(404).json({ message: "Tarefa não encontrada." }); return; }
      res.json({ task });
    } catch (err) {
      console.error("[tasks.update]", err);
      res.status(500).json({ message: "Erro ao atualizar tarefa." });
    }
  }

  async remove(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) { res.status(401).json({ message: "Não autenticado." }); return; }
      const { id } = req.params;
      await deleteTask(userId, id);
      res.json({ ok: true });
    } catch (err) {
      console.error("[tasks.remove]", err);
      res.status(500).json({ message: "Erro ao excluir tarefa." });
    }
  }
}
