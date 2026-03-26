// Templates de contexto por nicho para geração de cenas mais precisas
export interface NicheTemplate {
  id: string;
  label: string;
  description: string;
  contextPrompt: string;
  suggestedStyle: string;
  icon: string;
}

export const NICHE_TEMPLATES: NicheTemplate[] = [
  {
    id: "educational",
    label: "Aula Educacional",
    description: "Conteúdo didático, explicações de conceitos, tutoriais",
    contextPrompt:
      "Este é um vídeo educacional. Priorize ilustrações que expliquem visualmente os conceitos apresentados. Use diagramas, infográficos e representações claras. As cenas devem reforçar o aprendizado com imagens didáticas e acessíveis.",
    suggestedStyle: "flat",
    icon: "📚",
  },
  {
    id: "sales",
    label: "Pitch de Vendas",
    description: "Apresentação de produto, proposta de valor, conversão",
    contextPrompt:
      "Este é um vídeo de vendas. As ilustrações devem transmitir confiança, profissionalismo e o valor do produto/serviço. Use imagens que mostrem benefícios, resultados e transformações. Foco em elementos visuais persuasivos e modernos.",
    suggestedStyle: "photorealistic",
    icon: "💼",
  },
  {
    id: "motivational",
    label: "Conteúdo Motivacional",
    description: "Inspiração, superação, desenvolvimento pessoal",
    contextPrompt:
      "Este é um vídeo motivacional. As ilustrações devem ser inspiradoras, energéticas e emocionalmente impactantes. Use metáforas visuais de crescimento, superação e conquista. Cores vibrantes e composições dinâmicas.",
    suggestedStyle: "watercolor",
    icon: "🔥",
  },
  {
    id: "tutorial",
    label: "Tutorial / How-to",
    description: "Passo a passo, instruções, demonstrações práticas",
    contextPrompt:
      "Este é um vídeo tutorial com instruções passo a passo. As ilustrações devem mostrar claramente cada etapa do processo. Use setas, numeração visual, antes/depois e representações de ações específicas. Clareza e objetividade são essenciais.",
    suggestedStyle: "flat",
    icon: "🛠️",
  },
  {
    id: "storytelling",
    label: "Storytelling / Narrativa",
    description: "Histórias, casos reais, jornada do cliente",
    contextPrompt:
      "Este é um vídeo narrativo com storytelling. As ilustrações devem criar uma atmosfera imersiva que apoie a história sendo contada. Use personagens expressivos, cenários detalhados e composições cinematográficas que evoquem emoção.",
    suggestedStyle: "cartoon",
    icon: "📖",
  },
  {
    id: "product_demo",
    label: "Demonstração de Produto",
    description: "Features, funcionalidades, casos de uso do produto",
    contextPrompt:
      "Este é um vídeo de demonstração de produto. As ilustrações devem mostrar o produto em uso, destacar funcionalidades e benefícios específicos. Use mockups, interfaces, e representações realistas do produto em contexto de uso.",
    suggestedStyle: "photorealistic",
    icon: "📱",
  },
  {
    id: "kolhey",
    label: "Estilo Kolhey",
    description: "Identidade visual Kolhey: orgânico, vibrante, autêntico",
    contextPrompt:
      "Este vídeo deve seguir a identidade visual Kolhey: ilustrações orgânicas com traços expressivos, paleta vibrante com tons terrosos e laranja, elementos da natureza brasileira, sensação de autenticidade e crescimento sustentável.",
    suggestedStyle: "kolhey",
    icon: "🌿",
  },
];

export function getNicheTemplateById(id: string): NicheTemplate | undefined {
  return NICHE_TEMPLATES.find((t) => t.id === id);
}
