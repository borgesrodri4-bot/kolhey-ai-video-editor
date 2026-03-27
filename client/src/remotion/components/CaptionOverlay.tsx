import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate } from 'remotion';

interface Caption {
  text: string;
  startMs: number;
  endMs: number;
  index: number;
}

interface CaptionOverlayProps {
  captions: Caption[];
}

export const CaptionOverlay: React.FC<CaptionOverlayProps> = ({ captions }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Encontrar a legenda atual baseada no frame
  const currentMs = (frame / fps) * 1000;
  const currentCaption = captions.find(
    (c) => currentMs >= c.startMs && currentMs <= c.endMs
  );

  if (!currentCaption) return null;

  return (
    <AbsoluteFill
      style={{
        justifyContent: 'center',
        alignItems: 'center',
        top: '70%', // Posição típica TikTok
      }}
    >
      <div
        style={{
          fontSize: '80px',
          fontWeight: '900',
          color: 'white',
          textTransform: 'uppercase',
          textAlign: 'center',
          padding: '20px 40px',
          backgroundColor: '#E84B1A', // Laranja Kolhey
          borderRadius: '15px',
          boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
          fontFamily: 'Inter, sans-serif',
          maxWidth: '80%',
          lineHeight: '1.1',
        }}
      >
        {currentCaption.text}
      </div>
    </AbsoluteFill>
  );
};
