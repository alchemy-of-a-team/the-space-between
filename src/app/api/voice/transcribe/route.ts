import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const formData = await request.formData()
  const audio = formData.get('audio') as Blob
  if (!audio) return NextResponse.json({ error: 'No audio provided' }, { status: 400 })

  const whisperForm = new FormData()
  whisperForm.append('file', audio, 'audio.webm')
  whisperForm.append('model', 'whisper-1')

  const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: whisperForm,
  })

  if (!response.ok) {
    const err = await response.text()
    return NextResponse.json({ error: `Whisper error: ${err}` }, { status: 500 })
  }

  const result = await response.json()
  return NextResponse.json({ text: result.text })
}
