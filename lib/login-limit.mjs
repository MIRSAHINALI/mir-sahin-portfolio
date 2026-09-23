import {createHmac} from 'node:crypto';
import {isIP} from 'node:net';
export const LOGIN_WINDOW = 15 * 60 * 1000;
export const LOGIN_LIMIT = 10;

export function loginClientKey(request, config) {
  if (!config.SESSION_SECRET || config.SESSION_SECRET.length < 32) throw new Error('Session secret not configured');
  // Only trust this header behind Vercel's edge, never a client-supplied header on a standalone server.
  let address = config.VERCEL === '1' ? request.headers.get('x-vercel-forwarded-for')?.trim() : '127.0.0.1';
  if (!address || !isIP(address)) throw new Error('Trusted client address unavailable');
  if (isIP(address) === 6) {
    const canonical = new URL('http://[' + address + ']').hostname.slice(1, -1);
    const [left, right = ''] = canonical.split('::');
    const start = left ? left.split(':') : [];
    const end = right ? right.split(':') : [];
    const words = canonical.includes('::') ? [...start, ...Array(8-start.length-end.length).fill('0'), ...end] : start;
    // IPv4-mapped IPv6 must use the same bucket as IPv4.
    if (words.slice(0,5).every(w=>parseInt(w,16)===0) && parseInt(words[5],16)===65535) {
      const a=parseInt(words[6],16), b=parseInt(words[7],16);
      address=[a>>8,a&255,b>>8,b&255].join('.');
    } else address=words.slice(0,4).map(w=>parseInt(w,16).toString(16)).join(':')+'::/64';
  }
  return 'login:' + createHmac('sha256', config.SESSION_SECRET).update(address).digest('hex');
}

export async function reserveLoginAttempt(sql, key, now = Date.now()) {
  // Atomic upsert prevents parallel requests from bypassing the counter.
  const rows = await sql.query(`INSERT INTO login_attempts (id,attempts,window_start) VALUES ($1,1,$2)
    ON CONFLICT (id) DO UPDATE SET
    attempts=CASE WHEN login_attempts.window_start <= $3 THEN 1 ELSE CASE WHEN login_attempts.attempts < 11 THEN login_attempts.attempts+1 ELSE 11 END END,
    window_start=CASE WHEN login_attempts.window_start <= $3 THEN $2 ELSE login_attempts.window_start END
    RETURNING attempts,window_start`, [key,now,now-LOGIN_WINDOW]);
  const row=rows[0];
  return {allowed:row.attempts<=LOGIN_LIMIT,retryAfter:Math.max(1,Math.ceil((Number(row.window_start)+LOGIN_WINDOW-now)/1000))};
}
export async function clearLoginAttempts(sql,key) {
  await sql.query('DELETE FROM login_attempts WHERE id=$1',[key]);
}
