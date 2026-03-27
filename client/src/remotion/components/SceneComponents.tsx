import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, spring, useVideoConfig } from 'remotion';

interface SceneProps {
  content: string;
  colors: string[];
  visualStyle?: string;
}

// 1. Cena de Impacto (Frase em tela cheia)
export const ImpactScene: React.FC<SceneProps> = ({ content, colors }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const scale = spring({ frame, fps, config: { damping: 12 } });

  return (
    <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.3)' }}>
      <div style={{
        fontSize: '120px',
        fontWeight: '900',
        color: colors[0] || '#E84B1A',
        textAlign: 'center',
        textTransform: 'uppercase',
        transform: `scale(${scale})`,
        padding: '0 50px',
        textShadow: '0 10px 30px rgba(0,0,0,0.5)'
      }}>
        {content}
      </div>
    </AbsoluteFill>
  );
};

// 2. Estilo WhatsApp (Mensagem de chat)
export const WhatsAppScene: React.FC<SceneProps> = ({ content, colors }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const opacity = interpolate(frame, [0, 10], [0, 1], { extrapolateRight: 'clamp' });
  const translateY = interpolate(frame, [0, 15], [100, 0], { extrapolateRight: 'clamp' });

  return (
    <AbsoluteFill style={{ justifyContent: 'flex-end', paddingBottom: '400px', paddingLeft: '50px' }}>
      <div style={{
        backgroundColor: '#25D366',
        color: 'white',
        padding: '30px 50px',
        borderRadius: '30px 30px 30px 0',
        fontSize: '50px',
        maxWidth: '70%',
        opacity,
        transform: `translateY(${translateY}px)`,
        boxShadow: '0 10px 20px rgba(0,0,0,0.2)'
      }}>
        {content}
      </div>
    </AbsoluteFill>
  );
};

// 3. Comparativo (Lado a Lado)
export const ComparisonScene: React.FC<SceneProps> = ({ content, colors }) => {
  const [left, right] = content.split(' vs ');
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const move = spring({ frame, fps });

  return (
    <AbsoluteFill style={{ flexDirection: 'row', padding: '100px', gap: '50px' }}>
      <div style={{ flex: 1, backgroundColor: colors[0] || '#333', borderRadius: '30px', display: 'flex', justifyContent: 'center', alignItems: 'center', transform: `translateX(${(1 - move) * -500}px)` }}>
        <span style={{ fontSize: '60px', color: 'white', fontWeight: 'bold' }}>{left}</span>
      </div>
      <div style={{ flex: 1, backgroundColor: colors[1] || '#E84B1A', borderRadius: '30px', display: 'flex', justifyContent: 'center', alignItems: 'center', transform: `translateX(${(1 - move) * 500}px)` }}>
        <span style={{ fontSize: '60px', color: 'white', fontWeight: 'bold' }}>{right}</span>
      </div>
    </AbsoluteFill>
  );
};

// 4. Número Animado
export const AnimatedNumberScene: React.FC<SceneProps> = ({ content, colors }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const number = parseInt(content.replace(/\D/g, '')) || 0;
  const animatedValue = Math.round(interpolate(frame, [0, 30], [0, number], { extrapolateRight: 'clamp' }));

  return (
    <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center' }}>
      <div style={{ fontSize: '250px', fontWeight: '900', color: colors[0] || '#E84B1A' }}>
        {animatedValue}{content.includes('%') ? '%' : ''}
      </div>
    </AbsoluteFill>
  );
};

// 5. Rosto com Ilustração (Placeholder para sobreposição)
export const FaceIllustrationScene: React.FC<SceneProps> = ({ content, colors }) => {
  return (
    <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center' }}>
       <div style={{ border: `10px solid ${colors[0] || '#E84B1A'}`, borderRadius: '50%', padding: '20px', backgroundColor: 'rgba(255,255,255,0.1)' }}>
          <span style={{ fontSize: '50px', color: 'white' }}>✨ {content}</span>
       </div>
    </AbsoluteFill>
  );
};

// 6. Lista de Tópicos
export const ListScene: React.FC<SceneProps> = ({ content, colors }) => {
  const items = content.split(',').map(i => i.trim());
  return (
    <AbsoluteFill style={{ justifyContent: 'center', padding: '100px' }}>
      {items.map((item, i) => (
        <div key={i} style={{ fontSize: '60px', color: 'white', marginBottom: '30px', display: 'flex', alignItems: 'center' }}>
          <div style={{ width: '20px', height: '20px', backgroundColor: colors[0] || '#E84B1A', marginRight: '30px', borderRadius: '50%' }} />
          {item}
        </div>
      ))}
    </AbsoluteFill>
  );
};

// 7. Gráfico (Simulado)
export const ChartScene: React.FC<SceneProps> = ({ content, colors }) => {
  const frame = useCurrentFrame();
  const height = interpolate(frame, [0, 30], [0, 400], { extrapolateRight: 'clamp' });
  return (
    <AbsoluteFill style={{ justifyContent: 'flex-end', alignItems: 'center', paddingBottom: '300px' }}>
      <div style={{ display: 'flex', gap: '40px', alignItems: 'flex-end' }}>
        {[0.6, 0.8, 1, 0.7].map((v, i) => (
          <div key={i} style={{ width: '80px', height: height * v, backgroundColor: i === 2 ? colors[0] || '#E84B1A' : '#555', borderRadius: '10px' }} />
        ))}
      </div>
      <div style={{ color: 'white', fontSize: '40px', marginTop: '40px' }}>{content}</div>
    </AbsoluteFill>
  );
};

// 8. Mapa (Placeholder)
export const MapScene: React.FC<SceneProps> = ({ content, colors }) => {
  return (
    <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center' }}>
      <div style={{ fontSize: '80px', color: 'white' }}>📍 {content}</div>
    </AbsoluteFill>
  );
};

// 9. Código (Estilo Terminal)
export const CodeScene: React.FC<SceneProps> = ({ content, colors }) => {
  return (
    <AbsoluteFill style={{ justifyContent: 'center', padding: '100px' }}>
      <div style={{ backgroundColor: '#1e1e1e', padding: '50px', borderRadius: '20px', fontFamily: 'monospace', border: '1px solid #333' }}>
        <div style={{ color: '#569cd6', fontSize: '40px' }}>const <span style={{ color: '#9cdcfe' }}>kolhey</span> = () {'=>'} {'{'}</div>
        <div style={{ color: '#ce9178', fontSize: '40px', paddingLeft: '40px' }}>return "{content}";</div>
        <div style={{ color: '#569cd6', fontSize: '40px' }}>{'}'}</div>
      </div>
    </AbsoluteFill>
  );
};

// 10. Depoimento
export const TestimonialScene: React.FC<SceneProps> = ({ content, colors }) => {
  return (
    <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center', padding: '100px' }}>
      <div style={{ fontSize: '50px', fontStyle: 'italic', color: 'white', textAlign: 'center' }}>
        "{content}"
      </div>
    </AbsoluteFill>
  );
};

// 11. Call to Action
export const CTAScene: React.FC<SceneProps> = ({ content, colors }) => {
  const frame = useCurrentFrame();
  const pulse = Math.sin(frame / 5) * 0.1 + 1;
  return (
    <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center' }}>
      <div style={{
        backgroundColor: colors[0] || '#E84B1A',
        padding: '40px 80px',
        borderRadius: '100px',
        fontSize: '70px',
        fontWeight: 'bold',
        color: 'white',
        transform: `scale(${pulse})`,
        boxShadow: '0 0 50px rgba(232, 75, 26, 0.5)'
      }}>
        {content}
      </div>
    </AbsoluteFill>
  );
};
