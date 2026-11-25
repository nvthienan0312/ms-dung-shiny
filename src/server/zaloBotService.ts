import fs from "fs";
import os from "os";
import path from "path";

// Kiểu dữ liệu thông tin người dùng Zalo
export interface ZaloConnectedUser {
  id: string;
  name: string;
  avatar?: string;
  phone?: string;
}

export type ZaloQrStatus =
  | "idle"
  | "generating"
  | "ready"
  | "scanned"
  | "connected"
  | "expired"
  | "error";

function normalizeVnPhoneDigits(raw: string): {
  rawDigits: string;
  phone0: string;
  phone84: string;
} {
  const rawDigits = (raw || "").replace(/[^0-9]/g, "");
  if (!rawDigits) return { rawDigits: "", phone0: "", phone84: "" };
  let phone0 = rawDigits;
  let phone84 = rawDigits;
  if (rawDigits.startsWith("84") && rawDigits.length >= 10) {
    phone0 = "0" + rawDigits.slice(2);
    phone84 = rawDigits;
  } else if (rawDigits.startsWith("0")) {
    phone0 = rawDigits;
    phone84 = "84" + rawDigits.slice(1);
  }
  return { rawDigits, phone0, phone84 };
}

function normalizeGroupInviteCode(url: string): string | null {
  const match = (url || "").trim().match(/zalo\.me\/g\/([a-zA-Z0-9_-]+)/i) ||
    (url || "").trim().match(/\/g\/([a-zA-Z0-9_-]+)/i);
  return match ? match[1].trim() : null;
}

function normalizeTextStrict(val: string): string {
  return (val || "").toLowerCase().replace(/\s+/g, " ").trim();
}

/**
 * Đại diện cho 1 phiên Zalo Bot độc lập của ĐÚNG 1 tài khoản cụ thể.
 * Không dùng chung phiên hay ghi đè giữa các tài khoản khác nhau.
 */
export class SingleZaloBotInstance {
  public readonly accountKey: string;
  public readonly role: "ADMIN" | "TEACHER" | "ASSISTANT";
  private zaloInstance: any = null;
  private zaloApi: any = null;
  private currentQrCode: string | null = null;
  private currentQrStatus: ZaloQrStatus = "idle";
  private connectedUserInfo: ZaloConnectedUser | null = null;
  private isLoggingIn: boolean = false;
  private qrGeneratedAt: number = 0;
  private readonly safeKey: string;
  private readonly primarySessionFile: string;
  private readonly primarySessionBakFile: string;
  private readonly tmpSessionFile: string;
  private readonly tmpSessionBakFile: string;
  private readonly dbSessionKey: string;
  private restorePromise: Promise<boolean> | null = null;
  private lastDbCheckAt: number = 0;

  constructor(accountKey: string, role: "ADMIN" | "TEACHER" | "ASSISTANT" = "ADMIN") {
    this.safeKey = (accountKey || "admin")
      .toLowerCase()
      .replace(/[^a-z0-9_-]/g, "_")
      .replace(/^_+|_+$/g, "") || "admin";
    this.accountKey = this.safeKey;
    this.role = role;

    const fileName = `zalo_session_${this.safeKey}.json`;
    const bakName = `zalo_session_${this.safeKey}.json.bak`;
    this.primarySessionFile = path.join(process.cwd(), fileName);
    this.primarySessionBakFile = path.join(process.cwd(), bakName);

    const tmpDir = path.join(os.tmpdir(), "ms-dung-zalo-sessions");
    this.tmpSessionFile = path.join(tmpDir, fileName);
    this.tmpSessionBakFile = path.join(tmpDir, bakName);

    // Khóa DB tách biệt hoàn toàn với main_center_data
    this.dbSessionKey = `zalo_bot_session_${this.safeKey}`;

    // Chỉ kế thừa file cũ duy nhất cho tài khoản admin mặc định
    if (this.safeKey === "admin") {
      const legacyFile = path.join(process.cwd(), "zalo_session.json");
      if (!fs.existsSync(this.primarySessionFile) && fs.existsSync(legacyFile)) {
        try {
          fs.copyFileSync(legacyFile, this.primarySessionFile);
        } catch (_e) {}
      }
    }
  }

  private writeLocalSessionFiles(sessionData: any) {
    const serialized = JSON.stringify(sessionData, null, 2);
    try {
      fs.writeFileSync(this.primarySessionFile, serialized, "utf8");
      fs.writeFileSync(this.primarySessionBakFile, serialized, "utf8");
      return;
    } catch (_err) {
      // Fallback sang os.tmpdir() khi chạy trên môi trường serverless read-only (Netlify/Lambda)
    }
    try {
      const tmpDir = path.dirname(this.tmpSessionFile);
      if (!fs.existsSync(tmpDir)) {
        fs.mkdirSync(tmpDir, { recursive: true });
      }
      fs.writeFileSync(this.tmpSessionFile, serialized, "utf8");
      fs.writeFileSync(this.tmpSessionBakFile, serialized, "utf8");
    } catch (_err2) {}
  }

  private readLocalSessionContent(): { content: string; source: string } | null {
    const candidates = [
      this.primarySessionFile,
      this.primarySessionBakFile,
      this.tmpSessionFile,
      this.tmpSessionBakFile,
    ];
    for (const filePath of candidates) {
      try {
        if (fs.existsSync(filePath)) {
          return { content: fs.readFileSync(filePath, "utf8"), source: filePath };
        }
      } catch (_e) {}
    }
    return null;
  }

  private async saveSessionToDb(sessionData: any) {
    try {
      const { prisma } = await import("@/lib/prisma");
      await prisma.centerDataStore.upsert({
        where: { key: this.dbSessionKey },
        update: { data: sessionData },
        create: { key: this.dbSessionKey, data: sessionData },
      });
    } catch (_err) {
      // Không chặn luồng chính nếu chưa cấu hình DB hoặc đang chạy offline
    }
  }

  private async loadSessionFromDb(): Promise<any | null> {
    try {
      const { prisma } = await import("@/lib/prisma");
      const record = await prisma.centerDataStore.findUnique({
        where: { key: this.dbSessionKey },
      });
      if (record && record.data && typeof record.data === "object") {
        return record.data;
      }
    } catch (_err) {}
    return null;
  }

  private async deleteSessionStorage() {
    for (const filePath of [
      this.primarySessionFile,
      this.primarySessionBakFile,
      this.tmpSessionFile,
      this.tmpSessionBakFile,
    ]) {
      try {
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      } catch (_e) {}
    }
    try {
      const { prisma } = await import("@/lib/prisma");
      await prisma.centerDataStore.deleteMany({
        where: { key: this.dbSessionKey },
      });
    } catch (_e) {}
  }

  public async ensureRestored(forceRecheck: boolean = false): Promise<boolean> {
    if (this.zaloApi) return true;
    if (this.isLoggingIn) return false;
    const now = Date.now();
    if (!forceRecheck && this.lastDbCheckAt > 0 && now - this.lastDbCheckAt < 4000 && !this.restorePromise) {
      return false;
    }
    if (!this.restorePromise) {
      this.restorePromise = this.tryRestoreSession().finally(() => {
        this.restorePromise = null;
      });
    }
    return this.restorePromise;
  }

  // Khôi phục phiên từ file hoặc DB riêng của tài khoản này
  public async tryRestoreSession(): Promise<boolean> {
    this.lastDbCheckAt = Date.now();
    let sessionData: any = null;

    const local = this.readLocalSessionContent();
    if (local) {
      try {
        sessionData = JSON.parse(local.content);
      } catch (_e) {
        sessionData = null;
      }
    }

    if (!sessionData) {
      sessionData = await this.loadSessionFromDb();
    }

    if (!sessionData) return false;

    try {
      const { Zalo } = await import("zca-js");
      this.zaloInstance = new Zalo({ selfListen: false, checkUpdate: false, logging: false });
      const api = await this.zaloInstance.login(sessionData);

      this.zaloApi = api;
      this.currentQrStatus = "connected";
      await this.saveSessionFromApi(api);
      await this.hydrateSelfInfo(api);
      return true;
    } catch (err: any) {
      console.warn(`[ZALO BOT - ${this.accountKey}] Khôi phục phiên thất bại:`, err?.message || err);
      this.zaloApi = null;
      this.connectedUserInfo = null;
      return false;
    }
  }

  private async hydrateSelfInfo(api: any) {
    try {
      const accRes = await api.fetchAccountInfo();
      const profile = accRes?.profile || accRes || {};
      const ctx = api.getContext();
      this.connectedUserInfo = {
        id: profile.userId || profile.uid || ctx?.uid || `zalo_user_${this.accountKey}`,
        name: profile.displayName || profile.display_name || profile.name || `Zalo (${this.accountKey})`,
        avatar: profile.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(this.accountKey)}`,
        phone: profile.phoneNumber || "",
      };
    } catch (_e) {
      this.connectedUserInfo = {
        id: `uid_${this.accountKey}`,
        name: `Zalo (${this.accountKey})`,
        avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(this.accountKey)}`,
        phone: "",
      };
    }
  }

  private async saveSessionFromApi(api: any) {
    try {
      const ctx = api.getContext();
      if (ctx && ctx.cookie) {
        const sessionData = {
          cookie: ctx.cookie.toJSON ? ctx.cookie.toJSON().cookies : ctx.cookie,
          imei: ctx.imei,
          userAgent:
            ctx.options?.userAgent ||
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:133.0) Gecko/20100101 Firefox/133.0",
        };
        this.writeLocalSessionFiles(sessionData);
        await this.saveSessionToDb(sessionData);
      }
    } catch (err: any) {
      console.warn(`[ZALO BOT - ${this.accountKey}] Lưu session thất bại:`, err?.message);
    }
  }

  // Khởi tạo mã QR để đăng nhập cho đúng tài khoản này
  public async initQrLogin(forceNew: boolean = false): Promise<{
    success: boolean;
    qrCode?: string;
    alreadyConnected?: boolean;
    message?: string;
  }> {
    if (forceNew) {
      await this.disconnect();
    } else {
      await this.ensureRestored();
      if (this.zaloApi) {
        return {
          success: true,
          alreadyConnected: true,
          message: `Zalo "${this.connectedUserInfo?.name || this.accountKey}" đã được kết nối sẵn.`,
        };
      }
    }

    const now = Date.now();
    if (!forceNew && this.currentQrCode && this.currentQrStatus === "ready" && now - this.qrGeneratedAt < 50000) {
      return {
        success: true,
        qrCode: this.currentQrCode,
        message: "Mã QR hiện tại vẫn đang sẵn sàng.",
      };
    }

    this.isLoggingIn = true;
    this.currentQrStatus = "generating";
    this.currentQrCode = null;
    this.lastDbCheckAt = Date.now();

    try {
      const { Zalo, LoginQRCallbackEventType } = await import("zca-js");
      this.zaloInstance = new Zalo({ selfListen: false, checkUpdate: false, logging: false });

      return new Promise((resolve) => {
        let settled = false;
        const safeResolve = (payload: { success: boolean; qrCode?: string; message?: string }) => {
          if (!settled) {
            settled = true;
            resolve(payload);
          }
        };

        this.zaloInstance
          .loginQR({}, (event: any) => {
            if (event.type === LoginQRCallbackEventType.QRCodeGenerated) {
              this.currentQrCode = "data:image/png;base64," + event.data.image;
              this.currentQrStatus = "ready";
              this.qrGeneratedAt = Date.now();
              safeResolve({
                success: true,
                qrCode: this.currentQrCode,
                message: "Đã tạo mã QR thành công. Mở ứng dụng Zalo trên điện thoại để quét.",
              });
            } else if (event.type === LoginQRCallbackEventType.QRCodeScanned) {
              this.currentQrStatus = "scanned";
            } else if (event.type === LoginQRCallbackEventType.GotLoginInfo) {
              if (event.data) {
                this.writeLocalSessionFiles(event.data);
                void this.saveSessionToDb(event.data);
              }
            } else if (event.type === LoginQRCallbackEventType.QRCodeExpired) {
              this.currentQrStatus = "expired";
              this.currentQrCode = null;
              this.isLoggingIn = false;
            }
          })
          .then(async (api: any) => {
            this.zaloApi = api;
            await this.saveSessionFromApi(api);
            await this.hydrateSelfInfo(api);
            this.currentQrStatus = "connected";
            this.currentQrCode = null;
            this.isLoggingIn = false;
            safeResolve({
              success: true,
              message: `Đăng nhập Zalo thành công (${this.connectedUserInfo?.name || this.accountKey})!`,
            });
          })
          .catch((err: any) => {
            console.error(`[ZALO BOT - ${this.accountKey}] Lỗi đăng nhập QR:`, err?.message || err);
            this.currentQrStatus = "error";
            this.isLoggingIn = false;
            safeResolve({
              success: false,
              message: `Không thể tạo/xác thực mã QR Zalo: ${err?.message || "Lỗi kết nối Zalo Server"}`,
            });
          });

        setTimeout(() => {
          if (!this.currentQrCode && !this.zaloApi) {
            this.isLoggingIn = false;
            safeResolve({
              success: false,
              message: "Máy chủ Zalo phản hồi chậm khi tạo mã QR. Vui lòng bấm Thử lại.",
            });
          }
        }, 12000);
      });
    } catch (err: any) {
      this.isLoggingIn = false;
      this.currentQrStatus = "error";
      return {
        success: false,
        message: `Lỗi khởi tạo QR: ${err?.message || err}`,
      };
    }
  }

  public async getStatus() {
    await this.ensureRestored();
    const now = Date.now();
    const qrAge = this.qrGeneratedAt > 0 ? Math.floor((now - this.qrGeneratedAt) / 1000) : 0;
    const qrRemainingSec = Math.max(0, 60 - qrAge);

    return {
      accountKey: this.accountKey,
      role: this.role,
      isConnected: !!this.zaloApi,
      status: this.zaloApi ? "connected" : this.currentQrStatus,
      qrCode: this.currentQrCode,
      qrRemainingSec,
      isExpired: this.currentQrStatus === "expired" || (!!this.currentQrCode && qrRemainingSec <= 0),
      user: this.connectedUserInfo,
    };
  }

  private async fetchHydratedGroups(): Promise<Array<{ id: string; groupId: string; name: string; avatar?: string }>> {
    if (!this.zaloApi || !this.zaloApi.getAllGroups) return [];

    const groupsRaw = await this.zaloApi.getAllGroups().catch(() => []);
    let rawIds: string[] = [];
    let directList: any[] = [];

    if (Array.isArray(groupsRaw)) {
      directList = groupsRaw;
    } else if (groupsRaw && typeof groupsRaw === "object") {
      if (groupsRaw.gridVerMap && typeof groupsRaw.gridVerMap === "object") {
        rawIds = Object.keys(groupsRaw.gridVerMap);
      } else if (groupsRaw.groupMap && typeof groupsRaw.groupMap === "object") {
        directList = Object.values(groupsRaw.groupMap);
      }
    }

    if (directList.length > 0) {
      return directList.slice(0, 60).map((g: any) => {
        const gId = String(g.groupId || g.id || g.grid || "");
        return {
          id: gId,
          groupId: gId,
          name: g.name || g.groupName || `Nhóm Zalo (${gId})`,
          avatar: g.avatar,
        };
      });
    }

    const cappedIds = rawIds.slice(0, 60);
    const infoMap: Record<string, any> = {};

    if (cappedIds.length > 0 && this.zaloApi.getGroupInfo) {
      const chunkSize = 20;
      for (let i = 0; i < cappedIds.length; i += chunkSize) {
        const chunk = cappedIds.slice(i, i + chunkSize);
        try {
          const infoRes = await this.zaloApi.getGroupInfo(chunk);
          if (infoRes && infoRes.gridInfoMap) {
            Object.assign(infoMap, infoRes.gridInfoMap);
          }
        } catch (_e) {}
      }
    }

    return cappedIds.map((gid) => {
      const info = infoMap[gid];
      return {
        id: gid,
        groupId: gid,
        name: info?.name || `Nhóm Zalo (${gid})`,
        avatar: info?.avt || info?.fullAvt,
      };
    });
  }

  // Lấy danh bạ bạn bè & nhóm thật (có tên đầy đủ) của tài khoản này
  public async getContacts() {
    await this.ensureRestored(true);
    if (!this.zaloApi) {
      return { friends: [], groups: [], self: this.connectedUserInfo };
    }

    try {
      const [friends, hydratedGroups] = await Promise.all([
        this.zaloApi.getAllFriends ? this.zaloApi.getAllFriends().catch(() => []) : [],
        this.fetchHydratedGroups(),
      ]);

      const formattedFriends = Array.isArray(friends)
        ? friends.slice(0, 100).map((f: any) => ({
            id: f.userId || f.uid,
            userId: f.userId || f.uid,
            name: f.displayName || f.display_name || f.zaloName || f.zalo_name || "Bạn bè",
            phone: f.phoneNumber || "",
            avatar: f.avatar,
          }))
        : [];

      return {
        friends: formattedFriends,
        groups: hydratedGroups,
        self: this.connectedUserInfo,
      };
    } catch (_e) {
      return { friends: [], groups: [], self: this.connectedUserInfo };
    }
  }

  private async resolveGroupByInviteUrl(
    cleanUrl: string,
    fallbackName: string
  ): Promise<{ groupId: string; groupName: string } | null> {
    // 1. Gọi trực tiếp getGroupLinkInfo của zca-js
    if (this.zaloApi.getGroupLinkInfo) {
      try {
        const linkInfo = await this.zaloApi.getGroupLinkInfo({ link: cleanUrl });
        const gid = linkInfo?.groupId || linkInfo?.globalId;
        if (gid) {
          return {
            groupId: String(gid),
            groupName: linkInfo.name || fallbackName,
          };
        }
      } catch (_le) {}
    }

    // 2. Nếu getGroupLinkInfo bị từ chối hoặc lỗi, kiểm tra link tham gia của các nhóm bot đã tham gia
    const urlCode = normalizeGroupInviteCode(cleanUrl);
    if (!urlCode) return null;

    const groups = await this.fetchHydratedGroups();
    const directIdMatch = groups.find((g) => g.groupId === urlCode || g.id === urlCode);
    if (directIdMatch) {
      return { groupId: directIdMatch.groupId, groupName: directIdMatch.name || fallbackName };
    }

    if (this.zaloApi.getGroupLinkDetail) {
      const batchSize = 8;
      for (let i = 0; i < groups.length; i += batchSize) {
        const batch = groups.slice(i, i + batchSize);
        const results = await Promise.all(
          batch.map(async (g) => {
            try {
              const detail = await this.zaloApi.getGroupLinkDetail(g.groupId);
              const detailCode = detail?.link ? normalizeGroupInviteCode(detail.link) : null;
              if (detailCode && detailCode.toLowerCase() === urlCode.toLowerCase()) {
                return g;
              }
            } catch (_e) {}
            return null;
          })
        );
        const found = results.find(Boolean);
        if (found) {
          return { groupId: found.groupId, groupName: found.name || fallbackName };
        }
      }
    }

    return null;
  }

  // Gửi tin nhắn qua ĐÚNG bot của tài khoản này (không suy đoán nhầm nhóm / nhầm SĐT)
  public async sendMessage(params: {
    phone?: string;
    userId?: string;
    groupId?: string;
    groupUrl?: string;
    groupName?: string;
    className?: string;
    message: string;
  }): Promise<{
    success: boolean;
    recipient?: string;
    message: string;
    error?: string;
    needsZaloLogin?: boolean;
  }> {
    const { phone, userId, groupId, groupUrl, groupName, className, message } = params;

    if (!message || !message.trim()) {
      return { success: false, error: "Thiếu nội dung tin nhắn.", message: "Nội dung rỗng" };
    }

    await this.ensureRestored(true);

    if (!this.zaloApi) {
      return {
        success: false,
        needsZaloLogin: true,
        error: `Tài khoản Zalo cá nhân (${this.accountKey}) chưa kết nối Bot. Vui lòng bấm biểu tượng Zalo trên thanh trên cùng để quét mã QR đăng nhập.`,
        message: "Chưa kết nối tài khoản Zalo",
      };
    }

    try {
      const { ThreadType } = await import("zca-js");

      // 1. GỬI NHÓM ZALO LỚP
      const isGroupIntent = Boolean(groupId?.trim() || groupUrl?.trim() || groupName?.trim());
      if (isGroupIntent) {
        let targetGroupId = groupId?.trim() || "";
        let targetGroupName = groupName || className || "Nhóm Zalo Lớp";

        // Ưu tiên tuyệt đối: Nếu có groupUrl -> chỉ tìm theo groupUrl đó, KHÔNG rơi về khớp mờ tên lớp!
        if (!targetGroupId && groupUrl?.trim()) {
          const resolved = await this.resolveGroupByInviteUrl(groupUrl.trim(), targetGroupName);
          if (!resolved) {
            return {
              success: false,
              error: `Không tìm thấy hoặc không truy cập được nhóm Zalo từ link "${groupUrl.trim()}". Vui lòng kiểm tra tài khoản Zalo (${this.connectedUserInfo?.name || this.accountKey}) đã tham gia đúng nhóm này chưa hoặc chọn đúng nhóm trong danh sách.`,
              message: "Không khớp được link nhóm Zalo",
            };
          }
          targetGroupId = resolved.groupId;
          targetGroupName = resolved.groupName;
        }

        // Chỉ tra theo tên nếu KHÔNG truyền cả groupId lẫn groupUrl
        if (!targetGroupId && !groupUrl?.trim() && (groupName || className)) {
          const searchTarget = normalizeTextStrict(groupName || className || "");
          if (searchTarget.length >= 2) {
            const groups = await this.fetchHydratedGroups();
            // Ưu tiên khớp chính xác tên hoàn toàn
            let matched = groups.find((g) => normalizeTextStrict(g.name) === searchTarget);
            // Nếu không có tên khớp 100%, chỉ khớp theo ranh giới từ (tránh "K1" khớp nhầm "K12" hoặc rỗng)
            if (!matched && searchTarget.length >= 3) {
              const escaped = searchTarget.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
              const regex = new RegExp(`(^|[^a-z0-9])${escaped}([^a-z0-9]|$)`, "i");
              matched = groups.find((g) => g.name && regex.test(normalizeTextStrict(g.name)));
            }
            if (matched) {
              targetGroupId = matched.groupId;
              targetGroupName = matched.name || targetGroupName;
            }
          }
        }

        if (!targetGroupId) {
          return {
            success: false,
            error: `Không xác định được Nhóm Zalo lớp "${targetGroupName}". Vui lòng dán đúng Link nhóm (zalo.me/g/...) hoặc chọn nhóm từ danh sách Bot.`,
            message: "Chưa xác định được nhóm Zalo",
          };
        }

        await this.zaloApi.sendMessage({ msg: message }, targetGroupId, ThreadType.Group);
        return {
          success: true,
          recipient: targetGroupName,
          message: `Đã gửi thành công vào nhóm Zalo "${targetGroupName}"!`,
        };
      }

      // 2. GỬI QUA USER ID HOẶC CLOUD CỦA TÔI
      if (userId) {
        let targetId = userId;
        let targetName = "Người nhận";
        if (userId === "self" || userId === this.connectedUserInfo?.id) {
          targetId = this.connectedUserInfo?.id || userId;
          targetName = `Cloud của tôi (${this.connectedUserInfo?.name || "Chính bạn"})`;
        }

        await this.zaloApi.sendMessage({ msg: message }, targetId, ThreadType.User);
        return {
          success: true,
          recipient: targetName,
          message: `Đã gửi thành công qua Zalo tới ${targetName}!`,
        };
      }

      // 3. GỬI THEO SỐ ĐIỆN THOẠI (KHỚP CHÍNH XÁC 100%, KHÔNG KHỚP ĐUÔI 8 SỐ)
      if (!phone) {
        return {
          success: false,
          error: "Thiếu số điện thoại hoặc ID nhóm người nhận.",
          message: "Thiếu thông tin người nhận",
        };
      }

      const targetNorm = normalizeVnPhoneDigits(phone);
      if (!targetNorm.rawDigits || targetNorm.rawDigits.length < 9) {
        return {
          success: false,
          error: `Số điện thoại "${phone}" không hợp lệ.`,
          message: "SĐT không hợp lệ",
        };
      }

      let targetUid: string | null = null;
      let targetName: string | null = null;

      // Kiểm tra nếu gửi cho chính số của mình -> Cloud của tôi
      if (this.connectedUserInfo?.phone) {
        const myNorm = normalizeVnPhoneDigits(this.connectedUserInfo.phone);
        if (
          myNorm.phone0 &&
          (myNorm.phone0 === targetNorm.phone0 || myNorm.phone84 === targetNorm.phone84)
        ) {
          targetUid = this.connectedUserInfo.id;
          targetName = `Cloud của tôi (${this.connectedUserInfo.name})`;
        }
      }

      // Tra cứu danh bạ bạn bè theo số điện thoại khớp chính xác
      if (!targetUid && this.zaloApi.getAllFriends) {
        try {
          const friends = await this.zaloApi.getAllFriends();
          if (Array.isArray(friends)) {
            const matched = friends.find((f: any) => {
              const fNorm = normalizeVnPhoneDigits(f.phoneNumber || "");
              if (!fNorm.rawDigits) return false;
              return (
                fNorm.phone0 === targetNorm.phone0 ||
                fNorm.phone84 === targetNorm.phone84 ||
                fNorm.rawDigits === targetNorm.rawDigits
              );
            });
            if (matched) {
              targetUid = matched.userId || matched.uid;
              targetName = matched.displayName || matched.display_name || matched.zaloName;
            }
          }
        } catch (_fErr) {}
      }

      // Tra cứu qua findUser(84...)
      if (!targetUid && this.zaloApi.findUser && targetNorm.phone84) {
        try {
          const res84 = await this.zaloApi.findUser(targetNorm.phone84);
          if (res84 && (res84.uid || res84.userId)) {
            targetUid = res84.uid || res84.userId;
            targetName = res84.display_name || res84.displayName || res84.zalo_name || phone;
          }
        } catch (_e1) {}
      }

      // Tra cứu qua findUser(0...)
      if (!targetUid && this.zaloApi.findUser && targetNorm.phone0) {
        try {
          const res0 = await this.zaloApi.findUser(targetNorm.phone0);
          if (res0 && (res0.uid || res0.userId)) {
            targetUid = res0.uid || res0.userId;
            targetName = res0.display_name || res0.displayName || res0.zalo_name || phone;
          }
        } catch (_e2) {}
      }

      // Fallback getMultiUsersByPhones
      if (!targetUid && this.zaloApi.getMultiUsersByPhones) {
        try {
          const queryList = [targetNorm.phone84, targetNorm.phone0].filter(Boolean);
          const multi = await this.zaloApi.getMultiUsersByPhones(queryList);
          if (multi && typeof multi === "object") {
            const u = multi[targetNorm.phone84] || multi[targetNorm.phone0];
            if (u && (u.uid || u.userId)) {
              targetUid = u.uid || u.userId;
              targetName = u.display_name || u.displayName || phone;
            }
          }
        } catch (_e3) {}
      }

      if (!targetUid) {
        return {
          success: false,
          error: `Không tìm thấy tài khoản Zalo với SĐT ${phone} từ tài khoản (${this.connectedUserInfo?.name || this.accountKey}). Nguyên nhân có thể do phụ huynh chưa kết bạn hoặc đang tắt 'Cho phép tìm kiếm qua SĐT'.`,
          message: `Không tìm thấy Zalo cho SĐT ${phone}`,
        };
      }

      await this.zaloApi.sendMessage({ msg: message }, targetUid, ThreadType.User);
      return {
        success: true,
        recipient: targetName || phone,
        message: `Đã gửi thành công qua Zalo tới ${targetName || phone}!`,
      };
    } catch (err: any) {
      console.error(`[ZALO SEND ERROR - ${this.accountKey}]`, err);
      const errMsg = err?.message || "Lỗi không xác định";
      return {
        success: false,
        error: `Gửi Zalo thất bại từ tài khoản ${this.connectedUserInfo?.name || this.accountKey}: ${errMsg}`,
        message: "Gửi tin Zalo thất bại",
      };
    }
  }

  public async disconnect() {
    this.zaloApi = null;
    this.connectedUserInfo = null;
    this.currentQrStatus = "idle";
    this.currentQrCode = null;
    this.isLoggingIn = false;
    this.qrGeneratedAt = 0;
    this.restorePromise = null;
    this.lastDbCheckAt = Date.now();
    await this.deleteSessionStorage();
    return { success: true };
  }
}

/**
 * Quản lý đa Bot Zalo ĐỘC LẬP TUYỆT ĐỐI theo từng tài khoản người dùng.
 * Cho phép nhiều Bot (Admin, nhiều Giáo viên, nhiều Trợ giảng) hoạt động đồng thời song song.
 */
export class MultiZaloBotManager {
  private instances: Map<string, SingleZaloBotInstance> = new Map();

  private resolveKeyAndRole(
    accountId?: string,
    role?: string,
    phone?: string
  ): { key: string; normalizedRole: "ADMIN" | "TEACHER" | "ASSISTANT" } {
    const cleanRoleRaw = (role || "").toUpperCase();
    const normalizedRole: "ADMIN" | "TEACHER" | "ASSISTANT" =
      cleanRoleRaw === "ASSISTANT"
        ? "ASSISTANT"
        : cleanRoleRaw === "TEACHER"
        ? "TEACHER"
        : "ADMIN";

    const cleanAcc = (accountId || "").trim().toLowerCase();
    const cleanDigits = (phone || "").replace(/[^0-9]/g, "");

    if (cleanAcc && cleanAcc !== "teacher" && cleanAcc !== "assistant") {
      if (cleanAcc === "admin" || cleanAcc === "hotline") {
        return { key: "admin", normalizedRole: "ADMIN" };
      }
      const safe = cleanAcc.replace(/[^a-z0-9_-]/g, "_").replace(/^_+|_+$/g, "");
      if (safe) {
        const inferredRole: "ADMIN" | "TEACHER" | "ASSISTANT" = safe.startsWith("assistant")
          ? "ASSISTANT"
          : safe.startsWith("teacher")
          ? "TEACHER"
          : normalizedRole;
        return { key: safe, normalizedRole: inferredRole };
      }
    }

    if (normalizedRole === "ADMIN") {
      return { key: "admin", normalizedRole: "ADMIN" };
    }

    if (cleanDigits) {
      return {
        key: `${normalizedRole.toLowerCase()}_${cleanDigits}`,
        normalizedRole,
      };
    }

    return { key: normalizedRole.toLowerCase(), normalizedRole };
  }

  public getBotInstance(
    accountId?: string,
    role?: string,
    phone?: string
  ): SingleZaloBotInstance {
    const { key, normalizedRole } = this.resolveKeyAndRole(accountId, role, phone);

    if (!this.instances.has(key)) {
      const newBot = new SingleZaloBotInstance(key, normalizedRole);
      this.instances.set(key, newBot);
    }

    return this.instances.get(key)!;
  }

  // Thống kê tất cả các Bot Zalo đang hoạt động song song (kể cả trên nhiều instance serverless qua DB)
  public async getActiveBotsSummary(): Promise<Array<{ accountKey: string; role: string }>> {
    const activeKeys = new Map<string, string>();

    for (const [key, bot] of Array.from(this.instances.entries())) {
      const st = await bot.getStatus();
      if (st.isConnected) {
        activeKeys.set(key, bot.role);
      }
    }

    try {
      const { prisma } = await import("@/lib/prisma");
      const dbRows = await prisma.centerDataStore.findMany({
        where: { key: { startsWith: "zalo_bot_session_" } },
        select: { key: true },
      });
      for (const row of dbRows) {
        const k = row.key.replace(/^zalo_bot_session_/, "");
        if (k && !activeKeys.has(k)) {
          const inferredRole = k.startsWith("assistant")
            ? "ASSISTANT"
            : k.startsWith("teacher")
            ? "TEACHER"
            : "ADMIN";
          activeKeys.set(k, inferredRole);
        }
      }
    } catch (_e) {}

    return Array.from(activeKeys.entries()).map(([accountKey, role]) => ({
      accountKey,
      role,
    }));
  }

  // Gửi trực tiếp bằng ĐÚNG bot của tài khoản đang đăng nhập — tuyệt đối KHÔNG fallback sang tài khoản khác
  public async sendMessageFromAccount(params: {
    phone?: string;
    userId?: string;
    groupId?: string;
    groupUrl?: string;
    groupName?: string;
    className?: string;
    message: string;
    accountId?: string;
    senderRole?: string;
    senderPhone?: string;
  }) {
    const senderBot = this.getBotInstance(params.accountId, params.senderRole, params.senderPhone);
    return await senderBot.sendMessage(params);
  }

  // Giữ tương thích tên hàm cũ nếu có nơi gọi, nhưng KHÔNG fallback chéo tài khoản
  public async sendMessageWithFallback(params: {
    phone?: string;
    userId?: string;
    groupId?: string;
    groupUrl?: string;
    groupName?: string;
    className?: string;
    message: string;
    accountId?: string;
    senderRole?: string;
    senderPhone?: string;
  }) {
    return await this.sendMessageFromAccount(params);
  }
}

const globalForMultiZalo = globalThis as unknown as {
  multiZaloBotManagerInstance?: MultiZaloBotManager;
};

export const multiZaloBotManager =
  globalForMultiZalo.multiZaloBotManagerInstance || new MultiZaloBotManager();

// Giữ cache trên globalThis cho cả development & production để nhiều bot chạy song song ổn định
globalForMultiZalo.multiZaloBotManagerInstance = multiZaloBotManager;

export const zaloBotService = multiZaloBotManager.getBotInstance("admin", "ADMIN");
