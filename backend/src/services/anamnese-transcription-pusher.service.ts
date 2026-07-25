import { getPusherClient, isPusherConfigured, nutriPusherChannel } from "../utils/pusher-config";

export type AnamneseTranscriptionPushPayload = {
  jobId: string;
  patientId: string;
  patientName?: string;
  anamneseTitle?: string;
  status: "completed" | "error";
  text?: string;
  error?: string;
};

export async function notifyAnamneseTranscriptionJob(
  nutriId: string,
  payload: AnamneseTranscriptionPushPayload,
): Promise<void> {
  if (!isPusherConfigured()) return;
  const pusher = getPusherClient();
  if (!pusher) return;

  try {
    await pusher.trigger(nutriPusherChannel(nutriId), "anamnese-transcription", {
      ...payload,
      at: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[Pusher] Falha ao notificar transcrição de anamnese:", error);
  }
}
