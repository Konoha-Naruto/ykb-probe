/**
 * 医考帮 · 回包探针 v3
 * 目标域名: api.yikaobang.com.cn/index.php/...
 *
 * 只做两件事：把回包存进 Surge 持久化存储 + 打印一行摘要。
 * 不改任何数据，不会影响账号。
 */

const KEY = 'ykb_cap_v2';
const MAX_REC = 30;
const MAX_BODY = 12000;

const WATCH = [
  '/user/main/vip',
  '/shop/vip/',
  '/player/',
  '/allQuestion/',
  '/allquestion/',
  '/question/',
  '/Question/',
  '/papers/',
  '/web/quiz/',
  '/base/skill',
  '/course/',
  '/courseCatalog',
  '/chapter',
  '/vod/'
];

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
  const hit = WATCH.some(p => path.indexOf(p) !== -1);

  if (!hit) {
    $done({});
  } else {
    const body = $response.body || '';
    let code = null, msg = '', dataLen = 0, dataKeys = [], playauth = false;

    try {
      const j = JSON.parse(body);
      code = j.code !== undefined ? j.code : null;
      msg = j.msg || j.message || '';
      if (typeof j.data === 'string') dataLen = j.data.length;
      else if (j.data) dataLen = JSON.stringify(j.data).length;
      if (j.data && typeof j.data === 'object' && !Array.isArray(j.data)) dataKeys = Object.keys(j.data).slice(0, 12);
      playauth = /play_?auth"?\s*:\s*"[A-Za-z0-9+/=_-]{16,}"/i.test(body);
    } catch (e) {}

    const rec = {
      t: Date.now(),
      path: path.replace(/^https?:\/\/[^/]+/, ''),
      query: full.split('?')[1] ? full.split('?')[1].replace(/token=[^&]+/, 'token=***') : '',
      status: $response.status,
      code: code,
      msg: String(msg).slice(0, 80),
      dataLen: dataLen,
      dataKeys: dataKeys,
      playauth: playauth,
      body: body.slice(0, MAX_BODY),
      bodyLen: body.length
    };

    console.log('[ykb] ' + rec.path + ' code=' + code + ' dataLen=' + dataLen +
                ' playauth=' + playauth + ' keys=' + dataKeys.join(',') + ' msg=' + short(msg, 30));
    console.log('[ykb-raw] ' + short(body, 900));

    push(rec);
    $done({});
  }
} catch (e) {
  console.log('[ykb] err ' + e);
  $done({});
}
