import ytdl from "@distube/ytdl-core";
import { storagePut } from "./storage";
import { nanoid } from "nanoid";

export interface YouTubeVideoInfo {
  title: string;
  duration: number; // seconds
  thumbnailUrl: string;
  audioUrl: string; // S3 URL after upload
  audioKey: string;
  fileSizeBytes: number;
}

/**
 * Validates if a string is a valid YouTube URL
 */
export function isValidYouTubeUrl(url: string): boolean {
  return ytdl.validateURL(url);
}

/**
 * Extracts video metadata from a YouTube URL without downloading
 */
export async function getYouTubeVideoInfo(url: string): Promise<{
  title: string;
  duration: number;
  thumbnailUrl: string;
  videoId: string;
}> {
  if (!ytdl.validateURL(url)) {
    throw new Error("URL do YouTube inválida");
  }

  const info = await ytdl.getInfo(url);
  const videoDetails = info.videoDetails;

  return {
    title: videoDetails.title,
    duration: parseInt(videoDetails.lengthSeconds, 10),
    thumbnailUrl:
      videoDetails.thumbnails?.[videoDetails.thumbnails.length - 1]?.url ?? "",
    videoId: videoDetails.videoId,
  };
}

/**
 * Downloads audio from a YouTube video and uploads it to S3
 * Returns the S3 URL to be used for transcription
 */
export async function extractYouTubeAudio(
  url: string
): Promise<YouTubeVideoInfo> {
  if (!ytdl.validateURL(url)) {
    throw new Error("URL do YouTube inválida");
  }

  const info = await ytdl.getInfo(url);
  const videoDetails = info.videoDetails;

  const durationSeconds = parseInt(videoDetails.lengthSeconds, 10);

  // Limit to 15 minutes to avoid excessive processing
  if (durationSeconds > 900) {
    throw new Error(
      "Vídeo muito longo. O limite é de 15 minutos para vídeos do YouTube."
    );
  }

  // Get the best audio-only format
  const audioFormat = ytdl.chooseFormat(info.formats, {
    quality: "highestaudio",
    filter: "audioonly",
  });

  if (!audioFormat) {
    throw new Error("Nenhum formato de áudio disponível para este vídeo");
  }

  // Stream audio directly into a buffer
  const audioStream = ytdl.downloadFromInfo(info, { format: audioFormat });

  const chunks: Buffer[] = [];
  await new Promise<void>((resolve, reject) => {
    audioStream.on("data", (chunk: Buffer) => chunks.push(chunk));
    audioStream.on("end", resolve);
    audioStream.on("error", reject);
  });

  const audioBuffer = Buffer.concat(chunks);
  const fileSizeBytes = audioBuffer.length;

  // Upload to S3
  const key = `youtube-audio/${nanoid(12)}.webm`;
  const { url: audioUrl } = await storagePut(key, audioBuffer, "audio/webm");

  return {
    title: videoDetails.title,
    duration: durationSeconds,
    thumbnailUrl:
      videoDetails.thumbnails?.[videoDetails.thumbnails.length - 1]?.url ?? "",
    audioUrl,
    audioKey: key,
    fileSizeBytes,
  };
}
