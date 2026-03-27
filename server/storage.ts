import fs from 'fs/promises';
import path from 'path';
import { createWriteStream } from 'fs';
import { pipeline } from 'stream/promises';

// Pasta base para uploads (será mapeada para um volume na Railway)
const UPLOADS_DIR = path.join(process.cwd(), 'uploads');

/**
 * Garante que a pasta de uploads existe
 */
async function ensureUploadsDir() {
  try {
    await fs.access(UPLOADS_DIR);
  } catch {
    await fs.mkdir(UPLOADS_DIR, { recursive: true });
  }
}

/**
 * Normaliza a chave do arquivo para evitar problemas de caminho
 */
function normalizeKey(relKey: string): string {
  return relKey.replace(/^\/+/, "");
}

/**
 * Salva um arquivo localmente
 */
export async function storagePut(
  relKey: string,
  data: Buffer | Uint8Array | string,
  contentType = "application/octet-stream"
): Promise<{ key: string; url: string }> {
  await ensureUploadsDir();
  
  const key = normalizeKey(relKey);
  const filePath = path.join(UPLOADS_DIR, key);
  const dirPath = path.dirname(filePath);

  // Criar subpastas se necessário (ex: /videos/user1/...)
  await fs.mkdir(dirPath, { recursive: true });

  if (typeof data === 'string') {
    await fs.writeFile(filePath, data, 'utf-8');
  } else {
    await fs.writeFile(filePath, Buffer.from(data));
  }

  // A URL será servida pelo próprio backend em /api/files/:key
  const url = `/api/files/${key}`;
  
  return { key, url };
}

/**
 * Retorna a URL e chave de um arquivo existente
 */
export async function storageGet(relKey: string): Promise<{ key: string; url: string; }> {
  const key = normalizeKey(relKey);
  return {
    key,
    url: `/api/files/${key}`,
  };
}

/**
 * Helper para deletar arquivos locais
 */
export async function storageDelete(relKey: string): Promise<void> {
  const key = normalizeKey(relKey);
  const filePath = path.join(UPLOADS_DIR, key);
  try {
    await fs.unlink(filePath);
  } catch (err) {
    console.error(`Erro ao deletar arquivo local ${key}:`, err);
  }
}
