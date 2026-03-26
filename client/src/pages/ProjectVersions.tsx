import { useState } from "react";
import { useParams, useLocation } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { getLoginUrl } from "@/const";
import {
  ArrowLeft, Clock, Layers, CheckCircle2, RotateCcw,
  Loader2, Play, Star, Calendar, Image as ImageIcon,
  ChevronDown, ChevronUp, RefreshCw, Palette,
} from "lucide-react";
import { toast } from "sonner";
import { KolheyWordmark } from "@/components/KolheyLogo";

const STYLE_LABELS: Record<string, string> = {
  auto: "Automático",
  flat: "Flat Design",
  watercolor: "Aquarela",
  cartoon: "Cartoon",
  photorealistic: "Fotorrealista",
  minimalist: "Minimalista",
  kolhey: "Kolhey",
};

function formatDate(date: Date | string) {
  return new Date(date).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function ProjectVersions() {
  const { id } = useParams<{ id: string }>();
  const projectId = parseInt(id ?? "0", 10);
  const [, navigate] = useLocation();
  const { isAuthenticated, loading } = useAuth();

  const [expandedVersion, setExpandedVersion] = useState<number | null>(null);
  const [reprocessModalOpen, setReprocessModalOpen] = useState(false);
  const [reprocessStyle, setReprocessStyle] = useState("auto");
  const [reprocessDescription, setReprocessDescription] = useState("");
  const [reprocessLabel, setReprocessLabel] = useState("");

  const utils = trpc.useUtils();

  const { data: project, isLoading: projectLoading } = trpc.videos.getById.useQuery(
    { id: projectId },
    { enabled: isAuthenticated && projectId > 0 }
  );

  const { data: versions, isLoading: versionsLoading } = trpc.versions.list.useQuery(
    { projectId },
    { enabled: isAuthenticated && projectId > 0 }
  );

  const setActiveMutation = trpc.versions.setActive.useMutation({
    onSuccess: () => {
      utils.versions.list.invalidate({ projectId });
      toast.success("Versão ativada com sucesso");
    },
    onError: (err) => toast.error(err.message),
  });

  const restoreMutation = trpc.versions.restore.useMutation({
    onSuccess: (data) => {
      utils.versions.list.invalidate({ projectId });
      utils.videos.getById.invalidate({ id: projectId });
      toast.success(`${data.scenesRestored} cenas restauradas com sucesso`);
      setTimeout(() => navigate(`/projects/${projectId}`), 1500);
    },
    onError: (err) => toast.error(err.message),
  });

  const saveSnapshotMutation = trpc.versions.saveSnapshot.useMutation({
    onSuccess: (data) => {
      utils.versions.list.invalidate({ projectId });
      toast.success(`Versão ${data.versionNumber} salva com sucesso`);
    },
    onError: (err) => toast.error(err.message),
  });

  const reprocessMutation = trpc.versions.reprocess.useMutation({
    onSuccess: () => {
      utils.versions.list.invalidate({ projectId });
      utils.videos.getById.invalidate({ id: projectId });
      toast.success("Reprocessamento iniciado! Redirecionando...");
      setReprocessModalOpen(false);
      setTimeout(() => navigate(`/projects/${projectId}`), 1500);
    },
    onError: (err) => toast.error(err.message),
  });

  if (loading || projectLoading) {
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

  const isProcessing = reprocessMutation.isPending || restoreMutation.isPending || setActiveMutation.isPending;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container flex items-center justify-between h-16">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate(`/projects/${projectId}`)}
              className="text-muted-foreground"
            >
              <ArrowLeft className="w-4 h-4 mr-2" /> Projeto
            </Button>
            <div className="flex items-center gap-2">
              <KolheyWordmark size="sm" variant="light" />
              <span className="text-muted-foreground text-sm">/ Histórico de Versões</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="bg-transparent"
              onClick={() =>
                saveSnapshotMutation.mutate({
                  projectId,
                  label: `Snapshot ${new Date().toLocaleDateString("pt-BR")}`,
                })
              }
              disabled={isProcessing || saveSnapshotMutation.isPending}
            >
              {saveSnapshotMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <Layers className="w-4 h-4 mr-2" />
                  Salvar snapshot
                </>
              )}
            </Button>
            <Button
              size="sm"
              onClick={() => {
                setReprocessStyle(project?.visualStyle ?? "auto");
                setReprocessDescription(project?.description ?? "");
                setReprocessLabel("");
                setReprocessModalOpen(true);
              }}
              disabled={isProcessing || project?.status === "processing"}
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Reprocessar
            </Button>
          </div>
        </div>
      </header>

      <div className="container py-8 max-w-3xl mx-auto">
        {/* Project info */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold mb-1" style={{ fontFamily: "'Playfair Display', serif" }}>
            {project?.title ?? "Projeto"}
          </h1>
          <p className="text-muted-foreground text-sm">
            Histórico de versões — compare e restaure versões anteriores do processamento
          </p>
        </div>

        {/* Current state card */}
        <div className="mb-6 p-5 rounded-2xl border border-primary/20 bg-primary/5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Star className="w-4 h-4 text-primary" />
                <span className="font-semibold text-sm text-primary">Estado atual</span>
                <Badge
                  variant="outline"
                  className={`text-xs ${
                    project?.status === "completed"
                      ? "bg-green-400/10 text-green-400 border-green-400/20"
                      : project?.status === "processing"
                      ? "bg-yellow-400/10 text-yellow-400 border-yellow-400/20"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {project?.status ?? "—"}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                {project?.scenesCount ?? 0} cenas · Estilo: {STYLE_LABELS[project?.visualStyle ?? "auto"] ?? "—"}
              </p>
              {project?.description && (
                <p className="text-xs text-muted-foreground mt-1 line-clamp-2 italic">
                  "{project.description}"
                </p>
              )}
            </div>
            <Button
              size="sm"
              variant="outline"
              className="bg-transparent flex-shrink-0"
              onClick={() => navigate(`/projects/${projectId}`)}
            >
              <Play className="w-3 h-3 mr-1.5" />
              Ver timeline
            </Button>
          </div>
        </div>

        {/* Versions list */}
        {versionsLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : !versions || versions.length === 0 ? (
          <div className="text-center py-16 border border-dashed border-border rounded-2xl">
            <Clock className="w-10 h-10 text-muted-foreground mx-auto mb-3 opacity-40" />
            <p className="font-medium text-muted-foreground">Nenhuma versão salva ainda</p>
            <p className="text-sm text-muted-foreground mt-1">
              Salve um snapshot ou reprocesse o projeto para criar versões
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground font-medium">
              {versions.length} {versions.length === 1 ? "versão salva" : "versões salvas"}
            </p>
            {versions.map((version) => {
              const isExpanded = expandedVersion === version.id;
              const isActive = version.isActive === "yes";
              const snapshot = version.scenesSnapshot as Array<{
                id: number;
                sceneOrder: number;
                transcript: string;
                illustrationPrompt?: string;
                illustrationUrl?: string;
              }> | null;

              return (
                <div
                  key={version.id}
                  className={`rounded-2xl border transition-all ${
                    isActive
                      ? "border-primary/30 bg-primary/5"
                      : "border-border bg-card"
                  }`}
                >
                  {/* Version header */}
                  <div className="p-4 flex items-start gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold ${
                      isActive ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                    }`}>
                      v{version.versionNumber}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-sm">{version.label ?? `Versão ${version.versionNumber}`}</span>
                        {isActive && (
                          <Badge variant="outline" className="text-xs bg-primary/10 text-primary border-primary/20">
                            Ativa
                          </Badge>
                        )}
                        {version.visualStyle && (
                          <Badge variant="outline" className="text-xs text-muted-foreground">
                            <Palette className="w-3 h-3 mr-1" />
                            {STYLE_LABELS[version.visualStyle] ?? version.visualStyle}
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {formatDate(version.createdAt)}
                        </span>
                        <span className="flex items-center gap-1">
                          <ImageIcon className="w-3 h-3" />
                          {version.scenesCount} cenas
                        </span>
                      </div>
                      {version.description && (
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-1 italic">
                          "{version.description}"
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {!isActive && (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            className="bg-transparent text-xs h-7 px-2"
                            onClick={() => setActiveMutation.mutate({ projectId, versionId: version.id })}
                            disabled={isProcessing}
                          >
                            <CheckCircle2 className="w-3 h-3 mr-1" />
                            Ativar
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="bg-transparent text-xs h-7 px-2 text-orange-400 border-orange-400/30 hover:bg-orange-400/10"
                            onClick={() => {
                              if (confirm(`Restaurar as ${version.scenesCount} cenas da ${version.label ?? `Versão ${version.versionNumber}`}? As cenas atuais serão substituídas.`)) {
                                restoreMutation.mutate({ projectId, versionId: version.id });
                              }
                            }}
                            disabled={isProcessing}
                          >
                            <RotateCcw className="w-3 h-3 mr-1" />
                            Restaurar
                          </Button>
                        </>
                      )}
                      <button
                        onClick={() => setExpandedVersion(isExpanded ? null : version.id)}
                        className="p-1 rounded-lg hover:bg-muted transition-colors text-muted-foreground"
                      >
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Expanded scene preview */}
                  {isExpanded && snapshot && snapshot.length > 0 && (
                    <div className="px-4 pb-4 border-t border-border/50 pt-3">
                      <p className="text-xs font-medium text-muted-foreground mb-3">
                        Prévia das cenas ({snapshot.length})
                      </p>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {snapshot.slice(0, 6).map((scene, idx) => (
                          <div key={scene.id ?? idx} className="rounded-xl overflow-hidden border border-border bg-muted/30">
                            {scene.illustrationUrl ? (
                              <img
                                src={scene.illustrationUrl}
                                alt={`Cena ${idx + 1}`}
                                className="w-full h-20 object-cover"
                              />
                            ) : (
                              <div className="w-full h-20 flex items-center justify-center bg-muted">
                                <ImageIcon className="w-5 h-5 text-muted-foreground opacity-40" />
                              </div>
                            )}
                            <div className="p-2">
                              <p className="text-xs text-muted-foreground line-clamp-2 leading-tight">
                                {scene.transcript ?? scene.illustrationPrompt ?? `Cena ${idx + 1}`}
                              </p>
                            </div>
                          </div>
                        ))}
                        {snapshot.length > 6 && (
                          <div className="rounded-xl border border-border bg-muted/30 flex items-center justify-center h-full min-h-[100px]">
                            <p className="text-xs text-muted-foreground">+{snapshot.length - 6} cenas</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Reprocess Modal */}
      {reprocessModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-card border border-border rounded-2xl w-full max-w-md shadow-2xl">
            <div className="p-6">
              <h2 className="text-xl font-bold mb-1" style={{ fontFamily: "'Playfair Display', serif" }}>
                Reprocessar Projeto
              </h2>
              <p className="text-sm text-muted-foreground mb-6">
                A versão atual será salva no histórico antes do reprocessamento.
              </p>

              {/* Style selector */}
              <div className="mb-4">
                <label className="text-sm font-medium mb-2 block">Estilo visual</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: "auto", label: "Auto", icon: "✨" },
                    { id: "flat", label: "Flat", icon: "🎨" },
                    { id: "watercolor", label: "Aquarela", icon: "🖌️" },
                    { id: "cartoon", label: "Cartoon", icon: "💬" },
                    { id: "photorealistic", label: "Foto", icon: "📷" },
                    { id: "minimalist", label: "Minimal", icon: "⬜" },
                  ].map((s) => (
                    <button
                      key={s.id}
                      onClick={() => setReprocessStyle(s.id)}
                      className={`p-2 rounded-xl border text-xs font-medium transition-all ${
                        reprocessStyle === s.id
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border bg-muted/30 hover:border-primary/40 text-foreground"
                      }`}
                    >
                      <span className="block text-base mb-0.5">{s.icon}</span>
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Description */}
              <div className="mb-4">
                <label className="text-sm font-medium mb-2 block">
                  Novo contexto
                  <span className="text-muted-foreground font-normal ml-1">(opcional)</span>
                </label>
                <textarea
                  value={reprocessDescription}
                  onChange={(e) => setReprocessDescription(e.target.value)}
                  placeholder="Altere o contexto para obter cenas diferentes..."
                  maxLength={1000}
                  rows={3}
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground resize-none focus:outline-none focus:ring-2 focus:ring-primary/40 transition-colors"
                />
              </div>

              {/* Label */}
              <div className="mb-6">
                <label className="text-sm font-medium mb-2 block">
                  Nome da versão atual
                  <span className="text-muted-foreground font-normal ml-1">(opcional)</span>
                </label>
                <input
                  value={reprocessLabel}
                  onChange={(e) => setReprocessLabel(e.target.value)}
                  placeholder={`Versão ${(versions?.length ?? 0) + 1} - ${STYLE_LABELS[project?.visualStyle ?? "auto"]}`}
                  maxLength={255}
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 transition-colors"
                />
              </div>

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1 bg-transparent"
                  onClick={() => setReprocessModalOpen(false)}
                  disabled={reprocessMutation.isPending}
                >
                  Cancelar
                </Button>
                <Button
                  className="flex-1"
                  onClick={() =>
                    reprocessMutation.mutate({
                      projectId,
                      visualStyle: reprocessStyle,
                      description: reprocessDescription || undefined,
                      label: reprocessLabel || undefined,
                    })
                  }
                  disabled={reprocessMutation.isPending}
                >
                  {reprocessMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Iniciando...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Reprocessar
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
