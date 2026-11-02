/**
 * 医考帮 · playauth 探针 v2（Surge http-response 脚本）
 *
 * 双通道落盘：
 *   ① $persistentStore —— 不依赖 iSH 是否活着，App 切后台也能存
 *   ② POST 127.0.0.1:8765 —— iSH 里跑着收集器时直接落盘
 *
 * 判读：看 /player/getVideoPlayAuth 里有没有 play_auth 字符串。
 */

const KEY = 'ykb_cap_v1';
const MAX_REC = 20;
const MAX_BODY = 8000;

const WATCH = [
  '/player/getVideoPlayAuth',
  '/player/getVideoSts',
  '/player/getVideoMps',
  '/player/getVideoPlayInfo',
  '/player/getLiveEncryptSts',
  '/user/main/vip',
  '/base/product/order/getPrepay',
  '/appapi/reward/verifyReceipt'
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
  const url = $request.url.split('?')[0];
  if (!WATCH.some(p => url.indexOf(p) !== -1)) {
    $done({});
  } else {
    const body = $response.body || '';
    let code = null, msg = '', hasPlayAuth = false;

    try {
      const j = JSON.parse(body);
      code = j.code !== undefined ? j.code : (j.status !== undefined ? j.status : null);
      msg = j.msg || j.message || j.error || '';
      hasPlayAuth = /"?play_?auth"?\s*:\s*"[A-Za-z0-9+/=_-]{16,}"/i.test(body);
    } catch (e) {}

    const rec = {
      t: Date.now(),
      url: $request.url,
      method: $request.method,
      status: $response.status,
      reqBody: $request.body ? String($request.body).slice(0, 2000) : '',
      code: code,
      msg: String(msg).slice(0, 120),
      hasPlayAuth: hasPlayAuth,
      body: body.slice(0, MAX_BODY),
      bodyLen: body.length
    };

    console.log('[ykb] ' + url.replace(/^https?:\/\/[^/]+/, '') +
                ' code=' + code + ' playauth=' + hasPlayAuth + ' len=' + body.length +
                ' msg=' + short(msg, 40));
    console.log('[ykb-raw] ' + short(body, 1000));

    push(rec);

    $httpClient.post({
      url: 'http://127.0.0.1:8765/ykb',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(rec)
    }, function (err) {
      if (err) console.log('[ykb] collector offline（正常，iSH 挂起时如此）');
    });

    $done({});
  }
} catch (e) {
  console.log('[ykb] probe error: ' + e);
  $done({});
}
