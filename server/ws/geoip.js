// Resolve a country from an IP address using the free ip-api.com service.
// Results are cached in-memory to avoid repeat lookups and rate limits.
// Free tier: ~45 requests/min — fine for our connection rate.

const cache = new Map(); // ip -> { country, code }
const pending = new Map(); // ip -> Promise

// Extract the real client IP from an incoming request (handles proxies/Render).
export function getClientIp(req) {
  const xff = req.headers['x-forwarded-for'];
  if (xff) return String(xff).split(',')[0].trim();
  return (req.socket && req.socket.remoteAddress) || '';
}

function isPrivateIp(ip) {
  if (!ip) return true;
  return (
    ip === '127.0.0.1' || ip === '::1' ||
    ip.startsWith('10.') || ip.startsWith('192.168.') ||
    ip.startsWith('172.16.') || ip.startsWith('172.17.') ||
    ip.startsWith('172.18.') || ip.startsWith('172.19.') ||
    ip.startsWith('172.2') || ip.startsWith('172.30.') || ip.startsWith('172.31.') ||
    ip.startsWith('fc') || ip.startsWith('fd') || ip.startsWith('fe80')
  );
}

// Normalize IPv6-mapped IPv4 (e.g. ::ffff:1.2.3.4)
function normalizeIp(ip) {
  if (!ip) return '';
  if (ip.startsWith('::ffff:')) return ip.slice(7);
  return ip;
}

// Returns { country: 'Uzbekistan', code: 'UZ' } or null.
export async function lookupCountry(rawIp) {
  const ip = normalizeIp(rawIp);
  if (!ip || isPrivateIp(ip)) return null;
  if (cache.has(ip)) return cache.get(ip);
  if (pending.has(ip)) return pending.get(ip);

  const p = (async () => {
    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 4000);
      const res = await fetch(
        `http://ip-api.com/json/${ip}?fields=status,country,countryCode`,
        { signal: ctrl.signal }
      );
      clearTimeout(t);
      const data = await res.json();
      if (data && data.status === 'success') {
        const out = { country: data.country, code: data.countryCode };
        cache.set(ip, out);
        return out;
      }
    } catch (err) {
      // network/timeout — ignore, return null
    } finally {
      pending.delete(ip);
    }
    return null;
  })();

  pending.set(ip, p);
  return p;
}
