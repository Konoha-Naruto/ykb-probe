/**
 * 医考帮 · 探针 + VIP 改包 合体版 v6
 * 覆盖 *.yikaobang.com.cn
 *   1) 所有回包存进持久化存储（给判读用）
 *   2) /user/main/vip 的 is_vip / is_svip 强制改 1，让客户端以为已开通
 */

const KEY = 'ykb_cap_v4';
const MAX_REC = 40;
const MAX_BODY = 12000;

const SKIP = ['/log/', '/track', '/beacon/', '.png', '.jpg', '.jpeg', '.gif', '.webp', '.mp4'];

function short(s, n) {
  if (!s) return '';
  s = String(s).replace(/\s+/g, ' ');
  return s.length > n ? s.slice(0, n) + '…' : s;
}

function push(rec) {
  let arr = [];
  try {
    const raw = $persistentStore.read(KEY);
    if (raw) arr = JSON.parse(raw);
    if (!Array.isArray(arr)) arr = [];
  } catch (e) { arr = []; }
  arr.push(rec);
  if (arr.length > MAX_REC) arr = arr.slice(arr.length - MAX_REC);
  try { $persistentStore.write(JSON.stringify(arr), KEY); } catch (e) {}
}

function forceVip(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  for (const k of Object.keys(obj)) {
    const v = obj[k];
    if (v && typeof v === 'object') { forceVip(v); continue; }
    if (/^is_?s?vip$/i.test(k)) {
      obj[k] = (v === 0 || v === '0' || v === false) ? (typeof v === 'string' ? '1' : 1) : v;
    }
  }
  return obj;
}

try {
  const full = $request.url;
  const path = full.split('?')[0];
  let body = $response.body || '';

  if (!SKIP.some(s => path.indexOf(s) !== -1)) {
    // 1) 改写 VIP 状态
    if (path.indexOf('/user/main/vip') !== -1 || path.indexOf('/shop/vip/') !== -1) {
      try {
        const j = JSON.parse(body);
        forceVip(j);
        body = JSON.stringify(j);
      } catch (e) {}
    }

    // 2) 存档
    let code = null, msg = '', keys = [];
    try {
      const j = JSON.parse(body);
      code = (j.code !== undefined) ? j.code : null;
      msg = j.msg || j.message || '';
      if (j.data && typeof j.data === 'object' && !Array.isArray(j.data)) keys = Object.keys(j.data).slice(0, 10);
    } catch (e) {}

    const host = path.replace(/^https?:\/\//, '').split('/')[0];
    push({
      t: Date.now(),
      host: host,
      path: path.replace(/^https?:\/\/[^/]+/, ''),
      status: $response.status,
      code: code,
      msg: String(msg).slice(0, 60),
      dataKeys: keys,
      body: body.slice(0, MAX_BODY),
      bodyLen: body.length
    });

    console.log('[ykb6] ' + host + path.replace(/^https?:\/\/[^/]+/, '') + ' code=' + code + ' len=' + body.length);
    $done({ body: body });
  } else {
    $done({});
  }
} catch (e) {
  console.log('[ykb6] err ' + e);
  $done({});
}
