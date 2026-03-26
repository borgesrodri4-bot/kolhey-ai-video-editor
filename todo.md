# AI Video Editor - Kolhey TODO

## Banco de Dados
- [x] Schema: tabela `video_projects`
- [x] Schema: tabela `video_scenes`
- [x] Schema: tabela `processing_jobs`
- [x] Schema: tabela `user_style_profiles` (sistema adaptativo)
- [x] Schema: tabela `edit_events` (log de edições)
- [x] Schema: tabela `style_feedback` (feedback 👍/👎)
- [x] Campo `visualStyle` na tabela `video_projects`
- [x] Migrações SQL aplicadas

## Backend (tRPC Routers)
- [x] Router `videos.getUploadUrl` - URL presigned S3
- [x] Router `videos.create` - criar projeto com visualStyle
- [x] Router `videos.list` - listar projetos do usuário
- [x] Router `videos.getById` - buscar projeto com cenas
- [x] Router `videos.delete` - deletar projeto
- [x] Router `videos.startProcessing` - iniciar pipeline
- [x] Router `videos.getJobStatus` - polling de status
- [x] Router `scenes.update` - editar prompt de cena
- [x] Router `scenes.regenerateImage` - regenerar ilustração
- [x] Router `scenes.exportJson` - exportar JSON para Remotion
- [x] Router `scenes.reorder` - reordenar cenas (drag-and-drop)
- [x] Router `scenes.submitFeedback` - feedback 👍/👎
- [x] Router `adaptive.getProfile` - perfil adaptativo
- [x] Router `adaptive.getEditHistory` - histórico de edições
- [x] Router `adaptive.refreshProfile` - atualizar perfil
- [x] Router `adaptive.getStyleContext` - contexto para pipeline
- [x] Router `admin.getStats` - métricas gerais
- [x] Router `admin.getUsers` - listar usuários
- [x] Router `admin.getProjects` - listar projetos
- [x] Router `admin.getProcessingsByDay` - gráfico de processamentos

## Pipeline de Processamento
- [x] Transcrição com Whisper (com timestamps)
- [x] Análise com LLM (Claude) para divisão em cenas e prompts
- [x] Geração de imagens (DALL-E / modelo interno)
- [x] Orquestrador com progresso no DB
- [x] Tratamento de erros com retry automático
- [x] Injeção de perfil adaptativo nos prompts
- [x] Injeção de estilo visual escolhido pelo usuário
- [x] Notificação ao owner ao concluir/falhar

## Frontend - Páginas
- [x] Landing page pública com identidade Kolhey
- [x] Dashboard com listagem de projetos e sidebar
- [x] Upload com drag-and-drop, seleção de estilo e badge adaptativo
- [x] ProjectDetail com timeline, drag-and-drop, feedback 👍/👎 e exportação
- [x] AdaptiveProfile com métricas aprendidas e histórico
- [x] Admin com métricas, gráfico, tabela de usuários e projetos
- [x] Rota /admin protegida por role=admin

## Frontend - Componentes
- [x] KolheyLogo (SVG inline com O laranja e onça)
- [x] OnboardingModal (3 passos para novos usuários)
- [x] DropZone para drag-and-drop de MP4
- [x] ProgressTracker com polling em tempo real
- [x] ProjectCard para listagem
- [x] SceneTimeline com drag-and-drop (@dnd-kit)
- [x] SceneCard com feedback 👍/👎 e regenerar
- [x] Exportação JSON com preview e download

## Identidade Visual Kolhey
- [x] CSS global: paleta navy #0D1B2E + laranja #E84B1A
- [x] Tipografia: Playfair Display (títulos) + Inter (corpo) + Dancing Script (tagline)
- [x] Logo SVG inline com O laranja e onça IA
- [x] Favicon SVG com K + círculo laranja
- [x] Meta tags SEO e OG tags

## Sistema Adaptativo
- [x] Engine de análise de padrões via LLM
- [x] Trigger automático após conclusão do pipeline
- [x] Painel de perfil com métricas e confiança
- [x] Badge "Perfil Ativo" na página de upload

## Testes
- [x] 14 testes passando (3 arquivos)
- [x] Zero erros TypeScript

## Entrega
- [x] Checkpoint final

## Melhorias Finais (Fase Atual)
- [ ] Player HTML5 do vídeo original na página de detalhe
- [ ] Preview de ilustração em modal ao clicar na imagem da cena
- [ ] Sincronização do player com a cena selecionada na timeline
- [ ] Sistema de notificações por e-mail (Resend API)
- [ ] Skeleton loaders nas listas do Dashboard e Admin
- [ ] Empty state ilustrado no Dashboard (sem projetos)
- [ ] Página 404 personalizada com identidade Kolhey
- [ ] Responsividade mobile: sidebar collapsible, cards empilhados
- [ ] Botão de voltar ao topo nas páginas longas
- [ ] Toast de confirmação ao salvar edições de cena

## Auditoria Pré-Publicação
- [ ] Revisar todos os routers tRPC (inputs, outputs, erros)
- [ ] Revisar pipeline de processamento (transcrição, LLM, imagens)
- [ ] Revisar engine adaptativa (logEditEvent, analyzeAndUpdateProfile)
- [ ] Revisar helpers de banco de dados (db.ts)
- [ ] Revisar fluxo de upload (presigned URL, S3, criação de projeto)
- [ ] Revisar fluxo de processamento (startProcessing, polling de status)
- [ ] Revisar fluxo de exportação JSON (compatibilidade com Remotion)
- [ ] Revisar todos os estados de loading/erro/empty no frontend
- [ ] Corrigir todos os problemas encontrados

## Melhorias Adicionais (Fase Final)
- [ ] Limite de 500MB no servidor (endpoint /api/upload-video)
- [ ] Paginação no endpoint videos.list (cursor-based, 20 por página)
- [ ] Campo de descrição no schema video_projects
- [ ] Campo de descrição na página de Upload
- [ ] Injeção da descrição no prompt do Claude (pipeline)
- [ ] Paginação no frontend Dashboard (botão "Carregar mais")
- [ ] Testes atualizados para paginação e descrição

## Fase Final - Novas Funcionalidades
- [x] Suporte a URL do YouTube (extração de áudio via @distube/ytdl-core)
- [x] Campo de URL do YouTube no upload com validação e preview
- [x] Templates de prompt por nicho (Aula, Pitch, Motivacional, Tutorial, Storytelling, Demo, Kolhey)
- [x] Seleção de template preenche automaticamente a descrição e estilo visual
- [x] Schema: tabela `project_versions` para histórico de versões
- [x] Backend: endpoints para criar, listar, ativar, restaurar e reprocessar versões
- [x] Frontend: página `/projects/:id/versions` com histórico e comparação de versões
- [x] Botão "Versões" na página de detalhe do projeto
- [x] 31 testes passando (4 arquivos), zero erros TypeScript
