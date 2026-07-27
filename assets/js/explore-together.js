// Zero-setup peer-to-peer "explore together" chat. No account, no server, no
// database — two browsers connect directly over WebRTC using only free public
// STUN servers for NAT traversal. The "signaling" (exchanging connection
// info before the direct link forms) happens by hand: one person shares a
// link, the other opens it and sends a short reply code back.
//
// Tradeoffs, stated plainly:
//  - No persistent friends list or "online now" status — there's nowhere to
//    save that without a server. This only works while both people are
//    actively on the page with a live connection.
//  - Nothing is ever stored anywhere. Messages go straight from one browser
//    to the other and vanish when the tab closes. Nothing to leak later.
//  - Without a TURN server (which needs a paid/managed service), this works
//    on most home and mobile networks but can fail to connect on strict
//    school/office firewalls. That's a real limitation of the zero-setup
//    approach, not a bug.

const ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
];

function encode(desc){
  const json = JSON.stringify({ type: desc.type, sdp: desc.sdp });
  return btoa(unescape(encodeURIComponent(json)));
}
function decode(code){
  const json = decodeURIComponent(escape(atob(code)));
  return JSON.parse(json);
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

export function createRoom(){
  const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
  const channel = pc.createDataChannel('explore-together');
  const state = { pc, channel, role: 'host' };

  async function getOfferCode(){
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    await waitForIceGatheringComplete(pc);
    return encode(pc.localDescription);
  }
  async function acceptAnswerCode(code){
    await pc.setRemoteDescription(decode(code));
  }

  return { ...state, getOfferCode, acceptAnswerCode };
}

export function joinRoom(offerCode){
  const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
  const state = { pc, channel: null, role: 'guest' };
  const channelPromise = new Promise(resolve => {
    pc.ondatachannel = e => { state.channel = e.channel; resolve(e.channel); };
  });

  async function getAnswerCode(){
    await pc.setRemoteDescription(decode(offerCode));
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    await waitForIceGatheringComplete(pc);
    return encode(pc.localDescription);
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
    close(){ try{ channel && channel.close(); }catch(e){} try{ pc.close(); }catch(e){} },
  };
}
