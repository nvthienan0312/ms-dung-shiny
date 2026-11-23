import fs from "fs";
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

/**
 * Đại diện cho 1 phiên Zalo Bot độc lập của 1 tài khoản (Admin, Giáo viên, Trợ giảng)
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
  private readonly sessionFile: string;
  private readonly sessionBakFile: string;

  constructor(accountKey: string, role: "ADMIN" | "TEACHER" | "ASSISTANT" = "ADMIN") {
    this.accountKey = accountKey.toLowerCase();
    this.role = role;

    // Tên file session riêng biệt cho từng tài khoản để đảm bảo sự độc lập tuyệt đối
    const safeKey = this.accountKey.replace(/[^a-z0-9_-]/g, "_");
    this.sessionFile = path.join(process.cwd(), `zalo_session_${safeKey}.json`);
    this.sessionBakFile = path.join(process.cwd(), `zalo_session_${safeKey}.json.bak`);

    // Tương thích ngược: Nếu là tài khoản Admin/mặc định và có file zalo_session.json cũ
    if (this.accountKey === "admin" || this.accountKey === "default") {
      const legacyFile = path.join(process.cwd(), "zalo_session.json");
      if (!fs.existsSync(this.sessionFile) && fs.existsSync(legacyFile)) {
        try {
          fs.copyFileSync(legacyFile, this.sessionFile);
        } catch (_e) {}
      }
    }

    this.tryRestoreSession();
  }

  // Khôi phục phiên từ file session riêng của tài khoản
  public async tryRestoreSession(): Promise<boolean> {
    const fileToTry = fs.existsSync(this.sessionFile)
      ? this.sessionFile
      : fs.existsSync(this.sessionBakFile)
      ? this.sessionBakFile
      : null;

    if (!fileToTry) return false;

    try {
      console.log(`[ZALO BOT - ${this.accountKey.toUpperCase()}] Đang khôi phục phiên từ:`, fileToTry);
      const sessionContent = fs.readFileSync(fileToTry, "utf8");
      const sessionData = JSON.parse(sessionContent);

      const { Zalo } = await import("zca-js");
      this.zaloInstance = new Zalo();
      const api = await this.zaloInstance.login(sessionData);

      this.zaloApi = api;
      this.currentQrStatus = "connected";
      this.saveSessionFromApi(api);

      try {
        const accRes = await api.fetchAccountInfo();
        const profile = accRes?.profile || accRes || {};
        const ctx = api.getContext();
        this.connectedUserInfo = {
          id: profile.userId || profile.uid || ctx?.uid || `zalo_user_${this.accountKey}`,
          name: profile.displayName || profile.display_name || profile.name || `Zalo ${this.accountKey.toUpperCase()}`,
          avatar: profile.avatar || "https://api.dicebear.com/7.x/avataaars/svg?seed=" + this.accountKey,
          phone: profile.phoneNumber || "",
        };
        console.log(`[ZALO BOT - ${this.accountKey.toUpperCase()}] Khôi phục phiên thành công:`, this.connectedUserInfo.name);
      } catch (e) {
        this.connectedUserInfo = {
          id: `uid_${this.accountKey}`,
          name: `Zalo ${this.accountKey.toUpperCase()}`,
          avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=" + this.accountKey,
          phone: "",
        };
      }
      return true;
    } catch (err: any) {
      console.warn(`[ZALO BOT - ${this.accountKey.toUpperCase()}] Không thể khôi phục phiên cũ:`, err?.message || err);
      return false;
    }
  }

  private saveSessionFromApi(api: any) {
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
        fs.writeFileSync(this.sessionFile, JSON.stringify(sessionData, null, 2), "utf8");
        fs.writeFileSync(this.sessionBakFile, JSON.stringify(sessionData, null, 2), "utf8");
        console.log(`[ZALO BOT - ${this.accountKey.toUpperCase()}] Đã lưu phiên vào ${path.basename(this.sessionFile)} thành công!`);
      }
    } catch (err: any) {
      console.warn(`[ZALO BOT - ${this.accountKey.toUpperCase()}] Lưu session thất bại:`, err.message);
    }
  }

  // Khởi tạo mã QR để đăng nhập (Hỗ trợ forceNew để quét tài khoản khác / làm mới tự động)
  public async initQrLogin(forceNew: boolean = false): Promise<{ success: boolean; qrCode?: string; message?: string }> {
    // Nếu forceNew = true hoặc đang yêu cầu đổi tài khoản khác: Hủy kết nối cũ trước
    if (forceNew) {
      console.log(`[ZALO BOT - ${this.accountKey.toUpperCase()}] Yêu cầu tạo mã QR mới (Đổi tài khoản khác)...`);
      this.disconnect();
    } else if (this.zaloApi) {
      return {
        success: true,
        message: `Tài khoản Zalo ${this.connectedUserInfo?.name || this.accountKey} đã được kết nối sẵn.`,
      };
    }

    // Nếu mã QR hiện tại còn hiệu lực (< 50 giây), tái sử dụng
    const now = Date.now();
    if (!forceNew && this.currentQrCode && this.currentQrStatus === "ready" && now - this.qrGeneratedAt < 50000) {
      return {
        success: true,
        qrCode: this.currentQrCode,
        message: "Mã QR hiện tại vẫn đang sẵn sàng (còn hạn).",
      };
    }

    this.isLoggingIn = true;
    this.currentQrStatus = "generating";
    this.currentQrCode = null;

    try {
      const { Zalo, LoginQRCallbackEventType } = await import("zca-js");
      this.zaloInstance = new Zalo();

      return new Promise((resolve) => {
        this.zaloInstance
          .loginQR({}, (event: any) => {
            if (event.type === LoginQRCallbackEventType.QRCodeGenerated) {
              console.log(`[ZALO BOT - ${this.accountKey.toUpperCase()}] Đã sinh mã QR thật từ Zalo Server!`);
              this.currentQrCode = "data:image/png;base64," + event.data.image;
              this.currentQrStatus = "ready";
              this.qrGeneratedAt = Date.now();
              resolve({
                success: true,
                qrCode: this.currentQrCode,
                message: "Đã tạo mã QR thành công, vui lòng quét bằng app Zalo trên điện thoại.",
              });
            } else if (event.type === LoginQRCallbackEventType.QRCodeScanned) {
              console.log(`[ZALO BOT - ${this.accountKey.toUpperCase()}] Mã QR đã được quét bằng điện thoại!`);
              this.currentQrStatus = "scanned";
            } else if (event.type === LoginQRCallbackEventType.GotLoginInfo) {
              try {
                fs.writeFileSync(this.sessionFile, JSON.stringify(event.data, null, 2), "utf8");
                fs.writeFileSync(this.sessionBakFile, JSON.stringify(event.data, null, 2), "utf8");
                console.log(`[ZALO BOT - ${this.accountKey.toUpperCase()}] Đã lưu thông tin GotLoginInfo!`);
              } catch (sErr) {}
            } else if (event.type === LoginQRCallbackEventType.QRCodeExpired) {
              console.log(`[ZALO BOT - ${this.accountKey.toUpperCase()}] Mã QR đã hết hạn.`);
              this.currentQrStatus = "expired";
              this.currentQrCode = null;
              this.isLoggingIn = false;
            }
          })
          .then(async (api: any) => {
            console.log(`[ZALO BOT - ${this.accountKey.toUpperCase()}] Đăng nhập Zalo thành công!`);
            this.zaloApi = api;
            this.saveSessionFromApi(api);
            this.currentQrStatus = "connected";
            this.currentQrCode = null;
            this.isLoggingIn = false;

            try {
              const accRes = await api.fetchAccountInfo();
              const profile = accRes?.profile || accRes || {};
              const ctx = api.getContext();
              this.connectedUserInfo = {
                id: profile.userId || profile.uid || ctx?.uid || `zalo_user_${this.accountKey}`,
                name: profile.displayName || profile.display_name || profile.name || `Zalo ${this.accountKey.toUpperCase()}`,
                avatar: profile.avatar || "https://api.dicebear.com/7.x/avataaars/svg?seed=" + this.accountKey,
                phone: profile.phoneNumber || "",
              };
              console.log(`[ZALO BOT - ${this.accountKey.toUpperCase()}] Tài khoản đăng nhập:`, this.connectedUserInfo.name);
            } catch (e) {
              this.connectedUserInfo = {
                id: `uid_${this.accountKey}`,
                name: `Zalo ${this.accountKey.toUpperCase()}`,
                avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=" + this.accountKey,
                phone: "",
              };
            }
          })
          .catch((err: any) => {
            console.error(`[ZALO BOT - ${this.accountKey.toUpperCase()}] Lỗi trong quá trình quét QR:`, err?.message || err);
            this.currentQrStatus = "error";
            this.isLoggingIn = false;
          });

        // Timeout dự phòng sau 10 giây nếu chưa nhận được callback QRCodeGenerated
        setTimeout(() => {
          if (!this.currentQrCode) {
            resolve({
              success: false,
              message: "Chưa nhận được mã QR từ máy chủ Zalo. Vui lòng thử lại sau giây lát.",
            });
          }
        }, 10000);
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

  // Lấy trạng thái kết nối của tài khoản này
  public getStatus() {
    const now = Date.now();
    const qrAge = this.qrGeneratedAt > 0 ? Math.floor((now - this.qrGeneratedAt) / 1000) : 0;
    const qrRemainingSec = Math.max(0, 60 - qrAge);

    return {
      accountKey: this.accountKey,
      role: this.role,
      isConnected: !!this.zaloApi,
      status: this.currentQrStatus,
      qrCode: this.currentQrCode,
      qrRemainingSec,
      isExpired: this.currentQrStatus === "expired" || (this.currentQrCode && qrRemainingSec <= 0),
      user: this.connectedUserInfo,
    };
  }

  // Lấy danh bạ bạn bè & nhóm của tài khoản này
  public async getContacts() {
    if (!this.zaloApi) {
      return { friends: [], groups: [], self: this.connectedUserInfo };
    }

    try {
      const [friends, groups] = await Promise.all([
        this.zaloApi.getAllFriends ? this.zaloApi.getAllFriends().catch(() => []) : [],
        this.zaloApi.getAllGroups ? this.zaloApi.getAllGroups().catch(() => []) : [],
      ]);

      const formattedFriends = Array.isArray(friends)
        ? friends.slice(0, 50).map((f: any) => ({
            id: f.userId || f.uid,
            userId: f.userId || f.uid,
            name: f.displayName || f.display_name || f.zaloName || f.zalo_name || "Bạn bè",
            phone: f.phoneNumber || "",
            avatar: f.avatar,
          }))
        : [];

      let groupList: any[] = [];
      if (Array.isArray(groups)) {
        groupList = groups;
      } else if (groups && typeof groups === "object") {
        if (groups.gridVerMap && typeof groups.gridVerMap === "object") {
          groupList = Object.keys(groups.gridVerMap).map((gid) => ({
            groupId: gid,
            name: `Nhóm Zalo (${gid})`,
          }));
        } else if (groups.groupMap && typeof groups.groupMap === "object") {
          groupList = Object.values(groups.groupMap);
        }
      }

      const formattedGroups = groupList.slice(0, 50).map((g: any) => {
        const gId = g.groupId || g.id || g.grid;
        return {
          id: gId,
          groupId: gId,
          name: g.name || g.groupName || `Nhóm Zalo (${gId})`,
          avatar: g.avatar,
        };
      });

      return {
        friends: formattedFriends,
        groups: formattedGroups,
        self: this.connectedUserInfo,
      };
    } catch (e) {
      return { friends: [], groups: [], self: this.connectedUserInfo };
    }
  }

  // Gửi tin nhắn thật qua Zalo API (1-Chạm trực tiếp, tự động 100%)
  public async sendMessage(params: {
    phone?: string;
    userId?: string;
    groupId?: string;
    groupUrl?: string;
    groupName?: string;
    className?: string;
    message: string;
  }): Promise<{ success: boolean; recipient?: string; message: string; error?: string }> {
    const { phone, userId, groupId, groupUrl, groupName, className, message } = params;

    if (!message || !message.trim()) {
      return { success: false, error: "Thiếu nội dung tin nhắn.", message: "Nội dung rỗng" };
    }

    if (!this.zaloApi) {
      return {
        success: false,
        error: `Tài khoản Zalo (${this.accountKey.toUpperCase()}) chưa quét mã QR kết nối. Vui lòng quét mã QR để kích hoạt gửi tự động.`,
        message: "Chưa kết nối nick Zalo",
      };
    }

    try {
      const { ThreadType } = await import("zca-js");

      // 1. GỬI THẲNG VÀO NHÓM ZALO (GROUP ID hoặc TÌM THEO LINK / TÊN NHÓM)
      let targetGroupId = groupId;
      let targetGroupName = groupName || className || "Nhóm Zalo Lớp";

      // A. Nếu chưa có targetGroupId nhưng có groupUrl
      if (!targetGroupId && groupUrl) {
        console.log(`[ZALO SEND - ${this.accountKey}] Đang tra cứu nhóm từ groupUrl: ${groupUrl}`);
        
        // 1. Thử gọi API getGroupLinkInfo từ zca-js để lấy groupId chuẩn xác nhất
        if (this.zaloApi.getGroupLinkInfo) {
          try {
            const linkInfo = await this.zaloApi.getGroupLinkInfo({ link: groupUrl });
            if (linkInfo && (linkInfo.groupId || linkInfo.globalId)) {
              targetGroupId = linkInfo.groupId || linkInfo.globalId;
              targetGroupName = linkInfo.name || targetGroupName;
              console.log(`[ZALO SEND - ${this.accountKey}] getGroupLinkInfo thành công -> GroupId: ${targetGroupId} (${targetGroupName})`);
            }
          } catch (_le: any) {
            console.log(`[ZALO SEND - ${this.accountKey}] getGroupLinkInfo note:`, _le?.message || _le);
          }
        }

        // 2. Nếu vẫn chưa có targetGroupId, tra cứu trong danh bạ nhóm của bot
        if (!targetGroupId) {
          const contacts = await this.getContacts();
          const linkMatch = groupUrl.match(/\/g\/([a-zA-Z0-9_-]+)/);
          const urlId = linkMatch ? linkMatch[1] : null;

          if (urlId) {
            const matchedGroup = contacts.groups.find((g: any) => g.groupId === urlId || g.id === urlId);
            if (matchedGroup) {
              targetGroupId = matchedGroup.groupId || matchedGroup.id;
              targetGroupName = matchedGroup.name || targetGroupName;
            }
          }
        }
      }

      // B. Nếu vẫn chưa có targetGroupId, tra cứu theo tên nhóm hoặc tên lớp
      if (!targetGroupId && (groupName || className)) {
        const searchTarget = (groupName || className || "").toLowerCase().trim();
        const contacts = await this.getContacts();
        const matched = contacts.groups.find((g: any) => {
          const gName = (g.name || "").toLowerCase().trim();
          return gName.includes(searchTarget) || searchTarget.includes(gName);
        });
        if (matched) {
          targetGroupId = matched.groupId || matched.id;
          targetGroupName = matched.name || targetGroupName;
          console.log(`[ZALO SEND - ${this.accountKey}] Khớp nhóm Zalo theo tên: ${targetGroupId} (${matched.name})`);
        }
      }

      // C. Nếu đã tìm thấy ID nhóm Zalo, gửi tự động 100% qua ThreadType.Group
      if (targetGroupId) {
        console.log(`[ZALO SEND - ${this.accountKey}] Gửi thẳng tự động vào nhóm Zalo ID: ${targetGroupId} (${targetGroupName})`);
        await this.zaloApi.sendMessage({ msg: message }, targetGroupId, ThreadType.Group);
        return {
          success: true,
          recipient: targetGroupName,
          message: `Đã gửi trực tiếp 1-chạm vào nhóm Zalo "${targetGroupName}" thành công!`,
        };
      }

      // 2. Gửi qua User ID hoặc gửi vào Cloud cá nhân
      if (userId) {
        let targetId = userId;
        let targetName = "Người nhận";
        if (userId === "self" || userId === this.connectedUserInfo?.id) {
          targetId = this.connectedUserInfo?.id || userId;
          targetName = `Cloud của tôi (${this.connectedUserInfo?.name || "Chính bạn"})`;
        }

        console.log(`[ZALO SEND - ${this.accountKey}] Gửi tới UID: ${targetId} (${targetName})`);
        await this.zaloApi.sendMessage({ msg: message }, targetId, ThreadType.User);
        return {
          success: true,
          recipient: targetName,
          message: `Đã gửi trực tiếp 1-chạm qua Zalo tới ${targetName} thành công!`,
        };
      }

      // 3. Gửi theo Số điện thoại
      if (!phone) {
        return { success: false, error: "Thiếu số điện thoại hoặc ID nhóm người nhận.", message: "Thiếu thông tin người nhận" };
      }

      const cleanPhone = phone.replace(/[^0-9]/g, "");
      const phoneWith84 = cleanPhone.startsWith("0") ? "84" + cleanPhone.slice(1) : cleanPhone;
      const phoneWith0 = cleanPhone.startsWith("84") ? "0" + cleanPhone.slice(2) : cleanPhone;

      let targetUid: string | null = null;
      let targetName: string | null = null;

      // Kiểm tra Cloud của tôi
      if (this.connectedUserInfo) {
        const myPhone = (this.connectedUserInfo.phone || "").replace(/[^0-9]/g, "");
        if (myPhone && (myPhone === cleanPhone || myPhone === phoneWith0 || myPhone === phoneWith84)) {
          targetUid = this.connectedUserInfo.id;
          targetName = `Cloud của tôi (${this.connectedUserInfo.name})`;
        }
      }

      // Tra cứu danh bạ bạn bè trước
      if (!targetUid && this.zaloApi.getAllFriends) {
        try {
          const friends = await this.zaloApi.getAllFriends();
          if (Array.isArray(friends)) {
            const matched = friends.find((f: any) => {
              const fPhone = (f.phoneNumber || "").replace(/[^0-9]/g, "");
              return (
                fPhone === cleanPhone ||
                fPhone === phoneWith0 ||
                fPhone === phoneWith84 ||
                (cleanPhone.length >= 8 && fPhone.endsWith(cleanPhone.slice(-8)))
              );
            });
            if (matched) {
              targetUid = matched.userId || matched.uid;
              targetName = matched.displayName || matched.display_name || matched.zaloName;
            }
          }
        } catch (_fErr) {}
      }

      // Tra cứu qua findUser 84
      if (!targetUid && this.zaloApi.findUser) {
        try {
          const res84 = await this.zaloApi.findUser(phoneWith84);
          if (res84 && (res84.uid || res84.userId)) {
            targetUid = res84.uid || res84.userId;
            targetName = res84.display_name || res84.displayName || phone;
          }
        } catch (_e1) {}
      }

      // Tra cứu qua findUser 0
      if (!targetUid && this.zaloApi.findUser) {
        try {
          const res0 = await this.zaloApi.findUser(phoneWith0);
          if (res0 && (res0.uid || res0.userId)) {
            targetUid = res0.uid || res0.userId;
            targetName = res0.display_name || res0.displayName || phone;
          }
        } catch (_e2) {}
      }

      // Fallback getMultiUsersByPhones
      if (!targetUid && this.zaloApi.getMultiUsersByPhones) {
        try {
          const multi = await this.zaloApi.getMultiUsersByPhones([phoneWith84, phoneWith0]);
          if (multi && typeof multi === "object") {
            const u = multi[phoneWith84] || multi[phoneWith0];
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
          error: `Không tìm thấy tài khoản Zalo với SĐT ${phone}. Nguyên nhân: Người nhận có thể đang tắt tính năng 'Cho phép tìm kiếm bằng SĐT' trong Cài đặt riêng tư của Zalo.`,
          message: `Không tìm thấy UID cho SĐT ${phone}`,
        };
      }

      console.log(`[ZALO SEND - ${this.accountKey}] Đang gửi tới: ${targetName} (${targetUid})...`);
      await this.zaloApi.sendMessage({ msg: message }, targetUid, ThreadType.User);
      console.log(`[ZALO SEND - ${this.accountKey}] Gửi thành công tới: ${targetName}!`);

      return {
        success: true,
        recipient: targetName || phone,
        message: `Đã gửi trực tiếp 1-chạm qua Zalo tới ${targetName || phone} thành công!`,
      };
    } catch (err: any) {
      console.error(`[ZALO SEND ERROR - ${this.accountKey}]`, err);
      return {
        success: false,
        error: `Lỗi khi gửi qua Zalo: ${err?.message || "Người nhận có thể đang bật chặn tin nhắn từ người lạ"}`,
        message: "Lỗi gửi tin",
      };
    }
  }

  // Đăng xuất và xóa phiên riêng của tài khoản này
  public disconnect() {
    this.zaloApi = null;
    this.connectedUserInfo = null;
    this.currentQrStatus = "idle";
    this.currentQrCode = null;
    this.isLoggingIn = false;
    this.qrGeneratedAt = 0;
    try {
      if (fs.existsSync(this.sessionFile)) {
        fs.unlinkSync(this.sessionFile);
      }
    } catch (e) {}
    try {
      if (fs.existsSync(this.sessionBakFile)) {
        fs.unlinkSync(this.sessionBakFile);
      }
    } catch (e) {}
    console.log(`[ZALO BOT - ${this.accountKey.toUpperCase()}] Đã ngắt kết nối và xóa session file!`);
    return { success: true };
  }
}

/**
 * Quản lý đa tài khoản Bot Zalo (Multi-Account Bot Manager)
 * Đảm bảo sự độc lập cho từng tài khoản Admin, Giáo viên, Trợ giảng
 */
export class MultiZaloBotManager {
  private instances: Map<string, SingleZaloBotInstance> = new Map();

  constructor() {
    // Khởi tạo sẵn 3 bot độc lập cho 3 vai trò nòng cốt của trung tâm
    this.getBotInstance("admin", "ADMIN");
    this.getBotInstance("assistant", "ASSISTANT");
    this.getBotInstance("teacher", "TEACHER");
  }

  // Lấy hoặc tạo mới bot instance theo accountId / role / phone (đảm bảo tính độc lập tuyệt đối giữa các vai trò)
  public getBotInstance(
    accountId?: string,
    role?: string,
    phone?: string
  ): SingleZaloBotInstance {
    let key = "admin";
    let normalizedRole: "ADMIN" | "TEACHER" | "ASSISTANT" = "ADMIN";

    const cleanRole = (role || "").toUpperCase();
    const cleanAcc = (accountId || "").toLowerCase();

    if (cleanRole === "ASSISTANT" || cleanAcc === "assistant" || cleanAcc.includes("assistant") || cleanAcc.includes("ta")) {
      key = "assistant";
      normalizedRole = "ASSISTANT";
    } else if (cleanRole === "TEACHER" || cleanAcc === "teacher" || cleanAcc.includes("teacher")) {
      key = "teacher";
      normalizedRole = "TEACHER";
    } else if (cleanRole === "ADMIN" || cleanAcc === "admin" || cleanAcc.includes("admin") || cleanAcc.includes("hotline")) {
      key = "admin";
      normalizedRole = "ADMIN";
    } else if (phone) {
      key = phone.replace(/[^0-9]/g, "");
    } else if (accountId) {
      key = cleanAcc;
    }

    if (!this.instances.has(key)) {
      console.log(`[MULTI ZALO MANAGER] Khởi tạo Bot Instance mới cho: key=${key}, role=${normalizedRole}`);
      const newBot = new SingleZaloBotInstance(key, normalizedRole);
      this.instances.set(key, newBot);
    }

    return this.instances.get(key)!;
  }

  // Gửi tin nhắn thông minh: ưu tiên bot riêng của người gửi; nếu bot riêng thất bại hoặc chưa kết nối sẽ tự động fallback sang Bot Hotline Admin
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
    const senderBot = this.getBotInstance(params.accountId, params.senderRole, params.senderPhone);
    const adminBot = this.getBotInstance("admin", "ADMIN");

    // 1. Thử gửi bằng bot riêng của người gửi nếu đã kết nối
    if (senderBot.getStatus().isConnected) {
      console.log(`[MULTI ZALO] Gửi bằng Bot riêng của [${senderBot.accountKey.toUpperCase()}]`);
      const res = await senderBot.sendMessage(params);
      if (res.success) {
        return res;
      }

      console.warn(`[MULTI ZALO] Bot riêng [${senderBot.accountKey}] gửi không thành công (${res.error}), kích hoạt fallback tự động...`);
      // Nếu bot riêng gửi thất bại (ví dụ: chưa vào nhóm lớp hoặc chưa có bạn bè phụ huynh trên nick này),
      // tự động fallback sang Bot Hotline Trung Tâm (Admin)
      if (adminBot.getStatus().isConnected && senderBot !== adminBot) {
        console.log(`[MULTI ZALO] Tự động Fallback sang Bot Hotline [ADMIN] để tin nhắn không bị kẹt...`);
        const fallbackRes = await adminBot.sendMessage(params);
        if (fallbackRes.success) {
          return {
            ...fallbackRes,
            message: `${fallbackRes.message} (Chuyển tiếp tự động qua Bot Hotline Trung Tâm)`,
          };
        }
      }
      return res;
    }

    // 2. Nếu bot riêng chưa kết nối, thử fallback ngay sang bot Admin (Hotline Trung Tâm)
    if (adminBot.getStatus().isConnected && senderBot !== adminBot) {
      console.log(`[MULTI ZALO] Bot [${senderBot.accountKey}] chưa kết nối -> Tự động Fallback gửi qua Bot Hotline [ADMIN]`);
      const res = await adminBot.sendMessage(params);
      if (res.success) {
        return {
          ...res,
          message: `${res.message} (Gửi tự động qua Bot Hotline Trung Tâm)`,
        };
      }
    }

    // 3. Nếu cả 2 đều chưa kết nối, trả về thông báo yêu cầu kết nối
    return await senderBot.sendMessage(params);
  }

  // Danh sách trạng thái của tất cả các bot đang chạy
  public getAllStatus() {
    const result: Record<string, any> = {};
    this.instances.forEach((bot, key) => {
      result[key] = bot.getStatus();
    });
    return result;
  }
}

// Singleton pattern trên globalThis để không bị Next.js HMR tạo nhiều instance
const globalForMultiZalo = globalThis as unknown as {
  multiZaloBotManagerInstance?: MultiZaloBotManager;
};

export const multiZaloBotManager =
  globalForMultiZalo.multiZaloBotManagerInstance || new MultiZaloBotManager();

if (process.env.NODE_ENV !== "production") {
  globalForMultiZalo.multiZaloBotManagerInstance = multiZaloBotManager;
}

// Backward compatibility alias: bot mặc định (admin)
export const zaloBotService = multiZaloBotManager.getBotInstance("admin", "ADMIN");
