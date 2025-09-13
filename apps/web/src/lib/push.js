function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4)
  const base64 = (base64String + padding).replace(/\-/g, '+').replace(/_/g, '/')
  const rawData = atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; ++i) { outputArray[i] = rawData.charCodeAt(i) }
  return outputArray
}
export async function enablePush(token){
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) throw new Error('unsupported')
  const base = import.meta.env.VITE_API_URL || 'http://localhost:3001'
  const reg = await navigator.serviceWorker.register('/sw.js')
  let perm = Notification.permission
  if (perm !== 'granted') { perm = await Notification.requestPermission() }
  if (perm !== 'granted') throw new Error('denied')
  const vapidRes = await fetch(base + '/notify/vapid', { headers: { 'Authorization':'Bearer '+token } })
  const kp = await vapidRes.json()
  const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(kp.publicKey) })
  const res = await fetch(base + '/notify/subscribe', { method:'POST', headers:{ 'Content-Type':'application/json', 'Authorization':'Bearer '+token }, body: JSON.stringify(sub) })
  if (!res.ok) throw new Error('subscribe_failed')
  await fetch(base + '/notify/prefs', { method:'POST', headers:{ 'Content-Type':'application/json','Authorization':'Bearer '+token }, body: JSON.stringify({ push:true }) })
  return true
}
export async function testPush(token){
  const base = import.meta.env.VITE_API_URL || 'http://localhost:3001'
  await fetch(base + '/notify/test', { method:'POST', headers:{ 'Content-Type':'application/json','Authorization':'Bearer '+token }, body: JSON.stringify({ channel:'push' }) })
}
