import React, { useState, useEffect, useRef } from 'react';
import { collection, query, orderBy, onSnapshot, addDoc, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { Send, ArrowLeft, Video, Phone, Lock, MessageCircle } from 'lucide-react';
import { cn } from '../../lib/utils';
import { format } from 'date-fns';
import PrivateVault from './PrivateVault';

interface ChatWindowProps {
  match: any;
  onBack: () => void;
  onStartCall: (match: any) => void;
}

export default function ChatWindow({ match, onBack, onStartCall }: ChatWindowProps) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<any[]>([]);
  const [inputText, setInputText] = useState('');
  const [activeTab, setActiveTab] = useState<'chat' | 'vault'>('chat');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!match) return;

    // Se for o match da demo, usamos mensagens estáticas para evitar erro de permissão
    if (match.id === 'demo_match_mariana') {
      setMessages([
        {
          id: '1',
          senderId: 'mariana_uid',
          text: 'Oi! Adorei seu perfil, vamos conversar? 😊',
          createdAt: new Date(Date.now() - 1000 * 60 * 5).toISOString()
        }
      ]);
      return;
    }

    const q = query(
      collection(db, 'matches', match.id, 'messages'),
      orderBy('createdAt', 'asc')
    );

    return onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setMessages(msgs);
    });
  }, [match]);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !user) return;

    const text = inputText;
    setInputText('');

    try {
      await addDoc(collection(db, 'matches', match.id, 'messages'), {
        senderId: user.uid,
        text,
        createdAt: new Date().toISOString()
      });

      await updateDoc(doc(db, 'matches', match.id), {
        lastMessage: text,
        lastMessageAt: new Date().toISOString()
      });
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="flex flex-col h-full bg-brand-bg">
      {/* Header */}
      <div className="flex items-center gap-3 p-6 bg-white border-b border-brand-primary border-opacity-5">
        <button onClick={onBack} className="p-2 hover:bg-brand-bg rounded-full md:hidden text-brand-muted">
          <ArrowLeft size={24} />
        </button>
        <div className="w-12 h-12 rounded-full overflow-hidden bg-brand-nav bg-opacity-20 flex-shrink-0">
          <img 
            src={match.otherUser.photoURL || 'https://via.placeholder.com/150'} 
            className="w-full h-full object-cover" 
            alt={match.otherUser.displayName} 
          />
        </div>
        <div className="flex-1">
          <h3 className="font-bold text-brand-text">{match.otherUser.displayName}</h3>
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 bg-brand-accent rounded-full animate-pulse"></span>
            <p className="text-[10px] text-brand-accent font-bold uppercase tracking-wider">Ao Vivo • Online</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={() => setActiveTab(activeTab === 'chat' ? 'vault' : 'chat')}
            className={cn(
              "w-10 h-10 flex items-center justify-center rounded-xl transition-all",
              activeTab === 'vault' 
                ? "bg-brand-primary text-white shadow-lg shadow-brand-primary/20" 
                : "bg-brand-primary/10 text-brand-primary hover:bg-brand-primary/20"
            )}
            title={activeTab === 'chat' ? "Ver Cofre" : "Ver Chat"}
          >
            {activeTab === 'chat' ? <Lock size={18} /> : <MessageCircle size={18} />}
          </button>
          <button 
            onClick={() => onStartCall(match)}
            className="w-10 h-10 flex items-center justify-center bg-brand-accent bg-opacity-10 text-brand-accent hover:bg-brand-accent hover:text-white rounded-xl transition-all"
          >
            <Video size={20} />
          </button>
        </div>
      </div>

      {activeTab === 'chat' ? (
        <>
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {messages.map((msg) => {
              const isMine = msg.senderId === user?.uid;
              return (
                <div key={msg.id} className={cn("flex", isMine ? "justify-end" : "justify-start")}>
                  <div className={cn(
                    "max-w-[80%] p-4 rounded-3xl text-sm shadow-sm",
                    isMine 
                      ? "bg-brand-primary text-white rounded-br-none shadow-brand-primary/10" 
                      : "bg-white text-brand-text rounded-bl-none border border-brand-primary/5"
                  )}>
                    <p className="leading-relaxed">{msg.text}</p>
                    <p className={cn("text-[9px] mt-2 font-medium tracking-tighter uppercase opacity-60", isMine ? "text-right" : "text-left")}>
                      {msg.createdAt ? format(new Date(msg.createdAt), 'HH:mm') : ''}
                    </p>
                  </div>
                </div>
              );
            })}
            <div ref={scrollRef} />
          </div>

          {/* Input */}
          <form onSubmit={handleSendMessage} className="p-6 bg-white border-t border-brand-primary border-opacity-5 flex gap-4">
            <input 
              type="text" 
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Comece a digitar..."
              className="flex-1 bg-brand-bg rounded-2xl px-5 py-3 text-sm text-brand-text border-none focus:ring-2 focus:ring-brand-primary outline-none transition-all"
            />
            <button 
              type="submit"
              className="w-12 h-12 bg-brand-primary text-white rounded-2xl flex items-center justify-center hover:scale-105 shadow-lg shadow-brand-primary/20 transition-all active:scale-95"
            >
              <Send size={20} />
            </button>
          </form>
        </>
      ) : (
        <PrivateVault ownerId={match.otherUser.uid} isOwner={false} />
      )}
    </div>
  );
}
