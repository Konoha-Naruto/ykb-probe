/**
 * 医考帮 · 全站回包探针 v4
 * 覆盖 *.yikaobang.com.cn 全部主机（api / new-ykb / ykb-app-service ...）
 * 只读不改。存档键 ykb_cap_v3
 */

const KEY = 'ykb_cap_v3';
const MAX_REC = 40;
const MAX_BODY = 15000;

const SKIP = ['/log/', '/track', '/da/', '/beacon/', '/msgcenter/', '.png', '.jpg', '.jpeg', '.gif', '.webp', '.mp4', '.m3u8'];

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

try {
  const full = $request.url;
  const path = full.split('?')[0];
  if (SKIP.some(s => path.indexOf(s) !== -1)) {
    $done({});
  } else {
    const body = $response.body || '';
    let code = null, msg = '', dataLen = 0, keys = [], playauth = false;
    try {
      const j = JSON.parse(body);
      code = (j.code !== undefined) ? j.code : (j.status !== undefined ? j.status : null);
      msg = j.msg || j.message || '';
      if (typeof j.data === 'string') dataLen = j.data.length;
      else if (j.data) dataLen = JSON.stringify(j.data).length;
      if (j.data && typeof j.data === 'object' && !Array.isArray(j.data)) keys = Object.keys(j.data).slice(0, 10);
      playauth = /play_?auth"?\s*:\s*"[A-Za-z0-9+/=_-]{16,}"/i.test(body);
    } catch (e) {}

    const host = path.replace(/^https?:\/\//, '').split('/')[0];
    const rec = {
      t: Date.now(),
      host: host,
      path: path.replace(/^https?:\/\/[^/]+/, ''),
      query: full.indexOf('?') > -1 ? full.split('?')[1].replace(/token=[^&]+/, 'token=***') : '',
      status: $response.status,
      code: code,
      msg: String(msg).slice(0, 80),
      dataLen: dataLen,
      dataKeys: keys,
      playauth: playauth,
      body: body.slice(0, MAX_BODY),
      bodyLen: body.length
    };

    console.log('[ykb4] ' + host + rec.path + ' code=' + code + ' dataLen=' + dataLen +
                ' playauth=' + playauth + ' msg=' + short(msg, 24));
    push(rec);
    $done({});
  }
} catch (e) {
  console.log('[ykb4] err ' + e);
  $done({});
}
