// Authentication, Authorization and Points Management Service
// Stores authorized phones, registered user accounts, and gift transactions in localStorage

export interface UserAccount {
  phone: string;
  nickname: string;
  password: string; // 6-digit/character password
  points: number;
  avatar: string;
  createdAt: string;
  isAuthorized: boolean;
  role: 'user' | 'admin';
}

export interface GiftTransaction {
  id: string;
  phone: string;
  nickname: string;
  amount: number;
  previousBalance: number;
  newBalance: number;
  note: string;
  timestamp: string;
  operator: string;
}

const STORAGE_KEYS = {
  USERS: 'gamehall_users_v2',
  AUTHORIZED_PHONES: 'gamehall_auth_phones_v2',
  CURRENT_USER_PHONE: 'gamehall_curr_user_phone_v2',
  GIFT_LEDGER: 'gamehall_gift_ledger_v2'
};

// Initial preset authorized phone numbers (Bot admin authorized pool)
const DEFAULT_AUTHORIZED_PHONES = [
  '18888888888',
  '13800138000',
  '13912345678',
  '15888888888',
  '13666666666',
  '17700001111',
  '19988889999',
  '15012345678',
  '13122223333'
];

// Initial preset registered accounts
const DEFAULT_USERS: UserAccount[] = [
  {
    phone: '13800138000',
    nickname: '雀圣至尊',
    password: '666666',
    points: 68888,
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80',
    createdAt: '2025-01-01 10:00:00',
    isAuthorized: true,
    role: 'user'
  },
  {
    phone: '18888888888',
    nickname: '财神爷',
    password: '888888',
    points: 188888,
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&auto=format&fit=crop&q=80',
    createdAt: '2025-01-01 12:00:00',
    isAuthorized: true,
    role: 'admin'
  },
  {
    phone: '13912345678',
    nickname: '地主老财',
    password: '123456',
    points: 52000,
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=120&auto=format&fit=crop&q=80',
    createdAt: '2025-01-02 09:30:00',
    isAuthorized: true,
    role: 'user'
  },
  {
    phone: '15888888888',
    nickname: '赌神高进',
    password: '999999',
    points: 120000,
    avatar: 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=120&auto=format&fit=crop&q=80',
    createdAt: '2025-01-02 15:45:00',
    isAuthorized: true,
    role: 'user'
  }
];

class AuthService {
  private users: Map<string, UserAccount> = new Map();
  private authorizedPhones: Set<string> = new Set();
  private giftLedger: GiftTransaction[] = [];
  private currentUserPhone: string | null = null;
  private listeners: Set<() => void> = new Set();

  constructor() {
    this.init();
  }

  private init() {
    try {
      // 1. Load Authorized Phones
      const savedPhones = localStorage.getItem(STORAGE_KEYS.AUTHORIZED_PHONES);
      if (savedPhones) {
        const parsed: string[] = JSON.parse(savedPhones);
        this.authorizedPhones = new Set(parsed);
      } else {
        this.authorizedPhones = new Set(DEFAULT_AUTHORIZED_PHONES);
        this.saveAuthorizedPhones();
      }

      // 2. Load Users
      const savedUsers = localStorage.getItem(STORAGE_KEYS.USERS);
      if (savedUsers) {
        const parsed: UserAccount[] = JSON.parse(savedUsers);
        parsed.forEach(u => this.users.set(u.phone, u));
      } else {
        DEFAULT_USERS.forEach(u => this.users.set(u.phone, u));
        this.saveUsers();
      }

      // 3. Load Gift Ledger
      const savedLedger = localStorage.getItem(STORAGE_KEYS.GIFT_LEDGER);
      if (savedLedger) {
        this.giftLedger = JSON.parse(savedLedger);
      } else {
        // Initial sample gift records
        this.giftLedger = [
          {
            id: 'tx_init_1',
            phone: '13800138000',
            nickname: '雀圣至尊',
            amount: 68888,
            previousBalance: 0,
            newBalance: 68888,
            note: '新用户注册启动礼包 (Bot自动授权)',
            timestamp: '2025-01-01 10:00:15',
            operator: 'Telegram Bot'
          },
          {
            id: 'tx_init_2',
            phone: '18888888888',
            nickname: '财神爷',
            amount: 188888,
            previousBalance: 0,
            newBalance: 188888,
            note: '管理员账户初始分配',
            timestamp: '2025-01-01 12:00:20',
            operator: '系统初始'
          }
        ];
        this.saveLedger();
      }

      // 4. Load Current User
      const savedCurr = localStorage.getItem(STORAGE_KEYS.CURRENT_USER_PHONE);
      if (savedCurr && this.users.has(savedCurr)) {
        this.currentUserPhone = savedCurr;
      } else {
        // Default to logged in as 雀圣至尊 for instant playability
        this.currentUserPhone = '13800138000';
        localStorage.setItem(STORAGE_KEYS.CURRENT_USER_PHONE, '13800138000');
      }
    } catch {
      // Fallback
      this.authorizedPhones = new Set(DEFAULT_AUTHORIZED_PHONES);
      DEFAULT_USERS.forEach(u => this.users.set(u.phone, u));
      this.currentUserPhone = '13800138000';
    }
  }

  private saveUsers() {
    try {
      localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(Array.from(this.users.values())));
    } catch (e) {
      console.error(e);
    }
    this.notify();
  }

  private saveAuthorizedPhones() {
    try {
      localStorage.setItem(STORAGE_KEYS.AUTHORIZED_PHONES, JSON.stringify(Array.from(this.authorizedPhones)));
    } catch (e) {
      console.error(e);
    }
    this.notify();
  }

  private saveLedger() {
    try {
      localStorage.setItem(STORAGE_KEYS.GIFT_LEDGER, JSON.stringify(this.giftLedger));
    } catch (e) {
      console.error(e);
    }
    this.notify();
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    this.listeners.forEach(l => l());
  }

  // --- Authorized Phones Management ---
  public getAuthorizedPhones(): string[] {
    return Array.from(this.authorizedPhones);
  }

  public isPhoneAuthorized(phone: string): boolean {
    const clean = phone.trim();
    return this.authorizedPhones.has(clean);
  }

  public authorizePhone(phone: string): { success: boolean; message: string } {
    const clean = phone.trim();
    if (!clean) {
      return { success: false, message: '手机号不能为空' };
    }
    if (this.authorizedPhones.has(clean)) {
      return { success: false, message: `手机号 ${clean} 已经是已授权状态` };
    }
    this.authorizedPhones.add(clean);
    this.saveAuthorizedPhones();
    return { success: true, message: `成功授权手机号 ${clean}，现在该手机号可以进行注册` };
  }

  public revokeAuthorizedPhone(phone: string): { success: boolean; message: string } {
    const clean = phone.trim();
    if (!this.authorizedPhones.has(clean)) {
      return { success: false, message: '该手机号未在授权列表中' };
    }
    this.authorizedPhones.delete(clean);
    this.saveAuthorizedPhones();
    return { success: true, message: `已取消手机号 ${clean} 的授权` };
  }

  // --- Users & Registration ---
  public getUsers(): UserAccount[] {
    return Array.from(this.users.values());
  }

  public findUserByPhone(phone: string): UserAccount | null {
    const clean = phone.trim();
    return this.users.get(clean) || null;
  }

  public getCurrentUser(): UserAccount | null {
    if (!this.currentUserPhone) return null;
    return this.users.get(this.currentUserPhone) || null;
  }

  public setCurrentUser(user: UserAccount | null) {
    if (user) {
      this.currentUserPhone = user.phone;
      localStorage.setItem(STORAGE_KEYS.CURRENT_USER_PHONE, user.phone);
    } else {
      this.currentUserPhone = null;
      localStorage.removeItem(STORAGE_KEYS.CURRENT_USER_PHONE);
    }
    this.notify();
  }

  /**
   * Register a new player
   * Requirements:
   * 1. Phone MUST be authorized by bot admin
   * 2. No phone SMS verification needed
   * 3. Requires nickname
   * 4. Password MUST be exactly 6 characters (not limited to case or character type)
   */
  public register(phone: string, nickname: string, password: string): { success: boolean; message: string; user?: UserAccount } {
    const cleanPhone = phone.trim();
    const cleanNick = nickname.trim();

    if (!cleanPhone) {
      return { success: false, message: '请输入手机号' };
    }

    if (!cleanNick) {
      return { success: false, message: '请输入玩家昵称' };
    }

    if (cleanNick.length < 2 || cleanNick.length > 12) {
      return { success: false, message: '玩家昵称长度须在 2 到 12 个字符之间' };
    }

    // Password must be exactly 6 characters (not limited to case or character type)
    if (!password || password.length !== 6) {
      return { success: false, message: '密码必须为精准6位字符（不限大小写字母、数字或符号）' };
    }

    // Check if phone is already registered
    if (this.users.has(cleanPhone)) {
      return { success: false, message: '该手机号已被注册，请直接登录' };
    }

    // CRITICAL: Check Bot admin authorization
    if (!this.isPhoneAuthorized(cleanPhone)) {
      return {
        success: false,
        message: '该手机号未获得 Bot 管理员授权！请联系 Bot 管理员授权后再注册。'
      };
    }

    // Assign avatar based on random or nice image
    const avatars = [
      'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=120&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=120&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=120&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=120&auto=format&fit=crop&q=80'
    ];
    const avatar = avatars[Math.floor(Math.random() * avatars.length)];

    const nowStr = new Date().toLocaleString();
    const newUser: UserAccount = {
      phone: cleanPhone,
      nickname: cleanNick,
      password: password,
      points: 68888, // Starting bonus points
      avatar,
      createdAt: nowStr,
      isAuthorized: true,
      role: 'user'
    };

    this.users.set(cleanPhone, newUser);
    this.saveUsers();

    // Auto login new registered user
    this.setCurrentUser(newUser);

    // Record initial starting bonus gift
    this.addGiftRecord({
      phone: cleanPhone,
      nickname: cleanNick,
      amount: 68888,
      previousBalance: 0,
      newBalance: 68888,
      note: '新用户注册授权礼包',
      operator: 'Bot管理员'
    });

    return {
      success: true,
      message: `注册成功！欢迎玩家 [${cleanNick}]，已为您注入初始 68,888 积分！`,
      user: newUser
    };
  }

  /**
   * Login player with phone and 6-digit password
   */
  public login(phone: string, password: string): { success: boolean; message: string; user?: UserAccount } {
    const cleanPhone = phone.trim();

    if (!cleanPhone) {
      return { success: false, message: '请输入手机号' };
    }

    if (!password) {
      return { success: false, message: '请输入6位数密码' };
    }

    const user = this.users.get(cleanPhone);
    if (!user) {
      return { success: false, message: '未找到该账号，请先确认手机号或前往注册' };
    }

    if (user.password !== password) {
      return { success: false, message: '密码错误，请输入正确的6位数密码' };
    }

    this.setCurrentUser(user);
    return {
      success: true,
      message: `欢迎回来，[${user.nickname}]！`,
      user
    };
  }

  public logout() {
    this.setCurrentUser(null);
  }

  // --- Points Management & Gifting ---
  public giftPoints(targetPhone: string, amount: number, note = '管理员赠送积分'): {
    success: boolean;
    message: string;
    user?: UserAccount;
    newBalance?: number;
  } {
    const cleanPhone = targetPhone.trim();
    if (!cleanPhone) {
      return { success: false, message: '请输入接收玩家的手机号' };
    }

    if (!amount || isNaN(amount) || amount <= 0) {
      return { success: false, message: '赠送积分数量必须大于0' };
    }

    const user = this.users.get(cleanPhone);
    if (!user) {
      return { success: false, message: `未找到手机号为 ${cleanPhone} 的注册玩家账号` };
    }

    const prev = user.points;
    const next = prev + amount;
    user.points = next;
    this.users.set(cleanPhone, { ...user });
    this.saveUsers();

    // If current logged in user is the recipient, refresh session
    if (this.currentUserPhone === cleanPhone) {
      this.notify();
    }

    // Current operator
    const currUser = this.getCurrentUser();
    const operator = currUser ? `${currUser.nickname} (${currUser.phone})` : 'Bot 管理员';

    this.addGiftRecord({
      phone: cleanPhone,
      nickname: user.nickname,
      amount,
      previousBalance: prev,
      newBalance: next,
      note: note || '管理员赠送积分',
      operator
    });

    return {
      success: true,
      message: `成功为玩家 [${user.nickname}] 赠送 +${amount.toLocaleString()} 积分！最新余额: ${next.toLocaleString()}`,
      user,
      newBalance: next
    };
  }

  private addGiftRecord(record: Omit<GiftTransaction, 'id' | 'timestamp'>) {
    const newTx: GiftTransaction = {
      ...record,
      id: `tx_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      timestamp: new Date().toLocaleString()
    };
    this.giftLedger.unshift(newTx);
    // keep recent 50
    if (this.giftLedger.length > 50) {
      this.giftLedger = this.giftLedger.slice(0, 50);
    }
    this.saveLedger();
  }

  public getGiftLedger(): GiftTransaction[] {
    return [...this.giftLedger];
  }

  public updateUserPoints(phone: string, points: number) {
    const clean = phone.trim();
    const user = this.users.get(clean);
    if (user) {
      user.points = points;
      this.users.set(clean, { ...user });
      this.saveUsers();
    }
  }
}

export const authService = new AuthService();
