const q = []
let busy = false

function enqueue(job){
  const j = Object.assign({ id: Date.now().toString(36)+Math.random().toString(16).slice(2), ts: Date.now(), tries:0, maxTries:3, backoffMs:500 }, job||{})
  q.push(j)
  tick()
  return j.id
}
function size(){ return q.length }
async function tick(){
  if (busy) return
  const job = q[0]
  if (!job) return
  busy = true
  try {
    await job.run()
    q.shift()
  } catch(e) {
    job.tries += 1
    if (job.tries >= job.maxTries) { q.shift() }
    else {
      setTimeout(()=>{ busy=false; tick() }, job.backoffMs * job.tries); return
    }
  }
  busy = false
  setImmediate(tick)
}
module.exports = { enqueue, size }
