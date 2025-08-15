import axios from 'axios';
import { loginUrl, requestHost } from '../constants/index';
import { LoginManager } from '../utils/login';

const toastCache = {};
const toastCallBack = (e: Error) => {
  if (!e.message) {
    return;
  }
  if (!Object.prototype.hasOwnProperty.call(toastCache, e.message)) {
    toastCache[e.message] = 1;
    window.JSSDK.toast.error(e.message).then(() => {
      delete toastCache[e.message];
    });
    console.error(e);
  }
};

// 创建 axios 实例
const request = axios;

// 请求拦截器
request.interceptors.request.use(
  async (config) => {
    // 在请求发送之前做一些处理
    // 添加请求头信息
    const { loginUser } = await window.JSSDK.Context.load();
    const token = config.url?.endsWith(loginUrl)
      ? ''
      : (await LoginManager.getInstance().getToken()) || '';
    if (config.url?.startsWith('/')) {
      config.url = requestHost + config.url;
    }
    config.headers['X-PLUGIN-TOKEN'] = token;
    config.headers['X-USER-KEY'] = loginUser?.id || '';
    return config;
  },
  (error) => {
    // 对请求错误做些什么
    console.error(error);
    return Promise.reject(error);
  },
);

// 响应拦截器
request.interceptors.response.use(
  async (response) => {
    // 在响应之前做一些处理
    const res = {
      ...response.data,
      code: response.data.err_code,
    };
    if (res.code !== 0) {
      // token 失效
      if (res.code === 1000052203) {
        await LoginManager.getInstance().removeToken();
      }
      if (res.code === 1000051887) {
        toastCallBack(new Error('服务器繁忙，请稍后再试'));
      }
    }
    return res;
  },
  (error) => {
    // 对响应错误做些什么
    // toastCallBack(error);
    return Promise.reject(error);
  },
);

class Semaphore {
  private limit: number;
  private count: number; // 计数
  private lastRunTime: number; // 计时
  private duration = 1000;

  constructor(limit: number) {
    this.limit = limit;
    this.count = 0;
    this.lastRunTime = Date.now();
  }

  public acquire() {
    // 每次发起都判断下是否超过了 1s，如果超过就更新下计数和计时
    if (Date.now() - this.lastRunTime > this.duration) {
      this.lastRunTime = Date.now();
      this.count = 0;
    }
    // 靠 Promise 控制 resolve 的触发来实现阻塞
    return new Promise<void>((resolve) => {
      // 计数未超过限制时正常执行
      if (this.count < this.limit) {
        this.count++;
        resolve();
      } else {
        // 计数超过限制后开始无限循环
        const timer = setInterval(() => {
          if (Date.now() - this.lastRunTime > this.duration) {
            // 直到超过 1s 后，更新计数和计时
            this.lastRunTime = Date.now();
            this.count = 0;
          }
          if (this.count < this.limit) {
            // 满足条件时，正常执行，跳出循环
            this.count++;
            resolve();
            clearInterval(timer);
          }
        }, 100);
      }
    });
  }
}

type AsyncFunction = (...args: any) => Promise<any>;

const limitQps = (fn: AsyncFunction, limit: number): AsyncFunction => {
  const semaphore = new Semaphore(limit);

  return async (...args): Promise<any> => {
    await semaphore.acquire();

    try {
      return await fn(...args);
    } catch (e) {
      console.error('limitQps', e);
    }
  };
};

// 定义 requestCache 装饰器工厂函数
export const requestCache = (
  originalFunction: (...args: any[]) => Promise<any>,
  cacheDuration: number,
) => {
  const cache: Map<string, any> = new Map();
  const cachePromise: Map<string, Promise<any>> = new Map();

  // 返回一个装饰器函数
  return (...args: any[]) => {
    const [url, payload] = args;

    // 生成唯一的缓存键
    const cacheKey = `${url}-${JSON.stringify(payload)}`;

    // 检查是否有缓存
    if (cache.has(cacheKey)) {
      return Promise.resolve(cache.get(cacheKey));
    }

    // 检查是否有进行中的 Promise
    if (!cachePromise.has(cacheKey)) {
      cachePromise.set(
        cacheKey,
        originalFunction(...args)
          .then((result) => {
            // 请求完成后缓存结果
            cache.set(cacheKey, result);
            // 缓存过期后清除缓存，防止内存泄露
            setTimeout(() => {
              cache.delete(cacheKey);
            }, cacheDuration);

            return result;
          })
          .finally(() => {
            // 请求结束后清除 Promise 缓存
            cachePromise.delete(cacheKey);
          }),
      );
    }
    return cachePromise.get(cacheKey)!;
  };
};

export const limitPost: typeof request.post = requestCache(
  limitQps(request.post, 9),
  5000,
);

export default request;

export const mockFetch = <D = any>(data: D, ms = 500) =>
  new Promise((rev) => {
    setTimeout(() => rev(data), ms);
  });

export interface ResponseWrap<D> {
  code: number;
  msg: string;

  data?: D;
  error?: {
    id: number;
    localizedMessage: {
      locale: string;
      message: string;
    };
  };
}

export type ListResponseWrap<T> = ResponseWrap<{
  list: T[];
  total: number;
}>;

export interface IRes<T> {
  code: number;
  data: T;
  message: string;
  msg: string;
  error?: {
    id?: number;
    localizedMessage?: {
      locale: string;
      message: string;
    };
  };
  status_code?: number;
}
