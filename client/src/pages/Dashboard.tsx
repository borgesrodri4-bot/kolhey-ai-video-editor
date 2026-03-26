import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { OnboardingModal, useOnboarding } from "@/components/OnboardingModal";
import { KolheyWordmark } from "@/components/KolheyLogo";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";
import { getLoginUrl } from "@/const";
import {
  Plus, Film, Clock, CheckCircle2, XCircle, Loader2, Trash2, Eye,
  LogOut, LayoutDashboard, Brain, ShieldCheck, HelpCircle, Menu, X, Search, Filter,
} from "lucide-react";
import { NotificationBell } from "@/components/NotificationBell";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

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

// ─── Skeleton Card ─────────────────────────────────────────────────────────────
function SkeletonCard() {
  return (
    <div className="p-5 rounded-xl border border-border bg-card animate-pulse">
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="w-10 h-10 rounded-lg bg-muted" />
        <div className="w-20 h-5 rounded-full bg-muted" />
      </div>
      <div className="w-3/4 h-4 rounded bg-muted mb-2" />
      <div className="w-1/2 h-3 rounded bg-muted mb-4" />
      <div className="flex items-center justify-between">
        <div className="w-24 h-3 rounded bg-muted" />
        <div className="w-16 h-6 rounded bg-muted" />
      </div>
    </div>
  );
}

// ─── Project Card ──────────────────────────────────────────────────────────────
function ProjectCard({ project, onDelete }: { project: VideoProject; onDelete: () => void }) {
  const [, navigate] = useLocation();
  const cfg = statusConfig[project.status as keyof typeof statusConfig] ?? statusConfig.pending;
  const Icon = cfg.icon;
  const isSpinning = project.status === "processing" || project.status === "uploading";

  return (
    <div
      className="group p-5 rounded-xl border border-border bg-card hover:border-primary/50 transition-all cursor-pointer"
      onClick={() => navigate(`/projects/${project.id}`)}
    >
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
        <div
          className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={(e) => e.stopPropagation()}
        >
          <Button
            size="sm" variant="ghost"
            className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
            onClick={() => navigate(`/projects/${project.id}`)}
            title="Ver projeto"
          >
            <Eye className="w-3.5 h-3.5" />
          </Button>
          <Button
            size="sm" variant="ghost"
            className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
            onClick={onDelete}
            title="Deletar projeto"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Sidebar Content ───────────────────────────────────────────────────────────
function SidebarContent({
  user, navigate, logout, onClose,
}: {
  user: { name?: string | null; email?: string | null; role?: string } | null;
  navigate: (to: string) => void;
  logout: () => void;
  onClose?: () => void;
}) {
  const handleNav = (path: string) => {
    navigate(path);
    onClose?.();
  };

  return (
    <>
      <div className="px-5 py-4 border-b border-border flex items-center justify-between">
        <KolheyWordmark size="sm" variant="light" />
        {onClose && (
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground lg:hidden">
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      <nav className="flex-1 p-4 space-y-1">
        <button
          onClick={() => handleNav("/dashboard")}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg bg-primary/10 text-primary font-medium text-sm border border-primary/20"
        >
          <LayoutDashboard className="w-4 h-4" />
          Dashboard
        </button>
        <button
          onClick={() => handleNav("/upload")}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 font-medium text-sm transition-colors"
        >
          <Plus className="w-4 h-4" />
          Novo Projeto
        </button>
        <button
          onClick={() => handleNav("/adaptive-profile")}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 font-medium text-sm transition-colors"
        >
          <Brain className="w-4 h-4" />
          Perfil Adaptativo
        </button>
        {user?.role === "admin" && (
          <button
            onClick={() => handleNav("/admin")}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 font-medium text-sm transition-colors"
          >
            <ShieldCheck className="w-4 h-4" />
            Painel Admin
          </button>
        )}
        <button
          onClick={() => { localStorage.removeItem("kolhey_onboarding_done"); window.location.reload(); }}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 font-medium text-sm transition-colors"
        >
          <HelpCircle className="w-4 h-4" />
          Como funciona
        </button>
      </nav>

      <div className="p-4 border-t border-border">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-semibold text-sm flex-shrink-0">
            {user?.name?.[0]?.toUpperCase() ?? "K"}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{user?.name ?? "Usuário"}</p>
            <p className="text-xs text-muted-foreground truncate">{user?.email ?? ""}</p>
          </div>
        </div>
        <Button
          variant="ghost" size="sm"
          className="w-full justify-start text-muted-foreground hover:text-foreground"
          onClick={logout}
        >
          <LogOut className="w-4 h-4 mr-2" />
          Sair
        </Button>
        <p
          className="text-xs text-muted-foreground/50 mt-3 text-center italic"
          style={{ fontFamily: "'Dancing Script', cursive", fontSize: "0.85rem" }}
        >
          Resultados que se cultivam
        </p>
      </div>
    </>
  );
}

// ─── Main Dashboard ────────────────────────────────────────────────────────────
export default function Dashboard() {
  const { user, isAuthenticated, loading, logout } = useAuth();
  const [, navigate] = useLocation();
  const { show: showOnboarding, dismiss: dismissOnboarding } = useOnboarding();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const { data: projectsData, isLoading, refetch } = trpc.videos.list.useQuery(
    { limit: 50, status: "all" },
    {
      enabled: isAuthenticated,
      refetchInterval: (query) => {
        const data = query.state.data;
        if (!data) return false;
        const hasProcessing = data.items.some(
          (p) => p.status === "processing" || p.status === "uploading"
        );
        return hasProcessing ? 3000 : false;
      },
    }
  );

  const deleteMutation = trpc.videos.delete.useMutation({
    onSuccess: () => { toast.success("Projeto deletado com sucesso"); refetch(); },
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

  const allProjects: VideoProject[] = (projectsData?.items ?? []) as VideoProject[];
  const projectList = allProjects.filter((p) => {
    const matchSearch = !search || p.title.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || p.status === statusFilter;
    return matchSearch && matchStatus;
  });

  return (
    <div className="min-h-screen bg-background flex">
      {/* ── Desktop Sidebar ── */}
      <aside className="hidden lg:flex w-64 border-r border-border bg-sidebar flex-col flex-shrink-0">
        <SidebarContent user={user} navigate={navigate} logout={logout} />
      </aside>

      {/* ── Mobile Sidebar Overlay ── */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setSidebarOpen(false)}
          />
          <aside className="absolute left-0 top-0 bottom-0 w-72 bg-sidebar border-r border-border flex flex-col">
            <SidebarContent
              user={user}
              navigate={navigate}
              logout={logout}
              onClose={() => setSidebarOpen(false)}
            />
          </aside>
        </div>
      )}

      {/* ── Main Content ── */}
      <main className="flex-1 overflow-auto min-w-0">
        {/* Mobile header */}
        <div className="lg:hidden flex items-center justify-between px-4 py-3 border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
          <button onClick={() => setSidebarOpen(true)} className="text-muted-foreground hover:text-foreground">
            <Menu className="w-5 h-5" />
          </button>
          <KolheyWordmark size="sm" variant="light" />
          <div className="flex items-center gap-2">
            <NotificationBell />
            <Button size="sm" onClick={() => navigate("/upload")} className="h-8 px-3">
              <Plus className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>

        <div className="p-4 sm:p-6 lg:p-8">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 sm:mb-8">
            <div>
              <h1
                className="text-xl sm:text-2xl font-bold"
                style={{ fontFamily: "'Playfair Display', serif" }}
              >
                Meus Projetos
              </h1>
              <p className="text-muted-foreground text-sm mt-1">
                {projectList.length} de {allProjects.length} projeto{allProjects.length !== 1 ? "s" : ""}
              </p>
            </div>
            <div className="hidden sm:flex items-center gap-2">
              <NotificationBell />
              <Button
                onClick={() => navigate("/upload")}
                className="bg-primary hover:bg-primary/90"
              >
                <Plus className="w-4 h-4 mr-2" />
                Novo Projeto
              </Button>
            </div>
          </div>

          {/* Search & Filter */}
          {allProjects.length > 0 && (
            <div className="flex flex-col sm:flex-row gap-3 mb-6">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Buscar projetos..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 rounded-lg border border-border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all"
                />
              </div>
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-3 py-2 rounded-lg border border-border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all"
                >
                  <option value="all">Todos os status</option>
                  <option value="pending">Pendente</option>
                  <option value="processing">Processando</option>
                  <option value="completed">Concluído</option>
                  <option value="failed">Falhou</option>
                </select>
              </div>
            </div>
          )}

          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {[1, 2, 3, 4, 5, 6].map((i) => <SkeletonCard key={i} />)}
            </div>
          ) : projectList.length === 0 ? (
            <div className="text-center py-16 sm:py-24">
              {/* Decorative circle */}
              <div className="relative w-24 h-24 mx-auto mb-6">
                <div className="w-24 h-24 rounded-full bg-primary/5 border-2 border-primary/20 flex items-center justify-center">
                  <Film className="w-10 h-10 text-primary/40" />
                </div>
                <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                  <Plus className="w-3.5 h-3.5 text-white" />
                </div>
              </div>
              <h3
                className="text-xl font-semibold mb-2"
                style={{ fontFamily: "'Playfair Display', serif" }}
              >
                Nenhum projeto ainda
              </h3>
              <p className="text-muted-foreground text-sm mb-2 max-w-xs mx-auto">
                Faça upload de um vídeo MP4 e a IA irá transcrever, dividir em cenas e gerar ilustrações automaticamente.
              </p>
              <p
                className="text-muted-foreground/60 text-sm mb-8 italic"
                style={{ fontFamily: "'Dancing Script', cursive", fontSize: "1rem" }}
              >
                Resultados que se cultivam
              </p>
              <Button onClick={() => navigate("/upload")} className="bg-primary hover:bg-primary/90">
                <Plus className="w-4 h-4 mr-2" />
                Criar primeiro projeto
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
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

      <OnboardingModal open={showOnboarding} onClose={dismissOnboarding} />
    </div>
  );
}
