import React from 'react';
import { AbsoluteFill, Video, useVideoConfig, Series } from 'remotion';
import { CaptionOverlay } from './components/CaptionOverlay';
import { SceneLayer } from './components/SceneLayer';

export interface Caption {
  text: string;
  startMs: number;
  endMs: number;
  index: number;
}

export interface Scene {
  index: number; // Legenda de início
  type: string;
  content: string;
  visualStyle?: string;
}

interface VideoEditorProps {
  videoUrl: string;
  scenes: Scene[];
  captions: Caption[];
  visualStyle: string;
}

export const VideoEditor: React.FC<VideoEditorProps> = ({
  videoUrl,
  scenes,
  captions,
  visualStyle,
}) => {
  const { fps } = useVideoConfig();

  return (
    <AbsoluteFill style={{ backgroundColor: 'black' }}>
      {/* 1. Camada Inferior: Background (Vídeo Original) */}
      <AbsoluteFill>
        {videoUrl && (
          <Video
            src={videoUrl}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
            }}
          />
        )}
      </AbsoluteFill>

      {/* 2. Camada Intermediária: Cenas/Visual */}
      <AbsoluteFill>
        <SceneLayer scenes={scenes} captions={captions} visualStyle={visualStyle} />
      </AbsoluteFill>

      {/* 3. Camada Superior: Overlay (Legendas TikTok) */}
      <AbsoluteFill>
        <CaptionOverlay captions={captions} />
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
