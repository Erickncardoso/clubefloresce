import { Request, Response } from "express";
import bcrypt from "bcrypt";
import { Role, UserPlan, UserStatus } from "@prisma/client";
import { UserMgmtRepository } from "../repositories/user_mgmt.repository";
import { UserRepository } from "../repositories/user.repository";
import { RegistrationRequestService } from "../services/registration-request.service";
import {
  approvalWhatsappService,
  DEFAULT_APPROVAL_WHATSAPP_TEMPLATE,
  dispatchApprovalWhatsapp,
  WHATSAPP_FORMAT_HINT,
} from "../services/approval-whatsapp.service";
import { upgradeApprovalTemplate } from "../utils/whatsapp-message-format";
import { parseAccessExpiresAt } from "../utils/access-expires";
import { dispatchEmail, emailService } from "../services/email/email.service";

const userRepo = new UserRepository();
const registrationRequestService = new RegistrationRequestService();
const userMgmtRepo = new UserMgmtRepository();

type ApprovedPatient = {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  accessExpiresAt?: Date | null;
  approvalWhatsappMessage?: string | null;
};

function notifyPatientApproved(nutriUserId: string, user: ApprovedPatient) {
  dispatchEmail(
    (async () => {
      await emailService.sendRegistrationApproved({
        name: user.name,
        email: user.email,
        accessExpiresAt: user.accessExpiresAt,
      });
      await userMgmtRepo.markApprovalEmailSent(user.id);
    })(),
    "aprovação de cadastro",
  );

  if (!user.phone?.trim()) return;

  dispatchApprovalWhatsapp(
    (async () => {
      await approvalWhatsappService.sendApprovalMessage({
        nutriUserId,
        phone: user.phone,
        name: user.name,
        accessExpiresAt: user.accessExpiresAt,
        messageOverride: user.approvalWhatsappMessage,
      });
      await userMgmtRepo.markApprovalWhatsappSent(user.id);
    })(),
    "aprovação de cadastro",
  );
}

export class UserMgmtController {
  private userMgmtRepo: UserMgmtRepository;

  constructor() {
    this.userMgmtRepo = new UserMgmtRepository();
  }

  getAll = async (_req: Request, res: Response) => {
    try {
      const users = await this.userMgmtRepo.getAllUsers();
      res.json(users);
    } catch (error: any) {
      console.error("[users] getAll:", error?.message || error);
      res.status(500).json({ error: "Erro ao buscar usuários" });
    }
  };

  listRegistrationRequests = async (_req: Request, res: Response) => {
    try {
      const requests = await registrationRequestService.listPendingRequests();
      res.json({ requests });
    } catch (error: any) {
      console.error("[users] listRegistrationRequests:", error?.message || error);
      res.status(500).json({ error: "Erro ao buscar solicitações de cadastro" });
    }
  };

  rejectRegistrationRequest = async (req: Request, res: Response) => {
    try {
      await registrationRequestService.rejectRequest(String(req.params.id));
      return res.status(204).send();
    } catch (error: any) {
      const message = error?.message || "Erro ao reprovar solicitação.";
      const status = message.includes("inválida") || message.includes("processada") ? 400 : 500;
      return res.status(status).json({ error: message });
    }
  };

  getApprovalWhatsappTemplate = async (_req: Request, res: Response) => {
    try {
      const message = await approvalWhatsappService.getTemplate();
      return res.json({
        message,
        placeholders: ["{{nome}}", "{{primeiroNome}}", "{{linkApp}}", "{{acessoAte}}"],
        formatHint: WHATSAPP_FORMAT_HINT,
        defaultMessage: DEFAULT_APPROVAL_WHATSAPP_TEMPLATE,
      });
    } catch (error: any) {
      console.error("[users] getApprovalWhatsappTemplate:", error?.message || error);
      return res.status(500).json({ error: "Erro ao buscar mensagem de WhatsApp." });
    }
  };

  updateApprovalWhatsappTemplate = async (req: Request, res: Response) => {
    try {
      const message = await approvalWhatsappService.updateTemplate(String(req.body?.message || ""));
      return res.json({ message });
    } catch (error: any) {
      const status = error?.message?.includes("Informe") || error?.message?.includes("máximo") ? 400 : 500;
      return res.status(status).json({ error: error?.message || "Erro ao salvar mensagem de WhatsApp." });
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
      const nutriUserId = req.user?.id;
      if (!nutriUserId) {
        return res.status(401).json({ error: "Não autenticado." });
      }

      const {
        name,
        email,
        password,
        plan,
        status,
        accessExpiresAt,
        registrationRequestId,
      } = req.body;

      if (!name?.trim() || !email?.trim()) {
        return res.status(400).json({ error: "Nome e e-mail são obrigatórios." });
      }

      const normalizedEmail = String(email).trim().toLowerCase();
      let hashedPassword: string;
      let patientPhone: string | null = null;

      if (registrationRequestId) {
        const request = await registrationRequestService.getRequestForApproval(
          String(registrationRequestId),
        );

        if (!request) {
          return res.status(400).json({ error: "Solicitação inválida ou já processada." });
        }

        if (request.email !== normalizedEmail) {
          return res.status(400).json({ error: "O e-mail não corresponde à solicitação selecionada." });
        }

        if (!request.passwordHash) {
          return res.status(400).json({
            error: "Esta solicitação não possui senha definida. Peça para a aluna enviar novamente.",
          });
        }

        hashedPassword = request.passwordHash;
        patientPhone = request.phone?.trim() || null;
      } else {
        if (!password?.trim()) {
          return res.status(400).json({ error: "Nome, e-mail e senha são obrigatórios." });
        }
        hashedPassword = await bcrypt.hash(password, 10);
      }

      let parsedAccessExpiresAt: Date | null = null;
      if (accessExpiresAt !== undefined && accessExpiresAt !== null && String(accessExpiresAt).trim() !== "") {
        try {
          parsedAccessExpiresAt = parseAccessExpiresAt(accessExpiresAt);
        } catch (error: any) {
          return res.status(400).json({ error: error.message || "Data de acesso inválida." });
        }
      }

      const existing = await userRepo.findByEmail(normalizedEmail);
      if (existing) {
        return res.status(400).json({ error: "E-mail já cadastrado." });
      }

      const user = await this.userMgmtRepo.createPatient({
        name: String(name).trim(),
        email: normalizedEmail,
        password: hashedPassword,
        phone: patientPhone,
        plan: plan as UserPlan | undefined,
        status: (status as UserStatus | undefined) || UserStatus.ATIVO,
        accessExpiresAt: parsedAccessExpiresAt,
      });

      await registrationRequestService.approveByEmail(normalizedEmail).catch(() => {});

      if (registrationRequestId) {
        notifyPatientApproved(nutriUserId, user);
      }

      return res.status(201).json(user);
    } catch {
      return res.status(500).json({ error: "Erro ao criar paciente" });
    }
  };

  updatePatient = async (req: Request, res: Response) => {
    try {
      const nutriUserId = req.user?.id;
      if (!nutriUserId) {
        return res.status(401).json({ error: "Não autenticado." });
      }

      const { id } = req.params;
      const existing = await this.userMgmtRepo.getUserById(id);
      if (!existing) {
        return res.status(404).json({ error: "Usuário não encontrado" });
      }
      if (existing.role !== Role.PACIENTE) {
        return res.status(400).json({ error: "Somente pacientes podem ser editados aqui." });
      }

      const { name, phone, status, plan, accessExpiresAt } = req.body;

      let parsedAccessExpiresAt: Date | null | undefined;
      if (accessExpiresAt !== undefined) {
        if (accessExpiresAt === null || String(accessExpiresAt).trim() === "") {
          parsedAccessExpiresAt = null;
        } else {
          try {
            parsedAccessExpiresAt = parseAccessExpiresAt(accessExpiresAt);
          } catch (error: any) {
            return res.status(400).json({ error: error.message || "Data de acesso inválida." });
          }
        }
      }

      let parsedPhone: string | null | undefined;
      if (phone !== undefined) {
        parsedPhone = phone === null || String(phone).trim() === "" ? null : String(phone).trim();
      }

      const user = await this.userMgmtRepo.updatePatient(id, {
        ...(name ? { name: String(name).trim() } : {}),
        ...(parsedPhone !== undefined ? { phone: parsedPhone } : {}),
        ...(status ? { status } : {}),
        ...(plan ? { plan } : {}),
        ...(parsedAccessExpiresAt !== undefined ? { accessExpiresAt: parsedAccessExpiresAt } : {}),
      });

      if (
        status === UserStatus.ATIVO &&
        existing.status === UserStatus.PENDENTE
      ) {
        notifyPatientApproved(nutriUserId, user);
      }

      return res.json(user);
    } catch {
      return res.status(500).json({ error: "Erro ao atualizar paciente" });
    }
  };

  updateStatus = async (req: Request, res: Response) => {
    try {
      const nutriUserId = req.user?.id;
      if (!nutriUserId) {
        return res.status(401).json({ error: "Não autenticado." });
      }

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

      if (
        status === UserStatus.ATIVO &&
        existing.status === UserStatus.PENDENTE
      ) {
        notifyPatientApproved(nutriUserId, user);
      }

      res.json(user);
    } catch {
      res.status(500).json({ error: "Erro ao atualizar status" });
    }
  };

  resendApprovalEmail = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const existing = await this.userMgmtRepo.getUserById(id);
      if (!existing) {
        return res.status(404).json({ error: "Usuário não encontrado" });
      }
      if (existing.role !== Role.PACIENTE) {
        return res.status(400).json({ error: "Somente pacientes podem receber este e-mail." });
      }
      if (existing.status !== UserStatus.ATIVO) {
        return res.status(400).json({ error: "A aluna precisa estar ativa para receber o e-mail de aprovação." });
      }

      await emailService.sendRegistrationApproved({
        name: existing.name,
        email: existing.email,
        accessExpiresAt: existing.accessExpiresAt,
      });

      const user = await this.userMgmtRepo.markApprovalEmailSent(id);
      return res.json(user);
    } catch (error: any) {
      console.error("[users] resendApprovalEmail:", error?.message || error);
      return res.status(500).json({ error: "Erro ao reenviar e-mail de aprovação." });
    }
  };

  resendApprovalWhatsapp = async (req: Request, res: Response) => {
    try {
      const nutriUserId = req.user?.id;
      if (!nutriUserId) {
        return res.status(401).json({ error: "Não autenticado." });
      }

      const { id } = req.params;
      const existing = await this.userMgmtRepo.getUserById(id);
      if (!existing) {
        return res.status(404).json({ error: "Usuário não encontrado" });
      }
      if (existing.role !== Role.PACIENTE) {
        return res.status(400).json({ error: "Somente pacientes podem receber este WhatsApp." });
      }
      if (existing.status !== UserStatus.ATIVO) {
        return res.status(400).json({ error: "A aluna precisa estar ativa para receber o WhatsApp de aprovação." });
      }
      if (!existing.phone?.trim()) {
        return res.status(400).json({ error: "Esta aluna não possui telefone cadastrado." });
      }

      await approvalWhatsappService.sendApprovalMessage({
        nutriUserId,
        phone: existing.phone,
        name: existing.name,
        accessExpiresAt: existing.accessExpiresAt,
        messageOverride: existing.approvalWhatsappMessage,
      });

      const user = await this.userMgmtRepo.markApprovalWhatsappSent(id);
      return res.json(user);
    } catch (error: any) {
      console.error("[users] resendApprovalWhatsapp:", error?.message || error);
      const status = error?.message?.includes("Telefone") ? 400 : 500;
      return res.status(status).json({ error: error?.message || "Erro ao reenviar WhatsApp de aprovação." });
    }
  };

  resendPendingApprovalWhatsapp = async (req: Request, res: Response) => {
    try {
      const nutriUserId = req.user?.id;
      if (!nutriUserId) {
        return res.status(401).json({ error: "Não autenticado." });
      }

      const pending = await this.userMgmtRepo.listPendingApprovalWhatsappPatients();
      let sentCount = 0;
      const errors: Array<{ id: string; name: string; error: string }> = [];

      for (const patient of pending) {
        try {
          await approvalWhatsappService.sendApprovalMessage({
            nutriUserId,
            phone: patient.phone,
            name: patient.name,
            accessExpiresAt: patient.accessExpiresAt,
            messageOverride: patient.approvalWhatsappMessage,
          });
          await this.userMgmtRepo.markApprovalWhatsappSent(patient.id);
          sentCount += 1;
        } catch (error: any) {
          errors.push({
            id: patient.id,
            name: patient.name,
            error: error?.message || "Falha ao enviar.",
          });
        }
      }

      return res.json({
        pendingCount: pending.length,
        sentCount,
        failedCount: errors.length,
        errors,
      });
    } catch (error: any) {
      console.error("[users] resendPendingApprovalWhatsapp:", error?.message || error);
      return res.status(500).json({ error: "Erro ao reenviar WhatsApp pendentes." });
    }
  };

  syncRegistrationPhones = async (_req: Request, res: Response) => {
    try {
      const result = await this.userMgmtRepo.syncPhonesFromRegistrationRequests();
      return res.json(result);
    } catch (error: any) {
      console.error("[users] syncRegistrationPhones:", error?.message || error);
      return res.status(500).json({ error: "Erro ao sincronizar WhatsApp das solicitações." });
    }
  };

  updateApprovalWhatsappMessage = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const existing = await this.userMgmtRepo.getUserById(id);
      if (!existing) {
        return res.status(404).json({ error: "Usuário não encontrado" });
      }
      if (existing.role !== Role.PACIENTE) {
        return res.status(400).json({ error: "Somente pacientes possuem mensagem individual." });
      }

      const rawMessage = req.body?.message;
      if (rawMessage !== null && rawMessage !== undefined && typeof rawMessage !== "string") {
        return res.status(400).json({ error: "Mensagem inválida." });
      }

      const message =
        rawMessage === null || rawMessage === undefined || String(rawMessage).trim() === ""
          ? null
          : upgradeApprovalTemplate(String(rawMessage).trim());

      if (message && message.length > 4000) {
        return res.status(400).json({ error: "A mensagem deve ter no máximo 4000 caracteres." });
      }

      const user = await this.userMgmtRepo.updateApprovalWhatsappMessage(id, message);
      return res.json(user);
    } catch (error: any) {
      console.error("[users] updateApprovalWhatsappMessage:", error?.message || error);
      return res.status(500).json({ error: "Erro ao salvar mensagem individual." });
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
