import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import { randomUUID } from "crypto";
import { prisma } from "../lib/prisma";

export type AgendaAppointmentStatus = "scheduled" | "completed" | "cancelled";

export type AgendaAppointment = {
  id: string;
  nutriId: string;
  patientId: string;
  patientName: string;
  patientAvatar?: string | null;
  startsAt: string;
  durationMin: number;
  title: string;
  notes?: string | null;
  status: AgendaAppointmentStatus;
  createdAt: string;
  updatedAt: string;
};

const STORE_PATH = join(process.cwd(), ".data", "agenda-appointments.json");

type StoreShape = Record<string, AgendaAppointment[]>;

function ensureStoreDir() {
  const dir = dirname(STORE_PATH);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
}

function loadStore(): StoreShape {
  try {
    if (!existsSync(STORE_PATH)) return {};
    const raw = JSON.parse(readFileSync(STORE_PATH, "utf8"));
    return raw && typeof raw === "object" ? raw : {};
  } catch {
    return {};
  }
}

function saveStore(store: StoreShape) {
  ensureStoreDir();
  writeFileSync(STORE_PATH, JSON.stringify(store, null, 2), "utf8");
}

function listForNutri(store: StoreShape, nutriId: string): AgendaAppointment[] {
  return Array.isArray(store[nutriId]) ? store[nutriId] : [];
}

function normalizeAppointment(input: Partial<AgendaAppointment>, nutriId: string): AgendaAppointment | null {
  const patientId = String(input.patientId || "").trim();
  const patientName = String(input.patientName || "").trim();
  const startsAt = String(input.startsAt || "").trim();
  if (!patientId || !patientName || !startsAt) return null;

  const date = new Date(startsAt);
  if (Number.isNaN(date.getTime())) return null;

  const now = new Date().toISOString();
  const durationMin = Math.min(Math.max(Number(input.durationMin) || 60, 15), 240);
  const status = input.status === "completed" || input.status === "cancelled" ? input.status : "scheduled";

  return {
    id: String(input.id || randomUUID()),
    nutriId,
    patientId,
    patientName,
    patientAvatar: input.patientAvatar ?? null,
    startsAt: date.toISOString(),
    durationMin,
    title: String(input.title || "Consulta").trim() || "Consulta",
    notes: input.notes != null ? String(input.notes) : null,
    status,
    createdAt: input.createdAt || now,
    updatedAt: now,
  };
}

function inRange(startsAt: string, from?: string, to?: string) {
  const time = new Date(startsAt).getTime();
  if (Number.isNaN(time)) return false;
  if (from) {
    const fromTime = new Date(from).getTime();
    if (!Number.isNaN(fromTime) && time < fromTime) return false;
  }
  if (to) {
    const toTime = new Date(to).getTime();
    if (!Number.isNaN(toTime) && time > toTime) return false;
  }
  return true;
}

export async function listAgendaAppointments(
  nutriId: string,
  options: { from?: string; to?: string } = {},
) {
  const store = loadStore();
  const items = listForNutri(store, nutriId)
    .filter((item) => inRange(item.startsAt, options.from, options.to))
    .sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime());

  return items;
}

export async function searchAgendaAppointments(nutriId: string, query: string, limit = 20) {
  const q = String(query || "").trim().toLowerCase();
  if (!q) return [];

  const store = loadStore();
  return listForNutri(store, nutriId)
    .filter((item) => {
      const name = item.patientName.toLowerCase();
      const title = String(item.title || "").toLowerCase();
      return name.includes(q) || title.includes(q);
    })
    .sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime())
    .slice(0, Math.min(Math.max(limit, 1), 50));
}

export async function createAgendaAppointment(
  nutriId: string,
  payload: Partial<AgendaAppointment>,
) {
  const next = normalizeAppointment(payload, nutriId);
  if (!next) throw new Error("Dados do agendamento inválidos.");

  const patient = await prisma.user.findFirst({
    where: { id: next.patientId, role: "PACIENTE" },
    select: { id: true, name: true, avatar: true },
  });
  if (!patient) throw new Error("Paciente não encontrado.");

  next.patientName = patient.name;
  next.patientAvatar = patient.avatar;

  const store = loadStore();
  const list = listForNutri(store, nutriId);
  list.push(next);
  store[nutriId] = list;
  saveStore(store);
  return next;
}

export async function updateAgendaAppointment(
  nutriId: string,
  id: string,
  payload: Partial<AgendaAppointment>,
) {
  const store = loadStore();
  const list = listForNutri(store, nutriId);
  const index = list.findIndex((item) => item.id === id);
  if (index < 0) throw new Error("Agendamento não encontrado.");

  const current = list[index];
  const merged = normalizeAppointment({ ...current, ...payload, id: current.id, createdAt: current.createdAt }, nutriId);
  if (!merged) throw new Error("Dados do agendamento inválidos.");

  if (payload.patientId && payload.patientId !== current.patientId) {
    const patient = await prisma.user.findFirst({
      where: { id: merged.patientId, role: "PACIENTE" },
      select: { id: true, name: true, avatar: true },
    });
    if (!patient) throw new Error("Paciente não encontrado.");
    merged.patientName = patient.name;
    merged.patientAvatar = patient.avatar;
  }

  merged.updatedAt = new Date().toISOString();
  list[index] = merged;
  store[nutriId] = list;
  saveStore(store);
  return merged;
}

export async function deleteAgendaAppointment(nutriId: string, id: string) {
  const store = loadStore();
  const list = listForNutri(store, nutriId);
  const next = list.filter((item) => item.id !== id);
  if (next.length === list.length) throw new Error("Agendamento não encontrado.");
  store[nutriId] = next;
  saveStore(store);
  return { ok: true };
}
