# 🐆 Kolhey AI Video Editor

**Transforme vídeos em bruto em conteúdo visual profissional com IA**

![Status](https://img.shields.io/badge/status-90%25%20completo-blue)
![Tests](https://img.shields.io/badge/testes-36%2F38%20passando-yellow)
![TypeScript](https://img.shields.io/badge/typescript-0%20erros-green)
![License](https://img.shields.io/badge/license-MIT-green)

---

## 🎯 O QUE É KOLHEY?

Kolhey é uma plataforma de IA que transforma vídeos em bruto em conteúdo visual profissional:

- 📹 **Upload de vídeos** (MP4 ou YouTube)
- 🎤 **Transcrição automática** com timestamps (Whisper)
- 🧠 **Análise inteligente** e divisão em cenas (Claude)
- 🎨 **Geração de imagens** para cada cena
- 📊 **6 estilos visuais** (flat, watercolor, cartoon, photorealistic, minimalist, kolhey)
- 🎯 **7 templates de nicho** (Educacional, Pitch, Motivacional, Tutorial, Storytelling, Demo, Kolhey)
- 💾 **Histórico de versões** com comparação lado a lado
- 🔔 **Notificações in-app** em tempo real
- 👤 **Sistema adaptativo** que aprende suas preferências

---

## ⚡ COMEÇAR AGORA

### 1️⃣ Clone o Repositório
```bash
git clone https://github.com/borgesrodri4-bot/kolhey-ai-video-editor.git
cd kolhey-ai-video-editor
```

### 2️⃣ Instale Dependências
```bash
pnpm install
```

### 3️⃣ Configure Variáveis de Ambiente
```bash
# Criar arquivo .env com as variáveis necessárias
# Ver seção "Variáveis de Ambiente" abaixo
```

### 4️⃣ Inicie o Servidor
```bash
pnpm dev
```

### 5️⃣ Acesse no Navegador
```
http://localhost:5173
```

---

## 📋 CHECKLIST PARA VOCÊ

**Você acabou de clonar este repositório?** Siga este checklist:

### ✅ Setup (15 min)
- [ ] Clonar repositório
- [ ] Instalar dependências (`pnpm install`)
- [ ] Configurar `.env`
- [ ] Verificar banco de dados

### ✅ Entender (45 min)
- [ ] Ler `TRANSFERENCIA_CONHECIMENTO.md`
- [ ] Explorar estrutura de pastas
- [ ] Entender o fluxo de dados

### ✅ Corrigir Testes (30 min)
- [ ] Rodar `pnpm test` (esperado: 36/38 passando)
- [ ] Abrir `server/new-features.test.ts`
- [ ] Corrigir mock de `plan.getCurrent`
- [ ] Rodar `pnpm test` novamente (esperado: 38/38 passando)

### ✅ Finalizar (1h)
- [ ] Adicionar notificação ao reprocessar
- [ ] Adicionar badge de plano no header
- [ ] Adicionar mensagem de upgrade
- [ ] Testar tudo no navegador

### ✅ Publicar (15 min)
- [ ] Fazer commit: `git add . && git commit -m "..."`
- [ ] Fazer push: `git push origin main`
- [ ] Salvar checkpoint no Manus
- [ ] Publicar no Manus

---

## 📚 DOCUMENTAÇÃO

### Para Entender o Projeto
1. **Comece aqui:** [`TRANSFERENCIA_CONHECIMENTO.md`](./TRANSFERENCIA_CONHECIMENTO.md)
   - Visão geral completa
   - Arquitetura
   - Banco de dados
   - Todos os routers
   - Troubleshooting

2. **Depois faça isso:** [`CHECKLIST_PROXIMA_CONTA.md`](./CHECKLIST_PROXIMA_CONTA.md)
   - Passo a passo detalhado
   - Comandos prontos para copiar/colar
   - Verificações finais

3. **Acompanhe o progresso:** [`todo.md`](./todo.md)
   - Status de cada funcionalidade
   - O que falta fazer

---

## 🏗️ ARQUITETURA

```
┌─────────────────────────────────────────────────────────────────┐
│                        FRONTEND (React)                         │
│  Upload → Dashboard → ProjectDetail → ProjectVersions → Admin   │
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

---

## 🚀 STACK TECNOLÓGICO

### Frontend
- React 19 + TypeScript
- Tailwind CSS 4
- Wouter (roteamento)
- tRPC (comunicação)
- Shadcn/ui (componentes)
- @dnd-kit (drag-and-drop)

### Backend
- Express 4 + TypeScript
- tRPC 11
- Drizzle ORM
- MySQL/TiDB
- Whisper API (transcrição)
- Claude LLM (análise)

### DevTools
- Vite (build)
- Vitest (testes)
- Drizzle Kit (migrações)
- pnpm (package manager)

---

## 📁 ESTRUTURA DO PROJETO

```
kolhey-ai-video-editor/
├── client/                          # Frontend React
│   ├── src/
│   │   ├── pages/                   # 7 páginas principais
│   │   ├── components/              # 10+ componentes
│   │   ├── lib/trpc.ts              # Cliente tRPC
│   │   ├── App.tsx                  # Roteamento
│   │   └── index.css                # Estilos globais
│   └── vite.config.ts
│
├── server/                          # Backend Express + tRPC
│   ├── routers.ts                   # 10 routers tRPC
│   ├── db.ts                        # Query helpers
│   ├── pipeline.ts                  # Pipeline de processamento
│   ├── youtubeExtractor.ts          # Extração YouTube
│   ├── adaptiveEngine.ts            # Engine adaptativo
│   └── *.test.ts                    # 38 testes
│
├── drizzle/                         # Banco de dados
│   ├── schema.ts                    # Schema Drizzle
│   └── *.sql                        # Migrações
│
├── TRANSFERENCIA_CONHECIMENTO.md    # 📖 Documentação completa
├── CHECKLIST_PROXIMA_CONTA.md       # ✅ Seu checklist
├── todo.md                          # 📋 Status do projeto
└── README.md                        # Este arquivo
```

---

## 🧪 TESTES

### Rodar Testes
```bash
pnpm test
```

### Status Atual
- ✅ 36 testes passando
- ⚠️ 2 testes falhando (plan.getCurrent)
- ✅ 0 erros TypeScript

### Corrigir Testes
```bash
# 1. Abrir arquivo de testes
nano server/new-features.test.ts

# 2. Encontrar o mock de getUserById
# 3. Adicionar: youtubeDurationLimitMinutes: 15
# 4. Salvar e rodar testes novamente
pnpm test
```

---

## 💾 BANCO DE DADOS

### Tabelas Principais
- `users` - Usuários
- `video_projects` - Projetos de vídeo
- `video_scenes` - Cenas individuais
- `processing_jobs` - Histórico de processamentos
- `user_style_profiles` - Perfil adaptativo
- `project_versions` - Histórico de versões
- `user_notifications` - Notificações
- `edit_events` - Log de edições
- `style_feedback` - Feedback do usuário

### Aplicar Migrações
```bash
# Gerar SQL
pnpm drizzle-kit generate

# Aplicar via MySQL
mysql -u user -p database < drizzle/0007_*.sql
```

---

## 🔌 ROUTERS tRPC

### Disponíveis
- `videos.*` - Gerenciar vídeos
- `scenes.*` - Editar cenas
- `adaptive.*` - Perfil adaptativo
- `admin.*` - Painel admin
- `auth.*` - Autenticação
- `youtube.*` - YouTube (NOVO)
- `niche.*` - Templates (NOVO)
- `versions.*` - Versões (NOVO)
- `plan.*` - Planos (NOVO)
- `notifications.*` - Notificações (NOVO)

### Exemplo de Uso
```typescript
// Frontend
const { data, isLoading } = trpc.videos.list.useQuery();

// Backend
videos.list: protectedProcedure.query(async ({ ctx }) => {
  return await getVideoProjectsByUser(ctx.user.id);
});
```

---

## 🎨 FUNCIONALIDADES

### ✅ Fase 1: Fundação (100%)
- Upload de MP4
- Transcrição com Whisper
- Análise com Claude
- Geração de imagens
- 6 estilos visuais
- Sistema adaptativo
- Painel admin

### ✅ Fase 2: Avançadas (100%)
- **YouTube**: Validação, extração, preview
- **Templates**: 7 templates de nicho
- **Versões**: Histórico, comparação, reprocessamento

### ⚠️ Fase 3: Melhorias v3 (90%)
- **Limite por Plano**: free (15min), pro (30min), enterprise (60min)
- **Comparação**: Lado a lado de versões
- **Notificações**: In-app com sino 🔔
- ⚠️ Falta: Corrigir 2 testes, enviar notificação ao reprocessar

---

## 🔧 VARIÁVEIS DE AMBIENTE

```env
# Database
DATABASE_URL=mysql://user:password@localhost:3306/kolhey

# OAuth (Manus)
JWT_SECRET=seu_jwt_secret
VITE_APP_ID=seu_app_id
OAUTH_SERVER_URL=https://api.manus.im
VITE_OAUTH_PORTAL_URL=https://oauth.manus.im

# Manus APIs
BUILT_IN_FORGE_API_URL=https://api.manus.im/forge
BUILT_IN_FORGE_API_KEY=seu_api_key
VITE_FRONTEND_FORGE_API_KEY=seu_frontend_key
VITE_FRONTEND_FORGE_API_URL=https://api.manus.im/forge

# Owner
OWNER_NAME=Seu Nome
OWNER_OPEN_ID=seu_open_id

# App
VITE_APP_TITLE=Kolhey AI Video Editor
VITE_APP_LOGO=https://cdn.example.com/logo.png
```

---

## 📝 COMANDOS ESSENCIAIS

### Desenvolvimento
```bash
# Iniciar servidor
pnpm dev

# Rodar testes
pnpm test

# Compilar TypeScript
npx tsc --noEmit

# Gerar migrações
pnpm drizzle-kit generate

# Visualizar banco
pnpm drizzle-kit studio
```

### Git
```bash
# Ver status
git status

# Adicionar mudanças
git add .

# Fazer commit
git commit -m "Descrição"

# Fazer push
git push origin main
```

---

## 🐛 TROUBLESHOOTING

### Testes Falhando
```bash
# Problema: 2 testes falhando em plan.getCurrent
# Solução: Corrigir mock em server/new-features.test.ts
# Ver seção "Corrigir Testes" acima
```

### Servidor Não Inicia
```bash
# Problema: Port 3000 already in use
# Solução:
lsof -i :3000
kill -9 <PID>
pnpm dev
```

### YouTube Não Funciona
```bash
# Problema: Failed to extract audio
# Solução:
# 1. Verificar se @distube/ytdl-core está instalado
pnpm list @distube/ytdl-core
# 2. Verificar se URL é válida
# 3. Verificar limites de duração
```

### Notificações Não Aparecem
```bash
# Problema: Notifications not showing
# Solução:
# 1. Verificar se tabela user_notifications existe
mysql -u user -p database -e "SHOW TABLES LIKE 'user_notifications';"
# 2. Verificar se NotificationBell está importado
# 3. Verificar console do navegador (F12)
```

---

## 📞 PRÓXIMOS PASSOS

### Imediato (Hoje)
1. ✅ Corrigir 2 testes falhando
2. ✅ Enviar notificação ao reprocessar
3. ✅ Adicionar badge de plano
4. ✅ Publicar no Manus

### Curto Prazo (1-2 semanas)
5. Adicionar mensagem de upgrade
6. Implementar pagamento (Stripe)
7. Adicionar notificações por email

### Médio Prazo (1 mês)
8. Analytics dashboard
9. Integração com Remotion
10. Colaboração entre usuários

---

## 📊 STATUS DO PROJETO

| Componente | Status | Detalhes |
|-----------|--------|----------|
| Banco de Dados | ✅ 100% | 9 tabelas, todas as migrações |
| Backend | ✅ 95% | 10 routers, 2 em correção |
| Frontend | ✅ 90% | 7 páginas, 10+ componentes |
| Pipeline | ✅ 100% | Transcrição, análise, geração |
| Testes | ⚠️ 94% | 36/38 passando |
| TypeScript | ✅ 100% | 0 erros |

---

## 🎓 COMO CONTRIBUIR

1. Crie uma branch: `git checkout -b feature/sua-feature`
2. Faça suas mudanças
3. Rode testes: `pnpm test`
4. Faça commit: `git commit -m "Descrição"`
5. Faça push: `git push origin feature/sua-feature`
6. Abra um Pull Request

---

## 📄 LICENÇA

MIT

---

## 🤝 SUPORTE

Dúvidas? Consulte:
- [`TRANSFERENCIA_CONHECIMENTO.md`](./TRANSFERENCIA_CONHECIMENTO.md) - Documentação completa
- [`CHECKLIST_PROXIMA_CONTA.md`](./CHECKLIST_PROXIMA_CONTA.md) - Passo a passo
- [`todo.md`](./todo.md) - Status do projeto

---

## 🚀 PRONTO PARA COMEÇAR?

```bash
# 1. Clone
git clone https://github.com/borgesrodri4-bot/kolhey-ai-video-editor.git

# 2. Instale
cd kolhey-ai-video-editor
pnpm install

# 3. Configure
# Editar .env com suas variáveis

# 4. Inicie
pnpm dev

# 5. Leia
cat TRANSFERENCIA_CONHECIMENTO.md

# 6. Siga o checklist
cat CHECKLIST_PROXIMA_CONTA.md
```

---

**Desenvolvido com ❤️ para transformar vídeos em conteúdo profissional**

🐆 **Kolhey AI Video Editor** - Inteligência + Criatividade + Força
