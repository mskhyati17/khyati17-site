// Friends: search, requests, accepted-friend text chat, block, and a shared
// "online now" presence channel. Requires a real Supabase backend (see
// admin/supabase/friends.sql) — the demo localStorage auth used when Supabase
// isn't configured has no server, so there's no way for one visitor's browser
// to know another visitor exists, let alone whether they're online. Callers
// should check `FriendsAPI.available` before using anything else here.
import { supabase, Auth } from './auth.js';

const available = !!supabase;

function esc(s){ return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }

async function myId(){
  if(!supabase) return null;
  const { data } = await supabase.auth.getUser();
  return data?.user?.id || null;
}

// ---- search -----------------------------------------------------------
async function searchUsers(query){
  if(!available) return { ok:false, msg:'Friends needs the site\'s real account system, not the demo one.' };
  const q = String(query||'').trim();
  if(q.length < 2) return { ok:true, users: [] };
  const me = await myId();
  const r = await supabase.from('public_profiles').select('id,username,first_name,avatar_url').ilike('username', `%${q}%`).neq('id', me).limit(20);
  if(r.error) return { ok:false, msg:r.error.message };
  return { ok:true, users: r.data || [] };
}

// ---- friend requests ----------------------------------------------------
async function sendRequest(toUserId){
  if(!available) return { ok:false, msg:'Friends needs the site\'s real account system, not the demo one.' };
  const me = await myId();
  if(!me) return { ok:false, msg:'Sign in first.' };
  if(me === toUserId) return { ok:false, msg:"You can't friend yourself." };
  const r = await supabase.from('friend_requests').insert({ from_user: me, to_user: toUserId });
  if(r.error) return { ok:false, msg: r.error.message.includes('duplicate') ? 'Request already sent.' : r.error.message };
  return { ok:true };
}

async function respondRequest(requestId, accept){
  if(!available) return { ok:false, msg:'Friends needs the site\'s real account system, not the demo one.' };
  const r = await supabase.from('friend_requests').update({ status: accept ? 'accepted' : 'declined' }).eq('id', requestId);
  if(r.error) return { ok:false, msg:r.error.message };
  return { ok:true };
}

async function cancelRequest(requestId){
  if(!available) return { ok:false, msg:'Friends needs the site\'s real account system, not the demo one.' };
  const r = await supabase.from('friend_requests').delete().eq('id', requestId);
  if(r.error) return { ok:false, msg:r.error.message };
  return { ok:true };
}

async function removeFriend(requestId){ return cancelRequest(requestId); }

async function listIncoming(){
  if(!available) return { ok:false, msg:'unavailable', requests: [] };
  const me = await myId();
  const r = await supabase.from('friend_requests').select('id,from_user,created_at').eq('to_user', me).eq('status', 'pending').order('created_at', { ascending:false });
  if(r.error) return { ok:false, msg:r.error.message, requests: [] };
  const rows = r.data || [];
  const profiles = await profilesFor(rows.map(x=>x.from_user));
  return { ok:true, requests: rows.map(x=> ({ ...x, profile: profiles[x.from_user] })) };
}

async function listOutgoing(){
  if(!available) return { ok:false, msg:'unavailable', requests: [] };
  const me = await myId();
  const r = await supabase.from('friend_requests').select('id,to_user,created_at').eq('from_user', me).eq('status', 'pending').order('created_at', { ascending:false });
  if(r.error) return { ok:false, msg:r.error.message, requests: [] };
  const rows = r.data || [];
  const profiles = await profilesFor(rows.map(x=>x.to_user));
  return { ok:true, requests: rows.map(x=> ({ ...x, profile: profiles[x.to_user] })) };
}

async function listFriends(){
  if(!available) return { ok:false, msg:'unavailable', friends: [] };
  const me = await myId();
  const r = await supabase.from('friend_requests').select('id,from_user,to_user').eq('status', 'accepted').or(`from_user.eq.${me},to_user.eq.${me}`);
  if(r.error) return { ok:false, msg:r.error.message, friends: [] };
  const rows = r.data || [];
  const otherIds = rows.map(x => x.from_user === me ? x.to_user : x.from_user);
  const profiles = await profilesFor(otherIds);
  return { ok:true, friends: rows.map(x => {
    const otherId = x.from_user === me ? x.to_user : x.from_user;
    return { requestId: x.id, userId: otherId, profile: profiles[otherId] };
  }) };
}

async function profilesFor(ids){
  const unique = [...new Set(ids.filter(Boolean))];
  if(!unique.length) return {};
  const r = await supabase.from('public_profiles').select('id,username,first_name,avatar_url').in('id', unique);
  const map = {};
  (r.data || []).forEach(p => { map[p.id] = p; });
  return map;
}

// ---- block ----------------------------------------------------------------
async function blockUser(userId){
  if(!available) return { ok:false, msg:'unavailable' };
  const me = await myId();
  const b = await supabase.from('blocks').insert({ blocker: me, blocked: userId });
  if(b.error && !b.error.message.includes('duplicate')) return { ok:false, msg:b.error.message };
  // Blocking also clears any existing friend request/friendship between the two.
  await supabase.from('friend_requests').delete().or(`and(from_user.eq.${me},to_user.eq.${userId}),and(from_user.eq.${userId},to_user.eq.${me})`);
  return { ok:true };
}

async function unblockUser(userId){
  if(!available) return { ok:false, msg:'unavailable' };
  const me = await myId();
  const r = await supabase.from('blocks').delete().eq('blocker', me).eq('blocked', userId);
  if(r.error) return { ok:false, msg:r.error.message };
  return { ok:true };
}

async function listBlocked(){
  if(!available) return { ok:false, msg:'unavailable', blocked: [] };
  const me = await myId();
  const r = await supabase.from('blocks').select('blocked').eq('blocker', me);
  if(r.error) return { ok:false, msg:r.error.message, blocked: [] };
  const ids = (r.data||[]).map(x=>x.blocked);
  const profiles = await profilesFor(ids);
  return { ok:true, blocked: ids.map(id => ({ userId:id, profile: profiles[id] })) };
}

// ---- chat -------------------------------------------------------------
async function listMessages(withUserId, limit = 50){
  if(!available) return { ok:false, msg:'unavailable', messages: [] };
  const me = await myId();
  const r = await supabase.from('friend_messages').select('id,from_user,to_user,body,created_at')
    .or(`and(from_user.eq.${me},to_user.eq.${withUserId}),and(from_user.eq.${withUserId},to_user.eq.${me})`)
    .order('created_at', { ascending:true }).limit(limit);
  if(r.error) return { ok:false, msg:r.error.message, messages: [] };
  return { ok:true, messages: r.data || [] };
}

async function sendMessage(toUserId, body){
  if(!available) return { ok:false, msg:'unavailable' };
  const trimmed = String(body||'').trim();
  if(!trimmed) return { ok:false, msg:'Message is empty.' };
  if(trimmed.length > 1000) return { ok:false, msg:'Message is too long (max 1000 characters).' };
  const me = await myId();
  const r = await supabase.from('friend_messages').insert({ from_user: me, to_user: toUserId, body: trimmed }).select().single();
  if(r.error) return { ok:false, msg:r.error.message };
  return { ok:true, message: r.data };
}

// Subscribes once to new messages addressed to the current user. `onMessage`
// is called with every new row; the caller filters by from_user itself
// (e.g. to only append to whichever conversation is currently open, or to
// bump an unread badge for the rest).
let _msgChannel = null;
async function subscribeMessages(onMessage){
  if(!available) return () => {};
  const me = await myId();
  if(_msgChannel) { try{ supabase.removeChannel(_msgChannel); }catch(e){} }
  _msgChannel = supabase.channel('friend-messages-' + me)
    .on('postgres_changes', { event:'INSERT', schema:'public', table:'friend_messages', filter:`to_user=eq.${me}` }, payload => {
      try{ onMessage(payload.new); }catch(e){ console.warn('friend message handler failed', e); }
    })
    .subscribe();
  return () => { try{ supabase.removeChannel(_msgChannel); }catch(e){} _msgChannel = null; };
}

// ---- presence ("online now") ------------------------------------------
// Shared presence channel — see the limitations note in admin/supabase/friends.sql:
// any signed-in client subscribing to this exact channel name can see which
// user IDs are currently online. We only ever *display* that for accepted
// friends, but the channel itself isn't friend-scoped.
let _presenceChannel = null;
const _presenceListeners = new Set();

async function trackPresence(){
  if(!available) return () => {};
  const me = await myId();
  if(!me) return () => {};
  if(_presenceChannel) return () => {}; // already tracking
  _presenceChannel = supabase.channel('online-users', { config: { presence: { key: me } } });
  _presenceChannel
    .on('presence', { event:'sync' }, () => {
      const state = _presenceChannel.presenceState();
      const onlineIds = new Set(Object.keys(state));
      _presenceListeners.forEach(cb => { try{ cb(onlineIds); }catch(e){} });
    })
    .subscribe(async status => {
      if(status === 'SUBSCRIBED'){ try{ await _presenceChannel.track({ online_at: new Date().toISOString() }); }catch(e){} }
    });
  return () => { try{ supabase.removeChannel(_presenceChannel); }catch(e){} _presenceChannel = null; };
}

function onPresenceChange(cb){
  _presenceListeners.add(cb);
  return () => _presenceListeners.delete(cb);
}

function isOnline(userId){
  if(!_presenceChannel) return false;
  const state = _presenceChannel.presenceState();
  return !!state[userId];
}

export const FriendsAPI = {
  available,
  esc,
  myId,
  searchUsers,
  sendRequest,
  respondRequest,
  cancelRequest,
  removeFriend,
  listIncoming,
  listOutgoing,
  listFriends,
  blockUser,
  unblockUser,
  listBlocked,
  listMessages,
  sendMessage,
  subscribeMessages,
  trackPresence,
  onPresenceChange,
  isOnline,
};
