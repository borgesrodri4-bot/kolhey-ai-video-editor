# 🐆 KOLHEY AI VIDEO EDITOR - GUIA COMPLETO DE TRANSFERÊNCIA

**Data:** 26 de Março de 2026  
**Conta Anterior:** Não especificada  
**Conta Atual:** agc.kolhey@gmail.com  
**Status:** Projeto em produção com 90% de funcionalidades implementadas

---

## 📋 ÍNDICE

1. [Visão Geral](#visão-geral)
2. [Status Atual](#status-atual)
3. [Arquitetura](#arquitetura)
4. [Setup Inicial](#setup-inicial)
5. [Estrutura de Pastas](#estrutura-de-pastas)
6. [Banco de Dados](#banco-de-dados)
7. [Backend (tRPC Routers)](#backend-tropc-routers)
8. [Frontend (Páginas e Componentes)](#frontend-páginas-e-componentes)
9. [Pipeline de Processamento](#pipeline-de-processamento)
10. [Funcionalidades Implementadas](#funcionalidades-implementadas)
11. [Próximos Passos](#próximos-passos)
12. [Troubleshooting](#troubleshooting)
13. [Comandos Essenciais](#comandos-essenciais)

---

## 🎯 VISÃO GERAL

**Kolhey** é uma plataforma de IA que transforma vídeos em bruto em conteúdo visual profissional com cenas, textos e imagens geradas automaticamente.

### Características Principais

- ✅ Upload de vídeos MP4 ou URLs do YouTube
- ✅ Transcrição automática com timestamps (Whisper)
- ✅ Análise inteligente e divisão em cenas (Claude LLM)
- ✅ Geração de imagens para cada cena (Modelo interno)
- ✅ 6 estilos visuais: flat, watercolor, cartoon, photorealistic, minimalist, kolhey
- ✅ 7 templates de nicho: Educacional, Pitch, Motivacional, Tutorial, Storytelling, Demo, Kolhey
- ✅ Sistema adaptativo que aprende preferências do usuário
- ✅ Histórico de versões com comparação lado a lado
- ✅ Notificações in-app em tempo real
- ✅ Painel de administrador com estatísticas
- ✅ Suporte a planos (Free, Pro, Enterprise)

### Stack Tecnológico

```
Frontend:
  - React 19 + TypeScript
  - Tailwind CSS 4
  - Wouter (roteamento)
  - tRPC (comunicação com backend)
  - Shadcn/ui (componentes)
  - @dnd-kit (drag-and-drop)
  - Sonner (toasts)
  - date-fns (datas)

Backend:
  - Express 4 + TypeScript
  - tRPC 11
  - Drizzle ORM
  - MySQL/TiDB (banco de dados)
  - Whisper API (transcrição)
  - Claude LLM (análise)
  - @distube/ytdl-core (YouTube)
  - S3 (armazenamento)

DevTools:
  - Vite (build frontend)
  - Vitest (testes)
  - TypeScript (tipagem)
  - Drizzle Kit (migrações)
  - pnpm (package manager)
```

---

## 📊 STATUS ATUAL

### Implementação

| Componente | Status | Detalhes |
|-----------|--------|----------|
| **Banco de Dados** | ✅ 100% | 9 tabelas, todas as migrações aplicadas |
| **Backend** | ✅ 95% | 5 routers principais, 2 em correção de testes |
| **Frontend** | ✅ 90% | 7 páginas, 10+ componentes |
| **Pipeline** | ✅ 100% | Transcrição, análise, geração funcionando |
| **Testes** | ⚠️ 94% | 36/38 testes passando (2 falhando no plan.getCurrent) |
| **TypeScript** | ✅ 100% | Zero erros de compilação |

### Testes

```bash
Total: 38 testes
✅ Passando: 36
❌ Falhando: 2 (plan.getCurrent retorna undefined no mock)

Arquivos:
  ✅ server/videos.test.ts (9 testes)
  ✅ server/adaptive.test.ts (7 testes)
  ✅ server/auth.logout.test.ts (1 teste)
  ⚠️ server/new-features.test.ts (21 testes, 2 falhando)
```

### Checkpoints Salvos

```
v1 (0915fcec) - Inicial
v2 (42a7e06f) - YouTube + Templates + Versões
v3 (PENDENTE) - Melhorias v3 (após corrigir testes)
```

---

## 🏗️ ARQUITETURA

### Fluxo de Dados

```
┌─────────────────────────────────────────────────────────────────┐
│                        FRONTEND (React)                         │
│  Upload → ProjectDetail → ProjectVersions → Dashboard → Admin   │
└────────────────────────────┬────────────────────────────────────┘
                             │
                    tRPC Calls (JSON)
                             │
┌────────────────────────────▼────────────────────────────────────┐
│                    BACKEND (Express + tRPC)                     │
│  Routers: videos, scenes, adaptive, admin, auth, plan, niche   │
└────────────────────────────┬────────────────────────────────────┘
                             │
        ┌────────────────────┼────────────────────┐
        │                    │                    │
        ▼                    ▼                    ▼
    ┌────────┐          ┌────────┐          ┌────────┐
    │ MySQL  │          │ S3     │          │ LLM    │
    │ (DB)   │          │ (Files)│          │(Claude)│
    └────────┘          └────────┘          └────────┘
```

### Pipeline de Processamento

```
1. Upload (MP4 ou YouTube URL)
   ↓
2. Transcrição (Whisper API)
   Entrada: Áudio
   Saída: Texto com timestamps
   ↓
3. Análise (Claude LLM)
   Entrada: Texto + contexto do usuário
   Saída: Divisão em cenas + prompts
   ↓
4. Geração de Imagens (Modelo interno)
   Entrada: Prompts
   Saída: Imagens para cada cena
   ↓
5. Armazenamento (S3 + DB)
   Entrada: Imagens + metadados
   Saída: Projeto completo
   ↓
6. Notificação (In-app)
   Entrada: Status
   Saída: Notificação ao usuário
```

---

## 🚀 SETUP INICIAL

### Pré-requisitos

```bash
Node.js 22.13.0 (ou superior)
pnpm 9.x
MySQL 8.0 (ou TiDB compatível)
```

### Instalação

```bash
# 1. Clonar repositório
git clone https://github.com/borgesrodri4-bot/agencia-esteira.git
cd agencia-esteira

# 2. Instalar dependências
pnpm install

# 3. Configurar variáveis de ambiente
# Copiar .env.example para .env (se existir)
# Ou adicionar manualmente as variáveis (ver seção Variáveis de Ambiente)

# 4. Executar migrações do banco de dados
pnpm drizzle-kit generate  # Gera SQL das migrações
# Depois aplicar via Manus UI ou webdev_execute_sql

# 5. Iniciar servidor de desenvolvimento
pnpm dev

# 6. Acessar
# Frontend: http://localhost:5173
# Backend: http://localhost:3000
```

### Variáveis de Ambiente Necessárias

```env
# Database
DATABASE_URL=mysql://user:password@localhost:3306/kolhey

# OAuth (Manus)
JWT_SECRET=seu_jwt_secret_aqui
VITE_APP_ID=seu_app_id
OAUTH_SERVER_URL=https://api.manus.im
VITE_OAUTH_PORTAL_URL=https://oauth.manus.im

# Manus APIs
BUILT_IN_FORGE_API_URL=https://api.manus.im/forge
BUILT_IN_FORGE_API_KEY=seu_api_key
VITE_FRONTEND_FORGE_API_KEY=seu_frontend_key
VITE_FRONTEND_FORGE_API_URL=https://api.manus.im/forge

# Owner Info
OWNER_NAME=Seu Nome
OWNER_OPEN_ID=seu_open_id

# Analytics (opcional)
VITE_ANALYTICS_ENDPOINT=https://analytics.example.com
VITE_ANALYTICS_WEBSITE_ID=seu_website_id

# App Info
VITE_APP_TITLE=Kolhey AI Video Editor
VITE_APP_LOGO=https://cdn.example.com/logo.png
```

---

## 📁 ESTRUTURA DE PASTAS

```
video-editor-ai/
├── client/                          # Frontend React
│   ├── public/
│   │   ├── favicon.ico
│   │   ├── robots.txt
│   │   └── manifest.json
│   ├── src/
│   │   ├── components/
│   │   │   ├── ui/                  # Shadcn/ui components
│   │   │   ├── KolheyLogo.tsx
│   │   │   ├── DashboardLayout.tsx
│   │   │   ├── NotificationBell.tsx # NOVO: Notificações
│   │   │   ├── DropZone.tsx
│   │   │   ├── ProgressTracker.tsx
│   │   │   ├── ProjectCard.tsx
│   │   │   ├── SceneTimeline.tsx
│   │   │   ├── SceneCard.tsx
│   │   │   ├── AIChatBox.tsx
│   │   │   ├── Map.tsx
│   │   │   └── ...
│   │   ├── pages/
│   │   │   ├── Home.tsx             # Landing page
│   │   │   ├── Upload.tsx           # Upload + YouTube + Templates
│   │   │   ├── Dashboard.tsx        # Lista de projetos
│   │   │   ├── ProjectDetail.tsx    # Editar projeto
│   │   │   ├── ProjectVersions.tsx  # Histórico + Comparação
│   │   │   ├── AdaptiveProfile.tsx  # Perfil adaptativo
│   │   │   ├── Admin.tsx            # Painel admin
│   │   │   └── ...
│   │   ├── contexts/                # React contexts
│   │   ├── hooks/                   # Custom hooks
│   │   ├── lib/
│   │   │   ├── trpc.ts              # Cliente tRPC
│   │   │   └── ...
│   │   ├── App.tsx                  # Roteamento principal
│   │   ├── main.tsx                 # Providers
│   │   ├── index.css                # Estilos globais
│   │   └── const.ts                 # Constantes
│   ├── index.html
│   ├── vite.config.ts
│   └── tsconfig.json
│
├── server/                          # Backend Express + tRPC
│   ├── _core/
│   │   ├── context.ts               # Contexto tRPC (auth)
│   │   ├── env.ts                   # Variáveis de ambiente
│   │   ├── llm.ts                   # Integração Claude
│   │   ├── imageGeneration.ts       # Geração de imagens
│   │   ├── voiceTranscription.ts    # Transcrição Whisper
│   │   ├── userNotification.ts      # NOVO: Notificações
│   │   ├── map.ts                   # Google Maps
│   │   ├── oauth.ts                 # OAuth Manus
│   │   └── ...
│   ├── routers.ts                   # Todos os routers tRPC
│   ├── db.ts                        # Query helpers
│   ├── pipeline.ts                  # Pipeline de processamento
│   ├── youtubeExtractor.ts          # NOVO: Extração YouTube
│   ├── adaptiveEngine.ts            # Engine adaptativo
│   ├── storage.ts                   # S3 helpers
│   ├── index.ts                     # Servidor Express
│   ├── videos.test.ts               # Testes
│   ├── adaptive.test.ts
│   ├── auth.logout.test.ts
│   ├── new-features.test.ts         # NOVO: Testes de YouTube, Templates, Versões
│   └── ...
│
├── drizzle/                         # Banco de dados
│   ├── schema.ts                    # Schema Drizzle
│   ├── 0001_*.sql                   # Migrações
│   ├── 0002_*.sql
│   ├── ...
│   ├── 0007_*.sql                   # NOVO: user_notifications
│   └── drizzle.config.ts
│
├── shared/                          # Código compartilhado
│   ├── nicheTemplates.ts            # NOVO: Templates de nicho
│   └── ...
│
├── storage/                         # S3 helpers
│   └── ...
│
├── .manus-logs/                     # Logs do servidor
│   ├── devserver.log
│   ├── browserConsole.log
│   ├── networkRequests.log
│   └── sessionReplay.log
│
├── package.json
├── pnpm-lock.yaml
├── tsconfig.json
├── vite.config.ts
├── vitest.config.ts
├── drizzle.config.ts
├── todo.md                          # TODO list do projeto
├── TRANSFERENCIA_CONHECIMENTO.md    # Este arquivo
└── README.md                        # README original
```

---

## 💾 BANCO DE DADOS

### Tabelas

#### 1. `users`
```sql
CREATE TABLE users (
  id INT PRIMARY KEY AUTO_INCREMENT,
  openId VARCHAR(255) UNIQUE NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255),
  loginMethod ENUM('manus', 'google', 'github'),
  role ENUM('user', 'admin') DEFAULT 'user',
  plan ENUM('free', 'pro', 'enterprise') DEFAULT 'free',  -- NOVO
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  lastSignedIn TIMESTAMP
);
```

#### 2. `video_projects`
```sql
CREATE TABLE video_projects (
  id INT PRIMARY KEY AUTO_INCREMENT,
  userId INT NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  status ENUM('pending', 'processing', 'completed', 'failed') DEFAULT 'pending',
  progress INT DEFAULT 0,
  scenesCount INT DEFAULT 0,
  originalVideoUrl VARCHAR(500),
  originalVideoKey VARCHAR(255),
  audioUrl VARCHAR(500),
  audioKey VARCHAR(255),
  visualStyle ENUM('auto', 'flat', 'watercolor', 'cartoon', 'photorealistic', 'minimalist', 'kolhey') DEFAULT 'auto',
  durationSeconds INT,
  fileSizeBytes BIGINT,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (userId) REFERENCES users(id)
);
```

#### 3. `video_scenes`
```sql
CREATE TABLE video_scenes (
  id INT PRIMARY KEY AUTO_INCREMENT,
  projectId INT NOT NULL,
  sceneOrder INT NOT NULL,
  startTime INT,
  endTime INT,
  transcript TEXT,
  illustrationPrompt TEXT,
  illustrationUrl VARCHAR(500),
  illustrationStatus ENUM('pending', 'generating', 'completed', 'failed') DEFAULT 'pending',
  FOREIGN KEY (projectId) REFERENCES video_projects(id) ON DELETE CASCADE
);
```

#### 4. `processing_jobs`
```sql
CREATE TABLE processing_jobs (
  id INT PRIMARY KEY AUTO_INCREMENT,
  projectId INT NOT NULL,
  status ENUM('pending', 'transcribing', 'analyzing', 'generating', 'completed', 'failed') DEFAULT 'pending',
  progress INT DEFAULT 0,
  errorMessage TEXT,
  startedAt TIMESTAMP,
  completedAt TIMESTAMP,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (projectId) REFERENCES video_projects(id) ON DELETE CASCADE
);
```

#### 5. `user_style_profiles`
```sql
CREATE TABLE user_style_profiles (
  id INT PRIMARY KEY AUTO_INCREMENT,
  userId INT NOT NULL UNIQUE,
  styleContext TEXT,
  imageStyleSuffix TEXT,
  styleSummary TEXT,
  confidenceScore DECIMAL(3,2) DEFAULT 0.00,
  isReliable BOOLEAN DEFAULT FALSE,
  lastUpdatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
);
```

#### 6. `edit_events`
```sql
CREATE TABLE edit_events (
  id INT PRIMARY KEY AUTO_INCREMENT,
  userId INT NOT NULL,
  projectId INT NOT NULL,
  sceneId INT,
  eventType ENUM('prompt_edit', 'image_regenerate', 'feedback_given', 'style_changed') NOT NULL,
  details JSON,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (userId) REFERENCES users(id),
  FOREIGN KEY (projectId) REFERENCES video_projects(id) ON DELETE CASCADE,
  FOREIGN KEY (sceneId) REFERENCES video_scenes(id) ON DELETE CASCADE
);
```

#### 7. `style_feedback`
```sql
CREATE TABLE style_feedback (
  id INT PRIMARY KEY AUTO_INCREMENT,
  userId INT NOT NULL,
  sceneId INT NOT NULL,
  feedback ENUM('like', 'dislike') NOT NULL,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (userId) REFERENCES users(id),
  FOREIGN KEY (sceneId) REFERENCES video_scenes(id) ON DELETE CASCADE
);
```

#### 8. `project_versions` (NOVO)
```sql
CREATE TABLE project_versions (
  id INT PRIMARY KEY AUTO_INCREMENT,
  projectId INT NOT NULL,
  userId INT NOT NULL,
  versionNumber INT NOT NULL,
  label VARCHAR(255),
  visualStyle VARCHAR(50),
  description TEXT,
  scenesSnapshot JSON NOT NULL,
  scenesCount INT DEFAULT 0,
  isActive ENUM('yes', 'no') DEFAULT 'no',
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (projectId) REFERENCES video_projects(id) ON DELETE CASCADE,
  FOREIGN KEY (userId) REFERENCES users(id)
);
```

#### 9. `user_notifications` (NOVO)
```sql
CREATE TABLE user_notifications (
  id INT PRIMARY KEY AUTO_INCREMENT,
  userId INT NOT NULL,
  type ENUM('success', 'error', 'info', 'warning') DEFAULT 'info',
  title VARCHAR(255) NOT NULL,
  message TEXT,
  projectId INT,
  isRead BOOLEAN DEFAULT FALSE,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (projectId) REFERENCES video_projects(id) ON DELETE SET NULL
);
```

### Como Aplicar Migrações

```bash
# 1. Gerar SQL das migrações
pnpm drizzle-kit generate

# 2. Verificar o SQL gerado em drizzle/
cat drizzle/0007_*.sql

# 3. Aplicar via Manus UI (webdev_execute_sql)
# Ou via MySQL CLI:
mysql -u user -p database < drizzle/0007_*.sql
```

---

## 🔌 BACKEND (tRPC Routers)

### Estrutura de um Router

```typescript
// server/routers.ts
const videoRouter = router({
  // Procedure público (sem autenticação)
  getUploadUrl: publicProcedure
    .input(z.object({ fileName: z.string() }))
    .mutation(async ({ input }) => {
      // Lógica aqui
      return { uploadUrl: "..." };
    }),

  // Procedure protegido (com autenticação)
  create: protectedProcedure
    .input(z.object({ title: z.string(), videoKey: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // ctx.user = usuário autenticado
      // Lógica aqui
      return { projectId: 42 };
    }),

  // Procedure apenas para admin
  getStats: adminProcedure
    .query(async ({ ctx }) => {
      // Apenas admins podem acessar
      return { totalUsers: 100, totalProjects: 500 };
    }),
});
```

### Routers Disponíveis

#### 1. **Videos Router**
```typescript
videos.getUploadUrl()       // Gera URL presigned S3
videos.create()             // Cria novo projeto
videos.list()               // Lista projetos do usuário
videos.getById()            // Busca projeto específico
videos.delete()             // Deleta projeto
videos.startProcessing()    // Inicia pipeline
videos.getJobStatus()       // Polling de status
```

#### 2. **Scenes Router**
```typescript
scenes.update()             // Edita prompt de cena
scenes.regenerateImage()    // Regenera imagem
scenes.exportJson()         // Exporta para Remotion
scenes.reorder()            // Reordena cenas
scenes.submitFeedback()     // Feedback 👍/👎
```

#### 3. **Adaptive Router**
```typescript
adaptive.getProfile()       // Perfil adaptativo
adaptive.getEditHistory()   // Histórico de edições
adaptive.refreshProfile()   // Atualiza perfil
adaptive.getStyleContext()  // Contexto de estilo
```

#### 4. **Admin Router**
```typescript
admin.getStats()            // Estatísticas gerais
admin.getUsers()            // Lista usuários
admin.getProjects()         // Lista projetos
admin.getProcessingsByDay() // Gráfico de processamentos
```

#### 5. **Auth Router**
```typescript
auth.logout()               // Logout
auth.me()                   // Dados do usuário
```

#### 6. **YouTube Router** (NOVO)
```typescript
youtube.getInfo()           // Metadados do vídeo
youtube.createProject()     // Cria projeto de YouTube
```

#### 7. **Niche Router** (NOVO)
```typescript
niche.list()                // Lista templates
niche.getById()             // Template específico
```

#### 8. **Versions Router** (NOVO)
```typescript
versions.list()             // Lista versões
versions.saveSnapshot()     // Salva snapshot
versions.setActive()        // Ativa versão
versions.restore()          // Restaura cenas
versions.reprocess()        // Reprocessa com novo estilo
```

#### 9. **Plan Router** (NOVO)
```typescript
plan.getCurrent()           // Plano e limites do usuário
```

#### 10. **Notifications Router** (NOVO)
```typescript
notifications.list()        // Lista notificações
notifications.countUnread() // Conta não lidas
notifications.markRead()    // Marca como lida
notifications.markAllRead() // Marca todas como lidas
```

---

## 🎨 FRONTEND (Páginas e Componentes)

### Páginas Principais

#### 1. **Home.tsx** (Landing Page)
- Apresentação da Kolhey
- Benefícios e features
- Botão "Começar"
- Responsivo mobile

#### 2. **Upload.tsx** (Upload + YouTube + Templates)
- Drag-and-drop de MP4
- Campo de URL do YouTube
- Preview do YouTube (thumbnail, título, duração)
- Seleção de template (7 opções)
- Seleção de estilo visual (6 opções)
- Campo de descrição
- Validação de limites por plano
- Botão "Criar Projeto"

#### 3. **Dashboard.tsx** (Lista de Projetos)
- Sidebar com navegação
- Lista de projetos com cards
- Busca e filtros
- Status de cada projeto
- Botão "Novo Projeto"
- Notificações (sino no header)
- Responsivo mobile

#### 4. **ProjectDetail.tsx** (Editar Projeto)
- Timeline de cenas
- Drag-and-drop de cenas
- Editor de prompt por cena
- Regenerar imagem
- Feedback 👍/👎
- Exportar JSON
- Botão "Reprocessar"
- Botão "Versões"

#### 5. **ProjectVersions.tsx** (Histórico + Comparação)
- Lista de versões
- Salvar novo snapshot
- Ativar versão
- Restaurar cenas
- **Modo Comparação**: Selecionar 2 versões
- **CompareView**: Grid lado a lado
- Reprocessar com novo estilo

#### 6. **AdaptiveProfile.tsx** (Perfil Adaptativo)
- Métricas aprendidas
- Confiança do perfil
- Histórico de edições
- Contexto de estilo

#### 7. **Admin.tsx** (Painel Admin)
- Estatísticas gerais
- Gráfico de processamentos por dia
- Tabela de usuários
- Tabela de projetos
- Filtros e busca

### Componentes Reutilizáveis

| Componente | Uso |
|-----------|-----|
| **KolheyLogo** | Logo em todas as páginas |
| **DashboardLayout** | Layout com sidebar |
| **NotificationBell** | Sino de notificações (NOVO) |
| **DropZone** | Drag-and-drop de vídeos |
| **ProgressTracker** | Barra de progresso |
| **ProjectCard** | Card de projeto |
| **SceneTimeline** | Timeline de cenas |
| **SceneCard** | Card de cena |
| **OnboardingModal** | Tutorial inicial |
| **AIChatBox** | Chat com IA |
| **Map** | Google Maps |

---

## ⚙️ PIPELINE DE PROCESSAMENTO

### Fluxo Completo

```typescript
// server/pipeline.ts
export async function runVideoPipeline(
  projectId: number,
  userId: number,  // NOVO: Para notificações
  audioUrl: string,
  visualStyle: string,
  description: string
) {
  try {
    // 1. TRANSCRIÇÃO
    const transcript = await transcribeAudio({ audioUrl });
    
    // 2. ANÁLISE
    const scenes = await analyzeWithLLM({
      transcript,
      visualStyle,
      description,
      styleContext  // Do perfil adaptativo
    });
    
    // 3. GERAÇÃO DE IMAGENS
    for (const scene of scenes) {
      scene.illustrationUrl = await generateImage({
        prompt: scene.illustrationPrompt
      });
    }
    
    // 4. SALVAR NO BANCO
    await saveScenesToDatabase(projectId, scenes);
    
    // 5. NOTIFICAR USUÁRIO
    await sendUserNotification(userId, {
      type: 'success',
      title: 'Vídeo processado!',
      message: 'Seu vídeo foi processado com sucesso',
      projectId
    });
    
  } catch (error) {
    // Tratamento de erros
    await sendUserNotification(userId, {
      type: 'error',
      title: 'Erro ao processar',
      message: error.message,
      projectId
    });
  }
}
```

### Integração com Adaptive Engine

```typescript
// Após conclusão do pipeline:
await analyzeAndUpdateProfile({
  userId,
  projectId,
  editEvents,  // Edições que o usuário fez
  feedback     // Feedback 👍/👎
});

// Próximo pipeline injeta o contexto:
const styleContext = await getStyleContext(userId);
// styleContext = "Este usuário gosta de cores vibrantes e layouts minimalistas"
```

---

## ✨ FUNCIONALIDADES IMPLEMENTADAS

### Fase 1: Fundação (100%)

- ✅ Upload de MP4
- ✅ Transcrição com Whisper
- ✅ Análise com Claude
- ✅ Geração de imagens
- ✅ 6 estilos visuais
- ✅ Sistema adaptativo
- ✅ Painel admin
- ✅ Autenticação OAuth

### Fase 2: Avançadas (100%)

#### YouTube (100%)
- ✅ Validação de URLs
- ✅ Extração de metadados
- ✅ Preview (thumbnail, título, duração)
- ✅ Extração de áudio (@distube/ytdl-core)
- ✅ Limites por plano (free: 15min, pro: 30min, enterprise: 60min)
- ✅ Routers: `youtube.getInfo`, `youtube.createProject`

#### Templates de Nicho (100%)
- ✅ 7 templates: Educacional, Pitch, Motivacional, Tutorial, Storytelling, Demo, Kolhey
- ✅ Auto-preenchimento de descrição e estilo
- ✅ Contexto customizado por nicho
- ✅ Routers: `niche.list`, `niche.getById`

#### Histórico de Versões (100%)
- ✅ Salvar snapshots
- ✅ Listar versões
- ✅ Ativar versão
- ✅ Restaurar cenas
- ✅ Reprocessar com novo estilo
- ✅ Página `/projects/:id/versions`
- ✅ Routers: `versions.*`

### Fase 3: Melhorias v3 (90%)

#### Limite por Plano (100%)
- ✅ Campo `plan` no schema
- ✅ Validação no YouTube
- ✅ Router `plan.getCurrent`
- ⚠️ Testes: Mock retornando undefined

#### Comparação Lado a Lado (100%)
- ✅ Modo "Comparar"
- ✅ Seleção de 2 versões
- ✅ Grid lado a lado
- ✅ CompareView component

#### Notificações (100%)
- ✅ Tabela `user_notifications`
- ✅ Componente NotificationBell
- ✅ Dropdown com notificações
- ✅ Marcar como lida
- ✅ Polling a cada 30s
- ✅ Routers: `notifications.*`
- ⚠️ Envio ao concluir reprocessamento: Falta integração final no pipeline

---

## 🔧 PRÓXIMOS PASSOS

### Imediato (Crítico)

1. **Corrigir Testes** ⚠️
   ```bash
   # 2 testes falhando em plan.getCurrent
   # Problema: Mock retorna undefined
   # Solução: Adicionar youtubeDurationLimitMinutes ao mock
   
   pnpm test
   # Esperado: 38/38 passando
   ```

2. **Salvar Checkpoint Final**
   ```bash
   # Após corrigir testes
   webdev_save_checkpoint
   # Descrição: "Melhorias v3: Limite por plano, comparação e notificações"
   ```

3. **Enviar Notificação ao Concluir Reprocessamento**
   ```typescript
   // Em server/pipeline.ts, após conclusão:
   await sendUserNotification(userId, {
     type: 'success',
     title: 'Reprocessamento concluído!',
     message: `Seu vídeo foi reprocessado com sucesso em ${visualStyle}`,
     projectId
   });
   ```

### Curto Prazo (1-2 semanas)

4. **Badge de Plano no Header**
   - Mostrar plano atual do usuário
   - Botão "Upgrade" para planos superiores

5. **Mensagem de Upgrade**
   - Ao atingir limite de YouTube
   - Sugerir upgrade para Pro/Enterprise

6. **Testes Adicionais**
   - Testar limite de YouTube por plano
   - Testar notificações in-app
   - Testar comparação de versões

### Médio Prazo (1 mês)

7. **Pagamento (Stripe)**
   - Integração com Stripe
   - Checkout para Pro/Enterprise
   - Webhook para atualizar plano

8. **Email Notifications**
   - Resend API para notificações por email
   - Templates de email

9. **Analytics**
   - Rastrear uso de templates
   - Rastrear estilos mais populares
   - Dashboard de analytics

### Longo Prazo (3+ meses)

10. **Colaboração**
    - Compartilhar projetos com outros usuários
    - Comentários em cenas

11. **Integração com Remotion**
    - Exportar para Remotion diretamente
    - Preview de vídeo final

12. **Mobile App**
    - App iOS/Android
    - Upload de vídeos do celular

---

## 🐛 TROUBLESHOOTING

### Problema: Servidor não inicia

```bash
# Erro: "Port 3000 already in use"
# Solução:
lsof -i :3000
kill -9 <PID>
pnpm dev

# Ou usar porta diferente:
PORT=3001 pnpm dev
```

### Problema: Testes falhando

```bash
# Erro: "plan.getCurrent returns undefined"
# Solução:
# 1. Verificar mock em server/new-features.test.ts
# 2. Adicionar youtubeDurationLimitMinutes ao retorno
# 3. Rodar: pnpm test

# Erro: "No procedure found on path"
# Solução:
# 1. Verificar se router foi adicionado ao appRouter
# 2. Verificar ortografia do nome do procedure
# 3. Rodar: pnpm test
```

### Problema: YouTube não extrai áudio

```bash
# Erro: "Failed to extract audio"
# Solução:
# 1. Verificar se @distube/ytdl-core está instalado
pnpm list @distube/ytdl-core

# 2. Verificar se URL é válida
# 3. Verificar limites de duração
# 4. Verificar logs: tail -f .manus-logs/devserver.log
```

### Problema: Notificações não aparecem

```bash
# Erro: "Notifications not showing"
# Solução:
# 1. Verificar se tabela user_notifications existe
mysql -u user -p database -e "SHOW TABLES LIKE 'user_notifications';"

# 2. Verificar se NotificationBell está importado
# 3. Verificar polling a cada 30s
# 4. Verificar console do navegador (F12)
```

### Problema: TypeScript errors

```bash
# Erro: "Cannot find module"
# Solução:
pnpm install
pnpm dev

# Erro: "Type 'X' is not assignable to type 'Y'"
# Solução:
# 1. Verificar tipos em drizzle/schema.ts
# 2. Verificar tipos em server/routers.ts
# 3. Rodar: npx tsc --noEmit
```

---

## 📝 COMANDOS ESSENCIAIS

### Desenvolvimento

```bash
# Iniciar servidor de desenvolvimento
pnpm dev

# Compilar TypeScript
npx tsc --noEmit

# Executar testes
pnpm test

# Executar testes com watch
pnpm test --watch

# Gerar migrações do banco
pnpm drizzle-kit generate

# Visualizar banco de dados
pnpm drizzle-kit studio
```

### Produção

```bash
# Build frontend
pnpm build

# Build backend
pnpm build:server

# Iniciar servidor de produção
pnpm start
```

### Git

```bash
# Clonar repositório
git clone https://github.com/borgesrodri4-bot/agencia-esteira.git

# Adicionar mudanças
git add .

# Commit
git commit -m "Descrição das mudanças"

# Push
git push origin main

# Pull
git pull origin main

# Ver status
git status
```

---

## 📚 DOCUMENTAÇÃO ADICIONAL

### Arquivos Importantes

| Arquivo | Descrição |
|---------|-----------|
| `server/routers.ts` | Todos os routers tRPC (1000+ linhas) |
| `server/pipeline.ts` | Pipeline de processamento |
| `server/db.ts` | Query helpers |
| `server/adaptiveEngine.ts` | Engine adaptativo |
| `client/src/App.tsx` | Roteamento principal |
| `drizzle/schema.ts` | Schema do banco |
| `todo.md` | TODO list do projeto |

### Links Úteis

- [tRPC Documentation](https://trpc.io/)
- [Drizzle ORM](https://orm.drizzle.team/)
- [Tailwind CSS](https://tailwindcss.com/)
- [Shadcn/ui](https://ui.shadcn.com/)
- [Claude API](https://docs.anthropic.com/)
- [Whisper API](https://platform.openai.com/docs/guides/speech-to-text)
- [YouTube DL Core](https://github.com/distubejs/ytdl-core)

---

## 🎓 DICAS IMPORTANTES

### Para Novos Desenvolvedores

1. **Leia o schema primeiro** (`drizzle/schema.ts`)
   - Entenda a estrutura do banco
   - Veja as relações entre tabelas

2. **Entenda o fluxo de dados**
   - Frontend → tRPC → Backend → DB
   - Não pule etapas

3. **Use TypeScript**
   - Todos os tipos devem estar definidos
   - Rode `npx tsc --noEmit` frequentemente

4. **Escreva testes**
   - Cada novo router precisa de testes
   - Rode `pnpm test` antes de fazer push

5. **Mantenha o README atualizado**
   - Atualize quando adicionar features
   - Documente mudanças importantes

### Padrões de Código

```typescript
// ✅ BOM: Usar tipos explícitos
const getUser = async (userId: number): Promise<User> => {
  return await db.query.users.findFirst({ where: eq(users.id, userId) });
};

// ❌ RUIM: Sem tipos
const getUser = async (userId) => {
  return await db.query.users.findFirst({ where: eq(users.id, userId) });
};

// ✅ BOM: Usar protectedProcedure para rotas autenticadas
export const myRouter = router({
  create: protectedProcedure
    .input(z.object({ title: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // ctx.user é garantido aqui
    }),
});

// ❌ RUIM: Verificar autenticação manualmente
export const myRouter = router({
  create: publicProcedure
    .input(z.object({ title: z.string() }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user) throw new Error("Not authenticated");
      // ...
    }),
});
```

---

## 📞 SUPORTE

### Problemas Comuns

- **Servidor não inicia**: Verificar porta 3000, variáveis de ambiente
- **Testes falhando**: Rodar `pnpm install`, depois `pnpm test`
- **YouTube não funciona**: Verificar URL, limites de duração
- **Notificações não aparecem**: Verificar tabela no DB, polling

### Contato

Para dúvidas sobre o projeto, consulte:
- Documentação no README.md
- Código comentado em server/routers.ts
- Testes em server/*.test.ts

---

## 🎉 CONCLUSÃO

A Kolhey é uma plataforma completa e funcional pronta para produção. A maior parte das funcionalidades está implementada e testada.

**Status Final:**
- ✅ 90% das funcionalidades implementadas
- ✅ 94% dos testes passando (36/38)
- ✅ Zero erros TypeScript
- ✅ Pronta para publicação após corrigir 2 testes

**Próxima Ação:**
1. Corrigir testes do plan.getCurrent
2. Salvar checkpoint final
3. Publicar no Manus

Boa sorte! 🐆✨

---

**Última atualização:** 26 de Março de 2026  
**Próxima conta:** agc.kolhey@gmail.com  
**Repositório:** https://github.com/borgesrodri4-bot/agencia-esteira
