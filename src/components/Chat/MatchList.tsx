import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, doc, getDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { MessageCircle, Video } from 'lucide-react';
import { cn } from '../../lib/utils';

interface MatchListProps {
  onSelectMatch: (match: any) => void;
  selectedMatchId?: string;
}

export default function MatchList({ onSelectMatch, selectedMatchId }: MatchListProps) {
  const { user } = useAuth();
  const [matches, setMatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    // Se for visitante, não tenta ler matches do Firestore para evitar erro de permissão
    if (user.uid === 'guest_user_123') {
      const demoMatch = {
        id: 'demo_match_mariana',
        users: [user.uid, 'mariana_uid'],
        lastMessage: 'Oi! Adorei seu perfil, vamos conversar? 😊',
        lastMessageAt: new Date().toISOString(),
        otherUser: {
          uid: 'mariana_uid',
          displayName: 'Mariana',
          neighborhood: 'Pinheiros',
          bio: 'Apaixonada por design, café e boas conversas. Sorrir é o meu segredo!',
          photoURL: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=300&auto=format&fit=crop'
        }
      };
      setMatches([demoMatch]);
      setLoading(false);
      return;
    }

    const q = query(
      collection(db, 'matches'),
      where('users', 'array-contains', user.uid)
    );

    return onSnapshot(q, async (snapshot) => {
      const matchData = await Promise.all(
        snapshot.docs.map(async (matchDoc) => {
          const data = matchDoc.data();
          const otherUserId = data.users.find((id: string) => id !== user.uid);
          const otherUserSnap = await getDoc(doc(db, 'users', otherUserId));
          return {
            ...data,
            id: matchDoc.id,
            otherUser: otherUserSnap.exists() ? otherUserSnap.data() : { displayName: 'Usuário' }
          };
        })
      );
      setMatches(matchData);
      setLoading(false);
    });
  }, [user]);

  if (loading) return <div className="p-4 text-center">Carregando conversas...</div>;

  if (matches.length === 0) {
    return (
      <div className="p-8 text-center text-gray-500">
        <p>Ainda não há matches.</p>
        <p className="text-sm">Comece a dar likes no Discovery!</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-white rounded-3xl overflow-hidden border border-brand-primary/5">
      <div className="p-6 border-b border-brand-primary border-opacity-10">
        <h3 className="text-lg font-bold text-brand-text">Conversas</h3>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {matches.map((match) => (
          <button
            key={match.id}
            onClick={() => onSelectMatch(match)}
            className={cn(
              "w-full flex items-center gap-4 p-3 rounded-2xl transition-all relative group",
              selectedMatchId === match.id 
                ? "bg-brand-nav bg-opacity-20 shadow-sm" 
                : "hover:bg-brand-bg"
            )}
          >
            <div className="relative w-12 h-12 rounded-full overflow-hidden bg-brand-text flex-shrink-0">
              {match.otherUser.photoURL ? (
                <img src={match.otherUser.photoURL} alt={match.otherUser.displayName} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center font-bold text-white opacity-40">
                  {match.otherUser.displayName[0]}
                </div>
              )}
            </div>
            <div className="flex-1 text-left overflow-hidden">
              <div className="flex justify-between items-center mb-0.5">
                <span className="font-semibold text-sm text-brand-text">{match.otherUser.displayName}</span>
                <span className="text-[10px] text-brand-muted">
                  {match.lastMessageAt ? new Date(match.lastMessageAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                </span>
              </div>
              <p className="text-xs text-brand-muted truncate">{match.lastMessage || 'Dê um oi!'}</p>
            </div>
            {selectedMatchId === match.id && (
              <div className="absolute left-0 top-1/4 bottom-1/4 w-1 bg-brand-primary rounded-full"></div>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
