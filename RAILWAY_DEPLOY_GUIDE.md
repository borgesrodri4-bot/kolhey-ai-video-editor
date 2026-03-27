# 🚀 Guia de Deploy: Kolhey AI Video Editor na Railway

Este guia detalha como colocar o seu editor de vídeo no ar usando a **Railway**, com suporte a **Armazenamento Local Persistente** (sem precisar de S3/AWS) e renderização de vídeo via **Remotion/FFmpeg**.

---

## 1. Preparando o Repositório

O código já está 100% configurado para a Railway. Os seguintes arquivos foram adicionados:
*   `Dockerfile`: Instala o Node.js, FFmpeg, Chromium (para o Remotion) e faz o build do projeto.
*   `railway.json`: Configura o build via Docker e mapeia o volume persistente para a pasta `/app/uploads`.

**Passo 1:** Faça o push de todas as alterações para o seu repositório no GitHub.
```bash
git add .
git commit -m "feat: migração para armazenamento local e config railway"
git push origin main
```

---

## 2. Criando o Projeto na Railway

1. Acesse [Railway.app](https://railway.app/) e faça login.
2. Clique em **New Project** > **Deploy from GitHub repo**.
3. Selecione o repositório `kolhey-ai-video-editor`.
4. A Railway vai identificar automaticamente o `Dockerfile` e o `railway.json`.

---

## 3. Configurando o Banco de Dados (Supabase)

Como o projeto usa Drizzle ORM, você precisa de um banco PostgreSQL. Recomendamos o **Supabase**.

1. Crie um projeto no [Supabase](https://supabase.com/).
2. Vá em **Project Settings** > **Database** e copie a **Connection String (URI)**.
3. No painel da Railway, vá na aba **Variables** do seu serviço e adicione:
   *   `DATABASE_URL`: `sua_connection_string_do_supabase`

---

## 4. Configurando as Variáveis de Ambiente (Chaves de IA)

Ainda na aba **Variables** da Railway, adicione as chaves necessárias para a Inteligência Artificial e Autenticação:

| Variável | Descrição | Onde conseguir |
| :--- | :--- | :--- |
| `OPENAI_API_KEY` | Usada para transcrição (Whisper) | [OpenAI Platform](https://platform.openai.com/api-keys) |
| `ANTHROPIC_API_KEY` | Usada para Direção de Arte (Claude) | [Anthropic Console](https://console.anthropic.com/) |
| `GOOGLE_CLIENT_ID` | Login via Google | [Google Cloud Console](https://console.cloud.google.com/) |
| `GOOGLE_CLIENT_SECRET` | Login via Google | [Google Cloud Console](https://console.cloud.google.com/) |
| `SESSION_SECRET` | Chave aleatória para cookies | Gere uma string aleatória (ex: `kolhey_secret_2024`) |

---

## 5. Configurando o Volume Persistente (Uploads)

Para que os vídeos e imagens não sejam apagados quando a Railway reiniciar o servidor, configuramos um **Volume**.

1. No painel da Railway, vá na aba **Volumes**.
2. O volume `kolhey-uploads` já deve ter sido criado automaticamente pelo `railway.json`.
3. Certifique-se de que ele está montado no caminho `/app/uploads`.

---

## 6. Rodando as Migrações do Banco de Dados

Antes de usar o sistema, você precisa criar as tabelas no Supabase.

1. No seu terminal local (conectado ao projeto), rode o comando:
```bash
export DATABASE_URL="sua_connection_string_do_supabase"
pnpm db:push
```
Isso vai criar todas as tabelas (incluindo as novas tabelas de Convites e Whitelist).

---

## 7. Acessando o Sistema

1. Na Railway, vá na aba **Settings** > **Networking** e clique em **Generate Domain**.
2. Acesse a URL gerada.
3. Como o sistema agora é privado, você precisará gerar um convite para si mesmo.
   *   *Dica:* Como você é o dono, você pode ir direto no banco de dados (Supabase) e adicionar seu e-mail na tabela `users` com a role `admin`, ou na tabela `authorized_users`.

---

## 🎉 Pronto!
Seu sistema está no ar, processando vídeos localmente e usando IA para direção de arte, sem custos extras com S3!
