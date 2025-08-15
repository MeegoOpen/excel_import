export const handleErrorMsg = (e: any, minVersion?: string) => {
  let msg = '';
  if (e.name === 'NotSupportedError') {
    msg = minVersion
      ? `当前客户端暂不支持，\n请升级飞书客户端到${minVersion}及以上版本`
      : '当前客户端暂不支持，\n请升级飞书客户端到最新版本';
  } else {
    msg = '内部错误:' + (e.message || e.originMessage);
  }
  console.log('handleErrorMsg', e);
};

export const getLang = async () => {
  const { language } =
    (await window.JSSDK.Context.load().catch((e) => handleErrorMsg(e))) || {};
  return language || 'zh_CN';
};

export const getStorage = (key: string) =>
  window.JSSDK.storage
    .getItem(key)
    .then((res) => res ?? null)
    .catch((e) => handleErrorMsg(e));

export const setStorage = (key: string, value?: string) => {
  window.JSSDK.storage.setItem(key, value).catch((e) => handleErrorMsg(e));
};

export const removeStorage = (key: string) =>
  window.JSSDK.storage.removeItem(key).catch((e) => handleErrorMsg(e));
