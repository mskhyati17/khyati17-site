// Client-side user & comment management for the demo (localStorage) auth.
// Uses the same storage keys as auth.js / comments.js. NOTE: this is a
// browser-side system — it manages data in THIS browser. For multi-device,
// tamper-proof enforcement, move to Supabase (already wired in auth.js).
const UKEY = 'khyati_users';
const SKEY = 'khyati_session';
const CKEY = 'khyati_comments';
export const ADMIN_EMAILS = ['mskhyati.17@gmail.com', 'mskhyati17@gmail.com'];

function rd(k, d){ try { return JSON.parse(localStorage.getItem(k) || d); } catch (e) { return JSON.parse(d); } }
function wr(k, v){ try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }

export function currentEmail(){ try { return localStorage.getItem(SKEY) || ''; } catch (e) { return ''; } }

export function isAdmin(email){
  email = email || currentEmail();
  if (!email) return false;
  if (ADMIN_EMAILS.indexOf(email) >= 0) return true;
  const u = rd(UKEY, '{}')[email];
  return !!(u && u.level === 'admin');
}

export function listUsers(){
  const u = rd(UKEY, '{}');
  return Object.keys(u).map(e => Object.assign({ email: e }, u[e]));
}
export function patchUser(email, patch){ const u = rd(UKEY, '{}'); if (!u[email]) u[email] = {}; Object.assign(u[email], patch); wr(UKEY, u); }
export function deleteUser(email){ const u = rd(UKEY, '{}'); delete u[email]; wr(UKEY, u); }

export function hasTradeAccess(email){
  email = email || currentEmail();
  if (!email) return false;
  if (isAdmin(email)) return true; // owner/admins always have access
  const u = rd(UKEY, '{}')[email];
  if (!u || !u.tradeAccess) return false;
  if (u.tradeUntil && Date.now() > u.tradeUntil) return false; // expired (yearly re-approval)
  return true;
}
export function grantTrade(email, days){ patchUser(email, { tradeAccess: true, tradeUntil: Date.now() + (days || 365) * 86400000, deniedUntil: 0 }); }
export function revokeTrade(email){ patchUser(email, { tradeAccess: false, tradeUntil: 0, deniedUntil: Date.now() + 30 * 86400000 }); } // 30-day denial
export function setLevel(email, level){ patchUser(email, { level: level }); }
export function setPassword(email, pw){ patchUser(email, { password: pw }); }

// comments (array of {user_email, content_type, content_id, body, created_at, display_name})
export function listComments(){ return rd(CKEY, '[]'); }
export function saveComments(arr){ wr(CKEY, arr); }
