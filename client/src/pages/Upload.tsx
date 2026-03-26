import { useState, useRef, useCallback } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";
import { getLoginUrl } from "@/const";
import {
  Upload as UploadIcon, Film, X, ArrowLeft, Loader2,
  CheckCircle2, AlertCircle, Sparkles, Brain, Palette,
  Youtube, Link2, FileVideo, ChevronDown, ChevronUp,
} from "lucide-react";
import { toast } from "sonner";
import { KolheyWordmark } from "@/components/KolheyLogo";

const MAX_SIZE_BYTES = 500 * 1024 * 1024;
const ALLOWED_TYPES = ["video/mp4", "video/quicktime", "video/x-msvideo"];

const VISUAL_STYLES = [
  { id: "auto", label: "Automático", description: "IA decide o melhor estilo", icon: "✨" },
  { id: "flat", label: "Flat Design", description: "Ilustrações planas e modernas", icon: "🎨" },
  { id: "watercolor", label: "Aquarela", description: "Pinceladas suaves e artísticas", icon: "🖌️" },
  { id: "cartoon", label: "Cartoon", description: "Estilo animação e quadrinhos", icon: "💬" },
  { id: "photorealistic", label: "Fotorrealista", description: "Imagens hiper-realistas", icon: "📷" },
  { id: "minimalist", label: "Minimalista", description: "Formas simples e elegantes", icon: "⬜" },
];

function formatBytes(bytes: number) {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

type InputMode = "file" | "youtube";

export default function Upload() {
  const { isAuthenticated, loading } = useAuth();
  const [, navigate] = useLocation();

  // Input mode: file upload or YouTube URL
  const [inputMode, setInputMode] = useState<InputMode>("file");

  // File upload state
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // YouTube state
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [youtubeInfo, setYoutubeInfo] = useState<{
    videoId: string;
    title: string;
    durationSeconds: number;
    thumbnailUrl: string;
  } | null>(null);
  const [youtubeLoading, setYoutubeLoading] = useState(false);

  // Common state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [selectedStyle, setSelectedStyle] = useState("auto");
  const [selectedNiche, setSelectedNiche] = useState<string | null>(null);
  const [showNicheTemplates, setShowNicheTemplates] = useState(false);
  const [uploadState, setUploadState] = useState<"idle" | "uploading" | "creating" | "done" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const { data: adaptiveProfile } = trpc.adaptive.getProfile.useQuery(undefined, {
    enabled: isAuthenticated,
  });
  const { data: nicheTemplates } = trpc.niche.list.useQuery();

  const getUploadUrlMutation = trpc.videos.getUploadUrl.useMutation();
  const createProjectMutation = trpc.videos.create.useMutation();
  const youtubeGetInfoMutation = trpc.youtube.getInfo.useMutation();
  const youtubeCreateProjectMutation = trpc.youtube.createProject.useMutation();

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
    if (err) { toast.error(err); return; }
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

  const handleYoutubeValidate = async () => {
    if (!youtubeUrl.trim()) return;
    setYoutubeLoading(true);
    try {
      const info = await youtubeGetInfoMutation.mutateAsync({ url: youtubeUrl.trim() });
      setYoutubeInfo(info);
      if (!title) setTitle(info.title);
      toast.success("Vídeo encontrado: " + info.title);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "URL inválida";
      toast.error(msg);
      setYoutubeInfo(null);
    } finally {
      setYoutubeLoading(false);
    }
  };

  const handleNicheSelect = (nicheId: string) => {
    if (selectedNiche === nicheId) {
      setSelectedNiche(null);
      return;
    }
    const template = nicheTemplates?.find((t) => t.id === nicheId);
    if (!template) return;
    setSelectedNiche(nicheId);
    // Inject template context into description if empty
    if (!description.trim()) {
      setDescription(template.contextPrompt);
    }
    // Suggest visual style
    if (selectedStyle === "auto" && template.suggestedStyle !== "auto") {
      setSelectedStyle(template.suggestedStyle);
    }
    toast.success(`Template "${template.label}" aplicado`);
  };

  const handleUploadFile = async () => {
    if (!file || !title.trim()) {
      toast.error("Selecione um arquivo e defina um título");
      return;
    }

    try {
      setUploadState("uploading");
      setUploadProgress(0);
      setErrorMsg("");

      const { key, uploadEndpoint } = await getUploadUrlMutation.mutateAsync({
        filename: file.name,
        contentType: file.type || "video/mp4",
        fileSizeBytes: file.size,
      });

      const videoUrl = await new Promise<string>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) setUploadProgress(Math.round((e.loaded / e.total) * 100));
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

      setUploadState("creating");
      const { id } = await createProjectMutation.mutateAsync({
        title: title.trim(),
        description: description.trim() || undefined,
        videoKey: key,
        videoUrl,
        fileSizeBytes: file.size,
        visualStyle: selectedStyle,
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

  const handleYoutubeCreate = async () => {
    if (!youtubeInfo || !title.trim()) {
      toast.error("Valide o URL do YouTube e defina um título");
      return;
    }

    try {
      setUploadState("creating");
      setErrorMsg("");

      const { id } = await youtubeCreateProjectMutation.mutateAsync({
        youtubeUrl: youtubeUrl.trim(),
        title: title.trim(),
        description: description.trim() || undefined,
        visualStyle: selectedStyle,
      });

      setUploadState("done");
      toast.success("Projeto criado! Redirecionando...");
      setTimeout(() => navigate(`/projects/${id}`), 1200);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro desconhecido";
      setErrorMsg(msg);
      setUploadState("error");
      toast.error("Falha ao criar projeto: " + msg);
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
  const hasProfile = adaptiveProfile?.hasProfile === true;
  const confidence = hasProfile ? Math.round((adaptiveProfile?.context?.confidenceScore ?? 0)) : 0;
  const canSubmit = inputMode === "file"
    ? !!file && !!title.trim() && !isProcessing && uploadState !== "done"
    : !!youtubeInfo && !!title.trim() && !isProcessing && uploadState !== "done";

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container flex items-center justify-between h-16">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard")} className="text-muted-foreground">
              <ArrowLeft className="w-4 h-4 mr-2" /> Dashboard
            </Button>
            <div className="flex items-center gap-2">
              <KolheyWordmark size="sm" variant="light" />
              <span className="text-muted-foreground text-sm">/ Novo Projeto</span>
            </div>
          </div>
          {hasProfile && confidence > 0 && (
            <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 gap-1.5">
              <Brain className="w-3 h-3" />
              Perfil ativo · {confidence}% confiança
            </Badge>
          )}
        </div>
      </header>

      <div className="container py-10 max-w-2xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2" style={{ fontFamily: "'Playfair Display', serif" }}>
            Novo Projeto
          </h1>
          <p className="text-muted-foreground">
            Envie um vídeo MP4 ou cole um link do YouTube para iniciar o processamento com IA
          </p>
        </div>

        {/* Adaptive Profile Notice */}
        {hasProfile && confidence >= 30 && (
          <div className="mb-6 p-4 rounded-xl border border-primary/20 bg-primary/5 flex items-start gap-3">
            <Sparkles className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-primary">Perfil adaptativo aplicado</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                A IA usará seu estilo aprendido ({confidence}% de confiança) para personalizar as cenas e ilustrações deste projeto.
              </p>
            </div>
          </div>
        )}

        {/* Input Mode Tabs */}
        <div className="mb-6 flex gap-2 p-1 bg-muted rounded-xl">
          <button
            onClick={() => { setInputMode("file"); setYoutubeInfo(null); }}
            disabled={isProcessing}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-sm font-medium transition-all ${
              inputMode === "file"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <FileVideo className="w-4 h-4" />
            Upload MP4
          </button>
          <button
            onClick={() => { setInputMode("youtube"); setFile(null); }}
            disabled={isProcessing}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-sm font-medium transition-all ${
              inputMode === "youtube"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Youtube className="w-4 h-4" />
            YouTube
          </button>
        </div>

        {/* File Upload Zone */}
        {inputMode === "file" && (
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
        )}

        {/* YouTube URL Input */}
        {inputMode === "youtube" && (
          <div className="mb-6">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  value={youtubeUrl}
                  onChange={(e) => { setYoutubeUrl(e.target.value); setYoutubeInfo(null); }}
                  onKeyDown={(e) => e.key === "Enter" && handleYoutubeValidate()}
                  placeholder="https://www.youtube.com/watch?v=..."
                  disabled={isProcessing}
                  className="pl-9 bg-card border-border"
                />
              </div>
              <Button
                onClick={handleYoutubeValidate}
                disabled={!youtubeUrl.trim() || youtubeLoading || isProcessing}
                variant="outline"
                className="bg-transparent"
              >
                {youtubeLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Validar"}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Suporta links do YouTube públicos. Limite: 15 minutos de duração.
            </p>

            {/* YouTube video preview */}
            {youtubeInfo && (
              <div className="mt-3 p-4 rounded-xl border border-green-400/20 bg-green-400/5 flex items-center gap-3">
                {youtubeInfo.thumbnailUrl && (
                  <img
                    src={youtubeInfo.thumbnailUrl}
                    alt="thumbnail"
                    className="w-16 h-12 rounded-lg object-cover flex-shrink-0"
                  />
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate text-green-400">{youtubeInfo.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Duração: {Math.floor(youtubeInfo.durationSeconds / 60)}m {youtubeInfo.durationSeconds % 60}s
                  </p>
                </div>
                <CheckCircle2 className="w-5 h-5 text-green-400 flex-shrink-0" />
              </div>
            )}
          </div>
        )}

        {/* Title input */}
        <div className="mb-4">
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

        {/* Niche Templates */}
        <div className="mb-4">
          <button
            onClick={() => setShowNicheTemplates(!showNicheTemplates)}
            disabled={isProcessing}
            className="w-full flex items-center justify-between p-3 rounded-xl border border-border bg-card hover:border-primary/40 transition-all text-sm"
          >
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" />
              <span className="font-medium">
                {selectedNiche
                  ? `Nicho: ${nicheTemplates?.find((t) => t.id === selectedNiche)?.label ?? selectedNiche}`
                  : "Templates por nicho"}
              </span>
              {selectedNiche && (
                <Badge variant="outline" className="text-xs bg-primary/10 text-primary border-primary/20">
                  Aplicado
                </Badge>
              )}
            </div>
            {showNicheTemplates ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
          </button>

          {showNicheTemplates && nicheTemplates && (
            <div className="mt-2 grid grid-cols-2 sm:grid-cols-3 gap-2">
              {nicheTemplates.map((template) => (
                <button
                  key={template.id}
                  onClick={() => handleNicheSelect(template.id)}
                  disabled={isProcessing}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    selectedNiche === template.id
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-card hover:border-primary/40 hover:bg-card/80 text-foreground"
                  }`}
                >
                  <div className="text-xl mb-1">{template.icon}</div>
                  <p className="text-xs font-semibold leading-tight">{template.label}</p>
                  <p className="text-xs text-muted-foreground mt-0.5 leading-tight line-clamp-2">{template.description}</p>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Description input */}
        <div className="mb-6">
          <Label htmlFor="description" className="text-sm font-medium mb-2 block">
            Descrição / contexto
            <span className="text-muted-foreground font-normal ml-1">(opcional)</span>
          </Label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Descreva o conteúdo do vídeo, o público-alvo ou qualquer contexto que ajude a IA a gerar melhores cenas e ilustrações..."
            disabled={isProcessing || uploadState === "done"}
            maxLength={1000}
            rows={3}
            className="w-full px-3 py-2 rounded-lg border border-border bg-card text-sm text-foreground placeholder:text-muted-foreground resize-none focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/60 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          />
          <p className="text-xs text-muted-foreground mt-1 text-right">{description.length}/1000</p>
        </div>

        {/* Visual Style Selection */}
        <div className="mb-6">
          <Label className="text-sm font-medium mb-3 flex items-center gap-2">
            <Palette className="w-4 h-4 text-primary" />
            Estilo visual das ilustrações
          </Label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {VISUAL_STYLES.map((style) => (
              <button
                key={style.id}
                onClick={() => setSelectedStyle(style.id)}
                disabled={isProcessing || uploadState === "done"}
                className={`p-3 rounded-xl border text-left transition-all ${
                  selectedStyle === style.id
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-card hover:border-primary/40 hover:bg-card/80 text-foreground"
                }`}
              >
                <div className="text-xl mb-1">{style.icon}</div>
                <p className="text-xs font-semibold">{style.label}</p>
                <p className="text-xs text-muted-foreground mt-0.5 leading-tight">{style.description}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Upload Progress */}
        {(uploadState === "uploading" || uploadState === "creating") && (
          <div className="mb-6 p-4 rounded-xl border border-border bg-card">
            <div className="flex justify-between text-sm mb-2">
              <span className="text-muted-foreground">
                {uploadState === "uploading"
                  ? "Enviando arquivo..."
                  : inputMode === "youtube"
                  ? "Extraindo áudio do YouTube..."
                  : "Criando projeto..."}
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
                {inputMode === "youtube" ? "Extraindo e salvando áudio..." : "Salvando projeto..."}
              </div>
            )}
          </div>
        )}

        {/* Success */}
        {uploadState === "done" && (
          <div className="mb-6 p-4 rounded-xl border border-green-400/20 bg-green-400/5 flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-green-400 flex-shrink-0" />
            <p className="text-green-400 text-sm font-medium">Projeto criado! Redirecionando...</p>
          </div>
        )}

        {/* Error */}
        {uploadState === "error" && (
          <div className="mb-6 p-4 rounded-xl border border-red-400/20 bg-red-400/5 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-red-400 text-sm font-medium">Falha ao criar projeto</p>
              <p className="text-muted-foreground text-xs mt-0.5">{errorMsg}</p>
            </div>
          </div>
        )}

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
            onClick={inputMode === "file" ? handleUploadFile : handleYoutubeCreate}
            disabled={!canSubmit}
            className="flex-1"
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                {uploadState === "uploading"
                  ? `Enviando ${uploadProgress}%...`
                  : inputMode === "youtube"
                  ? "Extraindo áudio..."
                  : "Criando..."}
              </>
            ) : inputMode === "youtube" ? (
              <>
                <Youtube className="w-4 h-4 mr-2" />
                Criar Projeto do YouTube
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
