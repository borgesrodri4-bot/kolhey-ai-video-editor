import React from 'react';
import { Composition } from 'remotion';
import { VideoEditor } from './VideoEditor';

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="VideoEditor"
        component={VideoEditor}
        durationInFrames={1800} // 60 seconds at 30fps (default, will be dynamic)
        fps={30}
        width={1080}
        height={1920}
        defaultProps={{
          videoUrl: '',
          scenes: [],
          captions: [],
          visualStyle: 'auto',
        }}
      />
    </>
  );
};
