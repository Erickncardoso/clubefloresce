import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export class FinancialController {
  getSummary = async (req: Request, res: Response) => {
    try {
      const transactions = await prisma.transaction.findMany({
        orderBy: { createdAt: "desc" },
      });

      const totalRevenue = transactions.reduce((acc, curr) => {
        return curr.status === "PAID" ? acc + curr.amount : acc;
      }, 0);

      const activeMembers = await prisma.user.count({
        where: { role: "PACIENTE", status: "ATIVO" },
      });

      const recentTransactions = transactions.slice(0, 10);

      res.json({
        totalRevenue,
        activeMembers,
        growth: 12.5, // Mocked for now
        recentTransactions,
      });
    } catch (err) {
      res.status(500).json({ error: "Erro ao buscar resumo financeiro" });
    }
  };

  createTransaction = async (req: Request, res: Response) => {
    try {
      const { amount, status, userId } = req.body;
      const transaction = await prisma.transaction.create({
        data: { amount, status, userId },
      });
      res.status(201).json(transaction);
    } catch (err) {
      res.status(500).json({ error: "Erro ao criar transação" });
    }
  };
}
