const base = import.meta.env.VITE_API_URL || "http://localhost:3001"

function buildQuery(params){
  if(!params) return ""
  const q = Object.keys(params)
    .filter(k => params[k] !== undefined && params[k] !== null && params[k] !== "")
    .map(k => encodeURIComponent(k) + "=" + encodeURIComponent(String(params[k])))
  return q.length ? ("?" + q.join("&")) : ""
}

async function request(method, path, body, token, asText){
  const headers = { "Content-Type":"application/json" }
  if(token) headers["Authorization"] = "Bearer " + token
  const res = await fetch(base + path, {
    method,
    headers,
    body: body !== undefined && body !== null ? JSON.stringify(body) : undefined
  })
  if(!res.ok) throw new Error("http " + res.status)
  return asText ? (await res.text()) : (await res.json())
}

export async function getJson(path, token){
  return request("GET", path, null, token, false)
}
export async function postJson(path, data, token){
  return request("POST", path, data, token, false)
}
export async function putJson(path, data, token){
  return request("PUT", path, data, token, false)
}
export async function delJson(path, token){
  return request("DELETE", path, null, token, false)
}
export function csvUrl(path, params){
  return base + path + buildQuery(params||{})
}
export async function downloadCsv(path, params, filename){
  const url = csvUrl(path, params)
  try{
    const a = document.createElement("a")
    a.href = url
    a.download = filename || "export.csv"
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }catch(_e){
    window.open(url, "_blank")
  }
}

export { base }
export default { base, getJson, postJson, putJson, delJson, csvUrl, downloadCsv }
