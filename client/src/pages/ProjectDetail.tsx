import { useState, useEffect } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { useLocation, useParams } from "wouter";
import { getLoginUrl } from "@/const";
import {
  ArrowLeft,
  Loader2,
  Play,
  RefreshCw,
  Download,
  Edit3,
  Check,
  X,
  ImageIcon,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ChevronRight,
  Film,
} from "lucide-react";

import { toast } from "sonner";
import { KolheyWordmark } from "@/components/KolheyLogo";

type Scene = {
  id: number;
  sceneOrder: number;
  startTime: number;
  endTime: number;
  transcript: string;
  illustrationPrompt: string | null;
  illustrationUrl: string | null;
  illustrationStatus: "pending" | "generating" | "completed" | "failed";
};

type Project = {
  id: number;
  title: string;
  status: "pending" | "uploading" | "processing" | "completed" | "failed";
  progress: number;
  currentStep: string | null;
  errorMessage: string | null;
  scenesCount: number;
  durationSeconds: number | null;
  originalVideoUrl: string | null;
  scenes: Scene[];
};

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function SceneCard({
  scene,
  projectId,
  onUpdated,
}: {
  scene: Scene;
  projectId: number;
  onUpdated: () => void;
}) {
  const [editingTranscript, setEditingTranscript] = useState(false);
  const [editingPrompt, setEditingPrompt] = useState(false);
  const [transcriptVal, setTranscriptVal] = useState(scene.transcript);
  const [promptVal, setPromptVal] = useState(scene.illustrationPrompt ?? "");

  const updateMutation = trpc.scenes.update.useMutation({
    onSuccess: () => { toast.success("Cena atualizada"); onUpdated(); },
    onError: () => toast.error("Erro ao atualizar cena"),
  });

  const regenMutation = trpc.scenes.regenerateImage.useMutation({
    onSuccess: () => { toast.success("Ilustração regenerada!"); onUpdated(); },
    onError: () => toast.error("Erro ao regenerar ilustração"),
  });

  const isGenerating = scene.illustrationStatus === "generating" || regenMutation.isPending;

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden hover:border-primary/30 transition-colors">
      {/* Scene header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/20">
        <div className="flex items-center gap-3">
          <span className="text-xs font-mono text-muted-foreground bg-muted px-2 py-0.5 rounded">
            #{scene.sceneOrder + 1}
          </span>
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {formatTime(scene.startTime)} → {formatTime(scene.endTime)}
          </span>
          <span className="text-xs text-muted-foreground">
            ({(scene.endTime - scene.startTime).toFixed(1)}s)
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          {scene.illustrationStatus === "completed" && (
            <span className="text-xs text-green-400 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" /> Ilustração pronta
            </span>
          )}
          {scene.illustrationStatus === "failed" && (
            <span className="text-xs text-red-400 flex items-center gap-1">
              <XCircle className="w-3 h-3" /> Falhou
            </span>
          )}
          {isGenerating && (
            <span className="text-xs text-blue-400 flex items-center gap-1">
              <Loader2 className="w-3 h-3 animate-spin" /> Gerando...
            </span>
          )}
        </div>
      </div>

      <div className="p-4 grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Left: transcript + prompt */}
        <div className="space-y-3">
          {/* Transcript */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Transcrição
              </label>
              {!editingTranscript ? (
                <Button variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={() => setEditingTranscript(true)}>
                  <Edit3 className="w-3 h-3 mr-1" /> Editar
                </Button>
              ) : (
                <div className="flex gap-1">
                  <Button variant="ghost" size="sm" className="h-6 px-2 text-xs text-green-400"
                    onClick={() => {
                      updateMutation.mutate({ sceneId: scene.id, projectId, transcript: transcriptVal });
                      setEditingTranscript(false);
                    }}>
                    <Check className="w-3 h-3" />
                  </Button>
                  <Button variant="ghost" size="sm" className="h-6 px-2 text-xs text-red-400"
                    onClick={() => { setTranscriptVal(scene.transcript); setEditingTranscript(false); }}>
                    <X className="w-3 h-3" />
                  </Button>
                </div>
              )}
            </div>
            {editingTranscript ? (
              <Textarea
                value={transcriptVal}
                onChange={(e) => setTranscriptVal(e.target.value)}
                className="text-sm min-h-[80px] bg-muted/30 border-border resize-none"
              />
            ) : (
              <p className="text-sm text-foreground leading-relaxed bg-muted/20 rounded-lg p-3">
                {scene.transcript}
              </p>
            )}
          </div>

          {/* Prompt */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Prompt de Ilustração
              </label>
              {!editingPrompt ? (
                <Button variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={() => setEditingPrompt(true)}>
                  <Edit3 className="w-3 h-3 mr-1" /> Editar
                </Button>
              ) : (
                <div className="flex gap-1">
                  <Button variant="ghost" size="sm" className="h-6 px-2 text-xs text-green-400"
                    onClick={() => {
                      updateMutation.mutate({ sceneId: scene.id, projectId, illustrationPrompt: promptVal });
                      setEditingPrompt(false);
                    }}>
                    <Check className="w-3 h-3" />
                  </Button>
                  <Button variant="ghost" size="sm" className="h-6 px-2 text-xs text-red-400"
                    onClick={() => { setPromptVal(scene.illustrationPrompt ?? ""); setEditingPrompt(false); }}>
                    <X className="w-3 h-3" />
                  </Button>
                </div>
              )}
            </div>
            {editingPrompt ? (
              <Textarea
                value={promptVal}
                onChange={(e) => setPromptVal(e.target.value)}
                className="text-sm min-h-[80px] bg-muted/30 border-border resize-none font-mono"
                placeholder="Descreva a ilustração em inglês..."
              />
            ) : (
              <p className="text-xs text-muted-foreground leading-relaxed bg-muted/20 rounded-lg p-3 font-mono">
                {scene.illustrationPrompt ?? "Sem prompt definido"}
              </p>
            )}
          </div>
        </div>

        {/* Right: illustration */}
        <div className="flex flex-col">
          <div className="flex-1 rounded-lg overflow-hidden bg-muted/20 border border-border min-h-[180px] flex items-center justify-center relative">
            {scene.illustrationUrl ? (
              <img
                src={scene.illustrationUrl}
                alt={`Cena ${scene.sceneOrder + 1}`}
                className="w-full h-full object-cover"
              />
            ) : isGenerating ? (
              <div className="text-center">
                <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-2" />
                <p className="text-xs text-muted-foreground">Gerando ilustração...</p>
              </div>
            ) : (
              <div className="text-center">
                <ImageIcon className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
                <p className="text-xs text-muted-foreground">Sem ilustração</p>
              </div>
            )}
          </div>

          <Button
            variant="outline"
            size="sm"
            className="mt-2 bg-transparent text-xs"
            disabled={isGenerating || !scene.illustrationPrompt}
            onClick={() => regenMutation.mutate({ sceneId: scene.id, projectId })}
          >
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${isGenerating ? "animate-spin" : ""}`} />
            {isGenerating ? "Gerando..." : "Regenerar Ilustração"}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function ProjectDetail() {
  const { isAuthenticated, loading } = useAuth();
  const [, navigate] = useLocation();
  const params = useParams<{ id: string }>();
  const projectId = parseInt(params.id ?? "0");

  const { data, isLoading, refetch } = trpc.videos.getById.useQuery(
    { id: projectId },
    {
      enabled: isAuthenticated && !!projectId,
      refetchInterval: (query) => {
        const d = query.state.data as Project | undefined;
        if (!d) return false;
        return d.status === "processing" || d.status === "uploading" ? 3000 : false;
      },
    }
  );

  const startProcessingMutation = trpc.videos.startProcessing.useMutation({
    onSuccess: () => {
      toast.success("Processamento iniciado!");
      refetch();
    },
    onError: (err) => toast.error("Erro: " + err.message),
  });

  const exportQuery = trpc.scenes.exportJson.useQuery(
    { projectId },
    { enabled: false }
  );

  const handleExport = async () => {
    const result = await exportQuery.refetch();
    if (result.data) {
      const json = JSON.stringify(result.data, null, 2);
      const blob = new Blob([json], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `project-${projectId}-remotion.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("JSON exportado com sucesso!");
    }
  };

  if (loading || isLoading) {
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

  const project = data as Project | undefined;

  if (!project) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Projeto não encontrado</h2>
          <Button onClick={() => navigate("/dashboard")}>Voltar ao Dashboard</Button>
        </div>
      </div>
    );
  }

  const isProcessing = project.status === "processing";
  const isCompleted = project.status === "completed";
  const isFailed = project.status === "failed";
  const isPending = project.status === "pending";

  const statusColors = {
    pending: "bg-yellow-400/10 text-yellow-400 border-yellow-400/20",
    uploading: "bg-blue-400/10 text-blue-400 border-blue-400/20",
    processing: "bg-blue-400/10 text-blue-400 border-blue-400/20",
    completed: "bg-green-400/10 text-green-400 border-green-400/20",
    failed: "bg-red-400/10 text-red-400 border-red-400/20",
  };

  const statusLabels = {
    pending: "Pendente",
    uploading: "Enviando",
    processing: "Processando",
    completed: "Concluído",
    failed: "Falhou",
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container flex items-center justify-between h-16">
          <div className="flex items-center gap-3">
            <KolheyWordmark size="sm" variant="light" />
            <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard")} className="text-muted-foreground">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Dashboard
            </Button>
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
            <span className="font-semibold truncate max-w-xs">{project.title}</span>
          </div>

          <div className="flex items-center gap-3">
            <Badge variant="outline" className={statusColors[project.status]}>
              {isProcessing && <Loader2 className="w-3 h-3 mr-1 animate-spin" />}
              {isCompleted && <CheckCircle2 className="w-3 h-3 mr-1" />}
              {isFailed && <XCircle className="w-3 h-3 mr-1" />}
              {statusLabels[project.status]}
            </Badge>

            {isPending && (
              <Button
                size="sm"
                onClick={() => startProcessingMutation.mutate({ id: projectId })}
                disabled={startProcessingMutation.isPending}
              >
                {startProcessingMutation.isPending ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Play className="w-4 h-4 mr-2" />
                )}
                Iniciar Processamento
              </Button>
            )}

            {isCompleted && project.scenes.length > 0 && (
              <Button size="sm" variant="outline" className="bg-transparent" onClick={handleExport}>
                <Download className="w-4 h-4 mr-2" />
                Exportar JSON
              </Button>
            )}
          </div>
        </div>
      </header>

      <div className="container py-8">
        {/* Processing status */}
        {isProcessing && (
          <div className="mb-8 p-5 rounded-xl border border-blue-400/20 bg-blue-400/5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-blue-400" />
                <span className="font-medium text-blue-400">Processando com IA...</span>
              </div>
              <span className="text-sm font-mono text-blue-400">{project.progress}%</span>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden mb-2">
              <div
                className="h-full bg-blue-400 rounded-full transition-all duration-500"
                style={{ width: `${project.progress}%` }}
              />
            </div>
            <p className="text-sm text-muted-foreground">{project.currentStep ?? "Processando..."}</p>
          </div>
        )}

        {/* Error */}
        {isFailed && (
          <div className="mb-8 p-5 rounded-xl border border-red-400/20 bg-red-400/5 flex items-start gap-3">
            <XCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-red-400 mb-1">Processamento falhou</p>
              <p className="text-sm text-muted-foreground">{project.errorMessage ?? "Erro desconhecido"}</p>
              <Button size="sm" className="mt-3" onClick={() => startProcessingMutation.mutate({ id: projectId })}>
                <RefreshCw className="w-4 h-4 mr-2" />
                Tentar novamente
              </Button>
            </div>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          {[
            { label: "Cenas", value: project.scenesCount || "—" },
            { label: "Duração", value: project.durationSeconds ? `${Math.round(project.durationSeconds)}s` : "—" },
            { label: "Status", value: statusLabels[project.status] },
            { label: "Progresso", value: `${project.progress}%` },
          ].map((stat, i) => (
            <div key={i} className="p-4 rounded-xl border border-border bg-card text-center">
              <p className="text-2xl font-bold mb-1">{stat.value}</p>
              <p className="text-xs text-muted-foreground">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Scenes */}
        {project.scenes.length > 0 ? (
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Film className="w-4 h-4 text-primary" />
              <h2 className="font-semibold text-lg" style={{ fontFamily: "'Playfair Display', serif" }}>
                Timeline de Cenas ({project.scenes.length})
              </h2>
            </div>
            <div className="space-y-4">
              {project.scenes.map((scene) => (
                <SceneCard
                  key={scene.id}
                  scene={scene}
                  projectId={projectId}
                  onUpdated={refetch}
                />
              ))}
            </div>
          </div>
        ) : isPending ? (
          <div className="text-center py-20">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <Play className="w-8 h-8 text-primary" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Pronto para processar</h3>
            <p className="text-muted-foreground text-sm mb-6">
              Clique em "Iniciar Processamento" para que a IA transcreva e gere as cenas
            </p>
            <Button onClick={() => startProcessingMutation.mutate({ id: projectId })}>
              <Play className="w-4 h-4 mr-2" />
              Iniciar Processamento
            </Button>
          </div>
        ) : isProcessing ? (
          <div className="text-center py-20">
            <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto mb-4" />
            <p className="text-muted-foreground">As cenas aparecerão aqui conforme forem geradas...</p>
          </div>
        ) : null}
      </div>
    </div>
  );
}
