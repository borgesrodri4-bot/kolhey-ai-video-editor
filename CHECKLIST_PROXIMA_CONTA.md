# ✅ CHECKLIST PARA agc.kolhey@gmail.com

**Data de Transferência:** 26 de Março de 2026  
**Projeto:** Kolhey AI Video Editor  
**Repositório:** https://github.com/borgesrodri4-bot/kolhey-ai-video-editor  
**Status:** 90% completo, pronto para finalização

---

## 📋 ÍNDICE

1. [Setup Inicial](#setup-inicial)
2. [Entender o Projeto](#entender-o-projeto)
3. [Corrigir Testes](#corrigir-testes)
4. [Finalizar Implementação](#finalizar-implementação)
5. [Publicar](#publicar)

---

## 🚀 SETUP INICIAL

### Passo 1: Clonar Repositório
```bash
# [ ] Executar comando
git clone https://github.com/borgesrodri4-bot/kolhey-ai-video-editor.git
cd kolhey-ai-video-editor

# [ ] Verificar se clonou corretamente
ls -la
# Deve ver: client/, server/, drizzle/, package.json, etc
```

### Passo 2: Instalar Dependências
```bash
# [ ] Instalar com pnpm
pnpm install

# [ ] Verificar se instalou corretamente
pnpm --version
# Deve mostrar versão do pnpm

# [ ] Verificar node_modules
ls -la node_modules | head -20
# Deve ter muitas pastas
```

### Passo 3: Configurar Variáveis de Ambiente
```bash
# [ ] Criar arquivo .env (se não existir)
cp .env.example .env  # Se existir
# OU criar manualmente

# [ ] Adicionar variáveis necessárias
# Ver arquivo TRANSFERENCIA_CONHECIMENTO.md seção "Variáveis de Ambiente"

# [ ] Verificar se as variáveis estão corretas
cat .env | grep DATABASE_URL
```

### Passo 4: Verificar Banco de Dados
```bash
# [ ] Verificar se banco está configurado
# Conectar ao MySQL/TiDB com as credenciais do .env

# [ ] Verificar se as tabelas existem
mysql -u user -p database -e "SHOW TABLES;"
# Deve mostrar 9 tabelas:
# - users
# - video_projects
# - video_scenes
# - processing_jobs
# - user_style_profiles
# - edit_events
# - style_feedback
# - project_versions
# - user_notifications

# [ ] Se faltarem tabelas, aplicar migrações
# Ver seção "Aplicar Migrações" abaixo
```

---

## 📚 ENTENDER O PROJETO

### Passo 5: Ler Documentação Principal
```bash
# [ ] Ler TRANSFERENCIA_CONHECIMENTO.md
cat TRANSFERENCIA_CONHECIMENTO.md

# Tempo estimado: 30-45 minutos
# Importante entender:
#   - Visão Geral
#   - Arquitetura
#   - Estrutura de Pastas
#   - Banco de Dados
#   - Backend (Routers)
#   - Frontend (Páginas)
```

### Passo 6: Explorar Estrutura do Código
```bash
# [ ] Ver estrutura de pastas
tree -L 2 -I 'node_modules'

# [ ] Ler arquivo principal do backend
cat server/routers.ts | head -100

# [ ] Ler arquivo principal do frontend
cat client/src/App.tsx | head -100

# [ ] Ler schema do banco
cat drizzle/schema.ts | head -100
```

### Passo 7: Entender o Fluxo
```bash
# [ ] Desenhar no papel (ou mente) o fluxo:
# 1. Usuário faz upload de vídeo
# 2. Backend cria projeto
# 3. Pipeline começa (transcrição, análise, geração)
# 4. Notificação enviada ao usuário
# 5. Usuário vê projeto no dashboard

# [ ] Perguntas para responder:
# - Onde fica o código do pipeline?
# - Como funciona a autenticação?
# - Onde são armazenadas as imagens?
# - Como o frontend chama o backend?
```

---

## 🧪 CORRIGIR TESTES

### Passo 8: Rodar Testes Atuais
```bash
# [ ] Executar testes
pnpm test

# [ ] Resultado esperado:
# Test Files  1 failed | 3 passed (4)
#      Tests  2 failed | 36 passed (38)

# [ ] Notar quais testes falharam:
# - plan.getCurrent > returns the current user plan and limits
# - plan.getCurrent > free plan has 15 minute YouTube limit
```

### Passo 9: Entender o Erro
```bash
# [ ] Ler a mensagem de erro
# Erro típico:
# Expected: 15
# Received: undefined

# [ ] Significa que o mock retorna undefined para youtubeDurationLimitMinutes

# [ ] Abrir arquivo de testes
cat server/new-features.test.ts | grep -A 20 "plan.getCurrent"
```

### Passo 10: Corrigir o Mock
```bash
# [ ] Abrir arquivo: server/new-features.test.ts
nano server/new-features.test.ts

# [ ] Encontrar a seção de mocks do db.ts
# Procurar por: "getUserById: vi.fn().mockResolvedValue"

# [ ] Adicionar youtubeDurationLimitMinutes ao retorno
# Mudar de:
#   plan: "free",
# Para:
#   plan: "free",
#   youtubeDurationLimitMinutes: 15,

# [ ] Salvar arquivo (Ctrl+X, depois Y, depois Enter no nano)
```

### Passo 11: Rodar Testes Novamente
```bash
# [ ] Executar testes
pnpm test

# [ ] Resultado esperado:
# Test Files  4 passed (4)
#      Tests  38 passed (38)

# [ ] Se ainda falhar, verificar:
# - Sintaxe do mock
# - Nome do campo (youtubeDurationLimitMinutes vs outro)
# - Tipo do valor (number, não string)
```

### Passo 12: Verificar TypeScript
```bash
# [ ] Compilar TypeScript
npx tsc --noEmit

# [ ] Resultado esperado:
# (sem erros)

# [ ] Se houver erros, corrigi-los seguindo as mensagens
```

---

## 🔧 FINALIZAR IMPLEMENTAÇÃO

### Passo 13: Enviar Notificação ao Concluir Reprocessamento
```bash
# [ ] Abrir arquivo: server/pipeline.ts
nano server/pipeline.ts

# [ ] Encontrar a função: runVideoPipeline
# Procurar por: "export async function runVideoPipeline"

# [ ] Encontrar o final da função (onde retorna sucesso)
# Procurar por: "// Sucesso" ou "return" no final

# [ ] Adicionar notificação:
# await sendUserNotification(userId, {
#   type: 'success',
#   title: 'Reprocessamento concluído!',
#   message: `Seu vídeo foi reprocessado com sucesso em ${visualStyle}`,
#   projectId
# });

# [ ] Salvar arquivo
```

### Passo 14: Testar Notificações
```bash
# [ ] Iniciar servidor
pnpm dev

# [ ] Abrir navegador
# http://localhost:5173

# [ ] Fazer login

# [ ] Criar um projeto

# [ ] Ir para versões

# [ ] Clicar "Reprocessar"

# [ ] Escolher novo estilo

# [ ] Clicar "Reprocessar"

# [ ] Aguardar conclusão

# [ ] Verificar se notificação aparece no sino 🔔

# [ ] [ ] Notificação apareceu?
```

### Passo 15: Adicionar Badge de Plano no Header
```bash
# [ ] Abrir arquivo: client/src/pages/Dashboard.tsx
nano client/src/pages/Dashboard.tsx

# [ ] Encontrar o header do dashboard
# Procurar por: "Meus Projetos"

# [ ] Adicionar badge com plano do usuário
# Exemplo:
# <Badge variant="outline">Plano: {user?.plan}</Badge>

# [ ] Estilizar com cores:
# free = cinza
# pro = azul
# enterprise = dourado

# [ ] Salvar arquivo
```

### Passo 16: Adicionar Mensagem de Upgrade
```bash
# [ ] Abrir arquivo: client/src/pages/Upload.tsx
nano client/src/pages/Upload.tsx

# [ ] Encontrar validação de limite de YouTube
# Procurar por: "youtubeDurationLimitMinutes"

# [ ] Adicionar mensagem de upgrade:
# if (videoDuration > limit) {
#   toast.error(`Este vídeo é muito longo. Atualize para Pro para processar`);
# }

# [ ] Salvar arquivo
```

### Passo 17: Testar Tudo Novamente
```bash
# [ ] Rodar testes
pnpm test

# [ ] Resultado esperado:
# Test Files  4 passed (4)
#      Tests  38 passed (38)

# [ ] Compilar TypeScript
npx tsc --noEmit

# [ ] Resultado esperado:
# (sem erros)

# [ ] Iniciar servidor
pnpm dev

# [ ] Testar no navegador:
# [ ] Upload funciona
# [ ] YouTube funciona
# [ ] Templates funcionam
# [ ] Versões funcionam
# [ ] Notificações funcionam
# [ ] Badge de plano aparece
```

---

## 📤 PUBLICAR

### Passo 18: Fazer Commit das Mudanças
```bash
# [ ] Ver status
git status

# [ ] Adicionar mudanças
git add .

# [ ] Fazer commit
git commit -m "Corrigir testes, adicionar notificações e badge de plano"

# [ ] Verificar commit
git log --oneline | head -5
```

### Passo 19: Fazer Push para GitHub
```bash
# [ ] Fazer push
git push origin main

# [ ] Verificar se foi para GitHub
# Abrir: https://github.com/borgesrodri4-bot/kolhey-ai-video-editor

# [ ] Verificar se os commits aparecem
```

### Passo 20: Criar Checkpoint Final (Manus)
```bash
# [ ] Acessar Manus UI
# http://localhost:5173 (ou URL do projeto)

# [ ] Clicar em "Checkpoint" ou "Save"

# [ ] Adicionar descrição:
# "Finalização: Corrigir testes, notificações ao reprocessar, badge de plano"

# [ ] Salvar checkpoint

# [ ] Verificar se salvou corretamente
```

### Passo 21: Publicar no Manus
```bash
# [ ] Acessar Management UI

# [ ] Clicar em "Publish" (botão no header)

# [ ] Confirmar publicação

# [ ] Aguardar deploy

# [ ] Verificar se site está online
# URL: https://[seu-dominio].manus.space

# [ ] Testar funcionalidades principais:
# [ ] Upload funciona
# [ ] Dashboard carrega
# [ ] Projetos aparecem
# [ ] Notificações funcionam
```

---

## 📝 CHECKLIST FINAL

### Verificações Antes de Publicar

- [ ] Todos os 38 testes passando
- [ ] Zero erros TypeScript
- [ ] Notificações funcionando
- [ ] Badge de plano visível
- [ ] Mensagem de upgrade aparece
- [ ] YouTube extrai áudio corretamente
- [ ] Templates funcionam
- [ ] Versões funcionam
- [ ] Comparação lado a lado funciona
- [ ] Adaptive engine funciona
- [ ] Admin panel funciona
- [ ] Responsividade mobile OK
- [ ] Sem console errors
- [ ] Sem console warnings

### Documentação

- [ ] README.md atualizado (se necessário)
- [ ] TRANSFERENCIA_CONHECIMENTO.md lido
- [ ] todo.md atualizado
- [ ] Código comentado onde necessário

### Segurança

- [ ] Variáveis de ambiente não commitadas
- [ ] .env não está no Git
- [ ] Secrets não expostos no código
- [ ] Autenticação funcionando
- [ ] Admin routes protegidas

### Performance

- [ ] Sem memory leaks
- [ ] Sem infinite loops
- [ ] Sem queries N+1
- [ ] Imagens otimizadas
- [ ] Bundle size OK

---

## 🆘 TROUBLESHOOTING

### Se Encontrar Problemas

**Problema: Testes ainda falhando**
```bash
# 1. Verificar se o mock foi atualizado corretamente
cat server/new-features.test.ts | grep -A 5 "getUserById"

# 2. Verificar se há outros mocks que precisam ser atualizados
grep -r "plan:" server/new-features.test.ts

# 3. Rodar testes com mais detalhes
pnpm test -- --reporter=verbose
```

**Problema: TypeScript errors**
```bash
# 1. Limpar cache
rm -rf node_modules/.vite

# 2. Reinstalar dependências
pnpm install

# 3. Compilar novamente
npx tsc --noEmit
```

**Problema: Servidor não inicia**
```bash
# 1. Verificar porta 3000
lsof -i :3000

# 2. Matar processo se necessário
kill -9 <PID>

# 3. Iniciar novamente
pnpm dev
```

**Problema: Banco de dados não conecta**
```bash
# 1. Verificar variáveis de ambiente
cat .env | grep DATABASE_URL

# 2. Testar conexão
mysql -u user -p -h host database

# 3. Verificar se banco existe
mysql -u user -p -e "SHOW DATABASES;"
```

---

## 📞 PRÓXIMOS PASSOS APÓS PUBLICAR

1. **Monitorar logs** em produção
2. **Coletar feedback** dos usuários
3. **Implementar features adicionais** (pagamento, email, etc)
4. **Otimizar performance**
5. **Expandir para mobile app**

---

## 📊 ESTIMATIVA DE TEMPO

| Tarefa | Tempo |
|--------|-------|
| Setup Inicial | 15 min |
| Entender Projeto | 45 min |
| Corrigir Testes | 30 min |
| Finalizar Implementação | 1h |
| Testar Tudo | 30 min |
| Publicar | 15 min |
| **TOTAL** | **~3h 15min** |

---

## ✅ CONCLUSÃO

Após completar este checklist, a Kolhey estará **100% pronta para produção** com:

- ✅ 38/38 testes passando
- ✅ Zero erros TypeScript
- ✅ Todas as funcionalidades implementadas
- ✅ Notificações funcionando
- ✅ Sistema de planos funcionando
- ✅ Pronta para publicação

**Boa sorte! 🐆✨**

---

**Última atualização:** 26 de Março de 2026  
**Conta:** agc.kolhey@gmail.com  
**Repositório:** https://github.com/borgesrodri4-bot/kolhey-ai-video-editor
