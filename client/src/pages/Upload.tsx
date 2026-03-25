import { useState, useRef, useCallback } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";
import { getLoginUrl } from "@/const";
import {
  Upload as UploadIcon,
  Film,
  X,
  ArrowLeft,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";

const MAX_SIZE_BYTES = 500 * 1024 * 1024; // 500MB
const ALLOWED_TYPES = ["video/mp4", "video/quicktime", "video/x-msvideo"];

function formatBytes(bytes: number) {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

export default function Upload() {
  const { isAuthenticated, loading } = useAuth();
  const [, navigate] = useLocation();

  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadState, setUploadState] = useState<"idle" | "uploading" | "creating" | "done" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const getUploadUrlMutation = trpc.videos.getUploadUrl.useMutation();
  const createProjectMutation = trpc.videos.create.useMutation();

  const validateFile = (f: File): string | null => {
    if (!ALLOWED_TYPES.includes(f.type) && !f.name.endsWith(".mp4")) {
      return "Apenas arquivos MP4 são suportados";
    }
    if (f.size > MAX_SIZE_BYTES) {
      return `Arquivo muito grande. Máximo: 500MB (atual: ${formatBytes(f.size)})`;
    }
    return null;
  };

  const handleFileSelect = (f: File) => {
    const err = validateFile(f);
    if (err) {
      toast.error(err);
      return;
    }
    setFile(f);
    if (!title) setTitle(f.name.replace(/\.[^/.]+$/, ""));
    setUploadState("idle");
    setErrorMsg("");
  };

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped) handleFileSelect(dropped);
  }, [title]);

  const onDragOver = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(true); };
  const onDragLeave = () => setIsDragging(false);

  const handleUpload = async () => {
    if (!file || !title.trim()) {
      toast.error("Selecione um arquivo e defina um título");
      return;
    }

    try {
      setUploadState("uploading");
      setUploadProgress(0);
      setErrorMsg("");

      // 1. Obter URL de upload
      const { key, uploadEndpoint } = await getUploadUrlMutation.mutateAsync({
        filename: file.name,
        contentType: file.type || "video/mp4",
        fileSizeBytes: file.size,
      });

      // 2. Upload do arquivo via XHR para rastrear progresso
      const videoUrl = await new Promise<string>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) {
            setUploadProgress(Math.round((e.loaded / e.total) * 100));
          }
        };
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            const data = JSON.parse(xhr.responseText);
            resolve(data.url);
          } else {
            reject(new Error(`Upload failed: ${xhr.status}`));
          }
        };
        xhr.onerror = () => reject(new Error("Network error during upload"));
        xhr.open("POST", uploadEndpoint);
        xhr.setRequestHeader("Content-Type", file.type || "video/mp4");
        xhr.send(file);
      });

      // 3. Criar projeto no banco
      setUploadState("creating");
      const { id } = await createProjectMutation.mutateAsync({
        title: title.trim(),
        videoKey: key,
        videoUrl,
        fileSizeBytes: file.size,
      });

      setUploadState("done");
      toast.success("Projeto criado! Redirecionando...");
      setTimeout(() => navigate(`/projects/${id}`), 1200);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro desconhecido";
      setErrorMsg(msg);
      setUploadState("error");
      toast.error("Falha no upload: " + msg);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthenticated) {
    window.location.href = getLoginUrl();
    return null;
  }

  const isProcessing = uploadState === "uploading" || uploadState === "creating";

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container flex items-center gap-4 h-16">
          <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard")} className="text-muted-foreground">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Dashboard
          </Button>
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="font-semibold">Novo Projeto</span>
          </div>
        </div>
      </header>

      <div className="container py-12 max-w-2xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Enviar Vídeo</h1>
          <p className="text-muted-foreground">
            Faça upload de um vídeo MP4 para iniciar o processamento com IA
          </p>
        </div>

        {/* Drop Zone */}
        <div
          onDrop={onDrop}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onClick={() => !file && fileInputRef.current?.click()}
          className={`
            relative rounded-2xl border-2 border-dashed transition-all cursor-pointer mb-6
            ${isDragging ? "border-primary bg-primary/5 scale-[1.01]" : "border-border hover:border-primary/50 hover:bg-card/50"}
            ${file ? "cursor-default" : ""}
          `}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="video/mp4,.mp4"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
          />

          {!file ? (
            <div className="p-16 text-center">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <UploadIcon className="w-8 h-8 text-primary" />
              </div>
              <p className="font-semibold text-lg mb-1">
                {isDragging ? "Solte o arquivo aqui" : "Arraste um vídeo MP4"}
              </p>
              <p className="text-muted-foreground text-sm">
                ou clique para selecionar · máximo 500MB
              </p>
            </div>
          ) : (
            <div className="p-6 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Film className="w-6 h-6 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{file.name}</p>
                <p className="text-muted-foreground text-sm">{formatBytes(file.size)}</p>
              </div>
              {!isProcessing && uploadState !== "done" && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="flex-shrink-0"
                  onClick={(e) => { e.stopPropagation(); setFile(null); setTitle(""); setUploadState("idle"); }}
                >
                  <X className="w-4 h-4" />
                </Button>
              )}
            </div>
          )}
        </div>

        {/* Upload Progress */}
        {(uploadState === "uploading" || uploadState === "creating") && (
          <div className="mb-6 p-4 rounded-xl border border-border bg-card">
            <div className="flex justify-between text-sm mb-2">
              <span className="text-muted-foreground">
                {uploadState === "uploading" ? "Enviando arquivo..." : "Criando projeto..."}
              </span>
              {uploadState === "uploading" && <span className="font-medium">{uploadProgress}%</span>}
            </div>
            {uploadState === "uploading" && (
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            )}
            {uploadState === "creating" && (
              <div className="flex items-center gap-2 text-sm text-primary">
                <Loader2 className="w-4 h-4 animate-spin" />
                Salvando projeto...
              </div>
            )}
          </div>
        )}

        {/* Success */}
        {uploadState === "done" && (
          <div className="mb-6 p-4 rounded-xl border border-green-400/20 bg-green-400/5 flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-green-400 flex-shrink-0" />
            <p className="text-green-400 text-sm font-medium">Upload concluído! Redirecionando...</p>
          </div>
        )}

        {/* Error */}
        {uploadState === "error" && (
          <div className="mb-6 p-4 rounded-xl border border-red-400/20 bg-red-400/5 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-red-400 text-sm font-medium">Falha no upload</p>
              <p className="text-muted-foreground text-xs mt-0.5">{errorMsg}</p>
            </div>
          </div>
        )}

        {/* Title input */}
        <div className="mb-6">
          <Label htmlFor="title" className="text-sm font-medium mb-2 block">
            Título do projeto
          </Label>
          <Input
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Ex: Apresentação de produto Q1 2025"
            disabled={isProcessing || uploadState === "done"}
            className="bg-card border-border"
          />
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={() => navigate("/dashboard")}
            disabled={isProcessing}
            className="bg-transparent"
          >
            Cancelar
          </Button>
          <Button
            onClick={handleUpload}
            disabled={!file || !title.trim() || isProcessing || uploadState === "done"}
            className="flex-1"
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                {uploadState === "uploading" ? `Enviando ${uploadProgress}%...` : "Criando..."}
              </>
            ) : (
              <>
                <UploadIcon className="w-4 h-4 mr-2" />
                Enviar e Criar Projeto
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
