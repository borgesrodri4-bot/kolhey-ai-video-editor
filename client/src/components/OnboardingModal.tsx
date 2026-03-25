import { useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { KolheyWordmark } from "@/components/KolheyLogo";
import { Upload, Wand2, Film, ChevronRight, ChevronLeft, Sparkles } from "lucide-react";

const STEPS = [
  {
    icon: Upload,
    title: "Envie seu vídeo",
    description:
      "Faça upload de qualquer vídeo MP4 de até 500MB. Nossa IA extrai o áudio e transcreve automaticamente com timestamps precisos usando Whisper.",
    highlight: "Suporte a MP4 até 500MB",
    color: "text-blue-400",
    bg: "bg-blue-400/10",
    border: "border-blue-400/20",
  },
  {
    icon: Wand2,
    title: "A IA cria as cenas",
    description:
      "O Claude analisa a transcrição, divide o vídeo em cenas temáticas e gera prompts de ilustração personalizados. As imagens são criadas automaticamente para cada cena.",
    highlight: "Claude + DALL-E integrados",
    color: "text-primary",
    bg: "bg-primary/10",
    border: "border-primary/20",
  },
  {
    icon: Sparkles,
    title: "Refine e exporte",
    description:
      "Edite prompts, regenere ilustrações, reordene cenas com drag-and-drop e dê feedback 👍/👎. O sistema aprende seu estilo e melhora a cada projeto.",
    highlight: "Aprendizado adaptativo",
    color: "text-green-400",
    bg: "bg-green-400/10",
    border: "border-green-400/20",
  },
];

const ONBOARDING_KEY = "kolhey_onboarding_done";

export function useOnboarding() {
  const [show, setShow] = useState(() => {
    try {
      return !localStorage.getItem(ONBOARDING_KEY);
    } catch {
      return false;
    }
  });

  const dismiss = () => {
    try {
      localStorage.setItem(ONBOARDING_KEY, "1");
    } catch {}
    setShow(false);
  };

  return { show, dismiss };
}

export function OnboardingModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [step, setStep] = useState(0);
  const current = STEPS[step];
  const Icon = current.icon;
  const isLast = step === STEPS.length - 1;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md bg-card border-border p-0 overflow-hidden">
        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-border flex items-center justify-between">
          <KolheyWordmark size="sm" variant="light" />
          <span className="text-xs text-muted-foreground">
            {step + 1} de {STEPS.length}
          </span>
        </div>

        {/* Step indicator */}
        <div className="flex gap-1.5 px-6 pt-4">
          {STEPS.map((_, i) => (
            <div
              key={i}
              className={`h-1 flex-1 rounded-full transition-all duration-300 ${
                i <= step ? "bg-primary" : "bg-muted"
              }`}
            />
          ))}
        </div>

        {/* Content */}
        <div className="px-6 py-6">
          <div className={`w-16 h-16 rounded-2xl ${current.bg} border ${current.border} flex items-center justify-center mb-5`}>
            <Icon className={`w-8 h-8 ${current.color}`} />
          </div>

          <h2
            className="text-2xl font-bold mb-3"
            style={{ fontFamily: "'Playfair Display', serif" }}
          >
            {current.title}
          </h2>

          <p className="text-muted-foreground leading-relaxed mb-4 text-sm">
            {current.description}
          </p>

          <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full ${current.bg} border ${current.border}`}>
            <div className={`w-1.5 h-1.5 rounded-full ${current.color.replace("text-", "bg-")}`} />
            <span className={`text-xs font-medium ${current.color}`}>{current.highlight}</span>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 pb-6 flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setStep((s) => s - 1)}
            disabled={step === 0}
            className="text-muted-foreground"
          >
            <ChevronLeft className="w-4 h-4 mr-1" /> Anterior
          </Button>

          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={onClose} className="text-muted-foreground text-xs">
              Pular
            </Button>
            {isLast ? (
              <Button onClick={onClose} size="sm">
                <Film className="w-4 h-4 mr-2" /> Começar agora
              </Button>
            ) : (
              <Button onClick={() => setStep((s) => s + 1)} size="sm">
                Próximo <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
