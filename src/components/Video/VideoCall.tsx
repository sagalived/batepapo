import React, { useEffect, useRef, useState } from 'react';
import { Camera, CameraOff, Mic, MicOff, PhoneOff, Video } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { db } from '../../lib/firebase';
import { doc, onSnapshot, updateDoc, deleteDoc } from 'firebase/firestore';
import { cn } from '../../lib/utils';

interface VideoCallProps {
  callId: string;
  onEnd: () => void;
  isCaller: boolean;
  otherUser: any;
}

export default function VideoCall({ callId, onEnd, isCaller, otherUser }: VideoCallProps) {
  const { user } = useAuth();
  
  // Para a demo, se o otherUser for Mariana, usamos a foto dela sorrindo
  const displayUser = otherUser.uid === 'mariana_uid' ? {
    displayName: 'Mariana',
    photoURL: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=600&auto=format&fit=crop'
  } : otherUser;

  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const [isMicOn, setIsMicOn] = useState(true);
  const [isCamOn, setIsCamOn] = useState(true);

  useEffect(() => {
    async function setupMedia() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        setLocalStream(stream);
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }
      } catch (err) {
        console.error("Erro ao acessar câmera/microfone:", err);
      }
    }

    setupMedia();

    // Listen for call status
    const unsub = onSnapshot(doc(db, 'calls', callId), (snap) => {
      if (!snap.exists() || snap.data().status === 'ended' || snap.data().status === 'declined') {
        cleanup();
        onEnd();
      }
    });

    return () => {
      cleanup();
      unsub();
    };
  }, [callId]);

  const cleanup = () => {
    localStream?.getTracks().forEach(track => track.stop());
  };

  const handleEndCall = async () => {
    await updateDoc(doc(db, 'calls', callId), { status: 'ended' });
    setTimeout(() => deleteDoc(doc(db, 'calls', callId)), 2000);
    onEnd();
  };

  const toggleMic = () => {
    if (localStream) {
      localStream.getAudioTracks()[0].enabled = !isMicOn;
      setIsMicOn(!isMicOn);
    }
  };

  const toggleCam = () => {
    if (localStream) {
      localStream.getVideoTracks()[0].enabled = !isCamOn;
      setIsCamOn(!isCamOn);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black flex flex-col items-center justify-center">
      {/* Remote View (Simulated for Now in Preview) */}
      <div className="absolute inset-0 bg-slate-900 overflow-hidden flex flex-col items-center justify-center">
        {displayUser.photoURL ? (
          <img 
            src={displayUser.photoURL} 
            className="w-full h-full object-cover opacity-50 blur-sm" 
            alt="Other user"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-pink-900 opacity-50">
             <Video size={100} className="text-pink-300 animate-pulse" />
          </div>
        )}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center text-white">
          <div className="w-24 h-24 rounded-full border-4 border-brand-primary overflow-hidden mx-auto mb-4 bg-gray-700">
             <img src={displayUser.photoURL} className="w-full h-full object-cover" />
          </div>
          <h2 className="text-2xl font-bold">{displayUser.displayName}</h2>
          <p className="text-brand-accent animate-pulse">Conectando chamada de vídeo...</p>
        </div>
      </div>

      {/* Local View */}
      <div className="absolute top-8 right-8 w-32 h-48 bg-black rounded-lg border-2 border-white/20 overflow-hidden shadow-2xl">
        <video 
          ref={localVideoRef} 
          autoPlay 
          muted 
          playsInline 
          className="w-full h-full object-cover mirror"
        />
        {!isCamOn && (
           <div className="absolute inset-0 bg-gray-900 flex items-center justify-center">
              <CameraOff className="text-white" size={24} />
           </div>
        )}
      </div>

      {/* Controls */}
      <div className="absolute bottom-12 flex items-center gap-6 p-6 rounded-full bg-white/10 backdrop-blur-md border border-white/20">
        <button 
          onClick={toggleMic}
          className={cn(
            "w-12 h-12 rounded-full flex items-center justify-center transition-all",
            isMicOn ? "bg-white/20 text-white" : "bg-red-500 text-white"
          )}
        >
          {isMicOn ? <Mic size={24} /> : <MicOff size={24} />}
        </button>
        <button 
          onClick={handleEndCall}
          className="w-16 h-16 rounded-full bg-red-600 text-white flex items-center justify-center hover:bg-red-700 hover:scale-110 transition-all shadow-lg"
        >
          <PhoneOff size={32} />
        </button>
        <button 
          onClick={toggleCam}
          className={cn(
            "w-12 h-12 rounded-full flex items-center justify-center transition-all",
            isCamOn ? "bg-white/20 text-white" : "bg-red-500 text-white"
          )}
        >
          {isCamOn ? <Camera size={24} /> : <CameraOff size={24} />}
        </button>
      </div>
    </div>
  );
}
