'use client';

import { useEffect, useRef, useState } from 'react';
import { Camera, CameraOff } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface CameraViewProps {
  onCapture: (imageData: string, mode: 'problem' | 'step') => Promise<void>;
  hasProblem: boolean;
}

export default function CameraView({ onCapture, hasProblem }: CameraViewProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isCaptureInFlightRef = useRef(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string>('');

  const startCamera = async () => {
    setError('');

    const getStream = async (constraints: MediaStreamConstraints) => {
      try {
        return await navigator.mediaDevices.getUserMedia(constraints);
      } catch (err) {
        console.warn('Camera constraint failed:', constraints, err);
        return null;
      }
    };

    try {
      // 1. Try ideal constraints (Back camera, HD resolution)
      // Using 'ideal' prevents failure if specific resolution isn't supported
      let stream = await getStream({
        video: { 
           facingMode: 'environment', 
           width: { ideal: 1280 }, 
           height: { ideal: 720 } 
        },
        audio: false,
      });

      // 2. Fallback: Try any back camera
      if (!stream) {
        stream = await getStream({
          video: { facingMode: 'environment' },
          audio: false,
        });
      }

      // 3. Fallback: Try any camera (e.g. laptop webcam)
      if (!stream) {
        stream = await getStream({
          video: true,
          audio: false,
        });
      }

      if (!stream) {
        throw new Error('No camera accessible. Please check permissions and devices.');
      }

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        // Ensure video plays (some browsers require explicit play() after assignment)
        try {
           await videoRef.current.play();
        } catch (e) {
           console.error('Error playing video:', e);
        }
        setIsStreaming(true);
        setError('');
      } 
    } catch (err: any) {
      console.error('Error accessing camera:', err);
      let msg = 'Unable to access camera.';
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
         msg = 'Camera permission denied. Please reset permissions for this site.';
      } else if (err.name === 'NotFoundError') {
         msg = 'No camera device found.';
      } else if (err.name === 'NotReadableError') {
         msg = 'Camera is in use by another app.';
      }
      setError(msg);
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((track) => track.stop());
      videoRef.current.srcObject = null;
      setIsStreaming(false);
    }
  };

  const captureImage = async (mode: 'problem' | 'step' = 'problem') => {
    if (isCaptureInFlightRef.current) {
      return;
    }

    isCaptureInFlightRef.current = true;

    try {
      if (videoRef.current && canvasRef.current) {
        const video = videoRef.current;
        const canvas = canvasRef.current;
        const context = canvas.getContext('2d');

        // Check if video is ready with valid dimensions
        if (video.videoWidth === 0 || video.videoHeight === 0) {
          setError('Camera not ready yet. Please wait a moment and try again.');
          return;
        }

        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;

        if (context) {
          context.drawImage(video, 0, 0, canvas.width, canvas.height);
          const imageData = canvas.toDataURL('image/jpeg', 0.8);
          setError(''); // Clear any previous errors
          await onCapture(imageData, mode);
        }
      } else {
        setError('Camera not initialized. Please start the camera first.');
      }
    } finally {
      isCaptureInFlightRef.current = false;
    }
  };

  const captureStep = async () => {
    if (!isStreaming || !hasProblem) {
      setError('Capture the problem first, then capture your step.');
      return;
    }
    await captureImage('step');
  };

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  return (
    <div className="w-full bg-gray-900 rounded-lg overflow-hidden shadow-lg">
      <div className="relative aspect-video bg-gray-800">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="w-full h-full object-cover"
        />
        <canvas ref={canvasRef} className="hidden" />

        {!isStreaming && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-800">
            <div className="text-center">
              <CameraOff className="w-16 h-16 text-gray-500 mx-auto mb-4" />
              <p className="text-gray-400 mb-4">Camera not started</p>
            </div>
          </div>
        )}

        {error && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-800/90">
            <div className="text-center max-w-md px-4">
              <p className="text-red-400">{error}</p>
            </div>
          </div>
        )}
      </div>

      <div className="p-4 bg-gray-900 flex gap-3 justify-center">
        {!isStreaming ? (
          <Button onClick={startCamera} size="lg" className="gap-2">
            <Camera className="w-5 h-5" />
            Start Camera
          </Button>
        ) : (
          <>
            <Button
              onClick={() => void captureImage('problem')}
              size="lg"
              className="gap-2 bg-green-600 hover:bg-green-700"
            >
              <Camera className="w-5 h-5" />
              Capture Problem
            </Button>
            <Button
              onClick={captureStep}
              size="lg"
              className="gap-2 bg-amber-600 hover:bg-amber-700"
            >
              <Camera className="w-5 h-5" />
              Capture Step
            </Button>
            <Button
              onClick={stopCamera}
              size="lg"
              variant="outline"
              className="gap-2"
            >
              <CameraOff className="w-5 h-5" />
              Stop Camera
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
