import pg from 'pg';

const connectionString = "postgresql://postgres:sbp_e966ec8f937095057c4b6b5c49095d3c857be7c5@fxxijiaisxmfhchgbiul.supabase.co:5432/postgres";

const client = new pg.Client({
  connectionString,
  ssl: { rejectUnauthorized: false }
});

const sql = `
-- 1. Tabela de Usuários
CREATE TABLE IF NOT EXISTS "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255),
	"email" varchar(255) UNIQUE,
	"image" text,
	"role" varchar(50) DEFAULT 'user',
	"plan" varchar(50) DEFAULT 'free',
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"last_login_at" timestamp,
	"external_id" varchar(255)
);

-- 2. Tabela de Projetos de Vídeo
CREATE TABLE IF NOT EXISTS "video_projects" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"title" varchar(255) NOT NULL,
	"description" text,
	"status" varchar(50) DEFAULT 'pending' NOT NULL,
	"original_video_url" text,
	"original_video_key" text,
	"audio_url" text,
	"audio_key" text,
	"file_size_bytes" bigint,
	"duration_seconds" integer,
	"visual_style" varchar(100) DEFAULT 'auto',
	"progress" integer DEFAULT 0,
	"current_step" varchar(255),
	"error_message" text,
	"scenes_count" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

-- 3. Tabela de Cenas de Vídeo
CREATE TABLE IF NOT EXISTS "video_scenes" (
	"id" serial PRIMARY KEY NOT NULL,
	"project_id" integer NOT NULL,
	"scene_order" integer NOT NULL,
	"start_time" double precision,
	"end_time" double precision,
	"transcript" text,
	"illustration_prompt" text,
	"illustration_url" text,
	"illustration_key" text,
	"illustration_status" varchar(50) DEFAULT 'pending',
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

-- 4. Tabela de Convites
CREATE TABLE IF NOT EXISTS "invites" (
	"id" serial PRIMARY KEY NOT NULL,
	"token" varchar(255) UNIQUE NOT NULL,
	"created_by" integer NOT NULL,
	"max_uses" integer DEFAULT 1 NOT NULL,
	"uses_count" integer DEFAULT 0 NOT NULL,
	"expires_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);

-- 5. Tabela de Usuários Autorizados (Whitelist)
CREATE TABLE IF NOT EXISTS "authorized_users" (
	"id" serial PRIMARY KEY NOT NULL,
	"email" varchar(255) UNIQUE NOT NULL,
	"invited_by" integer,
	"invite_id" integer,
	"status" varchar(50) DEFAULT 'active' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"revoked_at" timestamp
);

-- 6. Tabela de Versões de Projeto
CREATE TABLE IF NOT EXISTS "project_versions" (
	"id" serial PRIMARY KEY NOT NULL,
	"project_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"version_number" integer NOT NULL,
	"label" varchar(255),
	"visual_style" varchar(100),
	"description" text,
	"scenes_snapshot" jsonb,
	"scenes_count" integer,
	"is_active" varchar(10) DEFAULT 'no',
	"created_at" timestamp DEFAULT now() NOT NULL
);

-- 7. Tabela de Notificações
CREATE TABLE IF NOT EXISTS "user_notifications" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"title" varchar(255) NOT NULL,
	"content" text NOT NULL,
	"type" varchar(50) DEFAULT 'info',
	"is_read" boolean DEFAULT false,
	"link" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);

-- 8. Tabela de Jobs de Processamento
CREATE TABLE IF NOT EXISTS "processing_jobs" (
	"id" serial PRIMARY KEY NOT NULL,
	"project_id" integer NOT NULL,
	"step" varchar(100) NOT NULL,
	"status" varchar(50) NOT NULL,
	"progress" integer DEFAULT 0,
	"error_message" text,
	"started_at" timestamp,
	"completed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

-- 9. Tabela de Feedback de Estilo
CREATE TABLE IF NOT EXISTS "style_feedback" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"project_id" integer NOT NULL,
	"scene_id" integer,
	"sentiment" varchar(20) NOT NULL,
	"illustration_prompt" text,
	"illustration_url" text,
	"comment" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);

-- 10. Tabela de Eventos de Edição (Adaptive Engine)
CREATE TABLE IF NOT EXISTS "edit_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"project_id" integer NOT NULL,
	"scene_id" integer,
	"event_type" varchar(100) NOT NULL,
	"previous_value" text,
	"new_value" text,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);

-- 11. Tabela de Perfil de Estilo do Usuário
CREATE TABLE IF NOT EXISTS "user_style_profiles" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer UNIQUE NOT NULL,
	"preferred_visual_styles" jsonb,
	"common_prompt_modifiers" jsonb,
	"color_preferences" jsonb,
	"scene_analysis_context" text,
	"image_style_suffix" text,
	"confidence_score" integer DEFAULT 0,
	"is_reliable" boolean DEFAULT false,
	"last_analyzed_at" timestamp,
	"total_edits_analyzed" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
`;

async function run() {
  try {
    console.log("Conectando ao Supabase...");
    await client.connect();
    console.log("Conectado! Criando tabelas...");
    await client.query(sql);
    console.log("Tabelas criadas com sucesso!");
  } catch (err) {
    console.error("Erro ao inicializar banco de dados:", err);
  } finally {
    await client.end();
  }
}

run();
