import OpenAI from "openai";

let client: OpenAI | null = null;

export function getOpenAIClient(timeoutMs = 30_000): OpenAI {
  if (client) return client;

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is required");
  }

  client = new OpenAI({
    apiKey,
    baseURL: process.env.OPENAI_BASE_URL || undefined,
    timeout: timeoutMs,
  });
  return client;
}

export type OpenAIAudioTranscriptionResult = {
  text?: string;
};

export async function transcribeAudioBase64WithOpenAI(
  voiceAudioBase64: string,
  voiceMimeType: string,
  timeoutMs = 30_000
 ): Promise<string> {
  const openai = getOpenAIClient(timeoutMs);
  const dataUrl = voiceAudioBase64.trim();
  if (!dataUrl) {
    return '';
  }

  const commaIndex = dataUrl.indexOf(',');
  const base64Payload = commaIndex >= 0 ? dataUrl.slice(commaIndex + 1).trim() : dataUrl;
  if (!base64Payload) {
    return '';
  }

  const audioBuffer = Buffer.from(base64Payload, 'base64');
  const extension = voiceMimeType.includes('ogg')
    ? 'ogg'
    : voiceMimeType.includes('wav')
      ? 'wav'
      : 'webm';
  const filename = `voice.${extension}`;
  const file = new File([audioBuffer], filename, { type: voiceMimeType || 'audio/webm' });
  const response = (await openai.audio.transcriptions.create({
    file,
    model: 'gpt-4o-mini-transcribe',
  })) as OpenAIAudioTranscriptionResult;

  return (response.text || '').trim();
}
