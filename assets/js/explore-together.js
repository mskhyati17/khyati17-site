// Zero-setup peer-to-peer "explore together" chat. No account, no server, no
// database — two browsers connect directly over WebRTC using only free public
// STUN servers for NAT traversal. The "signaling" (exchanging connection
// info before the direct link forms) happens by hand: one person shares a
// link, the other opens it and sends a short reply code back.
//
// friends.html keeps a *local* (per-browser, localStorage-only) friends list
// keyed by the `pairId` this module attaches to every offer/answer, so a
// returning friend is recognized by name instead of being a stranger again.
// That list makes reconnecting quicker (pre-filled, one-tap sharing), but a
// brand-new offer/answer code still has to be exchanged every time — there's
// no server to keep a connection (or its ICE candidates) alive between
// visits, so "reconnect" means "fast new handshake," not "resume the old one."
//
// Tradeoffs, stated plainly:
//  - No "online now" presence — there's nowhere to track that without a
//    server. This only works while both people are actively on the page
//    with a live connection; the friends list just remembers *who*, not
//    whether they're currently around.
//  - Nothing is ever stored anywhere except that local friends list (name +
//    pairId + last-connected time, in your own browser only). Messages
//    themselves go straight from one browser to the other and vanish when
//    the tab closes.
//  - Without a TURN server (which needs a paid/managed service), this works
//    on most home and mobile networks but can fail to connect on strict
//    school/office firewalls. That's a real limitation of the zero-setup
//    approach, not a bug.

const ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
];

function encode(desc, extra){
  const json = JSON.stringify({ type: desc.type, sdp: desc.sdp, ...(extra||{}) });
  return btoa(unescape(encodeURIComponent(json)));
}
function decode(code){
  const json = decodeURIComponent(escape(atob(code)));
  return JSON.parse(json);
}
function newPairId(){
  try{ return crypto.randomUUID(); }catch(e){ return 'p' + Date.now() + Math.random().toString(36).slice(2); }
}

function waitForIceGatheringComplete(pc){
  return new Promise(resolve => {
    if(pc.iceGatheringState === 'complete') return resolve();
    function check(){
      if(pc.iceGatheringState === 'complete'){ pc.removeEventListener('icegatheringstatechange', check); resolve(); }
    }
    pc.addEventListener('icegatheringstatechange', check);
    // Safety timeout: some networks never report "complete" cleanly even
    // once we have usable candidates. 4s is plenty for STUN-only gathering.
    setTimeout(resolve, 4000);
  });
}

// `pairId` identifies a friendship across separate connections — the same
// two people reconnecting later reuse the same id so each side's saved
// friends list can recognize "this is Dev again" instead of a stranger.
// Pass an existing one when reconnecting with a saved friend; omit it to
// mint a new one for a brand-new connection.
export function createRoom(pairId){
  const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
  const channel = pc.createDataChannel('explore-together');
  const state = { pc, channel, role: 'host', pairId: pairId || newPairId() };

  async function getOfferCode(){
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    await waitForIceGatheringComplete(pc);
    return encode(pc.localDescription, { pairId: state.pairId });
  }
  async function acceptAnswerCode(code){
    await pc.setRemoteDescription(decode(code));
  }

  return { ...state, getOfferCode, acceptAnswerCode };
}

export function joinRoom(offerCode){
  const offerData = decode(offerCode); // { type, sdp, pairId } — read eagerly so
  // the caller can recognize a returning friend before the connection even starts.
  const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
  const state = { pc, channel: null, role: 'guest', pairId: offerData.pairId };
  const channelPromise = new Promise(resolve => {
    pc.ondatachannel = e => { state.channel = e.channel; resolve(e.channel); };
  });

  async function getAnswerCode(){
    await pc.setRemoteDescription(offerData);
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    await waitForIceGatheringComplete(pc);
    return encode(pc.localDescription, { pairId: state.pairId });
  }

  return { ...state, getAnswerCode, channelPromise };
}

// Wires a data channel to friendly onopen/onmessage/onclose callbacks and
// returns a small controller for sending text + tearing the connection down.
export function wireChannel(pc, channel, { onOpen, onMessage, onClose } = {}){
  function bind(ch){
    ch.onopen = () => onOpen && onOpen();
    ch.onmessage = e => { try{ onMessage && onMessage(JSON.parse(e.data)); }catch(err){ /* ignore malformed */ } };
    ch.onclose = () => onClose && onClose();
  }
  if(channel) bind(channel);
  return {
    bindLateChannel: ch => { channel = ch; bind(ch); },
    send(text){
      if(!channel || channel.readyState !== 'open') return false;
      const trimmed = String(text||'').trim().slice(0, 1000);
      if(!trimmed) return false;
      channel.send(JSON.stringify({ body: trimmed, at: Date.now() }));
      return true;
    },
    // Sends an arbitrary JSON-serializable object as-is, bypassing the
    // {body,at} text-message wrapping above. Used for the small "introduce
    // yourself" handshake friends.html sends right after the channel opens.
    sendRaw(obj){
      if(!channel || channel.readyState !== 'open') return false;
      channel.send(JSON.stringify(obj));
      return true;
    },
    close(){ try{ channel && channel.close(); }catch(e){} try{ pc.close(); }catch(e){} },
  };
}
