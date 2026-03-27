import { useState, useCallback, useEffect } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { trpc } from "@/lib/trpc";
import { useLocation, useParams } from "wouter";
import { getLoginUrl } from "@/const";
import {
  ArrowLeft, Loader2, Play, RefreshCw, Download, Edit3, Check, X,
  ImageIcon, Clock, CheckCircle2, XCircle, AlertCircle, ChevronRight,
  Film, ThumbsUp, ThumbsDown, GripVertical, Copy, ExternalLink, Code2,
  History, Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { KolheyWordmark } from "@/components/KolheyLogo";
import { RemotionPlayer } from "@/components/RemotionPlayer";
import { Input } from "@/components/ui/input";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

type Scene = {
  id: number;
  sceneOrder: number;
  startTime: number;
  endTime: number;
  transcript: string;
  illustrationPrompt: string | null;
  illustrationUrl: string | null;
  illustrationStatus: "pending" | "generating" | "completed" | "failed";
  legenda_index_inicio?: number;
  componente?: string;
  paleta_cores?: string[];
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
  visualStyle?: string;
  scenes: Scene[];
};

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

// ─── Sortable Scene Card ───────────────────────────────────────────────────────
function SortableSceneCard({
  scene, projectId, onUpdated, index,
}: {
  scene: Scene; projectId: number; onUpdated: () => void; index: number;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: scene.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 10 : "auto",
  };

  return (
    <div ref={setNodeRef} style={style}>
      <SceneCard scene={scene} projectId={projectId} onUpdated={onUpdated} index={index} dragHandleProps={{ ...attributes, ...listeners }} />
    </div>
  );
}

// ─── Scene Card ────────────────────────────────────────────────────────────────
function SceneCard({
  scene, projectId, onUpdated, index, dragHandleProps,
}: {
  scene: Scene; projectId: number; onUpdated: () => void; index: number;
  dragHandleProps?: Record<string, unknown>;
}) {
  const [editingTranscript, setEditingTranscript] = useState(false);
  const [editingPrompt, setEditingPrompt] = useState(false);
  const [transcriptVal, setTranscriptVal] = useState(scene.transcript);
  const [promptVal, setPromptVal] = useState(scene.illustrationPrompt ?? "");
  const [imageModalOpen, setImageModalOpen] = useState(false);

  const updateMutation = trpc.scenes.update.useMutation({
    onSuccess: () => { toast.success("Cena atualizada"); onUpdated(); },
    onError: () => toast.error("Erro ao atualizar cena"),
  });

  const regenMutation = trpc.scenes.regenerateImage.useMutation({
    onSuccess: () => { toast.success("Ilustração regenerada!"); onUpdated(); },
    onError: () => toast.error("Erro ao regenerar ilustração"),
  });

  const feedbackMutation = trpc.scenes.submitFeedback.useMutation({
    onSuccess: (_, vars) => {
      toast.success(vars.sentiment === "positive" ? "👍 Feedback positivo registrado!" : "👎 Feedback negativo registrado!");
    },
    onError: () => toast.error("Erro ao registrar feedback"),
  });

  const isGenerating = scene.illustrationStatus === "generating" || regenMutation.isPending;

  return (
    <>
      <div className="rounded-xl border border-border bg-card overflow-hidden hover:border-primary/30 transition-colors">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/20">
          <div className="flex items-center gap-3">
            <button
              {...dragHandleProps}
              className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground transition-colors touch-none"
              title="Arrastar para reordenar"
            >
              <GripVertical className="w-4 h-4" />
            </button>
            <span className="text-xs font-mono text-muted-foreground bg-muted px-2 py-0.5 rounded">
              #{index + 1}
            </span>
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {formatTime(scene.startTime)} → {formatTime(scene.endTime)}
            </span>
            <span className="text-xs text-muted-foreground">
              ({(scene.endTime - scene.startTime).toFixed(1)}s)
            </span>
          </div>
          <div className="flex items-center gap-2">
            {scene.illustrationStatus === "completed" && (
              <span className="text-xs text-green-400 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> Pronta
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
            {scene.illustrationStatus === "completed" && (
              <div className="flex items-center gap-1 ml-2 border-l border-border pl-2">
                <Button
                  variant="ghost" size="sm"
                  className="h-6 w-6 p-0 text-muted-foreground hover:text-green-400"
                  title="Gostei desta ilustração"
                  onClick={() => feedbackMutation.mutate({ sceneId: scene.id, projectId, sentiment: "positive" })}
                  disabled={feedbackMutation.isPending}
                >
                  <ThumbsUp className="w-3.5 h-3.5" />
                </Button>
                <Button
                  variant="ghost" size="sm"
                  className="h-6 w-6 p-0 text-muted-foreground hover:text-red-400"
                  title="Não gostei desta ilustração"
                  onClick={() => feedbackMutation.mutate({ sceneId: scene.id, projectId, sentiment: "negative" })}
                  disabled={feedbackMutation.isPending}
                >
                  <ThumbsDown className="w-3.5 h-3.5" />
                </Button>
              </div>
            )}
          </div>
        </div>

        <div className="p-4 grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="space-y-3">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Transcrição</label>
                {!editingTranscript ? (
                  <Button variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={() => setEditingTranscript(true)}>
                    <Edit3 className="w-3 h-3 mr-1" /> Editar
                  </Button>
                ) : (
                  <div className="flex gap-1">
                    <Button variant="ghost" size="sm" className="h-6 px-2 text-xs text-green-400"
                      onClick={() => { updateMutation.mutate({ sceneId: scene.id, projectId, transcript: transcriptVal }); setEditingTranscript(false); }}>
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
                <Textarea value={transcriptVal} onChange={(e) => setTranscriptVal(e.target.value)}
                  className="text-sm min-h-[80px] bg-muted/30 border-border resize-none" />
              ) : (
                <p className="text-sm text-foreground leading-relaxed bg-muted/20 rounded-lg p-3">{scene.transcript}</p>
              )}
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Prompt de Ilustração</label>
                {!editingPrompt ? (
                  <Button variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={() => setEditingPrompt(true)}>
                    <Edit3 className="w-3 h-3 mr-1" /> Editar
                  </Button>
                ) : (
                  <div className="flex gap-1">
                    <Button variant="ghost" size="sm" className="h-6 px-2 text-xs text-green-400"
                      onClick={() => { updateMutation.mutate({ sceneId: scene.id, projectId, illustrationPrompt: promptVal, previousPrompt: scene.illustrationPrompt ?? "" }); setEditingPrompt(false); }}>
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
                <Textarea value={promptVal} onChange={(e) => setPromptVal(e.target.value)}
                  className="text-sm min-h-[80px] bg-muted/30 border-border resize-none font-mono"
                  placeholder="Descreva a ilustração em inglês..." />
              ) : (
                <p className="text-xs text-muted-foreground font-mono bg-muted/20 rounded-lg p-3 italic">
                  {scene.illustrationPrompt || "Nenhum prompt gerado"}
                </p>
              )}
            </div>
          </div>

          <div className="flex flex-col">
            <div
              className="flex-1 rounded-lg overflow-hidden bg-muted/20 border border-border min-h-[180px] flex items-center justify-center relative cursor-pointer group"
              onClick={() => scene.illustrationUrl && setImageModalOpen(true)}
            >
              {scene.illustrationUrl ? (
                <>
                  <img src={scene.illustrationUrl} alt={`Cena ${index + 1}`} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <ExternalLink className="w-6 h-6 text-white" />
                  </div>
                </>
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
            <Button variant="outline" size="sm" className="mt-2 bg-transparent text-xs"
              disabled={isGenerating || !scene.illustrationPrompt}
              onClick={() => regenMutation.mutate({ sceneId: scene.id, projectId })}>
              <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${isGenerating ? "animate-spin" : ""}`} />
              {isGenerating ? "Gerando..." : "Regenerar Ilustração"}
            </Button>
          </div>
        </div>
      </div>

      <Dialog open={imageModalOpen} onOpenChange={setImageModalOpen}>
        <DialogContent className="max-w-3xl bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-sm text-muted-foreground">
              Cena #{index + 1} — {formatTime(scene.startTime)} → {formatTime(scene.endTime)}
            </DialogTitle>
          </DialogHeader>
          {scene.illustrationUrl && (
            <img src={scene.illustrationUrl} alt={`Cena ${index + 1}`} className="w-full rounded-lg" />
          )}
          <p className="text-xs text-muted-foreground font-mono bg-muted/20 p-3 rounded-lg">
            {scene.illustrationPrompt}
          </p>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ─── Export Modal ──────────────────────────────────────────────────────────────
function ExportModal({ projectId, open, onClose }: { projectId: number; open: boolean; onClose: () => void }) {
  const { data, isLoading } = trpc.scenes.exportJson.useQuery(
    { projectId },
    { enabled: open }
  );

  const jsonStr = data ? JSON.stringify(data, null, 2) : "";

  const handleDownload = () => {
    const blob = new Blob([jsonStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `kolhey-project-${projectId}-remotion.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("JSON baixado!");
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(jsonStr);
    toast.success("JSON copiado para o clipboard!");
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl bg-card border-border max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2" style={{ fontFamily: "'Playfair Display', serif" }}>
            <Code2 className="w-5 h-5 text-primary" />
            Exportar para Remotion
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : (
          <>
            <div className="bg-muted/30 rounded-lg p-4 overflow-auto flex-1 max-h-64">
              <pre className="text-xs text-muted-foreground font-mono whitespace-pre-wrap">{jsonStr}</pre>
            </div>

            <div className="space-y-3 pt-2">
              <div className="p-3 rounded-lg bg-primary/5 border border-primary/20 text-xs text-muted-foreground">
                <p className="font-medium text-foreground mb-1">Como usar no Remotion:</p>
                <ol className="list-decimal list-inside space-y-1">
                  <li>Baixe o JSON e salve como <code className="bg-muted px-1 rounded">scenes.json</code></li>
                  <li>Importe no seu componente Remotion com <code className="bg-muted px-1 rounded">import scenes from './scenes.json'</code></li>
                  <li>Use <code className="bg-muted px-1 rounded">scenes.scenes</code> para iterar pelas cenas com <code className="bg-muted px-1 rounded">startTime</code>, <code className="bg-muted px-1 rounded">endTime</code> e <code className="bg-muted px-1 rounded">illustrationUrl</code></li>
                  <li>Configure o vídeo com <code className="bg-muted px-1 rounded">fps: {data?.remotionConfig.fps}</code>, <code className="bg-muted px-1 rounded">{data?.remotionConfig.width}x{data?.remotionConfig.height}</code></li>
                </ol>
              </div>

              <div className="flex gap-2">
                <Button onClick={handleCopy} variant="outline" className="flex-1 bg-transparent">
                  <Copy className="w-4 h-4 mr-2" /> Copiar JSON
                </Button>
                <Button onClick={handleDownload} className="flex-1">
                  <Download className="w-4 h-4 mr-2" /> Baixar .json
                </Button>
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────
export default function ProjectDetail() {
  const { isAuthenticated, loading } = useAuth();
  const [, navigate] = useLocation();
  const params = useParams<{ id: string }>();
  const projectId = parseInt(params.id ?? "0");
  const [exportOpen, setExportOpen] = useState(false);
  const [localScenes, setLocalScenes] = useState<Scene[] | null>(null);
  const [refinementPrompt, setRefinementPrompt] = useState("");

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

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

  useEffect(() => {
    if (data && localScenes === null) {
      setLocalScenes((data as Project).scenes);
    }
  }, [data, localScenes]);

  const reorderMutation = trpc.scenes.reorder.useMutation({
    onSuccess: () => toast.success("Ordem das cenas salva!"),
    onError: () => { toast.error("Erro ao salvar ordem"); refetch(); },
  });

  const startProcessingMutation = trpc.videos.startProcessing.useMutation({
    onSuccess: (result) => {
      if (result.adaptiveProfile.isActive) {
        toast.success(`Processamento iniciado! ${result.adaptiveProfile.message}`);
      } else {
        toast.success("Processamento iniciado!");
      }
      refetch();
    },
    onError: (err) => toast.error("Erro: " + err.message),
  });

  const reprocessMutation = trpc.versions.reprocess.useMutation({
    onSuccess: () => { toast.success("Refinamento iniciado!"); refetch(); },
    onError: () => toast.error("Erro ao iniciar refinamento"),
  });

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id || !localScenes) return;

    const oldIndex = localScenes.findIndex((s) => s.id === active.id);
    const newIndex = localScenes.findIndex((s) => s.id === over.id);
    const newScenes = arrayMove(localScenes, oldIndex, newIndex);
    setLocalScenes(newScenes);

    reorderMutation.mutate({
      projectId,
      order: newScenes.map((s, i) => ({ id: s.id, sceneOrder: i })),
    });
  }, [localScenes, projectId, reorderMutation]);

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

  const scenes = localScenes ?? project.scenes;
  const isProcessing = project.status === "processing";
  const isCompleted = project.status === "completed";
  const isFailed = project.status === "failed";
  const isPending = project.status === "pending";

  const statusColors: Record<string, string> = {
    pending: "bg-yellow-400/10 text-yellow-400 border-yellow-400/20",
    uploading: "bg-blue-400/10 text-blue-400 border-blue-400/20",
    processing: "bg-blue-400/10 text-blue-400 border-blue-400/20",
    completed: "bg-green-400/10 text-green-400 border-green-400/20",
    failed: "bg-red-400/10 text-red-400 border-red-400/20",
  };

  const statusLabels: Record<string, string> = {
    pending: "Pendente", uploading: "Enviando",
    processing: "Processando", completed: "Concluído", failed: "Falhou",
  };

  const remotionScenes = scenes.map((s: any) => ({
    index: s.legenda_index_inicio || 0,
    type: s.componente || 'impacto',
    content: s.transcript || '',
    colors: s.paleta_cores || ['#E84B1A', '#0D1B2E'],
  }));

  const remotionCaptions = scenes.map((s: any, i: number) => ({
    index: i,
    text: s.transcript || '',
    startMs: (s.startTime || 0) * 1000,
    endMs: (s.endTime || 0) * 1000,
  }));

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container flex items-center justify-between h-16">
          <div className="flex items-center gap-3">
            <KolheyWordmark size="sm" variant="light" />
            <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard")} className="text-muted-foreground">
              <ArrowLeft className="w-4 h-4 mr-2" /> Dashboard
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
              <Button size="sm" onClick={() => startProcessingMutation.mutate({ id: projectId })} disabled={startProcessingMutation.isPending}>
                {startProcessingMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Play className="w-4 h-4 mr-2" />}
                Processar
              </Button>
            )}

            {isCompleted && (
              <Button size="sm" variant="outline" onClick={() => setExportOpen(true)}>
                <Download className="w-4 h-4 mr-2" /> Exportar
              </Button>
            )}

            <Button variant="ghost" size="sm" onClick={() => navigate(`/projects/${projectId}/versions`)}>
              <History className="w-4 h-4 mr-2" /> Versões
            </Button>
          </div>
        </div>
      </header>

      <main className="container py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-5 space-y-6">
            <div className="sticky top-24 space-y-6">
              <div className="space-y-4">
                <RemotionPlayer 
                  videoUrl={project.originalVideoUrl || ''}
                  scenes={remotionScenes}
                  captions={remotionCaptions}
                  visualStyle={project.visualStyle || 'auto'}
                />
                
                <div className="flex gap-2 p-4 bg-muted/20 rounded-xl border border-border">
                  <Input 
                    placeholder="Ex: Troque a cena 3 por um comparativo..." 
                    className="bg-background border-border"
                    value={refinementPrompt}
                    onChange={(e) => setRefinementPrompt(e.target.value)}
                  />
                  <Button 
                    className="bg-primary hover:bg-primary/90"
                    onClick={() => {
                      if (!refinementPrompt) return;
                      reprocessMutation.mutate({ 
                        projectId, 
                        description: refinementPrompt,
                        label: `Refinamento: ${refinementPrompt.slice(0, 20)}...`
                      });
                      setRefinementPrompt("");
                    }}
                    disabled={reprocessMutation.isPending}
                  >
                    {reprocessMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
                    Refinar
                  </Button>
                </div>
              </div>

              <Card className="bg-card border-border">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-primary" /> Informações do Projeto
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <p className="text-[10px] text-muted-foreground uppercase">Duração</p>
                      <p className="text-sm font-medium">{project.durationSeconds ? formatTime(project.durationSeconds) : "--:--"}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] text-muted-foreground uppercase">Cenas</p>
                      <p className="text-sm font-medium">{project.scenesCount}</p>
                    </div>
                  </div>
                  {isProcessing && (
                    <div className="space-y-2">
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">{project.currentStep || "Processando..."}</span>
                        <span className="font-medium">{project.progress}%</span>
                      </div>
                      <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                        <div className="h-full bg-primary transition-all duration-500" style={{ width: `${project.progress}%` }} />
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>

          <div className="lg:col-span-7 space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold flex items-center gap-2" style={{ fontFamily: "'Playfair Display', serif" }}>
                <Film className="w-5 h-5 text-primary" /> Timeline de Cenas
              </h3>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-[10px] font-normal">
                  {scenes.length} cenas geradas
                </Badge>
              </div>
            </div>

            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={scenes.map((s) => s.id)} strategy={verticalListSortingStrategy}>
                <div className="space-y-4">
                  {scenes.map((scene, index) => (
                    <SortableSceneCard key={scene.id} scene={scene} projectId={projectId} onUpdated={refetch} index={index} />
                  ))}
                </div>
              </SortableContext>
            </DndContext>

            {scenes.length === 0 && !isProcessing && (
              <div className="text-center py-20 bg-muted/10 rounded-2xl border border-dashed border-border">
                <Film className="w-12 h-12 text-muted-foreground/20 mx-auto mb-4" />
                <p className="text-muted-foreground">Nenhuma cena gerada ainda.</p>
                <Button variant="link" onClick={() => startProcessingMutation.mutate({ id: projectId })}>
                  Iniciar processamento agora
                </Button>
              </div>
            )}
          </div>
        </div>
      </main>

      <ExportModal projectId={projectId} open={exportOpen} onClose={() => setExportOpen(false)} />
    </div>
  );
}
