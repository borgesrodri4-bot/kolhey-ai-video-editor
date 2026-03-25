import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";
import { getLoginUrl } from "@/const";
import { KolheyWordmark } from "@/components/KolheyLogo";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft, Users, Film, CheckCircle2, XCircle, Loader2,
  ShieldCheck, TrendingUp, BarChart3, Clock,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

const statusConfig: Record<string, { label: string; className: string }> = {
  pending: { label: "Pendente", className: "bg-yellow-400/10 text-yellow-400 border-yellow-400/20" },
  uploading: { label: "Enviando", className: "bg-blue-400/10 text-blue-400 border-blue-400/20" },
  processing: { label: "Processando", className: "bg-blue-400/10 text-blue-400 border-blue-400/20" },
  completed: { label: "Concluído", className: "bg-green-400/10 text-green-400 border-green-400/20" },
  failed: { label: "Falhou", className: "bg-red-400/10 text-red-400 border-red-400/20" },
};

export default function Admin() {
  const { user, isAuthenticated, loading } = useAuth();
  const [, navigate] = useLocation();

  const { data: stats, isLoading: statsLoading } = trpc.admin.getStats.useQuery(undefined, {
    enabled: isAuthenticated && user?.role === "admin",
  });

  const { data: users, isLoading: usersLoading } = trpc.admin.getUsers.useQuery(undefined, {
    enabled: isAuthenticated && user?.role === "admin",
  });

  const { data: projects, isLoading: projectsLoading } = trpc.admin.getProjects.useQuery(undefined, {
    enabled: isAuthenticated && user?.role === "admin",
  });

  const { data: chartData, isLoading: chartLoading } = trpc.admin.getProcessingsByDay.useQuery(
    { days: 14 },
    { enabled: isAuthenticated && user?.role === "admin" }
  );

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

  if (user?.role !== "admin") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <ShieldCheck className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Acesso restrito</h2>
          <p className="text-muted-foreground text-sm mb-4">Esta página é exclusiva para administradores.</p>
          <Button onClick={() => navigate("/dashboard")}>Voltar ao Dashboard</Button>
        </div>
      </div>
    );
  }

  const statCards = [
    { label: "Usuários", value: stats?.totalUsers ?? 0, icon: Users, color: "text-blue-400", bg: "bg-blue-400/10" },
    { label: "Projetos", value: stats?.totalProjects ?? 0, icon: Film, color: "text-primary", bg: "bg-primary/10" },
    { label: "Processados", value: stats?.totalProcessed ?? 0, icon: CheckCircle2, color: "text-green-400", bg: "bg-green-400/10" },
    { label: "Falhas", value: stats?.totalFailed ?? 0, icon: XCircle, color: "text-red-400", bg: "bg-red-400/10" },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container flex items-center justify-between h-16">
          <div className="flex items-center gap-3">
            <KolheyWordmark size="sm" variant="light" />
            <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard")} className="text-muted-foreground">
              <ArrowLeft className="w-4 h-4 mr-2" /> Dashboard
            </Button>
            <span className="text-muted-foreground">/</span>
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-primary" />
              <span className="font-semibold">Painel Admin</span>
            </div>
          </div>
          <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
            <ShieldCheck className="w-3 h-3 mr-1" /> Administrador
          </Badge>
        </div>
      </header>

      <div className="container py-8 space-y-8">
        {/* Stats */}
        <div>
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2" style={{ fontFamily: "'Playfair Display', serif" }}>
            <BarChart3 className="w-5 h-5 text-primary" /> Visão Geral
          </h2>
          {statsLoading ? (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((i) => <div key={i} className="h-24 rounded-xl border border-border bg-card animate-pulse" />)}
            </div>
          ) : (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {statCards.map((card) => {
                const Icon = card.icon;
                return (
                  <div key={card.label} className="p-5 rounded-xl border border-border bg-card">
                    <div className={`w-10 h-10 rounded-lg ${card.bg} flex items-center justify-center mb-3`}>
                      <Icon className={`w-5 h-5 ${card.color}`} />
                    </div>
                    <p className="text-3xl font-bold mb-1">{card.value}</p>
                    <p className="text-sm text-muted-foreground">{card.label}</p>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Chart */}
        <div className="p-5 rounded-xl border border-border bg-card">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-primary" /> Processamentos por Dia (últimos 14 dias)
          </h3>
          {chartLoading ? (
            <div className="h-48 bg-muted/20 rounded-lg animate-pulse" />
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={chartData ?? []}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="day" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "12px" }}
                  labelStyle={{ color: "hsl(var(--foreground))" }}
                />
                <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="Projetos" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Recent Projects */}
        <div>
          <h3 className="font-semibold mb-4 flex items-center gap-2" style={{ fontFamily: "'Playfair Display', serif" }}>
            <Film className="w-4 h-4 text-primary" /> Projetos Recentes
          </h3>
          {projectsLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => <div key={i} className="h-14 rounded-lg border border-border bg-card animate-pulse" />)}
            </div>
          ) : (
            <div className="rounded-xl border border-border bg-card overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/20">
                    <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">ID</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">Título</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">Status</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">Cenas</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">Criado</th>
                  </tr>
                </thead>
                <tbody>
                  {(projects ?? []).slice(0, 20).map((p) => {
                    const cfg = statusConfig[p.status] ?? statusConfig.pending;
                    return (
                      <tr key={p.id} className="border-b border-border/50 hover:bg-muted/10 transition-colors">
                        <td className="px-4 py-3 font-mono text-xs text-muted-foreground">#{p.id}</td>
                        <td className="px-4 py-3 font-medium max-w-xs truncate">{p.title}</td>
                        <td className="px-4 py-3">
                          <Badge variant="outline" className={`text-xs ${cfg.className}`}>{cfg.label}</Badge>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">{p.scenesCount ?? 0}</td>
                        <td className="px-4 py-3 text-muted-foreground text-xs">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {formatDistanceToNow(new Date(p.createdAt), { addSuffix: true, locale: ptBR })}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Users */}
        <div>
          <h3 className="font-semibold mb-4 flex items-center gap-2" style={{ fontFamily: "'Playfair Display', serif" }}>
            <Users className="w-4 h-4 text-primary" /> Usuários Cadastrados
          </h3>
          {usersLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => <div key={i} className="h-14 rounded-lg border border-border bg-card animate-pulse" />)}
            </div>
          ) : (
            <div className="rounded-xl border border-border bg-card overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/20">
                    <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">Nome</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">Email</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">Papel</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">Cadastro</th>
                  </tr>
                </thead>
                <tbody>
                  {(users ?? []).map((u) => (
                    <tr key={u.id} className="border-b border-border/50 hover:bg-muted/10 transition-colors">
                      <td className="px-4 py-3 font-medium">{u.name ?? "—"}</td>
                      <td className="px-4 py-3 text-muted-foreground">{u.email ?? "—"}</td>
                      <td className="px-4 py-3">
                        <Badge variant="outline" className={u.role === "admin" ? "bg-primary/10 text-primary border-primary/20" : "bg-muted/20 text-muted-foreground"}>
                          {u.role === "admin" ? "Admin" : "Usuário"}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground text-xs">
                        {formatDistanceToNow(new Date(u.createdAt), { addSuffix: true, locale: ptBR })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
