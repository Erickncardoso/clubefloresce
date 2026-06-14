import { Request, Response } from "express";
import bcrypt from "bcrypt";
import { Role, UserPlan, UserStatus } from "@prisma/client";
import { UserMgmtRepository } from "../repositories/user_mgmt.repository";
import { UserRepository } from "../repositories/user.repository";
import { RegistrationRequestService } from "../services/registration-request.service";

const userRepo = new UserRepository();
const registrationRequestService = new RegistrationRequestService();
export class UserMgmtController {
  private userMgmtRepo: UserMgmtRepository;

  constructor() {
    this.userMgmtRepo = new UserMgmtRepository();
  }

  getAll = async (_req: Request, res: Response) => {
    try {
      const users = await this.userMgmtRepo.getAllUsers();
      res.json(users);
    } catch {
      res.status(500).json({ error: "Erro ao buscar usuários" });
    }
  };

  listRegistrationRequests = async (_req: Request, res: Response) => {
    try {
      const requests = await registrationRequestService.listPendingRequests();
      res.json({ requests });
    } catch {
      res.status(500).json({ error: "Erro ao buscar solicitações de cadastro" });
    }
  };

  getById = async (req: Request, res: Response) => {
    try {
      const user = await this.userMgmtRepo.getUserById(req.params.id);
      if (!user) {
        return res.status(404).json({ error: "Usuário não encontrado" });
      }
      return res.json(user);
    } catch {
      return res.status(500).json({ error: "Erro ao buscar usuário" });
    }
  };

  createPatient = async (req: Request, res: Response) => {
    try {
      const { name, email, password, plan, status } = req.body;

      if (!name?.trim() || !email?.trim() || !password?.trim()) {
        return res.status(400).json({ error: "Nome, e-mail e senha são obrigatórios." });
      }

      const existing = await userRepo.findByEmail(String(email).trim().toLowerCase());
      if (existing) {
        return res.status(400).json({ error: "E-mail já cadastrado." });
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      const normalizedEmail = String(email).trim().toLowerCase();
      const user = await this.userMgmtRepo.createPatient({
        name: String(name).trim(),
        email: normalizedEmail,
        password: hashedPassword,
        plan: plan as UserPlan | undefined,
        status: status as UserStatus | undefined,
      });

      await registrationRequestService.approveByEmail(normalizedEmail).catch(() => {});

      return res.status(201).json(user);
    } catch {
      return res.status(500).json({ error: "Erro ao criar paciente" });
    }
  };

  updatePatient = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const existing = await this.userMgmtRepo.getUserById(id);
      if (!existing) {
        return res.status(404).json({ error: "Usuário não encontrado" });
      }
      if (existing.role !== Role.PACIENTE) {
        return res.status(400).json({ error: "Somente pacientes podem ser editados aqui." });
      }

      const { name, status, plan } = req.body;
      const user = await this.userMgmtRepo.updatePatient(id, {
        ...(name ? { name: String(name).trim() } : {}),
        ...(status ? { status } : {}),
        ...(plan ? { plan } : {}),
      });

      return res.json(user);
    } catch {
      return res.status(500).json({ error: "Erro ao atualizar paciente" });
    }
  };

  updateStatus = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const existing = await this.userMgmtRepo.getUserById(id);
      if (!existing) {
        return res.status(404).json({ error: "Usuário não encontrado" });
      }
      if (existing.role !== Role.PACIENTE) {
        return res.status(400).json({ error: "Somente pacientes podem ter o status alterado aqui." });
      }
      if (req.user?.id === id) {
        return res.status(400).json({ error: "Não é possível alterar o próprio status." });
      }

      const { status } = req.body;
      const user = await this.userMgmtRepo.updateUserStatus(id, status);
      res.json(user);
    } catch {
      res.status(500).json({ error: "Erro ao atualizar status" });
    }
  };

  delete = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      if (req.user?.id === id) {
        return res.status(400).json({ error: "Não é possível excluir a própria conta." });
      }

      const existing = await this.userMgmtRepo.getUserById(id);
      if (!existing) {
        return res.status(404).json({ error: "Usuário não encontrado" });
      }
      if (existing.role !== Role.PACIENTE) {
        return res.status(400).json({ error: "Somente pacientes podem ser excluídos aqui." });
      }

      await this.userMgmtRepo.deleteUser(id);
      res.status(204).send();
    } catch {
      res.status(500).json({ error: "Erro ao excluir usuário" });
    }
  };
}
