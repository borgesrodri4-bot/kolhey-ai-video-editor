import { useState } from "react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { KolheyWordmark } from "@/components/KolheyLogo";
import {
  Brain,
  Sparkles,
  TrendingUp,
  Clock,
  Layers,
  RefreshCw,
  ChevronLeft,
  Lightbulb,
  CheckCircle,
  XCircle,
  Edit3,
  RotateCcw,
  Scissors,
  Merge,
  Trash2,
  ThumbsUp,
  ThumbsDown,
  AlertCircle,
  Zap,
} from "lucide-react";

// Kolhey brand colors
const KOLHEY_NAVY = "#0D1B2E";
const KOLHEY_ORANGE = "#E84B1A";

// Map event types to icons and labels
const EVENT_META: Record<string, { icon: React.ReactNode; label: string; color: string }> = {
  prompt_edited: { icon: <Edit3 className="w-3.5 h-3.5" />, label: "Prompt editado", color: "text-blue-400" },
  image_regenerated: { icon: <RotateCcw className="w-3.5 h-3.5" />, label: "Imagem regenerada", color: "text-yellow-400" },
  image_accepted: { icon: <ThumbsUp className="w-3.5 h-3.5" />, label: "Imagem aceita", color: "text-green-400" },
  image_rejected: { icon: <ThumbsDown className="w-3.5 h-3.5" />, label: "Imagem rejeitada", color: "text-red-400" },
  scene_split: { icon: <Scissors className="w-3.5 h-3.5" />, label: "Cena dividida", color: "text-purple-400" },
  scene_merged: { icon: <Merge className="w-3.5 h-3.5" />, label: "Cenas mescladas", color: "text-indigo-400" },
  scene_deleted: { icon: <Trash2 className="w-3.5 h-3.5" />, label: "Cena removida", color: "text-red-400" },
  style_feedback: { icon: <Sparkles className="w-3.5 h-3.5" />, label: "Feedback de estilo", color: "text-orange-400" },
};

function ConfidenceMeter({ score }: { score: number }) {
  const level =
    score >= 70 ? { label: "Alto", color: "text-green-400", bar: "bg-green-500" } :
    score >= 35 ? { label: "Médio", color: "text-yellow-400", bar: "bg-yellow-500" } :
    { label: "Baixo", color: "text-red-400", bar: "bg-red-500" };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="text-white/60">Confiança do perfil</span>
        <span className={`font-semibold ${level.color}`}>{level.label} ({score}%)</span>
      </div>
      <div className="h-2 rounded-full bg-white/10 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-700 ${level.bar}`}
          style={{ width: `${score}%` }}
        />
      </div>
      <p className="text-xs text-white/40">
        {score < 20
          ? "Continue editando projetos para aumentar a confiança."
          : score < 50
          ? "Perfil em desenvolvimento. Mais edições melhoram a precisão."
          : "Perfil confiável. O sistema está bem calibrado ao seu estilo."}
      </p>
    </div>
  );
}

export default function AdaptiveProfile() {
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const { data: profileData, isLoading, refetch } = trpc.adaptive.getProfile.useQuery(undefined, {
    enabled: isAuthenticated,
    refetchInterval: false,
  });

  const { data: historyData } = trpc.adaptive.getEditHistory.useQuery(
    { limit: 30 },
    { enabled: isAuthenticated }
  );

  const refreshMutation = trpc.adaptive.refreshProfile.useMutation({
    onSuccess: () => {
      toast.success("Análise iniciada! O perfil será atualizado em alguns segundos.");
      setIsRefreshing(true);
      setTimeout(() => {
        refetch();
        setIsRefreshing(false);
      }, 4000);
    },
    onError: () => {
      toast.error("Falha ao iniciar análise.");
      setIsRefreshing(false);
    },
  });

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: KOLHEY_NAVY }}>
        <div className="flex flex-col items-center gap-3">
          <Brain className="w-10 h-10 animate-pulse" style={{ color: KOLHEY_ORANGE }} />
          <p className="text-white/60 text-sm">Carregando perfil adaptativo...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: KOLHEY_NAVY }}>
        <div className="text-center space-y-4">
          <Brain className="w-12 h-12 mx-auto" style={{ color: KOLHEY_ORANGE }} />
          <p className="text-white/70">Faça login para ver seu perfil adaptativo.</p>
          <Button asChild style={{ background: KOLHEY_ORANGE }}>
            <a href={getLoginUrl()}>Entrar</a>
          </Button>
        </div>
      </div>
    );
  }

  const profile = profileData?.profile;
  const context = profileData?.context;
  const hasProfile = profileData?.hasProfile;
  const history = historyData ?? [];

  const topThemes = Array.isArray(profile?.topThemes) ? (profile.topThemes as string[]) : [];
  const imageModifiers = Array.isArray(profile?.imageStyleModifiers) ? (profile.imageStyleModifiers as string[]) : [];
  const splitPrefs = profile?.sceneSplitPreferences as Record<string, boolean> | null | undefined;

  return (
    <div className="min-h-screen" style={{ background: KOLHEY_NAVY }}>
      {/* Header */}
      <header className="border-b border-white/10 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          {/* Logo integrada — SVG inline, elemento estrutural do header */}
          <KolheyWordmark size="sm" variant="light" />
          <Separator orientation="vertical" className="h-5 bg-white/20" />
          <Link href="/dashboard">
            <Button variant="ghost" size="sm" className="text-white/60 hover:text-white gap-2">
              <ChevronLeft className="w-4 h-4" />
              Dashboard
            </Button>
          </Link>
          <Separator orientation="vertical" className="h-5 bg-white/20" />
          <div className="flex items-center gap-2">
            <Brain className="w-5 h-5" style={{ color: KOLHEY_ORANGE }} />
            <h1 className="text-white font-semibold text-lg">Perfil Adaptativo</h1>
          </div>
        </div>
        <Button
          size="sm"
          onClick={() => {
            setIsRefreshing(true);
            refreshMutation.mutate();
          }}
          disabled={isRefreshing || refreshMutation.isPending}
          className="gap-2 text-white"
          style={{ background: KOLHEY_ORANGE }}
        >
          <RefreshCw className={`w-4 h-4 ${isRefreshing ? "animate-spin" : ""}`} />
          Atualizar Perfil
        </Button>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8 space-y-6">
        {/* Hero banner */}
        <div
          className="rounded-2xl p-6 border border-white/10 relative overflow-hidden"
          style={{ background: "linear-gradient(135deg, #0D1B2E 0%, #1a2d4a 100%)" }}
        >
          <div className="absolute top-0 right-0 w-64 h-64 rounded-full opacity-5"
            style={{ background: KOLHEY_ORANGE, transform: "translate(30%, -30%)" }} />
          <div className="relative z-10 flex items-start justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Zap className="w-5 h-5" style={{ color: KOLHEY_ORANGE }} />
                <span className="text-sm font-medium" style={{ color: KOLHEY_ORANGE }}>
                  Motor de Aprendizado Adaptativo
                </span>
              </div>
              <h2 className="text-2xl font-bold text-white">
                {hasProfile ? "Seu Estilo Personalizado" : "Construindo Seu Perfil"}
              </h2>
              <p className="text-white/60 text-sm max-w-lg">
                {hasProfile
                  ? profile?.styleSummary ?? "O sistema aprendeu suas preferências de edição."
                  : "Edite prompts, dê feedback nas ilustrações e processe mais projetos para que o sistema aprenda seu estilo único."}
              </p>
            </div>
            <div className="text-right hidden md:block">
              <div className="text-3xl font-bold" style={{ color: KOLHEY_ORANGE }}>
                {profile?.projectsAnalyzed ?? 0}
              </div>
              <div className="text-white/50 text-xs">projetos analisados</div>
            </div>
          </div>
          {hasProfile && context && (
            <div className="mt-4 relative z-10">
              <ConfidenceMeter score={context.confidenceScore} />
            </div>
          )}
        </div>

        {!hasProfile ? (
          /* Empty state */
          <Card className="border-white/10 text-center py-12" style={{ background: "#0f2035" }}>
            <CardContent className="space-y-4">
              <AlertCircle className="w-12 h-12 mx-auto text-white/30" />
              <div>
                <p className="text-white font-medium">Nenhum perfil ainda</p>
                <p className="text-white/50 text-sm mt-1">
                  Processe pelo menos 1 projeto e edite algumas cenas para o sistema começar a aprender.
                </p>
              </div>
              <Link href="/upload">
                <Button style={{ background: KOLHEY_ORANGE }} className="text-white">
                  Processar primeiro vídeo
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Style Summary */}
            <Card className="border-white/10" style={{ background: "#0f2035" }}>
              <CardHeader className="pb-3">
                <CardTitle className="text-white text-base flex items-center gap-2">
                  <Lightbulb className="w-4 h-4" style={{ color: KOLHEY_ORANGE }} />
                  Estilo Visual Preferido
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {profile?.preferredVisualStyle && (
                  <p className="text-white/80 text-sm leading-relaxed">
                    {profile.preferredVisualStyle}
                  </p>
                )}

                {topThemes.length > 0 && (
                  <div>
                    <p className="text-white/40 text-xs mb-2 uppercase tracking-wide">Temas frequentes</p>
                    <div className="flex flex-wrap gap-2">
                      {topThemes.map((theme, i) => (
                        <Badge
                          key={i}
                          variant="outline"
                          className="text-white/70 border-white/20 text-xs"
                        >
                          {theme}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {imageModifiers.length > 0 && (
                  <div>
                    <p className="text-white/40 text-xs mb-2 uppercase tracking-wide">Modificadores de imagem</p>
                    <div className="flex flex-wrap gap-2">
                      {imageModifiers.map((mod, i) => (
                        <Badge
                          key={i}
                          className="text-white text-xs"
                          style={{ background: `${KOLHEY_ORANGE}33`, border: `1px solid ${KOLHEY_ORANGE}66` }}
                        >
                          {mod}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Scene Preferences */}
            <Card className="border-white/10" style={{ background: "#0f2035" }}>
              <CardHeader className="pb-3">
                <CardTitle className="text-white text-base flex items-center gap-2">
                  <Layers className="w-4 h-4" style={{ color: KOLHEY_ORANGE }} />
                  Preferências de Cenas
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  {profile?.avgSceneDurationSeconds && (
                    <div className="rounded-lg p-3 border border-white/10" style={{ background: "#0D1B2E" }}>
                      <div className="flex items-center gap-1.5 mb-1">
                        <Clock className="w-3.5 h-3.5 text-white/40" />
                        <span className="text-white/40 text-xs">Duração média</span>
                      </div>
                      <p className="text-white font-semibold">
                        {Math.round(profile.avgSceneDurationSeconds)}s
                      </p>
                    </div>
                  )}
                  {profile?.avgScenesPerMinute && (
                    <div className="rounded-lg p-3 border border-white/10" style={{ background: "#0D1B2E" }}>
                      <div className="flex items-center gap-1.5 mb-1">
                        <TrendingUp className="w-3.5 h-3.5 text-white/40" />
                        <span className="text-white/40 text-xs">Cenas/minuto</span>
                      </div>
                      <p className="text-white font-semibold">
                        {profile.avgScenesPerMinute.toFixed(1)}
                      </p>
                    </div>
                  )}
                </div>

                {splitPrefs && (
                  <div className="space-y-2">
                    <p className="text-white/40 text-xs uppercase tracking-wide">Comportamento detectado</p>
                    {[
                      { key: "preferShortScenes", label: "Prefere cenas curtas" },
                      { key: "preferDetailedPrompts", label: "Prompts detalhados" },
                      { key: "preferMinimalistStyle", label: "Estilo minimalista" },
                    ].map(({ key, label }) => (
                      <div key={key} className="flex items-center gap-2 text-sm">
                        {splitPrefs[key] ? (
                          <CheckCircle className="w-4 h-4 text-green-400 shrink-0" />
                        ) : (
                          <XCircle className="w-4 h-4 text-white/20 shrink-0" />
                        )}
                        <span className={splitPrefs[key] ? "text-white/80" : "text-white/30"}>
                          {label}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Active Context */}
            {context?.isReliable && (
              <Card className="border-white/10 md:col-span-2" style={{ background: "#0f2035" }}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-white text-base flex items-center gap-2">
                    <Sparkles className="w-4 h-4" style={{ color: KOLHEY_ORANGE }} />
                    Contexto Ativo no Pipeline
                  </CardTitle>
                  <CardDescription className="text-white/40 text-xs">
                    Estas instruções são injetadas automaticamente em cada novo processamento
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {context.sceneAnalysisContext && (
                    <div className="rounded-lg p-3 border border-white/10" style={{ background: "#0D1B2E" }}>
                      <p className="text-white/40 text-xs mb-1 uppercase tracking-wide">Para análise de cenas (Claude)</p>
                      <p className="text-white/80 text-sm font-mono">{context.sceneAnalysisContext}</p>
                    </div>
                  )}
                  {context.imageStyleSuffix && (
                    <div className="rounded-lg p-3 border border-white/10" style={{ background: "#0D1B2E" }}>
                      <p className="text-white/40 text-xs mb-1 uppercase tracking-wide">Sufixo de estilo (DALL-E)</p>
                      <p className="text-sm font-mono" style={{ color: KOLHEY_ORANGE }}>{context.imageStyleSuffix}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Edit History */}
        {history.length > 0 && (
          <Card className="border-white/10" style={{ background: "#0f2035" }}>
            <CardHeader className="pb-3">
              <CardTitle className="text-white text-base flex items-center gap-2">
                <Clock className="w-4 h-4" style={{ color: KOLHEY_ORANGE }} />
                Histórico de Edições
              </CardTitle>
              <CardDescription className="text-white/40 text-xs">
                Cada ação sua treina o sistema para entender melhor seu estilo
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                {history.map((event) => {
                  const meta = EVENT_META[event.eventType] ?? {
                    icon: <Sparkles className="w-3.5 h-3.5" />,
                    label: event.eventType,
                    color: "text-white/60",
                  };
                  return (
                    <div
                      key={event.id}
                      className="flex items-start gap-3 py-2 border-b border-white/5 last:border-0"
                    >
                      <div className={`mt-0.5 shrink-0 ${meta.color}`}>{meta.icon}</div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-white/70 text-xs font-medium">{meta.label}</span>
                          <span className="text-white/30 text-xs shrink-0">
                            {new Date(event.createdAt).toLocaleDateString("pt-BR", {
                              day: "2-digit",
                              month: "short",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </div>
                        {event.eventType === "prompt_edited" && event.newValue && (
                          <p className="text-white/40 text-xs mt-0.5 truncate">
                            → {event.newValue.slice(0, 80)}{event.newValue.length > 80 ? "..." : ""}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
