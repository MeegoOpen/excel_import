import { APP_KEY, APP_SECRET, loginUrl } from '../constants';
import {
  setStorage,
  getStorage,
  handleErrorMsg,
  removeStorage,
} from '../utils';
import request from '../api/request';

interface AuthRes {
  token: string;
  expire_time: number;
}

async function getPluginToken() {
  const url = new URL(await window.JSSDK.navigation.getHref());
  return request
    .post<AuthRes>(`${url.origin}${loginUrl}`, {
      plugin_id: APP_KEY,
      plugin_secret: APP_SECRET,
    })
    .then((res) => res.data);
}

export class LoginManager {
  private static _instance: LoginManager;

  private _tenantKey = '';
  private _userKey = '';

  get TOKEN_STORAGE_KEY() {
    return `${APP_KEY}_${this._userKey}_${this._tenantKey}_token`;
  }

  get TOKEN_EXPIRE_KEY() {
    return `${APP_KEY}_${this._userKey}_${this._tenantKey}_expire_time`;
  }

  public static getInstance(): LoginManager {
    if (!LoginManager._instance) {
      LoginManager._instance = new LoginManager();
    }
    return LoginManager._instance;
  }
  private async fetchTenantKey(): Promise<void> {
    if (!this._tenantKey || !this._userKey) {
      const { loginUser } = await window.JSSDK.Context.load();
      this._tenantKey = loginUser.tenantId || '';
      this._userKey = loginUser.id || '';
    }
  }

  async getToken(): Promise<string> {
    await this.fetchTenantKey();
    const token = await this._checkLogin();
    if (token) return token;
    const code = await window.JSSDK.utils
      .getAuthCode()
      .catch((e) => handleErrorMsg(e, '7.18.0'));
    return await this._getToken(code?.code || '');
  }

  async removeToken() {
    await Promise.all([
      removeStorage(this.TOKEN_STORAGE_KEY),
      removeStorage(this.TOKEN_EXPIRE_KEY),
    ]);
  }

  private async _checkLogin(): Promise<string> {
    const [token, expireTime] = await Promise.all([
      getStorage(this.TOKEN_STORAGE_KEY),
      getStorage(this.TOKEN_EXPIRE_KEY),
    ]);
    if (!token || !expireTime || Number(expireTime) - Number(new Date()) <= 0) {
      return '';
    }
    return token;
  }

  private async _getToken(code: string): Promise<string> {
    try {
      const res = await getPluginToken();
      const { token, expire_time } = res;
      // expire_time示例值 7200 秒，这里累加当前时间，再减去五分钟，作为最终失效时间
      await Promise.all([
        setStorage(this.TOKEN_STORAGE_KEY, token),
        // 前端比后端的过期时间早五分钟
        setStorage(
          this.TOKEN_EXPIRE_KEY,
          String(expire_time * 1000 + Number(new Date()) - 300000),
        ),
      ]);
      return token;
    } catch (error) {
      console.error(error);
      return '';
    }
  }
}
