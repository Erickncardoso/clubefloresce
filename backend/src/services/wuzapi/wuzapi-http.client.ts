import {
  assertWuzapiConfigured,
  getWuzapiBaseUrl,
  getWuzapiUserToken,
} from "../../config/whatsapp-provider.config";

export type WuzapiJson = Record<string, unknown>;

export class WuzapiHttpClient {
  private async fetchWithTimeout(url: string, init: RequestInit = {}, timeoutMs = 12000): Promise<Response> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      return await fetch(url, { ...init, signal: init.signal || controller.signal });
    } finally {
      clearTimeout(timer);
    }
  }

  userHeaders(userId?: string): Record<string, string> {
    const token = getWuzapiUserToken(userId);
    if (!token) throw new Error("WUZAPI_USER_TOKEN não configurado.");
    return {
      "Content-Type": "application/json",
      token,
    };
  }

  adminHeaders(): Record<string, string> {
    const admin = String(process.env.WUZAPI_ADMIN_TOKEN || "").trim();
    if (!admin) throw new Error("WUZAPI_ADMIN_TOKEN não configurado.");
    return {
      "Content-Type": "application/json",
      Authorization: admin,
    };
  }

  private buildUrl(path: string, query?: Record<string, string | number | boolean | undefined>): string {
    assertWuzapiConfigured();
    const base = getWuzapiBaseUrl();
    const normalized = path.startsWith("/") ? path : `/${path}`;
    const url = new URL(`${base}${normalized}`);
    if (query) {
      for (const [key, value] of Object.entries(query)) {
        if (value === undefined || value === null || value === "") continue;
        url.searchParams.set(key, String(value));
      }
    }
    return url.toString();
  }

  async parseBody(res: Response): Promise<any> {
    const text = await res.text().catch(() => "");
    if (!text) return {};
    try {
      return JSON.parse(text);
    } catch {
      return { raw: text };
    }
  }

  unwrap<T = any>(body: any): T {
    if (body && typeof body === "object" && "data" in body) return body.data as T;
    return body as T;
  }

  assertOk(res: Response, body: any, context: string): void {
    if (res.ok) return;
    const message = String(body?.error || body?.message || body?.details || body?.Details || `${context} HTTP ${res.status}`);
    throw new Error(message);
  }

  async requestUser(
    userId: string,
    method: string,
    path: string,
    options: { body?: unknown; query?: Record<string, string | number | boolean | undefined>; timeoutMs?: number } = {},
  ): Promise<any> {
    const res = await this.fetchWithTimeout(
      this.buildUrl(path, options.query),
      {
        method,
        headers: this.userHeaders(userId),
        body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
      },
      options.timeoutMs ?? 12000,
    );
    const parsed = await this.parseBody(res);
    this.assertOk(res, parsed, path);
    return parsed;
  }

  getUser(userId: string, path: string, query?: Record<string, string | number | boolean | undefined>) {
    return this.requestUser(userId, "GET", path, { query });
  }

  postUser(
    userId: string,
    path: string,
    body?: unknown,
    timeoutMs?: number,
    query?: Record<string, string | number | boolean | undefined>,
  ) {
    return this.requestUser(userId, "POST", path, { body, timeoutMs, query });
  }

  putUser(userId: string, path: string, body?: unknown) {
    return this.requestUser(userId, "PUT", path, { body });
  }

  deleteUser(userId: string, path: string, body?: unknown) {
    return this.requestUser(userId, "DELETE", path, { body });
  }

  /** GET público (ex.: /health) — sem token de usuário. */
  async fetchPublic(method: string, path: string): Promise<any> {
    const res = await this.fetchWithTimeout(this.buildUrl(path), { method });
    const parsed = await this.parseBody(res);
    this.assertOk(res, parsed, path);
    return parsed;
  }

  deleteAdmin(path: string) {
    return this.fetchWithTimeout(this.buildUrl(path), {
      method: "DELETE",
      headers: this.adminHeaders(),
    }).then(async (res) => {
      const parsed = await this.parseBody(res);
      this.assertOk(res, parsed, path);
      return parsed;
    });
  }

  getAdmin(path: string, query?: Record<string, string | number | boolean | undefined>) {
    return this.fetchWithTimeout(this.buildUrl(path, query), {
      method: "GET",
      headers: this.adminHeaders(),
    }).then(async (res) => {
      const parsed = await this.parseBody(res);
      this.assertOk(res, parsed, path);
      return parsed;
    });
  }

  postAdmin(path: string, body?: unknown) {
    return this.fetchWithTimeout(this.buildUrl(path), {
      method: "POST",
      headers: this.adminHeaders(),
      body: body !== undefined ? JSON.stringify(body) : undefined,
    }).then(async (res) => {
      const parsed = await this.parseBody(res);
      this.assertOk(res, parsed, path);
      return parsed;
    });
  }
}

export const wuzapiHttp = new WuzapiHttpClient();
