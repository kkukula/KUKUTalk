import express from 'express'
import cors from 'cors'
import { z } from 'zod'

const app = express()
app.use(cors())
app.use(express.json())

const reqSchema = z.object({
  text: z.string().max(2000),
})

type Decision = 'ALLOW' | 'REVIEW' | 'BLOCK'

// Very simple rule-based stub (placeholder for a real model)
function classifyText(textRaw: string): { labels: string[]; scores: Record<string, number>; action: Decision } {
  const text = textRaw.toLowerCase()

  const profanity = ['badword', 'idiot', 'stupid']
  const violence = ['kill', 'beat you', 'punch', 'hurt you']
  const grooming = ['meet me alone', 'dont tell', "don't tell", 'secret just us', 'send pics']
  const selfharm = ['suicide', 'kill myself', 'hurt myself']

  const score = (keywords: string[]) => {
    let s = 0
    for (const k of keywords) {
      if (text.includes(k)) s += 0.5
    }
    return Math.min(1, s)
  }

  const scores = {
    profanity: score(profanity),
    violence: score(violence),
    grooming: score(grooming),
    self_harm: score(selfharm),
  }

  let label = 'SAFE'
  let action: Decision = 'ALLOW'

  const maxScore = Math.max(scores.profanity, scores.violence, scores.grooming, scores.self_harm)
  if (text.trim().length === 0) {
    label = 'OTHER'
    action = 'REVIEW'
  } else if (scores.self_harm >= 0.5) {
    label = 'SELF_HARM'
    action = 'BLOCK'
  } else if (scores.grooming >= 0.5) {
    label = 'GROOMING'
    action = 'BLOCK'
  } else if (scores.profanity >= 0.5 || scores.violence >= 0.5) {
    label = scores.profanity >= scores.violence ? 'PROFANITY' : 'VIOLENCE'
    action = maxScore >= 1 ? 'BLOCK' : 'REVIEW'
  } else {
    label = 'SAFE'
    action = 'ALLOW'
  }

  return { labels: [label], scores, action }
}

app.post('/classify', (req, res) => {
  const parsed = reqSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid body', issues: parsed.error.issues })
  }
  const result = classifyText(parsed.data.text)
  return res.json(result)
})

const port = Number(process.env.PORT || 4001)
app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`[ai-moderation] listening on http://0.0.0.0:${port}`)
})
