// All requests use credentials so the httpOnly session cookie is sent.
const opts = (extra = {}) => ({ credentials: 'include', ...extra });

export async function checkSession() {
  const r = await fetch('/api/admin/session', opts());
  return r.ok;
}

export async function login(password) {
  const r = await fetch('/api/admin/login', opts({
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password })
  }));
  if (r.ok) return { ok: true };
  const data = await r.json().catch(() => ({}));
  return { ok: false, status: r.status, error: data.error || 'Login failed' };
}

export async function logout() {
  await fetch('/api/admin/logout', opts({ method: 'POST' }));
}

export async function getOverview() {
  const r = await fetch('/api/admin/overview', opts());
  if (!r.ok) throw new Error('unauthorized');
  return r.json();
}

export async function getUsers() {
  const r = await fetch('/api/admin/users', opts());
  if (!r.ok) throw new Error('unauthorized');
  return r.json();
}

export async function getGames(limit = 30) {
  const r = await fetch(`/api/admin/games?limit=${limit}`, opts());
  if (!r.ok) throw new Error('unauthorized');
  return r.json();
}

export async function sendMessage(userId, text) {
  const r = await fetch('/api/admin/send', opts({
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, text })
  }));
  const data = await r.json().catch(() => ({}));
  return { ok: r.ok, error: data.error };
}
