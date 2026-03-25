import { useLocation } from "wouter";
import { KolheyWordmark } from "@/components/KolheyLogo";
import { Button } from "@/components/ui/button";
import { Home, ArrowLeft, Film } from "lucide-react";

export default function NotFound() {
  const [, navigate] = useLocation();

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm">
        <div className="container flex items-center h-16">
          <button onClick={() => navigate("/")} className="hover:opacity-80 transition-opacity">
            <KolheyWordmark size="sm" variant="light" />
          </button>
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 flex items-center justify-center px-4">
        <div className="text-center max-w-lg">
          {/* 404 display */}
          <div className="relative mb-8 inline-block">
            <p
              className="text-[9rem] sm:text-[11rem] font-bold leading-none select-none"
              style={{
                fontFamily: "'Playfair Display', serif",
                color: "rgba(232,75,26,0.12)",
              }}
            >
              404
            </p>
            {/* Decorative circle — the Kolhey "O" */}
            <div
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-28 h-28 sm:w-36 sm:h-36 rounded-full border-[3px] border-primary/40 pointer-events-none"
              style={{ boxShadow: "0 0 80px rgba(232,75,26,0.12)" }}
            />
          </div>

          <div className="mb-2">
            <span
              className="text-sm tracking-[0.2em] uppercase text-primary font-medium"
            >
              Página não encontrada
            </span>
          </div>

          <h1
            className="text-2xl sm:text-3xl font-bold mb-3 text-foreground"
            style={{ fontFamily: "'Playfair Display', serif" }}
          >
            Esse conteúdo não existe
          </h1>

          <p className="text-muted-foreground mb-8 leading-relaxed text-sm sm:text-base">
            O que você está procurando pode ter sido movido, removido ou nunca existiu.
            Volte ao início e continue cultivando seus resultados.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button onClick={() => navigate("/")} className="gap-2">
              <Home className="w-4 h-4" />
              Ir para o Início
            </Button>
            <Button
              variant="outline"
              className="gap-2 bg-transparent"
              onClick={() => navigate("/dashboard")}
            >
              <Film className="w-4 h-4" />
              Meus Projetos
            </Button>
            <Button
              variant="ghost"
              className="gap-2 text-muted-foreground"
              onClick={() => window.history.back()}
            >
              <ArrowLeft className="w-4 h-4" />
              Voltar
            </Button>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border py-6">
        <div className="container text-center">
          <p
            className="text-muted-foreground"
            style={{ fontFamily: "'Dancing Script', cursive", fontSize: "1rem" }}
          >
            Resultados que se cultivam
          </p>
        </div>
      </footer>
    </div>
  );
}
