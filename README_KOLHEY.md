# 🚀 Kolhey AI Video Editor - Manual de Operação

Este documento detalha a implementação final da plataforma, integrando a **Arquitetura Remotion de 3 Camadas** e as **Regras de Ouro de Sincronização**.

## 🛠️ O que foi implementado

### 1. Motor Remotion (Sanduíche de 3 Camadas)
O sistema de renderização foi reconstruído do zero para suportar:
- **Camada 1 (Background):** Vídeo original processado.
- **Camada 2 (Visual):** 11 componentes de cena dinâmicos (Impacto, WhatsApp, Comparativo, etc.).
- **Camada 3 (Overlay):** Legendas estilo TikTok com animação e cores Kolhey (#E84B1A).

### 2. Algoritmo de Corte de Silêncio Matemático
Localizado em `server/silenceCutter.ts`, este módulo:
- Identifica silêncios > 0.8s no JSON do Whisper.
- Recalcula todos os timestamps subsequentes via código determinístico.
- Gera filtros FFmpeg para edição física sem perda de sincronia.

### 3. Direção de Arte via Index (Regra de Ouro)
O motor de IA (Claude) foi reconfigurado em `server/pipeline.ts` para:
- Ignorar cálculos de segundos.
- Utilizar apenas o **índice da legenda** para marcar o início das cenas.
- Escolher automaticamente entre os 11 novos componentes visuais.

### 4. Interface de Preview & Refinamento
- **Player em Tempo Real:** Integrado na página de detalhes do projeto via `@remotion/player`.
- **Prompt In-App:** Campo de texto para solicitar ajustes na edição (ex: "Troque a cena 2 por um gráfico") sem sair da plataforma.

## 📋 Checklist de Operação Local

1. **Instalação:** `pnpm install`
2. **Dependências de Vídeo:** Certifique-se de ter o `ffmpeg` instalado no sistema.
3. **Testes de Sincronia:** `pnpm test` (41 testes passando, incluindo o novo algoritmo de silêncio).
4. **Execução:** `pnpm dev` para abrir o Dashboard.

## 🏗️ Estrutura de Pastas Chave
- `client/src/remotion/`: Todo o código de renderização de vídeo.
- `client/src/components/RemotionPlayer.tsx`: O player de preview.
- `server/silenceCutter.ts`: Lógica matemática de corte.
- `server/pipeline.ts`: Orquestrador de IA e Direção de Arte.

---
**Desenvolvido por Manus AI para Kolhey.**
"A sincronia perfeita não é uma opinião da IA, é uma certeza matemática."
