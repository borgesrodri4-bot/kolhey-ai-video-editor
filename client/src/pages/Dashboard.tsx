import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";
import { getLoginUrl } from "@/const";
import {
  Plus,
  Film,
  Clock,
  CheckCircle2,
  XCircle,
  Loader2,
  Trash2,
  Eye,
  LogOut,
  LayoutDashboard,
} from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

const KOLHEY_LOGO = "https://d2xsxph8kpxj0f.cloudfront.net/310519663468388409/gwVBgn9SLQhabuuxC5oTDT/kolhey-logo_46813286.jpeg";

type VideoProject = {
  id: number;
  title: string;
  status: "pending" | "uploading" | "processing" | "completed" | "failed";
  progress: number;
  currentStep?: string | null;
  errorMessage?: string | null;
  scenesCount: number;
  durationSeconds?: number | null;
  createdAt: Date;
  updatedAt: Date;
};

const statusConfig = {
  pending: { label: "Pendente", icon: Clock, className: "bg-yellow-400/10 text-yellow-400 border-yellow-400/20" },
  uploading: { label: "Enviando", icon: Loader2, className: "bg-blue-400/10 text-blue-400 border-blue-400/20" },
  processing: { label: "Processando", icon: Loader2, className: "bg-blue-400/10 text-blue-400 border-blue-400/20" },
  completed: { label: "Concluído", icon: CheckCircle2, className: "bg-green-400/10 text-green-400 border-green-400/20" },
  failed: { label: "Falhou", icon: XCircle, className: "bg-red-400/10 text-red-400 border-red-400/20" },
};

function ProjectCard({ project, onDelete }: { project: VideoProject; onDelete: () => void }) {
  const [, navigate] = useLocation();
  const cfg = statusConfig[project.status as keyof typeof statusConfig] ?? statusConfig.pending;
  const Icon = cfg.icon;
  const isSpinning = project.status === "processing" || project.status === "uploading";

  return (
    <div className="group p-5 rounded-xl border border-border bg-card hover:border-primary/50 transition-all">
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
          <Film className="w-5 h-5 text-primary" />
        </div>
        <Badge variant="outline" className={`text-xs ${cfg.className}`}>
          <Icon className={`w-3 h-3 mr-1 ${isSpinning ? "animate-spin" : ""}`} />
          {cfg.label}
        </Badge>
      </div>

      <h3 className="font-semibold text-base mb-1 line-clamp-1">{project.title}</h3>
      <p className="text-muted-foreground text-sm mb-3">
        {project.scenesCount > 0 ? `${project.scenesCount} cenas` : "Sem cenas ainda"}
        {project.durationSeconds ? ` · ${Math.round(project.durationSeconds)}s` : ""}
      </p>

      {project.status === "processing" && (
        <div className="mb-3">
          <div className="flex justify-between text-xs text-muted-foreground mb-1">
            <span>{project.currentStep ?? "Processando..."}</span>
            <span>{project.progress}%</span>
          </div>
          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-500"
              style={{ width: `${project.progress}%` }}
            />
          </div>
        </div>
      )}

      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">
          {formatDistanceToNow(new Date(project.createdAt), { addSuffix: true, locale: ptBR })}
        </span>
        <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button
            size="sm"
            variant="ghost"
            className="h-7 px-2 text-muted-foreground hover:text-foreground"
            onClick={() => navigate(`/projects/${project.id}`)}
          >
            <Eye className="w-3.5 h-3.5" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-7 px-2 text-muted-foreground hover:text-destructive"
            onClick={onDelete}
          >
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { user, isAuthenticated, loading, logout } = useAuth();
  const [, navigate] = useLocation();

  const { data: projects, isLoading, refetch } = trpc.videos.list.useQuery(undefined, {
    enabled: isAuthenticated,
    refetchInterval: (query) => {
      const data = query.state.data;
      if (!data) return false;
      const hasProcessing = (data as VideoProject[]).some(
        (p) => p.status === "processing" || p.status === "uploading"
      );
      return hasProcessing ? 3000 : false;
    },
  });

  const deleteMutation = trpc.videos.delete.useMutation({
    onSuccess: () => {
      toast.success("Projeto deletado com sucesso");
      refetch();
    },
    onError: () => toast.error("Erro ao deletar projeto"),
  });

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

  const projectList = (projects as VideoProject[] | undefined) ?? [];

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar Kolhey */}
      <aside className="w-64 border-r border-border bg-sidebar flex flex-col flex-shrink-0">
        {/* Logo */}
        <div className="p-5 border-b border-border">
          <img
            src={KOLHEY_LOGO}
            alt="Kolhey"
            className="h-10 w-auto rounded object-contain"
          />
        </div>

        <nav className="flex-1 p-4 space-y-1">
          <button
            onClick={() => navigate("/dashboard")}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg bg-primary/10 text-primary font-medium text-sm border border-primary/20"
          >
            <LayoutDashboard className="w-4 h-4" />
            Dashboard
          </button>
          <button
            onClick={() => navigate("/upload")}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 font-medium text-sm transition-colors"
          >
            <Plus className="w-4 h-4" />
            Novo Projeto
          </button>
        </nav>

        {/* User info + tagline */}
        <div className="p-4 border-t border-border">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-semibold text-sm">
              {user?.name?.[0]?.toUpperCase() ?? "K"}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{user?.name ?? "Usuário"}</p>
              <p className="text-xs text-muted-foreground truncate">{user?.email ?? ""}</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start text-muted-foreground hover:text-foreground"
            onClick={logout}
          >
            <LogOut className="w-4 h-4 mr-2" />
            Sair
          </Button>
          <p className="text-xs text-muted-foreground/50 mt-3 text-center italic" style={{ fontFamily: "'Dancing Script', cursive", fontSize: "0.85rem" }}>
            Resultados que se cultivam
          </p>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        <div className="p-8">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-2xl font-bold" style={{ fontFamily: "'Playfair Display', serif" }}>
                Meus Projetos
              </h1>
              <p className="text-muted-foreground text-sm mt-1">
                {projectList.length} projeto{projectList.length !== 1 ? "s" : ""}
              </p>
            </div>
            <Button onClick={() => navigate("/upload")} className="bg-primary hover:bg-primary/90">
              <Plus className="w-4 h-4 mr-2" />
              Novo Projeto
            </Button>
          </div>

          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-44 rounded-xl border border-border bg-card animate-pulse" />
              ))}
            </div>
          ) : projectList.length === 0 ? (
            <div className="text-center py-24">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Film className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-lg font-semibold mb-2" style={{ fontFamily: "'Playfair Display', serif" }}>
                Nenhum projeto ainda
              </h3>
              <p className="text-muted-foreground text-sm mb-6">
                Faça upload de um vídeo MP4 para começar
              </p>
              <Button onClick={() => navigate("/upload")} className="bg-primary hover:bg-primary/90">
                <Plus className="w-4 h-4 mr-2" />
                Criar primeiro projeto
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {projectList.map((project) => (
                <ProjectCard
                  key={project.id}
                  project={project}
                  onDelete={() => deleteMutation.mutate({ id: project.id })}
                />
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
