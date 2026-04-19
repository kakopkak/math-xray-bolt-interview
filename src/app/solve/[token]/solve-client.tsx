"use client";

import { useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { FeedbackBanner } from '@/components/ui/feedback-banner';

type Props = {
  token: string;
};

type HomeworkPayload = {
  id: string;
  assignmentId: string;
  studentKey: string;
  title: string;
  promptEt: string;
  status: string;
  dueAt: string | null;
  topic?: string;
};

export default function SolveClient({ token }: Props) {
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const [audioUrl, setAudioUrl] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [error, setError] = useState('');
  const [typedSolution, setTypedSolution] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [homework, setHomework] = useState<HomeworkPayload | null>(null);
  const [isLoadingHomework, setIsLoadingHomework] = useState(true);

  const hasRecording = useMemo(() => audioUrl.length > 0, [audioUrl]);

  useEffect(() => {
    let isCancelled = false;

    async function loadHomework() {
      setIsLoadingHomework(true);
      setError('');
      try {
        const response = await fetch(`/api/homework/${token}`);
        const payload = (await response.json().catch(() => ({}))) as HomeworkPayload & { error?: string };
        if (!response.ok) {
          if (!isCancelled) {
            setError(payload.error || 'Kodutöö laadimine ebaõnnestus.');
          }
          return;
        }
        if (!isCancelled) {
          setHomework(payload);
        }
      } catch {
        if (!isCancelled) {
          setError('Kodutöö laadimine ebaõnnestus.');
        }
      } finally {
        if (!isCancelled) {
          setIsLoadingHomework(false);
          setTypedSolution('');
        }
      }
    }

    void loadHomework();

    return () => {
      isCancelled = true;
    };
  }, [token]);

  async function startRecording() {
    setError('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];

      recorder.addEventListener('dataavailable', (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      });

      recorder.addEventListener('stop', () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);
        stream.getTracks().forEach((track) => track.stop());
      });

      recorder.start();
      setIsRecording(true);
    } catch {
      setError('Helisalvestuse käivitamine ebaõnnestus.');
    }
  }

  function stopRecording() {
    if (!mediaRecorderRef.current) {
      return;
    }
    mediaRecorderRef.current.stop();
    setIsRecording(false);
  }

  function rerecord() {
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
    }
    setAudioUrl('');
    chunksRef.current = [];
  }

  async function dataUrlFromBlob(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ''));
      reader.onerror = () => reject(new Error('Audio faili lugemine ebaõnnestus.'));
      reader.readAsDataURL(blob);
    });
  }

  async function submitHomework() {
    if (!homework) {
      return;
    }
    const normalizedTypedSolution = typedSolution.trim();
    if (!normalizedTypedSolution) {
      setError('Palun sisesta lahenduskäik.');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      let voiceAudioBase64 = '';
      let voiceMimeType = '';
      if (chunksRef.current.length > 0) {
        const voiceBlob = new Blob(chunksRef.current, { type: 'audio/webm' });
        voiceAudioBase64 = await dataUrlFromBlob(voiceBlob);
        voiceMimeType = voiceBlob.type || 'audio/webm';
      }

      const response = await fetch(`/api/assignments/${homework.assignmentId}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentName: homework.studentKey,
          inputType: 'typed',
          typedSolution: normalizedTypedSolution,
          photoBase64: '',
          voiceAudioBase64,
          voiceMimeType,
        }),
      });

      const payload = (await response.json().catch(() => ({}))) as { _id?: string; error?: string };
      if (!response.ok) {
        setError(payload.error || 'Kodutöö saatmine ebaõnnestus.');
        return;
      }

      if (payload._id) {
        window.location.href = `/student/result/${payload._id}`;
      }
    } catch {
      setError('Kodutöö saatmine ebaõnnestus.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-2xl space-y-4">
      <Card>
        <h1 className="text-2xl font-semibold">Kodutöö</h1>
        {isLoadingHomework ? (
          <p className="mt-2 text-sm text-[var(--color-text-muted)]">Kodutöö laadimine…</p>
        ) : homework ? (
          <>
            <p className="mt-2 text-sm text-[var(--color-text-muted)]">{homework.title}</p>
            <p className="mt-1 text-sm text-[var(--color-text)]">{homework.promptEt}</p>
          </>
        ) : (
          <p className="mt-2 text-sm text-[var(--color-text-muted)]">Lahenda ülesanne.</p>
        )
        }
      </Card>

      <Card>
        <div className="flex flex-wrap gap-2">
          {!isRecording ? (
            <Button onClick={() => void startRecording()}>Alusta salvestust</Button>
          ) : (
            <Button variant="secondary" onClick={stopRecording}>
              Stop
            </Button>
          )}
          <Button variant="secondary" onClick={rerecord} disabled={!hasRecording || isRecording}>
            Salvesta uuesti
          </Button>
          <Button onClick={() => void submitHomework()} disabled={isSubmitting || isRecording || isLoadingHomework}>
            {isSubmitting ? 'Saadan…' : 'Saada vastus'}
          </Button>
        </div>
        <label className="mt-4 block space-y-2">
          <span className="text-sm font-medium text-[var(--color-text)]">Lahenduskäik</span>
          <textarea
            value={typedSolution}
            onChange={(event) => setTypedSolution(event.target.value)}
            className="min-h-32 w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-text)]"
            placeholder="Kirjuta sammud..."
          />
        </label>

        {hasRecording ? (
          <audio className="mt-4 w-full" controls src={audioUrl}>
            Brauser ei toeta audio taasesitust.
          </audio>
        ) : null}

        {error ? <FeedbackBanner className="mt-3" tone="error" message={error} /> : null}
      </Card>

      <Card>
        <p className="text-sm text-[var(--color-text-muted)]">
          Vajadusel vaata
          {' '}
          <a className="font-medium text-[var(--color-text)] underline" href={`/teacher/topic/${homework?.topic || 'quadratic_equations'}`}>
            Õpetaja märkmik
          </a>
          {' '}
          enne uuesti lahendamist.
        </p>
      </Card>
    </div>
  );
}