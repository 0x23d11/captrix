import React, {
  useRef,
  useEffect,
  useState,
  forwardRef,
  useImperativeHandle,
} from "react";

export interface VideoPlayerRef {
  play: () => void;
  pause: () => void;
  getCurrentTime: () => number;
  setCurrentTime: (time: number) => void;
  getDuration: () => number;
  getVideoElement: () => HTMLVideoElement | null;
}

interface VideoPlayerProps {
  src: string;
  onPlay?: () => void;
  onPause?: () => void;
  onTimeUpdate?: (currentTime: number) => void;
  onDurationChange?: (duration: number) => void;
  onReady?: () => void;
  className?: string;
  muted?: boolean;
  controls?: boolean;
}

const VideoPlayer = forwardRef<VideoPlayerRef, VideoPlayerProps>(
  (
    {
      src,
      onPlay,
      onPause,
      onTimeUpdate,
      onDurationChange,
      onReady,
      className = "",
      muted = false,
      controls = false,
    },
    ref
  ) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const [isLoaded, setIsLoaded] = useState(false);
    const [duration, setDuration] = useState(0);
    const durationCheckRef = useRef<NodeJS.Timeout | null>(null);

    useImperativeHandle(ref, () => ({
      play: () => videoRef.current?.play(),
      pause: () => videoRef.current?.pause(),
      getCurrentTime: () => videoRef.current?.currentTime || 0,
      setCurrentTime: (time: number) => {
        if (videoRef.current) {
          videoRef.current.currentTime = time;
        }
      },
      getDuration: () => duration,
      getVideoElement: () => videoRef.current,
    }));

    // More aggressive duration detection
    const detectDuration = async () => {
      if (!videoRef.current || isLoaded) return; // Don't detect if already loaded

      const video = videoRef.current;
      console.log("Detecting duration, video state:", {
        readyState: video.readyState,
        duration: video.duration,
        videoWidth: video.videoWidth,
        videoHeight: video.videoHeight,
      });

      // Method 1: Direct duration
      if (isFinite(video.duration) && video.duration > 0) {
        console.log("Duration detected directly:", video.duration);
        setDuration(video.duration);
        onDurationChange?.(video.duration);
        setIsLoaded(true);
        onReady?.();
        return;
      }

      // Method 2: Try seeking to end
      try {
        const originalTime = video.currentTime;
        video.currentTime = 999999; // Seek to very end

        await new Promise((resolve) => setTimeout(resolve, 100));

        const estimatedDuration = video.currentTime;
        if (estimatedDuration > 0 && isFinite(estimatedDuration)) {
          console.log("Duration estimated by seeking:", estimatedDuration);
          setDuration(estimatedDuration);
          onDurationChange?.(estimatedDuration);
          video.currentTime = originalTime; // Reset
          setIsLoaded(true);
          onReady?.();
          return;
        }

        video.currentTime = originalTime;
      } catch (error) {
        console.log("Seeking method failed:", error);
      }

      // Method 3: Use the Blob URL to get duration via another video element
      try {
        const tempVideo = document.createElement("video");
        tempVideo.preload = "metadata";
        tempVideo.src = src;

        await new Promise((resolve, reject) => {
          tempVideo.onloadedmetadata = resolve;
          tempVideo.onerror = reject;
          setTimeout(reject, 5000); // 5 second timeout
        });

        if (isFinite(tempVideo.duration) && tempVideo.duration > 0) {
          console.log("Duration detected from temp video:", tempVideo.duration);
          setDuration(tempVideo.duration);
          onDurationChange?.(tempVideo.duration);
          setIsLoaded(true);
          onReady?.();
          return;
        }
      } catch (error) {
        console.log("Temp video method failed:", error);
      }

      console.log(
        "All duration detection methods failed, video might be corrupted or invalid"
      );
    };

    // Continuous duration checking
    const startDurationCheck = () => {
      if (durationCheckRef.current) {
        clearInterval(durationCheckRef.current);
      }

      durationCheckRef.current = setInterval(() => {
        if (videoRef.current && !isLoaded) {
          detectDuration();
        }
      }, 500);
    };

    // Stop duration checking when loaded
    useEffect(() => {
      if (isLoaded && durationCheckRef.current) {
        console.log("Video loaded, stopping duration detection");
        clearInterval(durationCheckRef.current);
        durationCheckRef.current = null;
      }
    }, [isLoaded]);

    useEffect(() => {
      setIsLoaded(false);
      setDuration(0);
      startDurationCheck();

      return () => {
        if (durationCheckRef.current) {
          clearInterval(durationCheckRef.current);
          durationCheckRef.current = null;
        }
      };
    }, [src]);

    const handleLoadedMetadata = () => {
      console.log("Video metadata loaded");
      detectDuration();
    };

    const handleLoadedData = () => {
      console.log("Video data loaded");
      detectDuration();
    };

    const handleCanPlay = () => {
      console.log("Video can play");
      detectDuration();
    };

    const handleTimeUpdate = () => {
      if (videoRef.current && onTimeUpdate) {
        onTimeUpdate(videoRef.current.currentTime);
      }
    };

    const handlePlay = () => {
      console.log("Video playing");
      onPlay?.();
    };

    const handlePause = () => {
      console.log("Video paused");
      onPause?.();
    };

    return (
      <div className="relative">
        <video
          ref={videoRef}
          src={src}
          className={className}
          muted={muted}
          controls={controls}
          onLoadedMetadata={handleLoadedMetadata}
          onLoadedData={handleLoadedData}
          onCanPlay={handleCanPlay}
          onTimeUpdate={handleTimeUpdate}
          onPlay={handlePlay}
          onPause={handlePause}
          preload="metadata"
        />

        {!isLoaded && (
          <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
            <div className="text-white text-center">
              <div className="loading loading-spinner loading-lg mb-2"></div>
              <div>Loading video...</div>
              <div className="text-sm opacity-70 mt-1">
                Detecting duration:{" "}
                {duration > 0 ? `${duration.toFixed(1)}s` : "Searching..."}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }
);

VideoPlayer.displayName = "VideoPlayer";

export default VideoPlayer;
