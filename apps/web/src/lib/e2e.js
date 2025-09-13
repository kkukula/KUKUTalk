import nacl from 'tweetnacl'

function bytesToB64(u8){ let s=''; for(let i=0;i<u8.length;i++){ s += String.fromCharCode(u8[i]) } return btoa(s) }
function b64ToBytes(b64){ const s = atob(b64); const u8=new Uint8Array(s.length); for(let i=0;i<s.length;i++){ u8[i]=s.charCodeAt(i) } return u8 }
function encUtf8(s){ return new TextEncoder().encode(s) }
function decUtf8(u8){ return new TextDecoder().decode(u8) }

async function keyFrom(pass, room){
  const material = 'kuku|' + (room||'') + '|' + String(pass||'')
  const digest = await crypto.subtle.digest('SHA-256', encUtf8(material))
  return new Uint8Array(digest) // 32 bytes
}

export async function encryptMessage(plain, pass, room){
  const key = await keyFrom(pass, room)
  const nonce = nacl.randomBytes(24)
  const ct = nacl.secretbox(encUtf8(String(plain||'')), nonce, key)
  return 'E2E.v1.' + bytesToB64(nonce) + '.' + bytesToB64(ct)
}

export async function decryptMessage(payload, pass, room){
  try{
    const parts = String(payload||'').split('.')
    if (parts.length !== 4 || parts[0] !== 'E2E' || parts[1] !== 'v1') return null
    const nonce = b64ToBytes(parts[2]); const ct = b64ToBytes(parts[3])
    const key = await keyFrom(pass, room)
    const out = nacl.secretbox.open(ct, nonce, key)
    if (!out) return null
    return decUtf8(out)
  } catch(e){ return null }
}

export function isE2EText(t){ try { return String(t||'').indexOf('E2E.v1.') === 0 } catch(e){ return false } }
