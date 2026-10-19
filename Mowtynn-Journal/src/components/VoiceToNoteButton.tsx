import React, { useState, useRef } from 'react';
import { AlertCircle, Mic, Square, Loader2 } from 'lucide-react';
import toast from "react-hot-toast";
import { MicrophonePermissionModal } from './MicrophonePermissionModal';
import { authFetch } from '../lib/api';

interface VoiceToNoteButtonProps {
  onParsed: (data: any) => void;
}

export const VoiceToNoteButton: React.FC<VoiceToNoteButtonProps> = ({ onParsed }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isError, setIsError] = useState(false);
  const [showPermissionModal, setShowPermissionModal] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const startRecording = async () => {
    setIsError(false);
    try {
      if (navigator.permissions && navigator.permissions.query) {
        try {
          const perm = await navigator.permissions.query({ name: 'microphone' as PermissionName });
          if (perm.state === 'denied') {
            setShowPermissionModal(true);
            return;
          }
        } catch {
          // Permission query unsupported or failed, proceed to getUserMedia
        }
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });
      const mimeType = MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : (MediaRecorder.isTypeSupported('audio/mp4') ? 'audio/mp4' : '');
      const recorderOptions = mimeType ? { mimeType } : {};
      const mediaRecorder = new MediaRecorder(stream, recorderOptions);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(chunksRef.current, { type: mediaRecorder.mimeType || 'audio/webm' });
        await processAudio(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err: any) {
      console.error("Mikrofona erişim hatası:", err);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError' || err.message?.includes('Permission denied') || err.message?.includes('denied')) {
        setShowPermissionModal(true);
      } else {
        toast.error("Mikrofona erişilemedi. Lütfen donanımınızı ve izinlerinizi kontrol edin.");
        setIsError(true);
      }
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setIsProcessing(true);
    }
  };

  const processAudio = async (audioBlob: Blob) => {
    const reader = new FileReader();
    reader.readAsDataURL(audioBlob);
    reader.onloadend = async () => {
      try {
        const base64Data = reader.result?.toString().split(',')[1];
        if (!base64Data) return;

        const res = await authFetch('/api/voice-to-note', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ audioBase64: base64Data })
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || "API Hatası");
        }

        const parsedData = await res.json();

        if (!parsedData || (!parsedData.content && !parsedData.title)) {
          throw new Error("Ses kaydından anlamlı bir veri çıkarılamadı.");
        }
        onParsed(parsedData);
      } catch (err: any) {
        console.error(err);
        toast.error(err.message || "Ses işlenirken bir hata oluştu.");
        setIsError(true);
      } finally {
        setIsProcessing(false);
      }
    };
  };

  return (
    <>
      <MicrophonePermissionModal
        isOpen={showPermissionModal}
        onClose={() => setShowPermissionModal(false)}
        onRetry={startRecording}
      />
      {isError ? (
        <button
          type="button"
          onClick={startRecording}
          className="h-9 w-9 flex items-center justify-center bg-red-950/80 text-red-400 hover:bg-red-900/60 border border-red-500/50 rounded-xl shrink-0 transition-colors"
        >
          <AlertCircle size={16} />
        </button>
      ) : isProcessing ? (
        <button
          type="button"
          disabled
          className="h-9 w-9 flex items-center justify-center bg-zinc-900 text-zinc-400 border border-zinc-800 rounded-xl shrink-0"
        >
          <Loader2 size={14} className="animate-spin text-zinc-300" />
        </button>
      ) : isRecording ? (
        <button
          type="button"
          onClick={stopRecording}
          className="h-9 w-9 flex items-center justify-center bg-red-950/80 text-red-400 border border-red-500/50 rounded-xl shrink-0 transition-colors"
        >
          <Square size={13} fill="currentColor" className="text-red-500" />
        </button>
      ) : (
        <button
          type="button"
          onClick={startRecording}
          className="h-9 w-9 flex items-center justify-center bg-zinc-900 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 border border-zinc-800 rounded-lg transition-colors duration-200 ease-out shrink-0"
        >
          <Mic size={16} />
        </button>
      )}
    </>
  );
};
