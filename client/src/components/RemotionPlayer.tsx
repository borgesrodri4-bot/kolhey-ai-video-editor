import React from 'react';
import { Player } from '@remotion/player';
import { VideoEditor } from '../remotion/VideoEditor';

interface RemotionPlayerProps {
  videoUrl: string;
  scenes: any[];
  captions: any[];
  visualStyle: string;
}

export const RemotionPlayer: React.FC<RemotionPlayerProps> = ({
  videoUrl,
  scenes,
  captions,
  visualStyle,
}) => {
  return (
    <div className="w-full aspect-[9/16] bg-black rounded-xl overflow-hidden shadow-2xl border-4 border-[#E84B1A]">
      <Player
        component={VideoEditor}
        durationInFrames={Math.max(1, Math.ceil((captions[captions.length - 1]?.endMs || 1800 * 33.33) / 33.33))}
        compositionWidth={1080}
        compositionHeight={1920}
        fps={30}
        style={{
          width: '100%',
          height: '100%',
        }}
        controls
        inputProps={{
          videoUrl,
          scenes,
          captions,
          visualStyle,
        }}
      />
    </div>
  );
};
