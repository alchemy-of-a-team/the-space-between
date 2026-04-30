'use client'

import { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'

interface VoiceRecorderProps {
  onTranscript: (text: string) => void
}

export function VoiceRecorder({ onTranscript }: VoiceRecorderProps) {
  const [recording, setRecording] = useState(false)
  const [transcribing, setTranscribing] = useState(false)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])

  async function startRecording() {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' })
    mediaRecorderRef.current = mediaRecorder
    chunksRef.current = []

    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data)
    }

    mediaRecorder.onstop = async () => {
      stream.getTracks().forEach(t => t.stop())
      const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
      setTranscribing(true)

      const formData = new FormData()
      formData.append('audio', blob)

      const res = await fetch('/api/voice/transcribe', {
        method: 'POST',
        body: formData,
      })

      if (res.ok) {
        const { text } = await res.json()
        onTranscript(text)
      }
      setTranscribing(false)
    }

    mediaRecorder.start()
    setRecording(true)
  }

  function stopRecording() {
    mediaRecorderRef.current?.stop()
    setRecording(false)
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      onClick={recording ? stopRecording : startRecording}
      disabled={transcribing}
      className="text-stone-400 hover:text-stone-600"
    >
      {transcribing ? (
        <span className="text-xs">Transcribing...</span>
      ) : recording ? (
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
          <span className="text-xs">Stop</span>
        </span>
      ) : (
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/>
          <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
          <line x1="12" x2="12" y1="19" y2="22"/>
        </svg>
      )}
    </Button>
  )
}
