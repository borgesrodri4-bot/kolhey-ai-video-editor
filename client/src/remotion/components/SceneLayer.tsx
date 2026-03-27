import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from 'remotion';
import * as Scenes from './SceneComponents';

interface Scene {
  index: number; // Legenda de início
  type: string;
  content: string;
  visualStyle?: string;
  colors?: string[];
}

interface Caption {
  text: string;
  startMs: number;
  endMs: number;
  index: number;
}

interface SceneLayerProps {
  scenes: Scene[];
  captions: Caption[];
  visualStyle: string;
}

export const SceneLayer: React.FC<SceneLayerProps> = ({
  scenes,
  captions,
  visualStyle,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const currentMs = (frame / fps) * 1000;

  // Encontrar a legenda atual baseada no frame
  const currentCaption = captions.find(
    (c) => currentMs >= c.startMs && currentMs <= c.endMs
  );

  if (!currentCaption) return null;

  // Encontrar a cena que começa neste index ou no index anterior mais próximo
  const currentScene = [...scenes]
    .sort((a, b) => b.index - a.index)
    .find((s) => s.index <= currentCaption.index);

  if (!currentScene) return null;

  const colors = currentScene.colors || ['#E84B1A', '#0D1B2E'];
  const sceneProps = { content: currentScene.content, colors, visualStyle };

  // Mapeamento dos 11 componentes de cena
  switch (currentScene.type) {
    case 'impacto': return <Scenes.ImpactScene {...sceneProps} />;
    case 'whatsapp': return <Scenes.WhatsAppScene {...sceneProps} />;
    case 'comparativo': return <Scenes.ComparisonScene {...sceneProps} />;
    case 'numero_animado': return <Scenes.AnimatedNumberScene {...sceneProps} />;
    case 'rosto_ilustracao': return <Scenes.FaceIllustrationScene {...sceneProps} />;
    case 'lista': return <Scenes.ListScene {...sceneProps} />;
    case 'grafico': return <Scenes.ChartScene {...sceneProps} />;
    case 'mapa': return <Scenes.MapScene {...sceneProps} />;
    case 'codigo': return <Scenes.CodeScene {...sceneProps} />;
    case 'depoimento': return <Scenes.TestimonialScene {...sceneProps} />;
    case 'call_to_action': return <Scenes.CTAScene {...sceneProps} />;
    default: return null;
  }
};
