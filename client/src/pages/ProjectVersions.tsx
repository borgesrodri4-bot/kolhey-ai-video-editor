import { useState, useMemo } from "react";
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
  Columns2, List, X,
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

type SceneSnapshot = {
  id: number;
  sceneOrder: number;
  transcript: string;
  illustrationPrompt?: string;
  illustrationUrl?: string;
};

type VersionData = {
  id: number;
  versionNumber: number;
  label?: string | null;
  visualStyle?: string | null;
  description?: string | null;
  scenesCount: number;
  isActive: "yes" | "no";
  createdAt: Date | string;
  scenesSnapshot?: unknown;
};

// ─── Compare Mode Component ────────────────────────────────────────────────────
function CompareView({
  versionA,
  versionB,
  onClose,
}: {
  versionA: VersionData;
  versionB: VersionData;
  onClose: () => void;
}) {
  const snapshotA = (versionA.scenesSnapshot as SceneSnapshot[] | null) ?? [];
  const snapshotB = (versionB.scenesSnapshot as SceneSnapshot[] | null) ?? [];
  const maxScenes = Math.max(snapshotA.length, snapshotB.length);

  return (
    <div className="fixed inset-0 z-50 bg-background overflow-auto">
      {/* Compare Header */}
      <div className="sticky top-0 z-10 border-b border-border bg-card/95 backdrop-blur-sm">
        <div className="container flex items-center justify-between h-14">
          <div className="flex items-center gap-3">
            <Columns2 className="w-5 h-5 text-primary" />
            <span className="font-semibold text-sm">Comparação de Versões</span>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="w-4 h-4 mr-1.5" />
            Fechar
          </Button>
        </div>
      </div>

      {/* Version labels */}
      <div className="container py-4">
        <div className="grid grid-cols-2 gap-4 mb-6">
          {[versionA, versionB].map((v, idx) => (
            <div
              key={v.id}
              className={`p-4 rounded-2xl border ${
                idx === 0 ? "border-blue-500/30 bg-blue-500/5" : "border-orange-500/30 bg-orange-500/5"
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white ${
                    idx === 0 ? "bg-blue-500" : "bg-orange-500"
                  }`}
                >
                  {idx === 0 ? "A" : "B"}
                </div>
                <span className="font-semibold text-sm">{v.label ?? `Versão ${v.versionNumber}`}</span>
                {v.isActive === "yes" && (
                  <Badge variant="outline" className="text-xs bg-primary/10 text-primary border-primary/20">
                    Ativa
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Palette className="w-3 h-3" />
                  {STYLE_LABELS[v.visualStyle ?? "auto"] ?? v.visualStyle}
                </span>
                <span className="flex items-center gap-1">
                  <ImageIcon className="w-3 h-3" />
                  {v.scenesCount} cenas
                </span>
                <span className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {formatDate(v.createdAt)}
                </span>
              </div>
              {v.description && (
                <p className="text-xs text-muted-foreground mt-1 line-clamp-1 italic">
                  "{v.description}"
                </p>
              )}
            </div>
          ))}
        </div>

        {/* Scene comparison rows */}
        <div className="space-y-4">
          {maxScenes === 0 ? (
            <div className="text-center py-12 text-muted-foreground text-sm">
              Nenhuma cena disponível para comparar nessas versões.
            </div>
          ) : (
            Array.from({ length: maxScenes }).map((_, idx) => {
              const sceneA = snapshotA[idx];
              const sceneB = snapshotB[idx];
              return (
                <div key={idx} className="grid grid-cols-2 gap-4">
                  {/* Scene A */}
                  <div className={`rounded-xl border overflow-hidden ${sceneA ? "border-blue-500/20 bg-card" : "border-dashed border-border bg-muted/20"}`}>
                    {sceneA ? (
                      <>
                        {sceneA.illustrationUrl ? (
                          <img
                            src={sceneA.illustrationUrl}
                            alt={`Cena ${idx + 1} — A`}
                            className="w-full h-36 object-cover"
                          />
                        ) : (
                          <div className="w-full h-36 flex items-center justify-center bg-muted">
                            <ImageIcon className="w-6 h-6 text-muted-foreground opacity-30" />
                          </div>
                        )}
                        <div className="p-3">
                          <p className="text-xs font-medium text-blue-400 mb-1">Cena {idx + 1}</p>
                          <p className="text-xs text-muted-foreground line-clamp-3 leading-relaxed">
                            {sceneA.transcript || sceneA.illustrationPrompt || "—"}
                          </p>
                        </div>
                      </>
                    ) : (
                      <div className="h-36 flex items-center justify-center">
                        <p className="text-xs text-muted-foreground">Sem cena</p>
                      </div>
                    )}
                  </div>

                  {/* Scene B */}
                  <div className={`rounded-xl border overflow-hidden ${sceneB ? "border-orange-500/20 bg-card" : "border-dashed border-border bg-muted/20"}`}>
                    {sceneB ? (
                      <>
                        {sceneB.illustrationUrl ? (
                          <img
                            src={sceneB.illustrationUrl}
                            alt={`Cena ${idx + 1} — B`}
                            className="w-full h-36 object-cover"
                          />
                        ) : (
                          <div className="w-full h-36 flex items-center justify-center bg-muted">
                            <ImageIcon className="w-6 h-6 text-muted-foreground opacity-30" />
                          </div>
                        )}
                        <div className="p-3">
                          <p className="text-xs font-medium text-orange-400 mb-1">Cena {idx + 1}</p>
                          <p className="text-xs text-muted-foreground line-clamp-3 leading-relaxed">
                            {sceneB.transcript || sceneB.illustrationPrompt || "—"}
                          </p>
                        </div>
                      </>
                    ) : (
                      <div className="h-36 flex items-center justify-center">
                        <p className="text-xs text-muted-foreground">Sem cena</p>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────
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

  // Compare mode state
  const [compareMode, setCompareMode] = useState(false);
  const [compareSelections, setCompareSelections] = useState<number[]>([]);
  const [compareViewOpen, setCompareViewOpen] = useState(false);

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
      toast.success("Reprocessamento iniciado! Você receberá uma notificação ao concluir.");
      setReprocessModalOpen(false);
      setTimeout(() => navigate(`/projects/${projectId}`), 1500);
    },
    onError: (err) => toast.error(err.message),
  });

  // Derived: versions selected for comparison
  const compareVersions = useMemo(() => {
    if (!versions || compareSelections.length < 2) return null;
    const a = versions.find((v) => v.id === compareSelections[0]);
    const b = versions.find((v) => v.id === compareSelections[1]);
    if (!a || !b) return null;
    return { a, b };
  }, [versions, compareSelections]);

  function toggleCompareSelection(versionId: number) {
    setCompareSelections((prev) => {
      if (prev.includes(versionId)) return prev.filter((id) => id !== versionId);
      if (prev.length >= 2) {
        toast.info("Selecione apenas 2 versões para comparar");
        return prev;
      }
      return [...prev, versionId];
    });
  }

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

  // Show compare view if open
  if (compareViewOpen && compareVersions) {
    return (
      <CompareView
        versionA={compareVersions.a as VersionData}
        versionB={compareVersions.b as VersionData}
        onClose={() => setCompareViewOpen(false)}
      />
    );
  }

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
            {/* Compare mode toggle */}
            {versions && versions.length >= 2 && (
              <Button
                variant={compareMode ? "default" : "outline"}
                size="sm"
                className={compareMode ? "" : "bg-transparent"}
                onClick={() => {
                  setCompareMode(!compareMode);
                  setCompareSelections([]);
                }}
              >
                <Columns2 className="w-4 h-4 mr-2" />
                {compareMode ? "Cancelar" : "Comparar"}
              </Button>
            )}
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

        {/* Compare mode banner */}
        {compareMode && (
          <div className="mb-6 p-4 rounded-2xl border border-primary/30 bg-primary/5 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Columns2 className="w-5 h-5 text-primary flex-shrink-0" />
              <div>
                <p className="text-sm font-medium">Modo de comparação</p>
                <p className="text-xs text-muted-foreground">
                  {compareSelections.length === 0
                    ? "Selecione 2 versões para comparar lado a lado"
                    : compareSelections.length === 1
                    ? "Selecione mais 1 versão"
                    : "2 versões selecionadas — pronto para comparar"}
                </p>
              </div>
            </div>
            {compareSelections.length === 2 && (
              <Button
                size="sm"
                onClick={() => setCompareViewOpen(true)}
                className="flex-shrink-0"
              >
                <Columns2 className="w-4 h-4 mr-2" />
                Ver comparação
              </Button>
            )}
          </div>
        )}

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
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground font-medium">
                {versions.length} {versions.length === 1 ? "versão salva" : "versões salvas"}
              </p>
              {compareMode && (
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <List className="w-3 h-3" />
                  Clique nas versões para selecionar
                </p>
              )}
            </div>
            {versions.map((version) => {
              const isExpanded = expandedVersion === version.id;
              const isActive = version.isActive === "yes";
              const isSelectedForCompare = compareSelections.includes(version.id);
              const compareIdx = compareSelections.indexOf(version.id);
              const snapshot = version.scenesSnapshot as SceneSnapshot[] | null;

              return (
                <div
                  key={version.id}
                  className={`rounded-2xl border transition-all ${
                    compareMode && isSelectedForCompare
                      ? compareIdx === 0
                        ? "border-blue-500/50 bg-blue-500/10 ring-2 ring-blue-500/20"
                        : "border-orange-500/50 bg-orange-500/10 ring-2 ring-orange-500/20"
                      : isActive
                      ? "border-primary/30 bg-primary/5"
                      : "border-border bg-card"
                  } ${compareMode ? "cursor-pointer" : ""}`}
                  onClick={() => compareMode && toggleCompareSelection(version.id)}
                >
                  {/* Version header */}
                  <div className="p-4 flex items-start gap-3">
                    {/* Compare selection indicator */}
                    {compareMode ? (
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold ${
                          isSelectedForCompare
                            ? compareIdx === 0
                              ? "bg-blue-500 text-white"
                              : "bg-orange-500 text-white"
                            : "bg-muted text-muted-foreground border-2 border-dashed border-border"
                        }`}
                      >
                        {isSelectedForCompare ? (compareIdx === 0 ? "A" : "B") : "·"}
                      </div>
                    ) : (
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold ${
                        isActive ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                      }`}>
                        v{version.versionNumber}
                      </div>
                    )}

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

                    {!compareMode && (
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {!isActive && (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              className="bg-transparent text-xs h-7 px-2"
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveMutation.mutate({ projectId, versionId: version.id });
                              }}
                              disabled={isProcessing}
                            >
                              <CheckCircle2 className="w-3 h-3 mr-1" />
                              Ativar
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="bg-transparent text-xs h-7 px-2 text-orange-400 border-orange-400/30 hover:bg-orange-400/10"
                              onClick={(e) => {
                                e.stopPropagation();
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
                          onClick={(e) => {
                            e.stopPropagation();
                            setExpandedVersion(isExpanded ? null : version.id);
                          }}
                          className="p-1 rounded-lg hover:bg-muted transition-colors text-muted-foreground"
                        >
                          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Expanded scene preview (only in list mode) */}
                  {!compareMode && isExpanded && snapshot && snapshot.length > 0 && (
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
                A versão atual será salva no histórico. Você receberá uma notificação quando concluir.
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
