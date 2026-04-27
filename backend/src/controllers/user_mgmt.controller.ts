import { Request, Response } from "express";
import { UserMgmtRepository } from "../repositories/user_mgmt.repository";

export class UserMgmtController {
  private userRepo: UserMgmtRepository;

  constructor() {
    this.userRepo = new UserMgmtRepository();
  }

  getAll = async (req: Request, res: Response) => {
    try {
      const users = await this.userRepo.getAllUsers();
      res.json(users);
    } catch (err) {
      res.status(500).json({ error: "Erro ao buscar usuários" });
    }
  };

  updateStatus = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { status } = req.body;
      const user = await this.userRepo.updateUserStatus(id, status);
      res.json(user);
    } catch (err) {
      res.status(500).json({ error: "Erro ao atualizar status" });
    }
  };

  delete = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      await this.userRepo.deleteUser(id);
      res.status(204).send();
    } catch (err) {
      res.status(500).json({ error: "Erro ao excluir usuário" });
    }
  };
}
