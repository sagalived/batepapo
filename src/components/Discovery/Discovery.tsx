import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, limit, doc, setDoc, getDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { motion, AnimatePresence } from 'motion/react';
import { Heart, X, MapPin, Info, MessageCircle } from 'lucide-react';
import { cn } from '../../lib/utils';

interface DiscoveryProps {
  onGoToProfile: () => void;
}

export default function Discovery({ onGoToProfile }: DiscoveryProps) {
  const { user, profile } = useAuth();
  const [profiles, setProfiles] = useState<any[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user && profile) {
      loadProfiles();
    }
  }, [user, profile]);

  const [direction, setDirection] = useState<number>(0);

  const loadProfiles = async () => {
    // Se for modo demo, não tenta buscar do Firestore para evitar erro de permissão
    if (user?.uid === 'guest_user_123') {
      setProfiles([
        {
          uid: 'mariana_uid',
          displayName: 'Mariana',
          neighborhood: 'Pinheiros',
          bio: 'Adoro conhecer novos lugares e pessoas!',
          photoURL: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=600&auto=format&fit=crop'
        },
        {
          uid: 'demo_user_2',
          displayName: 'Clara',
          neighborhood: 'Vila Madalena',
          bio: 'Arquiteta, amo sol e praia.',
          photoURL: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=600&auto=format&fit=crop&q=80'
        }
      ]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const q = query(
        collection(db, 'users'),
        where('uid', '!=', user?.uid),
        limit(20)
      );
      const snapshot = await getDocs(q);
      const docs = snapshot.docs.map(doc => doc.data());
      setProfiles(docs);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleLike = async (targetId: string) => {
    setDirection(1);
    if (!user) return;
    
    const likeId = `${user.uid}_${targetId}`;
    await setDoc(doc(db, 'likes', likeId), {
      fromId: user.uid,
      toId: targetId,
      createdAt: new Date().toISOString(),
    });

    const reverseLikeId = `${targetId}_${user.uid}`;
    const reverseLike = await getDoc(doc(db, 'likes', reverseLikeId));
    
    if (reverseLike.exists()) {
      const matchId = [user.uid, targetId].sort().join('_');
      await setDoc(doc(db, 'matches', matchId), {
        id: matchId,
        users: [user.uid, targetId],
        createdAt: new Date().toISOString(),
      });
      alert('É um Match! 🎉');
    }
    
    nextProfile();
  };

  const nextProfile = () => {
    setDirection(-1);
    setCurrentIndex(prev => prev + 1);
  };

  const variants = {
    enter: (direction: number) => ({
      x: direction > 0 ? 500 : direction < 0 ? -500 : 0,
      opacity: 0,
      scale: 0.8,
      rotate: direction > 0 ? 10 : direction < 0 ? -10 : 0,
    }),
    center: {
      zIndex: 1,
      x: 0,
      opacity: 1,
      scale: 1,
      rotate: 0,
    },
    exit: (direction: number) => ({
      zIndex: 0,
      x: direction > 0 ? 500 : direction < 0 ? -500 : 0,
      opacity: 0,
      scale: 0.8,
      rotate: direction > 0 ? 25 : direction < 0 ? -25 : 0,
    })
  };

  if (!profile?.neighborhood) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center bg-white">
        <div className="w-24 h-24 bg-pink-100 rounded-full flex items-center justify-center mb-6">
          <MapPin className="text-pink-500 w-12 h-12" />
        </div>
        <h2 className="text-2xl font-bold text-gray-800">Complete seu perfil</h2>
        <p className="text-gray-500 mt-2">Informe seu bairro para ver pessoas próximas!</p>
        <button 
          onClick={onGoToProfile}
          className="mt-6 px-8 py-3 bg-pink-500 text-white rounded-xl font-bold shadow-lg hover:shadow-pink-200 transition-all active:scale-95"
        >
          Configurar Bairro
        </button>
      </div>
    );
  }

  if (loading) return <div className="flex items-center justify-center h-full">Carregando pessoas próximas...</div>;

  if (currentIndex >= profiles.length) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center">
        <div className="w-24 h-24 bg-pink-100 rounded-full flex items-center justify-center mb-4">
          <MapPin className="text-pink-500 w-12 h-12" />
        </div>
        <h2 className="text-2xl font-bold text-gray-800">Acabaram as pessoas por perto</h2>
        <p className="text-gray-500 mt-2">Tente mudar seu bairro ou volte mais tarde!</p>
        <button 
          onClick={loadProfiles}
          className="mt-6 px-6 py-2 bg-pink-500 text-white rounded-full font-bold shadow-lg hover:bg-pink-600 transition-colors"
        >
          Recarregar
        </button>
      </div>
    );
  }

  const currentProfile = profiles[currentIndex];

  return (
    <div className="relative w-full h-full flex flex-col items-center justify-center p-4">
      <AnimatePresence mode="popLayout" custom={direction}>
        <motion.div
          key={currentProfile.uid}
          custom={direction}
          variants={variants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{
            x: { type: "spring", stiffness: 300, damping: 30 },
            opacity: { duration: 0.2 },
            scale: { duration: 0.3 }
          }}
          className="relative w-full max-w-lg h-[550px] bg-brand-nav rounded-[40px] shadow-2xl overflow-hidden touch-none"
        >
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent z-10"></div>
          
          {currentProfile.photoURL ? (
            <img 
              src={currentProfile.photoURL} 
              alt={currentProfile.displayName}
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="w-full h-full bg-brand-text flex items-center justify-center">
              <span className="text-white opacity-20 text-9xl font-black italic uppercase">
                {currentProfile.displayName[0]}
              </span>
            </div>
          )}

          <div className="absolute bottom-0 left-0 right-0 p-10 z-20 text-white">
            <div className="flex justify-between items-end flex-wrap gap-4">
              <div className="flex-1 min-w-[200px]">
                <h2 className="text-4xl font-bold mb-2">{currentProfile.displayName}</h2>
                <p className="text-lg opacity-90 mb-4 flex items-center gap-1">
                   <MapPin size={18} className="text-brand-primary" /> {currentProfile.neighborhood || 'Bairro indefinido'}
                </p>
                <div className="flex flex-wrap gap-2">
                  <span className="px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-xs">Conexão Natural</span>
                  <span className="px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-xs">Perto de você</span>
                </div>
              </div>
              
              <div className="flex gap-4">
                <button
                  onClick={nextProfile}
                  className="w-16 h-16 bg-white rounded-full flex items-center justify-center text-brand-text shadow-xl hover:scale-110 transition-transform active:scale-95"
                >
                  <X size={32} strokeWidth={2.5} />
                </button>
                <button
                  onClick={() => handleLike(currentProfile.uid)}
                  className="w-20 h-20 bg-brand-primary rounded-full flex items-center justify-center text-white shadow-xl hover:scale-110 transition-transform active:scale-95"
                >
                  <Heart size={40} fill="currentColor" />
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
