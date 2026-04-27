import test from "node:test";
import assert from "node:assert/strict";
import express from "express";
import request from "supertest";
import { WhatsappController } from "../controllers/whatsapp.controller";
import { WhatsappService } from "../services/whatsapp.service";

type RouteCase = {
  id: string;
  method: "get" | "post";
  path: string;
  serviceMethod: keyof WhatsappService;
  validBody?: Record<string, any>;
  validQuery?: Record<string, any>;
  invalidBody?: Record<string, any>;
};

const ROUTE_CASES: RouteCase[] = [
  { id: "create", method: "post", path: "/group/create", serviceMethod: "createGroup", validBody: { name: "Grupo Teste", participants: ["5511999999999"] }, invalidBody: { name: "", participants: [] } },
  { id: "info", method: "post", path: "/group/info", serviceMethod: "getGroupInfo", validBody: { groupjid: "120363324255083289@g.us", force: true }, invalidBody: { groupjid: "invalido" } },
  { id: "inviteInfo", method: "post", path: "/group/inviteInfo", serviceMethod: "getGroupInviteInfo", validBody: { invitecode: "https://chat.whatsapp.com/INVITE123" }, invalidBody: { invitecode: "" } },
  { id: "join", method: "post", path: "/group/join", serviceMethod: "joinGroup", validBody: { invitecode: "https://chat.whatsapp.com/INVITE123" }, invalidBody: { invitecode: "" } },
  { id: "leave", method: "post", path: "/group/leave", serviceMethod: "leaveGroup", validBody: { groupjid: "120363324255083289@g.us" }, invalidBody: { groupjid: "abc" } },
  { id: "list-get", method: "get", path: "/group/list", serviceMethod: "getAllGroups", validQuery: { force: "true", noparticipants: "false" } },
  { id: "list-post", method: "post", path: "/group/list", serviceMethod: "listGroupsPaginated", validBody: { limit: 50, offset: 0, search: "grupo", force: false, noParticipants: true } },
  { id: "resetInviteCode", method: "post", path: "/group/resetInviteCode", serviceMethod: "resetGroupInviteCode", validBody: { groupjid: "120363324255083289@g.us" }, invalidBody: { groupjid: "abc" } },
  { id: "updateAnnounce", method: "post", path: "/group/updateAnnounce", serviceMethod: "updateGroupAnnounce", validBody: { groupjid: "120363324255083289@g.us", announce: true }, invalidBody: { groupjid: "120363324255083289@g.us" } },
  { id: "updateDescription", method: "post", path: "/group/updateDescription", serviceMethod: "updateGroupDescription", validBody: { groupjid: "120363324255083289@g.us", description: "Nova descrição" }, invalidBody: { groupjid: "120363324255083289@g.us", description: "" } },
  { id: "updateImage", method: "post", path: "/group/updateImage", serviceMethod: "updateGroupImage", validBody: { groupjid: "120363324255083289@g.us", image: "delete" }, invalidBody: { groupjid: "120363324255083289@g.us", image: "" } },
  { id: "updateLocked", method: "post", path: "/group/updateLocked", serviceMethod: "updateGroupLocked", validBody: { groupjid: "120363324255083289@g.us", locked: true }, invalidBody: { groupjid: "120363324255083289@g.us" } },
  { id: "updateName", method: "post", path: "/group/updateName", serviceMethod: "updateGroupName", validBody: { groupjid: "120363324255083289@g.us", name: "Grupo X" }, invalidBody: { groupjid: "120363324255083289@g.us", name: "" } },
  { id: "updateParticipants", method: "post", path: "/group/updateParticipants", serviceMethod: "updateGroupParticipants", validBody: { groupjid: "120363324255083289@g.us", action: "add", participants: ["5511999999999"] }, invalidBody: { groupjid: "120363324255083289@g.us", action: "invalid", participants: [] } }
];

const originalMethods = new Map<keyof WhatsappService, any>();
const touchedMethods = new Set<keyof WhatsappService>();

const setServiceMock = (method: keyof WhatsappService, impl: any) => {
  if (!touchedMethods.has(method)) {
    originalMethods.set(method, (WhatsappService as any).prototype[method]);
    touchedMethods.add(method);
  }
  (WhatsappService as any).prototype[method] = impl;
};

const restoreServiceMethods = () => {
  for (const method of touchedMethods) {
    (WhatsappService as any).prototype[method] = originalMethods.get(method);
  }
  touchedMethods.clear();
  originalMethods.clear();
};

const buildTestApp = () => {
  const app = express();
  const controller = new WhatsappController();
  app.use(express.json());

  app.use((req: any, _res, next) => {
    req.user = {
      id: "user-test",
      email: "nutri@teste.com",
      role: String(req.headers["x-role"] || "NUTRICIONISTA")
    };
    next();
  });

  app.use((req: any, res, next) => {
    if (req.user?.role !== "NUTRICIONISTA") {
      return res.status(403).json({ message: "Acesso negado." });
    }
    next();
  });

  app.post("/group/create", controller.createGroup.bind(controller));
  app.post("/group/info", controller.getGroupInfo.bind(controller));
  app.post("/group/inviteInfo", controller.getGroupInviteInfo.bind(controller));
  app.post("/group/join", controller.joinGroup.bind(controller));
  app.post("/group/leave", controller.leaveGroup.bind(controller));
  app.get("/group/list", controller.listGroups.bind(controller));
  app.post("/group/list", controller.listGroupsPaginated.bind(controller));
  app.post("/group/resetInviteCode", controller.resetGroupInviteCode.bind(controller));
  app.post("/group/updateAnnounce", controller.updateGroupAnnounce.bind(controller));
  app.post("/group/updateDescription", controller.updateGroupDescription.bind(controller));
  app.post("/group/updateImage", controller.updateGroupImage.bind(controller));
  app.post("/group/updateLocked", controller.updateGroupLocked.bind(controller));
  app.post("/group/updateName", controller.updateGroupName.bind(controller));
  app.post("/group/updateParticipants", controller.updateGroupParticipants.bind(controller));

  return app;
};

const callCase = (app: express.Express, routeCase: RouteCase, role = "NUTRICIONISTA", bodyOrQuery?: Record<string, any>) => {
  if (routeCase.method === "get") {
    const req = request(app).get(routeCase.path).set("x-role", role);
    return req.query(bodyOrQuery || routeCase.validQuery || {});
  }
  return request(app).post(routeCase.path).set("x-role", role).send(bodyOrQuery || routeCase.validBody || {});
};

test.afterEach(() => {
  restoreServiceMethods();
});

for (const routeCase of ROUTE_CASES) {
  test(`[groups][200] ${routeCase.id}`, async () => {
    const app = buildTestApp();
    setServiceMock(routeCase.serviceMethod, async () => ({ ok: true, endpoint: routeCase.id }));
    const response = await callCase(app, routeCase);
    assert.equal(response.status, 200);
    assert.equal(response.body?.ok, true);
  });

  test(`[groups][400] ${routeCase.id}`, async () => {
    const app = buildTestApp();

    if (routeCase.invalidBody && routeCase.method === "post") {
      const response = await callCase(app, routeCase, "NUTRICIONISTA", routeCase.invalidBody);
      assert.equal(response.status, 400);
      assert.equal(typeof response.body?.message, "string");
      return;
    }

    setServiceMock(routeCase.serviceMethod, async () => {
      throw new Error("Requisição inválida: payload inválido");
    });
    const response = await callCase(app, routeCase);
    assert.equal(response.status, 400);
    assert.equal(typeof response.body?.message, "string");
  });

  test(`[groups][403] ${routeCase.id}`, async () => {
    const app = buildTestApp();
    const response = await callCase(app, routeCase, "PACIENTE");
    assert.equal(response.status, 403);
    assert.equal(response.body?.message, "Acesso negado.");
  });
}
