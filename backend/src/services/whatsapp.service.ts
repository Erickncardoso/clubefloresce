import dotenv from "dotenv";
dotenv.config();

const UAZAPI_URL = process.env.UAZAPI_SERVER_URL || "https://erickcardoso.uazapi.com";
// Em muitas documentações da UazAPI/Evolution, o header correto é 'apikey' e não 'admintoken'.
const API_KEY = process.env.UAZAPI_ADMIN_TOKEN || process.env.UAZAPI_API_KEY || "";

// Cache de token de instância por usuário — evita chamar /instance/all a cada proxy request.
// TTL de 5 minutos; invalidado explicitamente ao criar/deletar instâncias.
const instanceTokenCache = new Map<string, { token: string; expiresAt: number }>();
const INSTANCE_TOKEN_TTL_MS = 5 * 60 * 1000; // 5 minutos

/** Foto do perfil da sessão: cache curto para não chamar /chat/details a cada poll de status. */
const instanceProfilePicCache = new Map<string, { url: string; at: number }>();
const PROFILE_PIC_ENRICH_CACHE_TTL_MS = 90_000;

export class WhatsappService {
  private async sleep(ms: number): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, ms));
  }

  private async fetchWithTimeout(url: string, init: RequestInit = {}, timeoutMs = 8000): Promise<Response> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      return await fetch(url, { ...init, signal: init.signal || controller.signal });
    } finally {
      clearTimeout(timer);
    }
  }

  /** Headers para operações administrativas (criar/listar instâncias) */
  private getAdminHeaders() {
    return {
      "Content-Type": "application/json",
      "admintoken": API_KEY,
      "apikey": API_KEY
    };
  }
  /** Headers para operações de instância (conectar/desconectar/deletar) */
  private getInstanceHeaders(instanceToken: string) {
    return {
      "Content-Type": "application/json",
      "token": instanceToken
    };
  }
  /** Compatibilidade com código legado */
  private getHeaders() { return this.getAdminHeaders(); }

  private async _fetchAllInstances(): Promise<any[]> {
    try {
      // Endpoint correto da UazAPI: GET /instance/all com admintoken
      const res = await this.fetchWithTimeout(`${UAZAPI_URL}/instance/all`, {
        method: "GET",
        headers: this.getAdminHeaders()
      });
      if (res.ok) {
        const data: any = await res.json();
        // A resposta pode ser um array direto ou { instances: [] }
        return Array.isArray(data) ? data : (data.instances || data.data || []);
      }
      console.error(`[UazAPI] GET /instance/all → ${res.status}`);
      return [];
    } catch (e) {
      console.error("[UazAPI] _fetchAllInstances error:", e);
      return [];
    }
  }

  private _findInstance(instances: any[], userId: string): any | null {
    const byName = instances.find((i: any) => 
      i.name === `instancia_${userId}` || 
      i.instanceName === `instancia_${userId}` ||
      i.instance?.name === `instancia_${userId}`
    );
    return byName || (instances.length > 0 ? instances[0] : null);
  }

  async getInstanceInfo(userId: string): Promise<{ token: string, name: string } | null> {
    try {
      const instances = await this._fetchAllInstances();
      const inst = this._findInstance(instances, userId);
      if (!inst) return null;
      return {
        token: inst.token || inst.hash || inst.instance?.token || '',
        name: inst.name || inst.instanceName || inst.instance?.name || ''
      };
    } catch(err) {
      console.error("Erro ao buscar instância UazAPI:", err);
      return null;
    }
  }

  async getInstanceToken(userId: string): Promise<string | null> {
    const cached = instanceTokenCache.get(userId);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.token;
    }
    const info = await this.getInstanceInfo(userId);
    if (!info?.token) return null;
    instanceTokenCache.set(userId, { token: info.token, expiresAt: Date.now() + INSTANCE_TOKEN_TTL_MS });
    return info.token;
  }

  /** Invalida o cache de token para forçar re-fetch na próxima requisição */
  invalidateInstanceTokenCache(userId?: string): void {
    if (userId) instanceTokenCache.delete(userId);
    else instanceTokenCache.clear();
  }

  /** URL de avatar em payloads UAZ/Baileys (campos variam entre versões). */
  private _pickProfilePicUrlFromObject(obj: any): string {
    if (!obj || typeof obj !== "object") return "";
    const candidates = [
      obj.profilePicUrl,
      obj.profilePictureUrl,
      obj.profile_picture_url,
      obj.profilePicture,
      obj.picUrl,
      obj.pic,
      obj.avatar,
      obj.image,
      obj.imageUrl,
      obj.imgUrl,
      obj.picture,
      obj?.me?.profilePictureUrl,
      obj?.me?.imgUrl,
      obj?.me?.img,
      obj?.user?.profilePicUrl,
      obj?.instance?.profilePicUrl,
      obj?.instance?.profilePictureUrl,
      obj?.data?.profilePicUrl,
      obj?.data?.image,
      obj?.response?.profilePicUrl
    ];
    for (const c of candidates) {
      const s = typeof c === "string" ? c.trim() : "";
      if (!s) continue;
      if (/^https?:\/\//i.test(s)) return s;
      if (s.startsWith("data:image")) return s;
    }
    return "";
  }

  /**
   * O GET /instance/status muitas vezes traz `profilePicUrl` dentro de `instance` aninhado.
   * O spread plano `{ ...myInst, ...statusData }` não acha esses campos.
   */
  private _mergeUazStatusInstance(myInst: any, statusData: any | null): any {
    if (!statusData || typeof statusData !== "object") {
      return { ...myInst };
    }
    const nested = statusData.instance;
    const nestedObj = nested && typeof nested === "object" && !Array.isArray(nested) ? nested : null;
    const { instance: _drop, ...statusFlat } = statusData;
    return {
      ...myInst,
      ...(nestedObj || {}),
      ...statusFlat
    };
  }

  /** Identificador (JID ou telefone) da própria conta para /chat/details. */
  private _pickSelfIdentifierForChatDetails(merged: any, statusData: any): string {
    const pick = (o: any): string => {
      if (!o || typeof o !== "object") return "";
      const j =
        o.jid ||
        o.wuid ||
        o.ownerJid ||
        o.owner ||
        o.phone ||
        o.userId ||
        o.id;
      return typeof j === "string" ? j.trim() : "";
    };
    let raw = pick(merged) || pick(statusData) || pick(statusData?.instance);
    if (!raw) return "";
    if (/^\d+$/.test(raw)) return `${raw}@s.whatsapp.net`;
    if (raw.includes("@")) return raw;
    return raw;
  }

  /**
   * Garante `instance.profilePicUrl` para a UI: merge aninhado + fallback em /chat/details (com cache).
   */
  private async _hydrateInstanceProfilePic(
    userId: string,
    myInst: any,
    statusData: any | null
  ): Promise<any> {
    const merged = this._mergeUazStatusInstance(myInst, statusData);
    let pic = this._pickProfilePicUrlFromObject(merged);
    if (!pic && statusData) pic = this._pickProfilePicUrlFromObject(statusData);

    if (pic) {
      merged.profilePicUrl = pic;
      instanceProfilePicCache.set(userId, { url: pic, at: Date.now() });
      return merged;
    }

    const cached = instanceProfilePicCache.get(userId);
    if (cached?.url && Date.now() - cached.at < PROFILE_PIC_ENRICH_CACHE_TTL_MS) {
      merged.profilePicUrl = cached.url;
      return merged;
    }

    const selfId = this._pickSelfIdentifierForChatDetails(merged, statusData || {});
    if (!selfId) return merged;

    try {
      const details = await this.getChatDetails(userId, { number: selfId, preview: true });
      const dPic = this._pickProfilePicUrlFromObject(details);
      if (dPic) {
        merged.profilePicUrl = dPic;
        instanceProfilePicCache.set(userId, { url: dPic, at: Date.now() });
      }
    } catch {
      /* sessão ainda subindo ou limite — não falha o /status */
    }
    return merged;
  }

  async getAllInstances(): Promise<any[]> {
    return this._fetchAllInstances();
  }

  async createInstance(userId: string, customName?: string): Promise<string | null> {
    try {
      const data = await this.createInstanceManual(userId, customName);
      this.invalidateInstanceTokenCache(userId);
      return data?.token || data?.hash || data?.instance?.token || null;
    } catch(err) {
       console.error("Erro fatal ao criar instância UazAPI:", err);
       return null;
    }
  }

  async createInstanceManual(userId: string, customName?: string): Promise<any> {
    const instanceName = customName || `instancia_${userId}`;
    console.log(`[UazAPI] Criando instância: ${instanceName}`);
    
    // POST /instance/create com admintoken no header
    const res = await fetch(`${UAZAPI_URL}/instance/create`, {
      method: "POST",
      headers: this.getAdminHeaders(),
      body: JSON.stringify({
        name: instanceName,
        systemName: "Clube Florescer"
      })
    });

    const text = await res.text();
    console.log(`[UazAPI] POST /instance/create → ${res.status}: ${text}`);
    
    if (!res.ok) {
      throw new Error(`Erro ao criar instância: ${res.status} - ${text}`);
    }
    
    const data = JSON.parse(text);
    return data;
  }

  async updateAdminFields(instanceId: string, adminField01?: string, adminField02?: string): Promise<boolean> {
    try {
      const res = await fetch(`${UAZAPI_URL}/instance/updateAdminFields`, {
        method: "POST",
        headers: this.getHeaders(),
        body: JSON.stringify({
          instanceId,
          adminField01,
          adminField02
        })
      });
      return res.ok;
    } catch {
      return false;
    }
  }

  async deleteInstance(instanceName: string): Promise<{ success: boolean, message?: string }> {
    try {
      // Busca todas as instâncias para achar o token específico da que queremos deletar
      const allInst = await this._fetchAllInstances();
      const inst = allInst.find((i: any) =>
        i.name === instanceName || i.instanceName === instanceName ||
        i.instance?.name === instanceName
      );
      
      // O token da instância é necessário para o DELETE /instance
      const instanceToken = inst?.token || inst?.hash || inst?.apikey || inst?.instance?.token;
      
      console.log(`[UazAPI] Deletando "${instanceName}" com token: ${instanceToken ? '✓' : 'não encontrado'}`);
      
      if (!instanceToken) {
        return { success: false, message: `Token da instância "${instanceName}" não encontrado. Instâncias disponíveis: ${allInst.map((i:any) => i.name || i.instanceName).join(', ')}` };
      }

      // DELETE /instance com o token da INSTÂNCIA no header "token"
      const res = await fetch(`${UAZAPI_URL}/instance`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          "token": instanceToken   // token da instância específica
        }
      });
      
      const text = await res.text();
      console.log(`[UazAPI] DELETE /instance → ${res.status}: ${text}`);
      
      if (res.ok) {
        this.invalidateInstanceTokenCache();
        return { success: true };
      }
      return { success: false, message: `Erro ${res.status}: ${text}` };
    } catch (err: any) {
      console.error("Erro ao deletar instância:", err);
      return { success: false, message: err.message };
    }
  }

  async connect(userId: string, customName?: string, phone?: string): Promise<any> {
    try {
      const instanceInfo = await this.getInstanceInfo(userId);
      
      let instanceToken = instanceInfo?.token;
      let instanceName = customName || instanceInfo?.name || `instancia_${userId}`;
      
      // Se não tem instância, cria uma
      if (!instanceToken) {
         console.log(`[UazAPI] Sem instância ativa, criando: ${instanceName}`);
         const createData = await this.createInstanceManual(userId, customName);
         instanceToken = createData?.token || createData?.hash || createData?.instance?.token;
         instanceName = createData?.name || createData?.instance?.name || instanceName;
      }

      if (!instanceToken) {
        throw new Error("Não foi possível obter o token da instância WhatsApp.");
      }

      console.log(`[UazAPI] Conectando instância "${instanceName}"...`);
      
      // POST /instance/connect com token da instância no header
      const body: any = {};
      if (phone) body.phone = phone;
      
      const res = await fetch(`${UAZAPI_URL}/instance/connect`, {
        method: "POST",
        headers: this.getInstanceHeaders(instanceToken),
        body: JSON.stringify(body)
      });
      
      const text = await res.text();
      console.log(`[UazAPI] POST /instance/connect → ${res.status}: ${text.substring(0, 200)}`);
      
      if (!res.ok) {
        if(res.status === 429) throw new Error("Limite de conexões simultâneas atingido. Delete instâncias antigas.");
        if(res.status === 401) throw new Error("Token de instância inválido ou expirado.");
        if(res.status === 404) throw new Error(`Instância não encontrada: ${text}`);
        throw new Error(`Erro ao conectar WhatsApp. Status ${res.status}: ${text}`);
      }
      
      return JSON.parse(text);
    } catch(err) {
      console.error("Erro no connect da UazAPI:", err);
      throw err;
    }
  }

  async getStatus(userId: string): Promise<any> {
    try {
      const instances = await this._fetchAllInstances();
      const myInst = this._findInstance(instances, userId);

      if (!myInst) {
        return { status: "disconnected", instance: null, allInstances: instances };
      }

      const instanceToken = myInst.token || myInst.hash || myInst.instance?.token;
      
      // GET /instance/status com token da instância
      if (instanceToken) {
        try {
          const statusRes = await this.fetchWithTimeout(`${UAZAPI_URL}/instance/status`, {
            method: "GET",
            headers: this.getInstanceHeaders(instanceToken)
          });
          if (statusRes.ok) {
            const statusData: any = await statusRes.json();
            console.log(`[UazAPI] GET /instance/status →`, JSON.stringify(statusData).substring(0, 200));
            const merged = await this._hydrateInstanceProfilePic(userId, myInst, statusData);
            return {
              instance: merged,
              allInstances: instances,
              status: statusData
            };
          }
        } catch(e) {
          console.error("[UazAPI] Erro ao buscar status:", e);
        }
      }

      const mergedFallback = await this._hydrateInstanceProfilePic(userId, myInst, null);
      return {
        instance: mergedFallback,
        allInstances: instances,
        status: myInst
      };
    } catch (err: any) {
      console.error("Erro ao pegar status da instância:", err);
      return { status: "error", message: err.message };
    }
  }
  
  async disconnect(userId: string): Promise<any> {
    try {
      const instanceInfo = await this.getInstanceInfo(userId);
      if (!instanceInfo) throw new Error("Instância não encontrada para desconectar.");

      // POST /instance/disconnect com token da instância no header
      const res = await fetch(`${UAZAPI_URL}/instance/disconnect`, {
        method: "POST",
        headers: this.getInstanceHeaders(instanceInfo.token)
      });
      
      const text = await res.text();
      console.log(`[UazAPI] POST /instance/disconnect → ${res.status}: ${text}`);
      
      if (!res.ok) {
        if(res.status === 401) throw new Error("Token de instância inválido.");
        if(res.status === 404) throw new Error("Instância não encontrada.");
        throw new Error(`Erro ao desconectar. Status: ${res.status}`);
      }
      instanceProfilePicCache.delete(userId);
      return JSON.parse(text);
    } catch (err: any) {
      console.error("Erro ao desconectar:", err);
      return { success: false, message: err.message };
    }
  }

  async regenerateQrCode(userId: string, customName?: string): Promise<any> {
    const instanceInfo = await this.getInstanceInfo(userId);
    const instanceName = customName || instanceInfo?.name;

    // Conforme a doc da UAZAPI, para novo QR é necessário desconectar e reconectar.
    await this.disconnect(userId);

    // Evita corrida imediata entre disconnect e connect na UAZAPI.
    await this.sleep(1500);

    try {
      // Sem o campo phone, /instance/connect retorna fluxo de QR code.
      return await this.connect(userId, instanceName);
    } catch (err: any) {
      const message = String(err?.message || "").toLowerCase();
      const retryable =
        message.includes("canceled") ||
        message.includes("cancelled") ||
        message.includes("connecting");

      if (!retryable) throw err;

      // Fallback: consulta status atual; em muitos casos o QR já está disponível após o cancelamento.
      const statusData: any = await this.getStatus(userId);
      return {
        ...statusData,
        qrcode: statusData?.instance?.qrcode || statusData?.instance?.qr || statusData?.status?.qrcode || ""
      };
    }
  }

  async getGlobalWebhook(): Promise<any> {
    try {
      const res = await fetch(`${UAZAPI_URL}/globalwebhook`, {
        method: "GET",
        headers: this.getHeaders() // Usa a apikey/admintoken
      });
      
      if (!res.ok) {
        console.error("UazAPI Erro ao consultar Global Webhook:", await res.text());
        return null;
      }
      
      return (await res.json()) as any;
    } catch (err) {
      console.error("Erro fatal ao buscar Global Webhook:", err);
      return null;
    }
  }

  async setGlobalWebhook(
    url: string,
    events: string[],
    excludeMessages: string[] = ["wasSentByApi"], // Padronizado conforme recomendação da doc
    addUrlEvents: boolean = false,
    addUrlTypesMessages: boolean = false
  ): Promise<boolean> {
    try {
      const res = await fetch(`${UAZAPI_URL}/globalwebhook`, {
        method: "POST",
        headers: this.getHeaders(),
        body: JSON.stringify({
          url,
          events,
          excludeMessages,
          addUrlEvents,
          addUrlTypesMessages
        })
      });

      if (!res.ok) {
        const errorText = await res.text();
        console.error(`UazAPI Erro ao configurar Global Webhook [Status ${res.status}]:`, errorText);
        return false;
      }
      
      return true; // 200 Webhook global configurado com sucesso
    } catch (err) {
      console.error("Erro fatal ao configurar Global Webhook:", err);
      return false;
    }
  }

  async getGlobalWebhookErrors(): Promise<any[] | null> {
    try {
      const res = await fetch(`${UAZAPI_URL}/globalwebhook/errors`, {
        method: "GET",
        headers: this.getHeaders() // Usa a apikey/admintoken obrigatoriamente
      });
      
      if (!res.ok) {
        const errorText = await res.text();
        console.error(`UazAPI Erro ao consultar erros do Webhook [Status ${res.status}]:`, errorText);
        return null;
      }
      
      // A documentação menciona o header 'X-Webhook-Error-Capture-Started-At'
      const captureStartedAt = res.headers.get("X-Webhook-Error-Capture-Started-At");
      if (captureStartedAt) {
        console.log("⏱️ Erros do webhook registrados desde:", captureStartedAt);
      }
      
      // Retorna a lista de até 20 erros em formato de array, conforme o Exemplo
      return (await res.json()) as any[];
    } catch (err) {
      console.error("Erro fatal ao buscar histórico de erros do Global Webhook:", err);
      return null;
    }
  }

  async restartApp(): Promise<{ success: boolean; message: string }> {
    try {
      const res = await fetch(`${UAZAPI_URL}/admin/restart`, {
        method: "POST",
        headers: this.getHeaders() // Usa a apikey/admintoken obrigatoriamente
      });
      
      const data = (await res.json()) as any;

      // A documentação especifica que a resposta de sucesso é um status 202
      if (res.status === 202 || res.ok) {
        return { success: true, message: data.message || "Reinicio agendado com sucesso" };
      } else {
        console.error(`UazAPI Erro ao reiniciar a aplicação [Status ${res.status}]:`, data.error);
        return { success: false, message: data.error || "Erro interno do servidor ao agendar o reinicio" };
      }
    } catch (err: any) {
      console.error("Erro fatal ao tentar reiniciar a UazAPI:", err);
      return { success: false, message: err.message || "Falha de comunicação com o servidor" };
    }
  }

  async resetInstance(userId: string): Promise<any> {
    try {
      const token = await this.getInstanceToken(userId);
      
      if (!token) {
        throw new Error("Não foi possível encontrar a instância ativa para solicitar o reset.");
      }

      const res = await fetch(`${UAZAPI_URL}/instance/reset`, {
        method: "POST",
        headers: { ...this.getHeaders(), token: token } // Token da instância
      });
      
      const data = (await res.json()) as any;

      if (!res.ok) {
        if(res.status === 400) throw new Error("Payload JSON inválido.");
        if(res.status === 401) throw new Error("Token inválido, ausente ou cliente não encontrado.");
        if(res.status === 403) throw new Error(data.error || "Reset bloqueado pela política de reconexão.");
        if(res.status === 409) throw new Error(data.error || "A sessão atual não é reconectável por reset.");
        
        throw new Error(data.error || `Erro interno ao solicitar o reset (Status: ${res.status}).`);
      }
      
      // Retorna 200: { response: "Instance reset started", resetting: true, ... }
      return data;
    } catch (err: any) {
      console.error("Erro fatal ao resetar instância UazAPI:", err);
      return { 
        error: err.message, 
        resetting: false, 
        instanceId: null, 
        queuedRecoveryAttempted: false 
      };
    }
  }

  async getWhatsAppLimits(userId: string): Promise<any> {
    try {
      const token = await this.getInstanceToken(userId);
      if (!token) throw new Error("Token da instância não encontrado.");

      const res = await fetch(`${UAZAPI_URL}/instance/wa_messages_limits`, {
        method: "GET",
        headers: { ...this.getHeaders(), token: token }
      });
      
      if (!res.ok) {
         if (res.status === 401) throw new Error("Token inválido ou ausente");
         if (res.status === 500) throw new Error("Erro interno ao consultar limites: No session");
         throw new Error(`Erro ao buscar limites: ${res.status}`);
      }
      
      return await res.json();
    } catch(err: any) {
      console.error("Erro getWhatsAppLimits:", err);
      throw err;
    }
  }

  async updateInstanceName(userId: string, name: string): Promise<any> {
    try {
      const token = await this.getInstanceToken(userId);
      if (!token) throw new Error("Token da instância não encontrado.");

      const res = await fetch(`${UAZAPI_URL}/instance/updateInstanceName`, {
        method: "POST",
        headers: { ...this.getHeaders(), token: token },
        body: JSON.stringify({ name })
      });
      
      if (!res.ok) {
        if (res.status === 401) throw new Error("Token inválido/expirado");
        if (res.status === 404) throw new Error("Instância não encontrada");
        throw new Error(`Erro ao atualizar nome: ${res.status}`);
      }
      return await res.json();
    } catch(err: any) {
      console.error("Erro updateInstanceName:", err);
      throw err;
    }
  }

  async getPrivacySettings(userId: string): Promise<any> {
    try {
      const token = await this.getInstanceToken(userId);
      if (!token) throw new Error("Token da instância não encontrado.");

      const res = await fetch(`${UAZAPI_URL}/instance/privacy`, {
        method: "GET",
        headers: { ...this.getHeaders(), token: token }
      });
      
      if (!res.ok) {
        if (res.status === 401) throw new Error("Token de autenticação inválido");
        if (res.status === 500) throw new Error("Erro interno do servidor: No session");
        throw new Error(`Erro ao buscar privacidade: ${res.status}`);
      }
      return await res.json();
    } catch(err: any) {
      console.error("Erro getPrivacySettings:", err);
      throw err;
    }
  }

  async updatePrivacySettings(userId: string, privacyData: any): Promise<any> {
    try {
      const token = await this.getInstanceToken(userId);
      if (!token) throw new Error("Token da instância não encontrado.");

      const res = await fetch(`${UAZAPI_URL}/instance/privacy`, {
        method: "POST",
        headers: { ...this.getHeaders(), token: token },
        body: JSON.stringify(privacyData)
      });
      
      if (!res.ok) {
         if (res.status === 400) throw new Error("Dados de entrada inválidos");
         if (res.status === 401) throw new Error("Token de autenticação inválido");
         throw new Error("Erro interno do servidor");
      }
      return await res.json();
    } catch(err: any) {
      console.error("Erro updatePrivacySettings:", err);
      throw err;
    }
  }

  async updatePresence(userId: string, presence: "available" | "unavailable"): Promise<any> {
    try {
      const token = await this.getInstanceToken(userId);
      if (!token) throw new Error("Token da instância não encontrado.");

      const res = await fetch(`${UAZAPI_URL}/instance/presence`, {
        method: "POST",
        headers: { ...this.getHeaders(), token: token },
        body: JSON.stringify({ presence })
      });
      
      if (!res.ok) {
        if (res.status === 400) throw new Error("Requisição inválida");
        if (res.status === 401) throw new Error("Token inválido ou expirado");
        if (res.status === 500) throw new Error("Erro interno do servidor");
        throw new Error(`Erro ao atualizar presença: ${res.status}`);
      }
      return await res.json();
    } catch(err: any) {
      console.error("Erro updatePresence:", err);
      throw err;
    }
  }

  async updateDelaySettings(userId: string, msg_delay_min: number, msg_delay_max: number): Promise<any> {
    try {
      const token = await this.getInstanceToken(userId);
      if (!token) throw new Error("Token da instância não encontrado.");

      const res = await fetch(`${UAZAPI_URL}/instance/updateDelaySettings`, {
        method: "POST",
        headers: { ...this.getHeaders(), token: token },
        body: JSON.stringify({ msg_delay_min, msg_delay_max })
      });
      
      if (!res.ok) {
        if (res.status === 400) throw new Error("Requisição inválida");
        if (res.status === 401) throw new Error("Token inválido ou expirado");
        if (res.status === 500) throw new Error("Erro interno do servidor: Failed to update delay settings");
        throw new Error(`Erro ao atualizar delay: ${res.status}`);
      }
      return await res.json();
    } catch(err: any) {
      console.error("Erro updateDelaySettings:", err);
      throw err;
    }
  }

  async getProxyConfiguration(userId: string): Promise<any> {
    try {
      const token = await this.getInstanceToken(userId);
      if (!token) throw new Error("Token da instância não encontrado.");

      const res = await fetch(`${UAZAPI_URL}/instance/proxy`, {
        method: "GET",
        headers: { ...this.getHeaders(), token: token }
      });
      
      if (!res.ok) {
        if (res.status === 401) throw new Error("Token inválido ou expirado");
        if (res.status === 500) throw new Error("Erro interno do servidor ao recuperar a configuração de proxy");
        throw new Error(`Erro desconhecido ao obter proxy: ${res.status}`);
      }
      
      return await res.json();
    } catch(err: any) {
      console.error("Erro getProxyConfiguration:", err);
      throw err;
    }
  }

  async updateProxyConfiguration(userId: string, enable: boolean, proxy_url?: string): Promise<any> {
    try {
      const token = await this.getInstanceToken(userId);
      if (!token) throw new Error("Token da instância não encontrado.");

      const bodyParams: any = { enable };
      if (proxy_url) {
        bodyParams.proxy_url = proxy_url;
      }

      const res = await fetch(`${UAZAPI_URL}/instance/proxy`, {
        method: "POST",
        headers: { ...this.getHeaders(), token: token },
        body: JSON.stringify(bodyParams)
      });
      
      if (!res.ok) {
        const errorText = await res.text();
        if (res.status === 400) throw new Error(`Payload inválido ou falha na validação do proxy: ${errorText}`);
        if (res.status === 401) throw new Error("Token inválido ou expirado");
        if (res.status === 500) throw new Error("Erro interno do servidor ao configurar o proxy");
        throw new Error(`Erro desconhecido ao configurar proxy: ${res.status}`);
      }
      
      return await res.json();
    } catch(err: any) {
      console.error("Erro updateProxyConfiguration:", err);
      throw err;
    }
  }

  async deleteProxyConfiguration(userId: string): Promise<any> {
    try {
      const token = await this.getInstanceToken(userId);
      if (!token) throw new Error("Token da instância não encontrado.");

      const res = await fetch(`${UAZAPI_URL}/instance/proxy`, {
        method: "DELETE",
        headers: { ...this.getHeaders(), token: token }
      });
      
      if (!res.ok) {
        if (res.status === 401) throw new Error("Token inválido ou expirado");
        if (res.status === 500) throw new Error("Erro interno do servidor ao deletar a configuração de proxy");
        throw new Error(`Erro desconhecido ao deletar proxy: ${res.status}`);
      }
      
      return await res.json();
    } catch(err: any) {
      console.error("Erro deleteProxyConfiguration:", err);
      throw err;
    }
  }

  async updateWhatsAppProfileName(userId: string, name: string): Promise<any> {
    try {
      const token = await this.getInstanceToken(userId);
      if (!token) throw new Error("Token da instância não encontrado.");

      const res = await fetch(`${UAZAPI_URL}/profile/name`, {
        method: "POST",
        headers: { ...this.getHeaders(), token: token },
        body: JSON.stringify({ name })
      });
      
      if (!res.ok) {
        if (res.status === 400) throw new Error("Dados inválidos na requisição (ex: Nome muito longo).");
        if (res.status === 401) throw new Error("Sem sessão ativa (Token inválido/inexistente).");
        if (res.status === 403) throw new Error("Ação não permitida: Limite de alterações excedido ou conta com restrições.");
        if (res.status === 500) throw new Error("Erro interno do servidor ao alterar nome do perfil.");
        throw new Error(`Erro desconhecido ao alterar nome do perfil: ${res.status}`);
      }
      
      return await res.json();
    } catch(err: any) {
      console.error("Erro updateWhatsAppProfileName:", err);
      throw err;
    }
  }

  async updateWhatsAppProfileImage(userId: string, image: string): Promise<any> {
    try {
      const token = await this.getInstanceToken(userId);
      if (!token) throw new Error("Token da instância não encontrado.");

      const res = await fetch(`${UAZAPI_URL}/profile/image`, {
        method: "POST",
        headers: { ...this.getHeaders(), token: token },
        body: JSON.stringify({ image })
      });
      
      if (!res.ok) {
        if (res.status === 400) throw new Error("Dados inválidos: Formato de imagem inválido ou URL inacessível.");
        if (res.status === 401) throw new Error("Sem sessão ativa (Token inválido/inexistente).");
        if (res.status === 403) throw new Error("Ação não permitida: Limite de alterações excedido ou conta com restrições.");
        if (res.status === 413) throw new Error("Imagem muito grande.");
        if (res.status === 500) throw new Error("Erro interno do servidor ao alterar imagem do perfil.");
        throw new Error(`Erro desconhecido ao alterar imagem do perfil: ${res.status}`);
      }
      
      return await res.json();
    } catch(err: any) {
      console.error("Erro updateWhatsAppProfileImage:", err);
      throw err;
    }
  }

  async getBusinessProfile(userId: string, jid: string): Promise<any> {
    try {
      const token = await this.getInstanceToken(userId);
      if (!token) throw new Error("Token da instância não encontrado.");

      const res = await fetch(`${UAZAPI_URL}/business/get/profile`, {
        method: "POST",
        headers: { ...this.getHeaders(), token: token },
        body: JSON.stringify({ jid })
      });
      if (!res.ok) {
        if (res.status === 400) throw new Error("Requisição inválida");
        if (res.status === 401) throw new Error("Token inválido ou expirado");
        if (res.status === 500) throw new Error("Erro interno ao recuperar o perfil comercial");
        throw new Error(`Erro desconhecido: ${res.status}`);
      }
      return await res.json();
    } catch(err: any) {
      console.error("Erro getBusinessProfile:", err);
      throw err;
    }
  }

  async getBusinessCategories(userId: string): Promise<any> {
    try {
      const token = await this.getInstanceToken(userId);
      if (!token) throw new Error("Token da instância não encontrado.");

      const res = await fetch(`${UAZAPI_URL}/business/get/categories`, {
        method: "GET",
        headers: { ...this.getHeaders(), token: token }
      });
      if (!res.ok) {
        if (res.status === 401) throw new Error("Token inválido ou expirado");
        if (res.status === 500) throw new Error("Erro interno ao recuperar as categorias de negócios");
        throw new Error(`Erro desconhecido: ${res.status}`);
      }
      return await res.json();
    } catch(err: any) {
      console.error("Erro getBusinessCategories:", err);
      throw err;
    }
  }

  async updateBusinessProfile(userId: string, data: {description?: string, address?: string, email?: string}): Promise<any> {
    try {
      const token = await this.getInstanceToken(userId);
      if (!token) throw new Error("Token da instância não encontrado.");

      const res = await fetch(`${UAZAPI_URL}/business/update/profile`, {
        method: "POST",
        headers: { ...this.getHeaders(), token: token },
        body: JSON.stringify(data)
      });
      if (!res.ok) {
        if (res.status === 207) throw new Error("Sucesso parcial — ao menos um campo falhou na atualização.");
        if (res.status === 400) throw new Error("Requisição inválida");
        if (res.status === 401) throw new Error("Token inválido ou expirado");
        if (res.status === 500) throw new Error("Falha total — nenhum campo foi atualizado no perfil comercial");
        throw new Error(`Erro desconhecido: ${res.status}`);
      }
      return await res.json();
    } catch(err: any) {
      console.error("Erro updateBusinessProfile:", err);
      throw err;
    }
  }

  async listCatalogProducts(userId: string, jid: string, after?: string): Promise<any> {
    try {
      const token = await this.getInstanceToken(userId);
      if (!token) throw new Error("Token da instância não encontrado.");

      const bodyParams: any = { jid };
      if (after) bodyParams.after = after;

      const res = await fetch(`${UAZAPI_URL}/business/catalog/list`, {
        method: "POST",
        headers: { ...this.getHeaders(), token: token },
        body: JSON.stringify(bodyParams)
      });
      if (!res.ok) {
        if (res.status === 400) throw new Error("Requisição inválida");
        if (res.status === 401) throw new Error("Token inválido ou expirado");
        if (res.status === 500) throw new Error("Erro interno ao recuperar os produtos do catálogo");
        throw new Error(`Erro desconhecido: ${res.status}`);
      }
      return await res.json();
    } catch(err: any) {
      console.error("Erro listCatalogProducts:", err);
      throw err;
    }
  }

  async getCatalogProductInfo(userId: string, jid: string, id: string): Promise<any> {
    try {
      const token = await this.getInstanceToken(userId);
      if (!token) throw new Error("Token da instância não encontrado.");

      const res = await fetch(`${UAZAPI_URL}/business/catalog/info`, {
        method: "POST",
        headers: { ...this.getHeaders(), token: token },
        body: JSON.stringify({ jid, id })
      });
      if (!res.ok) {
        if (res.status === 400) throw new Error("Requisição inválida");
        if (res.status === 401) throw new Error("Token inválido ou expirado");
        if (res.status === 500) throw new Error("Erro interno ao recuperar as informações do produto");
        throw new Error(`Erro desconhecido: ${res.status}`);
      }
      return await res.json();
    } catch(err: any) {
      console.error("Erro getCatalogProductInfo:", err);
      throw err;
    }
  }

  async deleteCatalogProduct(userId: string, id: string): Promise<any> {
    try {
      const token = await this.getInstanceToken(userId);
      if (!token) throw new Error("Token da instância não encontrado.");

      const res = await fetch(`${UAZAPI_URL}/business/catalog/delete`, {
        method: "POST",
        headers: { ...this.getHeaders(), token: token },
        body: JSON.stringify({ id })
      });
      if (!res.ok) {
        if (res.status === 400) throw new Error("Requisição inválida");
        if (res.status === 401) throw new Error("Token inválido ou expirado");
        if (res.status === 500) throw new Error("Erro interno ao deletar o produto");
        throw new Error(`Erro desconhecido: ${res.status}`);
      }
      return await res.json();
    } catch(err: any) {
      console.error("Erro deleteCatalogProduct:", err);
      throw err;
    }
  }

  async showCatalogProduct(userId: string, id: string): Promise<any> {
    try {
      const token = await this.getInstanceToken(userId);
      if (!token) throw new Error("Token da instância não encontrado.");

      const res = await fetch(`${UAZAPI_URL}/business/catalog/show`, {
        method: "POST",
        headers: { ...this.getHeaders(), token: token },
        body: JSON.stringify({ id })
      });
      if (!res.ok) {
        if (res.status === 400) throw new Error("Requisição inválida");
        if (res.status === 401) throw new Error("Token inválido ou expirado");
        if (res.status === 500) throw new Error("Erro interno ao mostrar o produto");
        throw new Error(`Erro desconhecido: ${res.status}`);
      }
      return await res.json();
    } catch(err: any) {
      console.error("Erro showCatalogProduct:", err);
      throw err;
    }
  }

  async hideCatalogProduct(userId: string, id: string): Promise<any> {
    try {
      const token = await this.getInstanceToken(userId);
      if (!token) throw new Error("Token da instância não encontrado.");

      const res = await fetch(`${UAZAPI_URL}/business/catalog/hide`, {
        method: "POST",
        headers: { ...this.getHeaders(), token: token },
        body: JSON.stringify({ id })
      });
      if (!res.ok) {
        if (res.status === 400) throw new Error("Requisição inválida");
        if (res.status === 401) throw new Error("Token inválido ou expirado");
        if (res.status === 500) throw new Error("Erro interno ao ocultar o produto");
        throw new Error(`Erro desconhecido: ${res.status}`);
      }
      return await res.json();
    } catch(err: any) {
      console.error("Erro hideCatalogProduct:", err);
      throw err;
    }
  }

  async makeVoiceCall(userId: string, number: string, call_duration?: number): Promise<any> {
    try {
      const token = await this.getInstanceToken(userId);
      if (!token) throw new Error("Token da instância não encontrado.");

      const bodyParams: any = { number };
      if (call_duration) bodyParams.call_duration = call_duration;

      const res = await fetch(`${UAZAPI_URL}/call/make`, {
        method: "POST",
        headers: { ...this.getHeaders(), token: token },
        body: JSON.stringify(bodyParams)
      });
      if (!res.ok) {
        if (res.status === 400) throw new Error("Número inválido ou ausente");
        if (res.status === 401) throw new Error("Token inválido ou expirado");
        if (res.status === 500) throw new Error("Erro interno ao iniciar chamada");
        throw new Error(`Erro desconhecido: ${res.status}`);
      }
      return await res.json();
    } catch(err: any) {
      console.error("Erro makeVoiceCall:", err);
      throw err;
    }
  }

  async rejectVoiceCall(userId: string, number?: string, id?: string): Promise<any> {
    try {
      const token = await this.getInstanceToken(userId);
      if (!token) throw new Error("Token da instância não encontrado.");

      const bodyParams: any = {};
      if (number) bodyParams.number = number;
      if (id) bodyParams.id = id;

      const res = await fetch(`${UAZAPI_URL}/call/reject`, {
        method: "POST",
        headers: { ...this.getHeaders(), token: token },
        body: JSON.stringify(bodyParams)
      });
      if (!res.ok) {
        if (res.status === 400) throw new Error("Requisição ou número inválido");
        if (res.status === 401) throw new Error("Token inválido ou expirado");
        if (res.status === 500) throw new Error("Erro interno ao rejeitar chamada");
        throw new Error(`Erro desconhecido: ${res.status}`);
      }
      return await res.json();
    } catch(err: any) {
      console.error("Erro rejectVoiceCall:", err);
      throw err;
    }
  }

  async getInstanceWebhook(userId: string): Promise<any> {
    try {
      const token = await this.getInstanceToken(userId);
      if (!token) throw new Error("Token da instância não encontrado.");

      const res = await fetch(`${UAZAPI_URL}/webhook`, {
        method: "GET",
        headers: { ...this.getHeaders(), token: token }
      });
      if (!res.ok) {
        if (res.status === 401) throw new Error("Token inválido ou não fornecido");
        if (res.status === 500) throw new Error("Erro interno do servidor");
        throw new Error(`Erro desconhecido: ${res.status}`);
      }
      return await res.json();
    } catch(err: any) {
      console.error("Erro getInstanceWebhook:", err);
      throw err;
    }
  }

  async setInstanceWebhook(userId: string, data: {
    action?: "add" | "update" | "delete",
    id?: string,
    enabled?: boolean,
    url?: string,
    events?: string[],
    excludeMessages?: string[],
    addUrlEvents?: boolean,
    addUrlTypesMessages?: boolean
  }): Promise<any> {
    try {
      const token = await this.getInstanceToken(userId);
      if (!token) throw new Error("Token da instância não encontrado.");

      const res = await fetch(`${UAZAPI_URL}/webhook`, {
        method: "POST",
        headers: { ...this.getHeaders(), token: token },
        body: JSON.stringify(data)
      });
      if (!res.ok) {
        if (res.status === 400) throw new Error("Requisição inválida (ex: Invalid action)");
        if (res.status === 401) throw new Error("Token inválido ou não fornecido");
        if (res.status === 500) throw new Error("Erro interno do servidor");
        throw new Error(`Erro desconhecido: ${res.status}`);
      }
      return await res.json();
    } catch(err: any) {
      console.error("Erro setInstanceWebhook:", err);
      throw err;
    }
  }

  async getInstanceWebhookErrors(userId: string): Promise<any> {
    try {
      const token = await this.getInstanceToken(userId);
      if (!token) throw new Error("Token da instância não encontrado.");

      const res = await fetch(`${UAZAPI_URL}/webhook/errors`, {
        method: "GET",
        headers: { ...this.getHeaders(), token: token }
      });
      if (!res.ok) {
        if (res.status === 401) throw new Error("Token inválido ou não fornecido");
        throw new Error(`Erro desconhecido: ${res.status}`);
      }
      return await res.json();
    } catch(err: any) {
      console.error("Erro getInstanceWebhookErrors:", err);
      throw err;
    }
  }

  async getSseUrl(userId: string, events: string[], excludeMessages?: string[]): Promise<string> {
    const token = await this.getInstanceToken(userId);
    if (!token) throw new Error("Token da instância não encontrado.");

    let url = `${UAZAPI_URL}/sse?token=${token}&events=${events.join(',')}`;
    if (excludeMessages && excludeMessages.length > 0) {
      url += `&excludeMessages=${excludeMessages.join(',')}`;
    }
    return url;
  }

  // --- DISPARO DE MENSAGENS E INTERAÇÕES ---

  private async _sendToApi(userId: string, path: string, body: any): Promise<any> {
    try {
      const token = await this.getInstanceToken(userId);
      if (!token) throw new Error("Token da instância não encontrado.");

      const res = await fetch(`${UAZAPI_URL}${path}`, {
        method: "POST",
        headers: { ...this.getHeaders(), token: token },
        body: JSON.stringify(body)
      });

      if (!res.ok) {
        const errData: any = await res.json().catch(() => ({}));
        if (res.status === 400) throw new Error(`Requisição inválida: ${errData.error || res.status}`);
        if (res.status === 401) throw new Error("Token inválido ou não autorizado");
        if (res.status === 429) throw new Error("Limite de requisições excedido (Rate limit)");
        if (res.status === 413) throw new Error("Arquivo muito grande");
        if (res.status === 415) throw new Error("Formato de mídia não suportado");
        if (res.status === 500) throw new Error(`Erro interno do servidor: ${errData.error || res.status}`);
        throw new Error(`Erro ${res.status}: ${JSON.stringify(errData)}`);
      }

      return await res.json();
    } catch(err: any) {
      console.error(`Erro _sendToApi(${path}):`, err);
      throw err;
    }
  }

  async sendText(userId: string, data: any): Promise<any> {
    return this._sendToApi(userId, '/send/text', data);
  }

  async sendMedia(userId: string, data: any): Promise<any> {
    return this._sendToApi(userId, '/send/media', data);
  }

  async sendContact(userId: string, data: any): Promise<any> {
    return this._sendToApi(userId, '/send/contact', data);
  }

  async sendLocation(userId: string, data: any): Promise<any> {
    return this._sendToApi(userId, '/send/location', data);
  }

  async sendPresence(userId: string, data: { number: string; presence: 'composing' | 'recording' | 'paused'; delay?: number; }): Promise<any> {
    return this._sendToApi(userId, '/message/presence', data);
  }

  async sendStatus(userId: string, data: any): Promise<any> {
    return this._sendToApi(userId, '/send/status', data);
  }

  async sendMenu(userId: string, data: any): Promise<any> {
    return this._sendToApi(userId, '/send/menu', data);
  }

  async sendCarousel(userId: string, data: any): Promise<any> {
    return this._sendToApi(userId, '/send/carousel', data);
  }

  async requestLocation(userId: string, data: any): Promise<any> {
    return this._sendToApi(userId, '/send/location-button', data);
  }

  async requestPayment(userId: string, data: any): Promise<any> {
    return this._sendToApi(userId, '/send/request-payment', data);
  }

  async sendPixButton(userId: string, data: any): Promise<any> {
    return this._sendToApi(userId, '/send/pix-button', data);
  }

  // --- FILA ASSÍNCRONA ---

  async getAsyncMessageQueueStatus(userId: string): Promise<any> {
    try {
      const token = await this.getInstanceToken(userId);
      if (!token) throw new Error("Token da instância não encontrado.");

      const res = await fetch(`${UAZAPI_URL}/message/async`, {
        method: "GET",
        headers: { ...this.getHeaders(), token: token }
      });
      if (!res.ok) {
        if (res.status === 401) throw new Error("Token inválido ou ausente");
        if (res.status === 500) throw new Error("Erro interno ao consultar a fila async");
        throw new Error(`Erro desconhecido: ${res.status}`);
      }
      return await res.json();
    } catch(err: any) {
      console.error("Erro getAsyncMessageQueueStatus:", err);
      throw err;
    }
  }

  async clearAsyncMessageQueue(userId: string): Promise<any> {
    try {
      const token = await this.getInstanceToken(userId);
      if (!token) throw new Error("Token da instância não encontrado.");

      const res = await fetch(`${UAZAPI_URL}/message/async`, {
        method: "DELETE",
        headers: { ...this.getHeaders(), token: token }
      });
      if (!res.ok) {
        if (res.status === 401) throw new Error("Token inválido ou ausente");
        if (res.status === 409) throw new Error("Conflito: A fila não pôde ser limpa pois a instância está em reset ou havia envio em progresso.");
        if (res.status === 500) throw new Error("Erro interno ao limpar a fila async");
        throw new Error(`Erro desconhecido: ${res.status}`);
      }
      return await res.json();
    } catch(err: any) {
      console.error("Erro clearAsyncMessageQueue:", err);
      throw err;
    }
  }

  // --- GERENCIAMENTO DE MENSAGENS ---

  async downloadMedia(userId: string, data: any): Promise<any> {
    return this._sendToApi(userId, '/message/download', data);
  }

  async findMessages(userId: string, data: any): Promise<any> {
    return this._sendToApi(userId, '/message/find', data);
  }

  async historySync(userId: string, data: { number: string; messageid?: string; count?: number }): Promise<any> {
    return this._sendToApi(userId, '/message/history-sync', data);
  }

  async markRead(userId: string, ids: string[]): Promise<any> {
    return this._sendToApi(userId, '/message/markread', { id: ids });
  }

  async reactMessage(userId: string, data: { number: string; text: string; id: string }): Promise<any> {
    return this._sendToApi(userId, '/message/react', data);
  }

  async deleteMessage(userId: string, id: string): Promise<any> {
    return this._sendToApi(userId, '/message/delete', { id });
  }

  async editMessage(userId: string, data: { id: string; text: string }): Promise<any> {
    return this._sendToApi(userId, '/message/edit', data);
  }

  async pinMessage(userId: string, data: { id: string; pin?: boolean; duration?: number }): Promise<any> {
    return this._sendToApi(userId, '/message/pin', data);
  }

  // --- GERENCIAMENTO DE CHATS ---

  async deleteChat(userId: string, data: { number: string; deleteChatDB?: boolean; deleteMessagesDB?: boolean; deleteChatWhatsApp?: boolean; clearChatWhatsApp?: boolean }): Promise<any> {
    return this._sendToApi(userId, '/chat/delete', data);
  }

  async archiveChat(userId: string, data: { number: string; archive: boolean }): Promise<any> {
    return this._sendToApi(userId, '/chat/archive', data);
  }

  async readChat(userId: string, data: { number: string; read: boolean }): Promise<any> {
    return this._sendToApi(userId, '/chat/read', data);
  }

  async muteChat(userId: string, data: { number: string; muteEndTime: number }): Promise<any> {
    return this._sendToApi(userId, '/chat/mute', data);
  }

  async pinChat(userId: string, data: { number: string; pin: boolean }): Promise<any> {
    return this._sendToApi(userId, '/chat/pin', data);
  }

  async findChats(userId: string, data: any): Promise<any> {
    return this._sendToApi(userId, '/chat/find', data);
  }

  async getChatNotes(userId: string, data: { number: string }): Promise<any> {
    return this._sendToApi(userId, '/chat/notes', data);
  }

  async refreshChatNotes(userId: string, data: { number: string; force?: boolean }): Promise<any> {
    return this._sendToApi(userId, '/chat/notes/refresh', data);
  }

  async editChatNotes(userId: string, data: { number: string; notes: string }): Promise<any> {
    return this._sendToApi(userId, '/chat/notes/edit', data);
  }

  // --- GERENCIAMENTO DE CONTATOS E VERIFICAÇÕES ---

  async getContacts(userId: string, contactScope?: string): Promise<any> {
    try {
      const token = await this.getInstanceToken(userId);
      if (!token) throw new Error("Token da instância não encontrado.");

      const url = new URL(`${UAZAPI_URL}/contacts`);
      if (contactScope) {
        url.searchParams.append('contactScope', contactScope);
      }

      const res = await fetch(url.toString(), {
        method: "GET",
        headers: { ...this.getHeaders(), token: token }
      });
      if (!res.ok) {
        throw new Error(`Erro ao buscar contatos: ${res.status}`);
      }
      return await res.json();
    } catch(err: any) {
      console.error("Erro getContacts:", err);
      throw err;
    }
  }

  async listContacts(userId: string, data: { limit?: number; offset?: number; contactScope?: string }): Promise<any> {
    return this._sendToApi(userId, '/contacts/list', data);
  }

  async addContact(userId: string, data: { number: string; name: string }): Promise<any> {
    return this._sendToApi(userId, '/contact/add', data);
  }

  async removeContact(userId: string, data: { number: string }): Promise<any> {
    return this._sendToApi(userId, '/contact/remove', data);
  }

  async getChatDetails(userId: string, data: { number: string; preview?: boolean }): Promise<any> {
    return this._sendToApi(userId, '/chat/details', data);
  }

  async checkNumbers(userId: string, numbers: string[]): Promise<any> {
    return this._sendToApi(userId, '/chat/check', { numbers });
  }

  // --- GERENCIAMENTO DE BLOQUEIOS ---

  async blockContact(userId: string, data: { number: string; block: boolean }): Promise<any> {
    return this._sendToApi(userId, '/chat/block', data);
  }

  async getBlockList(userId: string): Promise<any> {
    try {
      const token = await this.getInstanceToken(userId);
      if (!token) throw new Error("Token da instância não encontrado.");

      const res = await fetch(`${UAZAPI_URL}/chat/blocklist`, {
        method: "GET",
        headers: { ...this.getHeaders(), token: token }
      });
      if (!res.ok) {
        throw new Error(`Erro ao buscar blocklist: ${res.status}`);
      }
      return await res.json();
    } catch(err: any) {
      console.error("Erro getBlockList:", err);
      throw err;
    }
  }

  // --- GERENCIAMENTO DE ETIQUETAS (LABELS) ---

  async manageChatLabels(userId: string, data: { number: string; labelids?: string[]; add_labelid?: string; remove_labelid?: string }): Promise<any> {
    return this._sendToApi(userId, '/chat/labels', data);
  }

  async editLabel(userId: string, data: { labelid: string; name?: string; color?: number; delete?: boolean }): Promise<any> {
    return this._sendToApi(userId, '/label/edit', data);
  }

  async getLabels(userId: string): Promise<any> {
    try {
      const token = await this.getInstanceToken(userId);
      if (!token) throw new Error("Token da instância não encontrado.");

      const res = await fetch(`${UAZAPI_URL}/labels`, {
        method: "GET",
        headers: { ...this.getHeaders(), token: token }
      });
      if (!res.ok) {
        throw new Error(`Erro ao buscar labels: ${res.status}`);
      }
      return await res.json();
    } catch(err: any) {
      console.error("Erro getLabels:", err);
      throw err;
    }
  }

  async refreshLabels(userId: string, data: { force?: boolean }): Promise<any> {
    return this._sendToApi(userId, '/labels/refresh', data);
  }

  // --- GERENCIAMENTO DE GRUPOS E COMUNIDADES ---

  async createGroup(userId: string, data: { name: string; participants: string[] }): Promise<any> {
    return this._sendToApi(userId, '/group/create', data);
  }

  async getGroupInfo(userId: string, data: { groupjid: string; getInviteLink?: boolean; getRequestsParticipants?: boolean; force?: boolean }): Promise<any> {
    return this._sendToApi(userId, '/group/info', data);
  }

  async getGroupInviteInfo(userId: string, data: { invitecode: string }): Promise<any> {
    return this._sendToApi(userId, '/group/inviteInfo', data);
  }

  async joinGroup(userId: string, data: { invitecode: string }): Promise<any> {
    return this._sendToApi(userId, '/group/join', data);
  }

  async leaveGroup(userId: string, data: { groupjid: string }): Promise<any> {
    return this._sendToApi(userId, '/group/leave', data);
  }

  async getAllGroups(userId: string, force?: boolean, noparticipants?: boolean): Promise<any> {
    try {
      const token = await this.getInstanceToken(userId);
      if (!token) throw new Error("Token da instância não encontrado.");

      const url = new URL(`${UAZAPI_URL}/group/list`);
      if (force) url.searchParams.append('force', 'true');
      if (noparticipants) url.searchParams.append('noparticipants', 'true');

      const res = await fetch(url.toString(), {
        method: "GET",
        headers: { ...this.getHeaders(), token: token }
      });
      if (!res.ok) {
        throw new Error(`Erro ao buscar grupos: ${res.status}`);
      }
      return await res.json();
    } catch(err: any) {
      console.error("Erro getAllGroups:", err);
      throw err;
    }
  }

  async listGroupsPaginated(userId: string, data: { limit?: number; offset?: number; search?: string; force?: boolean; noParticipants?: boolean }): Promise<any> {
    return this._sendToApi(userId, '/group/list', data);
  }

  async resetGroupInviteCode(userId: string, data: { groupjid: string }): Promise<any> {
    return this._sendToApi(userId, '/group/resetInviteCode', data);
  }

  async updateGroupAnnounce(userId: string, data: { groupjid: string; announce: boolean }): Promise<any> {
    return this._sendToApi(userId, '/group/updateAnnounce', data);
  }

  async updateGroupDescription(userId: string, data: { groupjid: string; description: string }): Promise<any> {
    return this._sendToApi(userId, '/group/updateDescription', data);
  }

  async updateGroupImage(userId: string, data: { groupjid: string; image: string }): Promise<any> {
    return this._sendToApi(userId, '/group/updateImage', data);
  }

  async updateGroupLocked(userId: string, data: { groupjid: string; locked: boolean }): Promise<any> {
    return this._sendToApi(userId, '/group/updateLocked', data);
  }

  async updateGroupName(userId: string, data: { groupjid: string; name: string }): Promise<any> {
    return this._sendToApi(userId, '/group/updateName', data);
  }

  async updateGroupParticipants(userId: string, data: { groupjid: string; action: 'add' | 'remove' | 'promote' | 'demote' | 'approve' | 'reject'; participants: string[] }): Promise<any> {
    return this._sendToApi(userId, '/group/updateParticipants', data);
  }

  async createCommunity(userId: string, data: { name: string }): Promise<any> {
    return this._sendToApi(userId, '/community/create', data);
  }

  async editCommunityGroups(userId: string, data: { community: string; action: 'add' | 'remove'; groupjids: string[] }): Promise<any> {
    return this._sendToApi(userId, '/community/editgroups', data);
  }

  // --- RESPOSTAS RÁPIDAS (QUICK REPLIES) ---

  async editQuickReply(userId: string, data: { id?: string; delete?: boolean; shortCut: string; type: string; text?: string; file?: string; docName?: string }): Promise<any> {
    return this._sendToApi(userId, '/quickreply/edit', data);
  }

  async getAllQuickReplies(userId: string): Promise<any> {
    try {
      const token = await this.getInstanceToken(userId);
      if (!token) throw new Error("Token da instância não encontrado.");

      const res = await fetch(`${UAZAPI_URL}/quickreply/showall`, {
        method: "GET",
        headers: { ...this.getHeaders(), token: token }
      });
      if (!res.ok) {
        throw new Error(`Erro ao buscar quick replies: ${res.status}`);
      }
      return await res.json();
    } catch(err: any) {
      console.error("Erro getAllQuickReplies:", err);
      throw err;
    }
  }

  // --- CRM E CAMPOS PERSONALIZADOS ---

  async updateInstanceFieldsMap(userId: string, data: Record<string, string>): Promise<any> {
    return this._sendToApi(userId, '/instance/updateFieldsMap', data);
  }

  async editChatLead(userId: string, data: any): Promise<any> {
    return this._sendToApi(userId, '/chat/editLead', data);
  }

  // --- SENDER E DISPARO EM MASSA ---

  async createSimpleCampaign(userId: string, data: any): Promise<any> {
    return this._sendToApi(userId, '/sender/simple', data);
  }

  async createAdvancedCampaign(userId: string, data: any): Promise<any> {
    return this._sendToApi(userId, '/sender/advanced', data);
  }

  async editCampaign(userId: string, data: { folder_id: string; action: 'stop' | 'continue' | 'delete' }): Promise<any> {
    return this._sendToApi(userId, '/sender/edit', data);
  }

  async clearDoneCampaignMessages(userId: string, data: { hours?: number }): Promise<any> {
    return this._sendToApi(userId, '/sender/cleardone', data);
  }

  async clearAllCampaigns(userId: string): Promise<any> {
    try {
      const token = await this.getInstanceToken(userId);
      if (!token) throw new Error("Token da instância não encontrado.");

      const res = await fetch(`${UAZAPI_URL}/sender/clearall`, {
        method: "DELETE",
        headers: { ...this.getHeaders(), token: token }
      });
      if (!res.ok) {
        throw new Error(`Erro ao limpar todas campanhas: ${res.status}`);
      }
      return await res.json();
    } catch(err: any) {
      console.error("Erro clearAllCampaigns:", err);
      throw err;
    }
  }

  async listCampaignFolders(userId: string, status?: string): Promise<any> {
    try {
      const token = await this.getInstanceToken(userId);
      if (!token) throw new Error("Token da instância não encontrado.");

      const url = new URL(`${UAZAPI_URL}/sender/listfolders`);
      if (status) {
        url.searchParams.append('status', status);
      }

      const res = await fetch(url.toString(), {
        method: "GET",
        headers: { ...this.getHeaders(), token: token }
      });
      if (!res.ok) {
        throw new Error(`Erro ao buscar pastas de campanhas: ${res.status}`);
      }
      return await res.json();
    } catch(err: any) {
      console.error("Erro listCampaignFolders:", err);
      throw err;
    }
  }

  async listCampaignMessages(userId: string, data: { folder_id: string; messageStatus?: 'Scheduled' | 'Sent' | 'Failed'; limit?: number; offset?: number }): Promise<any> {
    return this._sendToApi(userId, '/sender/listmessages', data);
  }
}
