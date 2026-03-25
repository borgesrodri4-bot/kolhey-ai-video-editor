import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { KolheyLogo, KolheyWordmark } from "@/components/KolheyLogo";
import { getLoginUrl } from "@/const";
import { useLocation } from "wouter";
import {
  Upload,
  Wand2,
  Film,
  ArrowRight,
  Brain,
  ImageIcon,
  Zap,
} from "lucide-react";

const features = [
  {
    icon: Upload,
    title: "Upload de Vídeo",
    description: "Arraste e solte vídeos MP4 de até 500MB com validação automática.",
  },
  {
    icon: Brain,
    title: "Transcrição com IA",
    description: "OpenAI Whisper transcreve o áudio com timestamps precisos.",
  },
  {
    icon: Wand2,
    title: "Análise Inteligente",
    description: "Claude divide o conteúdo em cenas e gera prompts de ilustração.",
  },
  {
    icon: ImageIcon,
    title: "Geração de Ilustrações",
    description: "DALL-E cria ilustrações personalizadas para cada cena automaticamente.",
  },
  {
    icon: Film,
    title: "Timeline Interativa",
    description: "Visualize e refine as cenas antes de exportar para o Remotion.",
  },
  {
    icon: Zap,
    title: "Exportação JSON",
    description: "Exporte os dados em formato compatível com Remotion para renderização.",
  },
];

const steps = [
  { step: "01", title: "Faça o upload", desc: "Envie seu vídeo MP4 bruto" },
  { step: "02", title: "IA processa", desc: "Transcrição, análise e geração automática" },
  { step: "03", title: "Refine", desc: "Ajuste cenas e ilustrações na timeline" },
  { step: "04", title: "Exporte", desc: "Baixe o JSON para renderizar com Remotion" },
];

export default function Home() {
  const { isAuthenticated, loading } = useAuth();
  const [, navigate] = useLocation();

  const handleCTA = () => {
    if (isAuthenticated) {
      navigate("/dashboard");
    } else {
      window.location.href = getLoginUrl();
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* ── Header ── */}
      <header className="fixed top-0 left-0 right-0 z-50 border-b border-border/40 bg-background/90 backdrop-blur-md">
        <div className="container flex items-center justify-between h-16">
          {/* Logo integrada — SVG inline, sem imagem sobreposta */}
          <KolheyWordmark size="sm" variant="light" />

          <nav className="flex items-center gap-4">
            {!loading && (
              isAuthenticated ? (
                <Button
                  onClick={() => navigate("/dashboard")}
                  size="sm"
                  className="bg-primary hover:bg-primary/90"
                >
                  Ir para o Dashboard
                  <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              ) : (
                <Button
                  onClick={handleCTA}
                  size="sm"
                  className="bg-primary hover:bg-primary/90"
                >
                  Começar
                  <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              )
            )}
          </nav>
        </div>
      </header>

      {/* ── Hero ── */}
      <section className="pt-32 pb-24 px-4 text-center relative overflow-hidden">
        {/* Background glow */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-0 right-0 w-[700px] h-[700px] rounded-full bg-primary/5 blur-3xl -translate-y-1/3 translate-x-1/4" />
          <div className="absolute bottom-0 left-0 w-[500px] h-[500px] rounded-full bg-primary/5 blur-3xl translate-y-1/3 -translate-x-1/4" />
        </div>

        <div className="relative max-w-4xl mx-auto">
          {/*
            Logo hero: tamanho XL, com tagline — completamente integrada ao layout,
            não é uma imagem sobreposta mas sim o próprio elemento tipográfico da marca.
          */}
          <div className="flex flex-col items-center mb-10">
            <KolheyLogo size="xl" showTagline variant="light" />
          </div>

          <h1
            className="text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight mb-6 leading-tight"
            style={{ fontFamily: "'Playfair Display', serif" }}
          >
            Edite vídeos com{" "}
            <span className="kolhey-gradient">inteligência artificial</span>
          </h1>

          <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed">
            Faça upload de um vídeo MP4 e a IA transcreve, analisa, divide em cenas e gera
            ilustrações personalizadas automaticamente. Exporte para Remotion e renderize.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              size="lg"
              onClick={handleCTA}
              className="text-base px-8 h-12 bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20"
            >
              Começar agora
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="text-base px-8 h-12 bg-transparent border-border hover:border-primary/50"
              onClick={() =>
                document.getElementById("how-it-works")?.scrollIntoView({ behavior: "smooth" })
              }
            >
              Ver como funciona
            </Button>
          </div>
        </div>
      </section>

      {/* ── How it works ── */}
      <section id="how-it-works" className="py-24 px-4 border-t border-border/40">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2
              className="text-3xl sm:text-4xl font-bold mb-3"
              style={{ fontFamily: "'Playfair Display', serif" }}
            >
              Como funciona
            </h2>
            <p className="text-muted-foreground text-lg">
              Do upload ao vídeo editado em 4 etapas simples
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {steps.map((s, i) => (
              <div key={i} className="relative">
                {i < steps.length - 1 && (
                  <div className="hidden lg:block absolute top-8 left-full w-full h-px bg-gradient-to-r from-border to-transparent z-0" />
                )}
                <div className="relative z-10 p-6 rounded-xl border border-border bg-card hover:border-primary/50 transition-colors">
                  <div
                    className="text-4xl font-bold text-primary/40 mb-3"
                    style={{ fontFamily: "'Playfair Display', serif" }}
                  >
                    {s.step}
                  </div>
                  <h3 className="font-semibold text-lg mb-1">{s.title}</h3>
                  <p className="text-muted-foreground text-sm">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section className="py-24 px-4 bg-card/20">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2
              className="text-3xl sm:text-4xl font-bold mb-3"
              style={{ fontFamily: "'Playfair Display', serif" }}
            >
              Funcionalidades
            </h2>
            <p className="text-muted-foreground text-lg">
              Tudo que você precisa para automatizar a edição de vídeos
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((f, i) => (
              <div
                key={i}
                className="p-6 rounded-xl border border-border bg-card hover:border-primary/50 hover:bg-card/80 transition-all group"
              >
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                  <f.icon className="w-6 h-6 text-primary" />
                </div>
                <h3 className="font-semibold text-lg mb-2">{f.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{f.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA final ── */}
      <section className="py-24 px-4 text-center relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-primary/5 blur-3xl rounded-full" />
        </div>
        <div className="relative max-w-2xl mx-auto">
          <h2
            className="text-3xl sm:text-4xl font-bold mb-3"
            style={{ fontFamily: "'Playfair Display', serif" }}
          >
            Pronto para automatizar sua edição?
          </h2>
          <p className="text-muted-foreground text-lg mb-8">
            Comece agora e transforme seus vídeos brutos em conteúdo ilustrado com IA.
          </p>
          <Button
            size="lg"
            onClick={handleCTA}
            className="text-base px-10 h-12 bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20"
          >
            Começar gratuitamente
            <ArrowRight className="w-5 h-5 ml-2" />
          </Button>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-border/40 py-8 px-4">
        <div className="container flex flex-col sm:flex-row items-center justify-between gap-4">
          {/* Logo integrada no footer — versão pequena */}
          <KolheyWordmark size="sm" variant="light" className="opacity-70" />
          <p className="text-muted-foreground text-sm text-center">
            Powered by Claude, OpenAI Whisper e DALL-E
          </p>
          <p
            className="text-muted-foreground/60 text-xs italic"
            style={{ fontFamily: "'Dancing Script', cursive", fontSize: "1rem" }}
          >
            Resultados que se cultivam
          </p>
        </div>
      </footer>
    </div>
  );
}
