import { Request, Response } from "express";
import {
  createAgendaAppointment,
  deleteAgendaAppointment,
  listAgendaAppointments,
  searchAgendaAppointments,
  updateAgendaAppointment,
} from "../services/agenda.service";

export class AgendaController {
  async list(req: Request, res: Response) {
    try {
      const nutriId = req.user?.id;
      if (!nutriId) {
        res.status(401).json({ message: "Não autenticado." });
        return;
      }
      const from = typeof req.query.from === "string" ? req.query.from : undefined;
      const to = typeof req.query.to === "string" ? req.query.to : undefined;
      const appointments = await listAgendaAppointments(nutriId, { from, to });
      res.json({ appointments });
    } catch (err) {
      console.error("[agenda.list]", err);
      res.status(500).json({ message: "Erro ao carregar agenda." });
    }
  }

  async search(req: Request, res: Response) {
    try {
      const nutriId = req.user?.id;
      if (!nutriId) {
        res.status(401).json({ message: "Não autenticado." });
        return;
      }
      const q = typeof req.query.q === "string" ? req.query.q : "";
      const limit = req.query.limit ? Number(req.query.limit) : 20;
      const appointments = await searchAgendaAppointments(nutriId, q, limit);
      res.json({ appointments });
    } catch (err) {
      console.error("[agenda.search]", err);
      res.status(500).json({ message: "Erro ao buscar na agenda." });
    }
  }

  async create(req: Request, res: Response) {
    try {
      const nutriId = req.user?.id;
      if (!nutriId) {
        res.status(401).json({ message: "Não autenticado." });
        return;
      }
      const appointment = await createAgendaAppointment(nutriId, req.body || {});
      res.status(201).json({ appointment });
    } catch (err: any) {
      const message = err?.message || "Erro ao criar agendamento.";
      res.status(message.includes("inválid") || message.includes("encontrado") ? 400 : 500).json({ message });
    }
  }

  async update(req: Request, res: Response) {
    try {
      const nutriId = req.user?.id;
      if (!nutriId) {
        res.status(401).json({ message: "Não autenticado." });
        return;
      }
      const appointment = await updateAgendaAppointment(nutriId, req.params.id, req.body || {});
      res.json({ appointment });
    } catch (err: any) {
      const message = err?.message || "Erro ao atualizar agendamento.";
      res.status(message.includes("encontrado") || message.includes("inválid") ? 400 : 500).json({ message });
    }
  }

  async remove(req: Request, res: Response) {
    try {
      const nutriId = req.user?.id;
      if (!nutriId) {
        res.status(401).json({ message: "Não autenticado." });
        return;
      }
      await deleteAgendaAppointment(nutriId, req.params.id);
      res.json({ ok: true });
    } catch (err: any) {
      const message = err?.message || "Erro ao excluir agendamento.";
      res.status(message.includes("encontrado") ? 404 : 500).json({ message });
    }
  }
}
