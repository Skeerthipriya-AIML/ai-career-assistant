import React, { useEffect, useRef, useState } from 'react';
import { Camera, CameraOff, Video } from 'lucide-react';

export const VideoFeed: React.FC = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [streamActive, setStreamActive] = useState<boolean>(false);
  const [permissionError, setPermissionError] = useState<boolean>(false);

  // Live telemetry metrics
  const [attention, setAttention] = useState<number>(95);
  const [smile, setSmile] = useState<number>(10);
  const [stress, setStress] = useState<number>(20);
  const [eyeContact, setEyeContact] = useState<number>(92);

  // Toggle Webcam
  const startWebcam = async () => {
    setPermissionError(false);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480 } });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
        setStreamActive(true);
      }
    } catch (err) {
      console.error("Camera access blocked:", err);
      setPermissionError(true);
    }
  };

  const stopWebcam = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((track) => track.stop());
      videoRef.current.srcObject = null;
      setStreamActive(false);
    }
  };

  useEffect(() => {
    return () => {
      // Clean up stream on unmount
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  // Frame processing loop drawing mock tracking indicators
  useEffect(() => {
    if (!streamActive) return;

    let frameId: number;
    const canvas = canvasRef.current;
    const video = videoRef.current;

    const drawFrame = () => {
      if (!canvas || !video) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Draw the video frame to the canvas
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      // Simulating dynamic face tracking bounding box
      const boxWidth = 240;
      const boxHeight = 240;
      const boxX = (canvas.width - boxWidth) / 2 + Math.sin(Date.now() / 400) * 8; // add minor float jitter
      const boxY = (canvas.height - boxHeight) / 2 + Math.cos(Date.now() / 500) * 6;

      // Draw bounding box
      ctx.strokeStyle = '#545eff'; // brand color
      ctx.lineWidth = 3;
      ctx.setLineDash([20, 10]); // animated dashes
      ctx.strokeRect(boxX, boxY, boxWidth, boxHeight);
      ctx.setLineDash([]); // reset

      // Draw corners indicators
      ctx.fillStyle = '#545eff';
      const cornerLen = 15;
      // top-left
      ctx.fillRect(boxX - 2, boxY - 2, cornerLen, 4);
      ctx.fillRect(boxX - 2, boxY - 2, 4, cornerLen);
      // top-right
      ctx.fillRect(boxX + boxWidth - cornerLen + 2, boxY - 2, cornerLen, 4);
      ctx.fillRect(boxX + boxWidth - 2, boxY - 2, 4, cornerLen);
      // bottom-left
      ctx.fillRect(boxX - 2, boxY + boxHeight - 2, cornerLen, 4);
      ctx.fillRect(boxX - 2, boxY + boxHeight - cornerLen + 2, 4, cornerLen);
      // bottom-right
      ctx.fillRect(boxX + boxWidth - cornerLen + 2, boxY + boxHeight - 2, cornerLen, 4);
      ctx.fillRect(boxX + boxWidth - 2, boxY + boxHeight - cornerLen + 2, 4, cornerLen);

      // Draw scanning tag
      ctx.fillStyle = 'rgba(84, 94, 255, 0.85)';
      ctx.font = 'bold 10px Inter, monospace';
      ctx.fillText('FACIAL COGNITIVE SCAN: OK', boxX, boxY - 8);

      // Oscillate mock metrics
      setAttention(Math.floor(90 + Math.sin(Date.now() / 1000) * 4));
      setSmile(Math.floor(15 + Math.cos(Date.now() / 2000) * 10));
      setStress(Math.floor(18 + Math.sin(Date.now() / 1500) * 6));
      setEyeContact(Math.floor(88 + Math.cos(Date.now() / 800) * 5));

      frameId = requestAnimationFrame(drawFrame);
    };

    drawFrame();

    return () => {
      cancelAnimationFrame(frameId);
    };
  }, [streamActive]);

  return (
    <div className="flex flex-col bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl p-4 w-full">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          <Video className="text-brand-400" size={16} />
          <span className="text-xs font-semibold text-slate-300">Live Feedback Camera Feed</span>
        </div>
        <button
          onClick={streamActive ? stopWebcam : startWebcam}
          className={`flex items-center space-x-1.5 px-3 py-1 rounded text-xs font-semibold text-white transition ${
            streamActive ? 'bg-red-600 hover:bg-red-700' : 'bg-brand-500 hover:bg-brand-600'
          }`}
        >
          {streamActive ? (
            <>
              <CameraOff size={12} />
              <span>Turn Off</span>
            </>
          ) : (
            <>
              <Camera size={12} />
              <span>Turn On Camera</span>
            </>
          )}
        </button>
      </div>

      {/* Main Canvas view */}
      <div className="relative bg-slate-950 aspect-video rounded-lg border border-slate-800 overflow-hidden flex items-center justify-center">
        <video ref={videoRef} className="hidden" playsInline muted />
        <canvas ref={canvasRef} width={480} height={270} className="w-full h-full object-cover" />

        {!streamActive && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-500 p-4 text-center">
            <CameraOff size={32} className="mb-2 text-slate-600" />
            {permissionError ? (
              <span className="text-xs text-red-400 font-medium">Camera access blocked by browser permissions.</span>
            ) : (
              <span className="text-xs">Turn on camera to enable simulated attention and emotion monitoring telemetry.</span>
            )}
          </div>
        )}
      </div>

      {/* Telemetry telemetry widgets */}
      {streamActive && (
        <div className="grid grid-cols-2 gap-3 mt-4">
          <div className="bg-slate-950 p-2.5 rounded border border-slate-800/80">
            <span className="text-[9px] uppercase font-bold text-slate-500 tracking-wider">Attention Factor</span>
            <div className="flex items-center justify-between mt-1">
              <span className="text-sm font-semibold text-teal-400">{attention}%</span>
              <span className="text-[10px] text-slate-400">Target: &gt;90%</span>
            </div>
          </div>
          <div className="bg-slate-950 p-2.5 rounded border border-slate-800/80">
            <span className="text-[9px] uppercase font-bold text-slate-500 tracking-wider">Stress Index</span>
            <div className="flex items-center justify-between mt-1">
              <span className="text-sm font-semibold text-orange-400">{stress}%</span>
              <span className="text-[10px] text-slate-400">Target: &lt;30%</span>
            </div>
          </div>
          <div className="bg-slate-950 p-2.5 rounded border border-slate-800/80">
            <span className="text-[9px] uppercase font-bold text-slate-500 tracking-wider">Smile Value</span>
            <div className="flex items-center justify-between mt-1">
              <span className="text-sm font-semibold text-brand-400">{smile}%</span>
              <span className="text-[10px] text-slate-400">Friendly Indicator</span>
            </div>
          </div>
          <div className="bg-slate-950 p-2.5 rounded border border-slate-800/80">
            <span className="text-[9px] uppercase font-bold text-slate-500 tracking-wider">Eye Contact Ratios</span>
            <div className="flex items-center justify-between mt-1">
              <span className="text-sm font-semibold text-teal-400">{eyeContact}%</span>
              <span className="text-[10px] text-slate-400">Camera Focus</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
