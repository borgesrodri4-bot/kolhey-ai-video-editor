# AI Video Editor - TODO

## Banco de Dados
- [x] Schema: tabela `video_projects` (id, userId, title, status, originalVideoUrl, audioUrl, duration, createdAt, updatedAt)
- [x] Schema: tabela `video_scenes` (id, projectId, order, startTime, endTime, transcript, illustrationPrompt, illustrationUrl, status)
- [x] Schema: tabela `processing_jobs` (id, projectId, step, status, progress, errorMessage, createdAt, updatedAt)
- [x] Executar migrações SQL

## Backend (tRPC Routers)
- [x] Router `videos.upload` - gerar URL presigned S3 para upload direto
- [x] Router `videos.create` - criar projeto após upload concluído
- [x] Router `videos.list` - listar projetos do usuário com paginação
- [x] Router `videos.getById` - buscar projeto com cenas
- [x] Router `videos.delete` - deletar projeto e arquivos S3
- [x] Router `videos.startProcessing` - iniciar pipeline assíncrono
- [x] Router `videos.getJobStatus` - polling de status do processamento
- [x] Router `scenes.update` - editar prompt ou texto de uma cena
- [x] Router `scenes.regenerateImage` - regenerar ilustração de uma cena
- [x] Router `scenes.exportJson` - exportar cenas em JSON para Remotion

## Pipeline de Processamento
- [x] Módulo de transcrição com Whisper (áudio via URL)
- [x] Módulo de transcrição com OpenAI Whisper (com timestamps)
- [x] Módulo de análise com LLM para divisão em cenas e geração de prompts
- [x] Módulo de geração de imagens (DALL-E / modelo interno)
- [x] Orquestrador do pipeline com atualização de progresso no DB
- [x] Tratamento de erros com retry automático por etapa

## Frontend - Layout e Navegação
- [x] Design system: paleta de cores escura/moderna, tipografia
- [x] DashboardLayout com sidebar para usuários autenticados
- [x] Landing page pública com CTA de login
- [x] Rota /dashboard - painel principal
- [x] Rota /upload - página de upload
- [x] Rota /projects/:id - detalhe do projeto e timeline
- [x] Rota /projects/:id/refine - editor de cenas (integrado na página de detalhe)

## Frontend - Componentes
- [x] Componente DropZone para drag-and-drop de MP4
- [x] Componente ProgressTracker com polling em tempo real
- [x] Componente ProjectCard para listagem de projetos
- [x] Componente SceneTimeline com visualização interativa
- [x] Componente SceneCard com imagem, texto e botão de regenerar
- [x] Componente ExportModal para exportar JSON (botão integrado)

## Notificações e Exportação
- [x] Notificação automática ao owner quando processamento concluir
- [x] Notificação automática ao owner quando processamento falhar
- [x] Exportação de cenas em JSON compatível com Remotion

## Testes
- [x] Teste do router `videos.list`
- [x] Teste do router `scenes.exportJson`
- [x] Teste do pipeline de processamento (mock de APIs)
- [x] 7 testes passando (2 arquivos de teste)

## Entrega
- [ ] Checkpoint final
- [ ] Documentação de uso

## Identidade Visual Kolhey
- [ ] Upload e CDN da logo Kolhey
- [ ] Atualizar CSS global com paleta Kolhey (azul escuro #0D1B2E, laranja #E84B1A, branco)
- [ ] Atualizar tipografia para serif (Playfair Display) no título e sans-serif no corpo
- [ ] Atualizar landing page com nome, tagline e cores Kolhey
- [ ] Atualizar sidebar/header do dashboard com logo Kolhey
- [ ] Atualizar título da aba (VITE_APP_TITLE) para Kolhey

## Sistema Adaptativo de Estilo
- [x] Schema: tabela `user_style_profiles` (preferências aprendidas por usuário)
- [x] Schema: tabela `edit_events` (log de cada edição feita pelo usuário)
- [x] Schema: tabela `style_feedback` (avaliações de ilustrações aceitas/rejeitadas)
- [x] Engine de análise de padrões de edição (server/adaptiveEngine.ts)
- [x] Endpoint para registrar eventos de edição automaticamente
- [x] Endpoint para atualizar perfil de estilo após análise
- [x] Integração do perfil adaptativo no pipeline (injetar no prompt do Claude)
- [x] Integração do perfil adaptativo na geração de imagens (injetar no prompt DALL-E)
- [x] Painel de "Meu Estilo" no frontend com métricas aprendidas
- [x] Indicador visual de confiança do sistema adaptativo
- [x] Botão de feedback rápido (👍/👎) em cada cena gerada
- [x] Testes do engine adaptativo (14 testes passando, 3 arquivos)

## Integração Orgânica da Logo Kolhey
- [x] Criar componente KolheyLogo em SVG inline (tipografia + círculo laranja no O)
- [x] Integrar logo no header da landing page como elemento tipográfico
- [x] Integrar logo no sidebar do dashboard como marca principal
- [x] Integrar logo nos headers de Upload, ProjectDetail e AdaptiveProfile
- [x] Remover uso da imagem JPG sobreposta em todas as páginas

## Ajuste da Logo e Onça
- [ ] Corrigir posicionamento e proporção do círculo laranja no O
- [ ] Adicionar onça SVG como elemento decorativo no hero (igual ao modelo)
- [ ] Adicionar onça sutil no sidebar do dashboard
