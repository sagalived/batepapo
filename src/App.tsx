import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { signInWithGoogle, auth, db } from './lib/firebase';
import Discovery from './components/Discovery/Discovery';
import MatchList from './components/Chat/MatchList';
import ChatWindow from './components/Chat/ChatWindow';
import ProfileEdit from './components/Profile/ProfileEdit';
import VideoCall from './components/Video/VideoCall';
import { Heart, MessageSquare, User, LogOut, Video, Bell, MapPin } from 'lucide-react';
import { cn } from './lib/utils';
import { collection, query, where, onSnapshot, addDoc, doc, updateDoc, deleteDoc } from 'firebase/firestore';

function AppContent() {
  const { user, profile, loading } = useAuth();
  const [activeTab, setActiveTab] = useState<'discovery' | 'chats' | 'profile'>('chats');
  const [selectedMatch, setSelectedMatch] = useState<any>({
    id: 'demo_match_mariana',
    users: ['guest_user_123', 'mariana_uid'],
    otherUser: {
      uid: 'mariana_uid',
      displayName: 'Mariana',
      neighborhood: 'Pinheiros',
      bio: 'Apaixonada por design, café e boas conversas.',
      photoURL: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=300&auto=format&fit=crop'
    }
  });
  const [activeCall, setActiveCall] = useState<any>(null);
  const [incomingCall, setIncomingCall] = useState<any>(null);

  // Listen for incoming calls
  useEffect(() => {
    if (!user || user.uid === 'guest_user_123') return;
    
    const q = query(
      collection(db, 'calls'),
      where('receiverId', '==', user.uid),
      where('status', '==', 'calling')
    );

    return onSnapshot(q, (snap) => {
      if (!snap.empty) {
        const callData = { id: snap.docs[0].id, ...snap.docs[0].data() };
        setIncomingCall(callData);
      } else {
        setIncomingCall(null);
      }
    });
  }, [user]);

  if (loading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-brand-bg">
        <div className="flex flex-col items-center gap-4">
          <Heart className="text-brand-primary animate-bounce" size={48} fill="currentColor" />
          <p className="text-brand-primary font-bold tracking-widest uppercase text-sm">Amigo</p>
        </div>
      </div>
    );
  }

  // Comentado para desabilitar a tela de login no momento
  /*
  if (!user) {
    // ...
  }
  */

  const startCall = async (match: any) => {
    const callData = {
      callerId: user.uid,
      receiverId: match.otherUser.uid,
      status: 'calling',
      createdAt: new Date().toISOString(),
    };
    const callRef = await addDoc(collection(db, 'calls'), callData);
    setActiveCall({ ...callData, id: callRef.id, otherUser: match.otherUser, isCaller: true });
  };

  const acceptCall = async () => {
    if (!incomingCall) return;
    await updateDoc(doc(db, 'calls', incomingCall.id), { status: 'ongoing' });
    // Need otherUser info for the call UI
    // For simplicity, we'll assume we can get it or just show ID
    setActiveCall({ ...incomingCall, isCaller: false, otherUser: { displayName: 'Recebendo...', uid: incomingCall.callerId } });
    setIncomingCall(null);
  };

  const declineCall = async () => {
    if (!incomingCall) return;
    await updateDoc(doc(db, 'calls', incomingCall.id), { status: 'declined' });
    setIncomingCall(null);
  };

  return (
    <div className="h-screen w-screen bg-brand-bg flex flex-col md:flex-row relative overflow-hidden font-sans">
      {/* Incoming Call Notification */}
      {incomingCall && (
        <div className="absolute top-6 right-6 z-50 w-72 bg-white/95 backdrop-blur shadow-2xl border border-brand-primary/20 rounded-2xl p-4 flex items-center gap-3 animate-slide-in">
          <div className="w-10 h-10 bg-brand-primary rounded-lg flex items-center justify-center text-white shrink-0">
             <Video size={24} />
          </div>
          <div className="flex-1">
            <p className="text-xs font-bold text-brand-text">Chamada de vídeo!</p>
            <div className="flex gap-2 mt-2">
              <button onClick={declineCall} className="text-[10px] font-bold text-brand-muted hover:text-red-500 transition-colors uppercase">Recusar</button>
              <button onClick={acceptCall} className="text-[10px] font-bold text-brand-primary hover:text-brand-primary/80 transition-colors uppercase">Atender</button>
            </div>
          </div>
        </div>
      )}

      {/* Video Call Modal */}
      {activeCall && (
        <VideoCall 
          callId={activeCall.id}
          isCaller={activeCall.isCaller}
          otherUser={activeCall.otherUser}
          onEnd={() => setActiveCall(null)}
        />
      )}

      {/* Navigation Sidebar (Desktop) / Bottom Nav (Mobile) */}
      <nav className="z-30 w-full md:w-24 h-20 md:h-full bg-brand-nav bg-opacity-30 border-t md:border-t-0 md:border-r border-brand-primary border-opacity-10 flex md:flex-col items-center justify-around md:justify-start md:py-8 md:gap-10 order-last md:order-first">
        <div className="hidden md:flex w-12 h-12 bg-brand-primary rounded-2xl items-center justify-center shadow-lg shadow-brand-primary/30">
          <Heart className="text-white w-7 h-7" fill="currentColor" />
        </div>
        
        <div className="flex md:flex-col gap-8 items-center justify-around w-full md:w-auto">
          <button
            onClick={() => setActiveTab('discovery')}
            className={cn("p-3 transition-all", activeTab === 'discovery' ? "bg-white bg-opacity-50 rounded-xl text-brand-primary shadow-sm" : "text-brand-text opacity-40 hover:opacity-100")}
          >
            <Heart size={28} />
          </button>
          
          <button
            onClick={() => setActiveTab('chats')}
            className={cn("p-3 transition-all", activeTab === 'chats' ? "bg-white bg-opacity-50 rounded-xl text-brand-primary shadow-sm" : "text-brand-text opacity-40 hover:opacity-100")}
          >
            <MessageSquare size={28} />
          </button>
          
          <button
            onClick={() => setActiveTab('profile')}
            className={cn("p-3 transition-all", activeTab === 'profile' ? "bg-white bg-opacity-50 rounded-xl text-brand-primary shadow-sm" : "text-brand-text opacity-40 hover:opacity-100")}
          >
            <User size={28} />
          </button>

          <button
            onClick={() => auth.signOut()}
            className="p-3 text-brand-text opacity-40 hover:text-red-500 hover:opacity-100 transition-all"
          >
            <LogOut size={28} />
          </button>
        </div>

        <div className="hidden md:block mt-auto mb-4">
          <div className="w-10 h-10 bg-brand-accent rounded-full border-2 border-white shadow-sm overflow-hidden bg-gray-200">
            {profile?.photoURL && <img src={profile.photoURL} alt="Me" className="w-full h-full object-cover" />}
          </div>
        </div>
      </nav>

      <main className="flex-1 overflow-hidden relative p-4 md:p-8 flex flex-col">
        <header className="mb-6 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-brand-text">
              {activeTab === 'discovery' ? 'Pessoas Próximas' : activeTab === 'chats' ? 'Suas Mensagens' : 'Seu Perfil'}
            </h1>
            {activeTab === 'discovery' && (
              <p className="text-brand-muted text-sm flex items-center gap-1">
                <MapPin className="w-4 h-4 text-brand-primary" /> {profile?.neighborhood || 'Configure seu bairro'}
              </p>
            )}
          </div>
        </header>

        <div className="flex-1 overflow-hidden">
          {activeTab === 'discovery' && <Discovery onGoToProfile={() => setActiveTab('profile')} />}
          {activeTab === 'chats' && (
            <div className="h-full flex gap-6">
              <aside className={cn("w-full md:w-80 flex flex-col", selectedMatch && "hidden md:flex")}>
                <MatchList 
                  onSelectMatch={setSelectedMatch} 
                  selectedMatchId={selectedMatch?.id}
                />
              </aside>
              {selectedMatch && (
                <div className="flex-1 h-full z-40 md:z-0 fixed md:relative inset-0 md:rounded-[32px] overflow-hidden shadow-2xl border border-brand-primary border-opacity-5 bg-white">
                  <ChatWindow 
                    match={selectedMatch} 
                    onBack={() => setSelectedMatch(null)}
                    onStartCall={startCall}
                  />
                </div>
              )}
            </div>
          )}
          {activeTab === 'profile' && <ProfileEdit />}
        </div>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
