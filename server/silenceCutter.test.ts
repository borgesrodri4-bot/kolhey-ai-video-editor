import { describe, it, expect } from 'vitest';
import { processSilenceCuts, WordTimestamp } from './silenceCutter';

describe('Algoritmo de Corte de Silêncio Matemático', () => {
  it('deve identificar silêncios maiores que 0.8s e recalcular timestamps', () => {
    const words: WordTimestamp[] = [
      { word: 'Olá', start: 0.1, end: 0.5 },
      { word: 'mundo', start: 0.6, end: 1.0 },
      { word: 'silêncio', start: 2.5, end: 3.0 }, // Silêncio de 1.5s entre 1.0 e 2.5
      { word: 'longo', start: 3.1, end: 3.5 },
    ];

    const result = processSilenceCuts(words, 0.8);

    // O silêncio entre 1.0 e 2.5 é de 1.5s (> 0.8s)
    expect(result.cuts.length).toBe(1);
    expect(result.cuts[0].duration).toBe(1.5);

    // A palavra 'silêncio' deve ter seu tempo deslocado em 1.5s para trás
    // Original: 2.5 -> 3.0 | Novo: 1.0 -> 1.5
    expect(result.words[2].start).toBeCloseTo(1.0);
    expect(result.words[2].end).toBeCloseTo(1.5);

    // A palavra 'longo' também deve ser deslocada
    // Original: 3.1 -> 3.5 | Novo: 1.6 -> 2.0
    expect(result.words[3].start).toBeCloseTo(1.6);
    expect(result.words[3].end).toBeCloseTo(2.0);
  });

  it('deve ignorar silêncios menores que o limite (ex: 0.5s)', () => {
    const words: WordTimestamp[] = [
      { word: 'Teste', start: 0.1, end: 0.5 },
      { word: 'rápido', start: 1.0, end: 1.5 }, // Silêncio de 0.5s (< 0.8s)
    ];

    const result = processSilenceCuts(words, 0.8);

    expect(result.cuts.length).toBe(0);
    expect(result.words[1].start).toBe(1.0); // Mantém o tempo original
  });

  it('deve lidar com silêncio no início do vídeo', () => {
    const words: WordTimestamp[] = [
      { word: 'Início', start: 1.5, end: 2.0 }, // Silêncio inicial de 1.5s
    ];

    const result = processSilenceCuts(words, 0.8);

    expect(result.cuts.length).toBe(1);
    expect(result.cuts[0].duration).toBe(1.5);
    expect(result.words[0].start).toBe(0); // Começa no tempo zero após o corte
  });
});
