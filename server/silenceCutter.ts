/**
 * Algoritmo de Corte de Silêncio Matemático (Regra de Ouro)
 * Identifica silêncios > 0.8s e recalcula timestamps via código determinístico.
 */

export interface WordTimestamp {
  word: string;
  start: number; // em segundos
  end: number;   // em segundos
}

export interface CutSegment {
  start: number;
  end: number;
  duration: number;
}

export interface ProcessedTranscript {
  words: WordTimestamp[];
  cuts: CutSegment[];
  totalDurationRemoved: number;
}

/**
 * Analisa a lista de palavras e identifica silêncios maiores que o limite.
 * Recalcula os timestamps de todas as palavras subsequentes.
 */
export function processSilenceCuts(
  words: WordTimestamp[],
  silenceThreshold = 0.8
): ProcessedTranscript {
  const cuts: CutSegment[] = [];
  const processedWords: WordTimestamp[] = [];
  let totalDurationRemoved = 0;

  if (words.length === 0) {
    return { words: [], cuts: [], totalDurationRemoved: 0 };
  }

  // 1. Identificar silêncio inicial (antes da primeira palavra)
  if (words[0].start > silenceThreshold) {
    const duration = words[0].start;
    cuts.push({ start: 0, end: words[0].start, duration });
    totalDurationRemoved += duration;
  }

  // 2. Processar palavras e silêncios entre elas
  for (let i = 0; i < words.length; i++) {
    const currentWord = words[i];
    const nextWord = words[i + 1];

    // Adicionar palavra atual com o timestamp recalculado
    processedWords.push({
      word: currentWord.word,
      start: Math.max(0, currentWord.start - totalDurationRemoved),
      end: Math.max(0, currentWord.end - totalDurationRemoved),
    });

    // Verificar silêncio após esta palavra
    if (nextWord) {
      const silenceDuration = nextWord.start - currentWord.end;
      
      if (silenceDuration > silenceThreshold) {
        // Marcar trecho para corte
        cuts.push({
          start: currentWord.end,
          end: nextWord.start,
          duration: silenceDuration,
        });
        
        // Acumular duração removida para as próximas palavras
        totalDurationRemoved += silenceDuration;
      }
    }
  }

  return {
    words: processedWords,
    cuts,
    totalDurationRemoved,
  };
}

/**
 * Gera os comandos do FFmpeg para realizar os cortes físicos no vídeo/áudio.
 * Baseado nos segmentos de silêncio identificados.
 */
export function generateFFmpegCutFilter(cuts: CutSegment[], totalDuration: number): string {
  if (cuts.length === 0) return "";

  // Inverter a lógica: manter o que NÃO é silêncio
  const keepSegments: { start: number; end: number }[] = [];
  let lastEnd = 0;

  for (const cut of cuts) {
    if (cut.start > lastEnd) {
      keepSegments.push({ start: lastEnd, end: cut.start });
    }
    lastEnd = cut.end;
  }

  if (lastEnd < totalDuration) {
    keepSegments.push({ start: lastEnd, end: totalDuration });
  }

  // Construir filtro select/aselect para o FFmpeg
  const videoFilter = keepSegments
    .map((seg, i) => `between(t,${seg.start},${seg.end})`)
    .join("+");
  
  return `[0:v]select='${videoFilter}',setpts=PTS-STARTPTS[v];[0:a]aselect='${videoFilter}',asetpts=PTS-STARTPTS[a]`;
}
