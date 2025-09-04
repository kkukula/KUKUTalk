import express from 'express'
import cors from 'cors'
import { z } from 'zod'

const app = express()
app.use(cors())
app.use(express.json())

const explainSchema = z.object({
  text: z.string().min(1).max(2000),
  language: z.enum(['pl', 'en']).default('pl'),
})

const quizSchema = z.object({
  topic: z.string().min(1).max(100),
  level: z.enum(['easy', 'medium', 'hard']).default('easy'),
  count: z.number().int().min(1).max(10).default(3),
  language: z.enum(['pl', 'en']).default('pl'),
})

function simpleExplain(text: string, lang: 'pl' | 'en') {
  const short = text.length > 140 ? text.slice(0, 140) + '…' : text
  if (lang === 'pl') {
    return {
      summary: `Streszczenie: ${short}`,
      kidFriendly: `W skrócie: ${text} — to znaczy coś prostego i zrozumiałego dla dzieci.`,
      steps: [
        'Zastanów się, o czym jest zdanie.',
        'Wypisz najważniejsze słowa.',
        'Powiedz to krócej i prościej.',
      ],
    }
  }
  return {
    summary: `Summary: ${short}`,
    kidFriendly: `In short: ${text} — this means something simple and easy to understand for kids.`,
    steps: ['Think what it is about.', 'List key words.', 'Say it shorter and simpler.'],
  }
}

type Q = {
  question: string
  options: string[]
  correctIndex: number
  hint?: string
}

function makeQuiz(topic: string, level: 'easy' | 'medium' | 'hard', count: number, lang: 'pl' | 'en'): Q[] {
  const baseQuestions: Record<string, { pl: string; en: string; options: [string,string,string,string]; correct: number; hintPl: string; hintEn: string }[]> = {
    math: [
      { pl: 'Ile to 2 + 3?', en: 'What is 2 + 3?', options: ['4','5','6','7'], correct: 1, hintPl: 'Policz na palcach.', hintEn: 'Count on your fingers.' },
      { pl: 'Ile to 9 - 4?', en: 'What is 9 - 4?', options: ['3','4','5','6'], correct: 2, hintPl: 'Pomyśl o różnicy.', hintEn: 'Think about the difference.' },
      { pl: 'Ile to 3 × 3?', en: 'What is 3 × 3?', options: ['6','7','8','9'], correct: 3, hintPl: 'To 3 plus 3 plus 3.', hintEn: 'It is 3 plus 3 plus 3.' },
    ],
    language: [
      { pl: 'W którym wyrazie jest „ą”?', en: 'Which word contains “ą”?', options: ['kota','mama','wąż','pies'], correct: 2, hintPl: 'Myśl o wężu.', hintEn: 'Think of a snake.' },
      { pl: 'Synonim „duży” to…', en: 'A synonym for “big” is…', options: ['mały','wielki','płytki','cichy'], correct: 1, hintPl: 'Brzmi podobnie do „wiel-”.', hintEn: 'Sounds like “great”.' },
      { pl: 'Jaki to czas: „czytałem”?', en: 'What tense is “I read (yesterday)”?', options: ['przyszły','teraźniejszy','przeszły','warunkowy'], correct: 2, hintPl: 'To było kiedyś.', hintEn: 'It happened in the past.' },
    ],
    safety: [
      { pl: 'Co robisz, gdy ktoś obcy prosi o adres?', en: 'What do you do if a stranger asks for your address?', options: ['Podaję','Ignoruję','Mówię rodzicowi','Daję numer telefonu'], correct: 2, hintPl: 'Porozmawiaj z dorosłym.', hintEn: 'Talk to an adult.' },
      { pl: 'Jak reagujesz na obraźliwą wiadomość?', en: 'How do you react to an insulting message?', options: ['Odpisuję tym samym','Zgłaszam dorosłemu','Udostępniam dalej','Spotykam się z nadawcą'], correct: 1, hintPl: 'Poproś o pomoc.', hintEn: 'Ask for help.' },
      { pl: 'Co to jest hasło?', en: 'What is a password?', options: ['Imię zwierzaka','Tajny klucz','Publiczna wiadomość','Adres szkoły'], correct: 1, hintPl: 'Coś tajnego.', hintEn: 'Something secret.' },
    ],
  }

  const key = /math|matem|dodaw|odejm|mnoż|liczb|number|add|subtract|multiply/i.test(topic) ? 'math'
    : /bezpiecze|safety|password|hasło|obraźliw/i.test(topic) ? 'safety'
    : 'language'

  const bank = baseQuestions[key]
  const picked: Q[] = []
  for (let i = 0; i < Math.min(count, bank.length); i++) {
    const item = bank[i]
    const question = lang === 'pl' ? item.pl : item.en
    const hint = lang === 'pl' ? item.hintPl : item.hintEn
    let options = [...item.options]
    // Difficulty tweaks (simple & deterministic): reorder options
    if (level === 'medium') {
      options = [options[1], options[0], options[2], options[3]]
    } else if (level === 'hard') {
      options = [options[2], options[1], options[3], options[0]]
    }
    // Recompute correct index after reorder
    const originalCorrect = item.correct
    const newIndex = options.indexOf(item.options[originalCorrect])
    picked.push({ question, options, correctIndex: newIndex, hint })
  }
  return picked
}

app.post('/explain', (req, res) => {
  const parsed = explainSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: 'Invalid body', issues: parsed.error.issues })
  const data = simpleExplain(parsed.data.text, parsed.data.language)
  return res.json(data)
})

app.post('/quiz', (req, res) => {
  const parsed = quizSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: 'Invalid body', issues: parsed.error.issues })
  const questions = makeQuiz(parsed.data.topic, parsed.data.level, parsed.data.count, parsed.data.language)
  return res.json({ questions })
})

const port = Number(process.env.PORT || 4002)
app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`[ai-tutor] listening on http://0.0.0.0:${port}`)
})
