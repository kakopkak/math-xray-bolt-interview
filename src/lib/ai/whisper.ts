import { transcribeAudioBase64WithOpenAI } from '@/lib/ai/openai-client';
export async function transcribeVoiceBase64(
  voiceAudioBase64: string,
  voiceMimeType: string
): Promise<string> {
  return transcribeAudioBase64WithOpenAI(voiceAudioBase64, voiceMimeType);
}