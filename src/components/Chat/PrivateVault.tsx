import React, { useState, useEffect } from 'react';
import { Lock, Unlock, Image as ImageIcon, Check, X, Clock, Upload, Trash2 } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { db } from '../../lib/firebase';
import { collection, query, where, onSnapshot, doc, setDoc, updateDoc, addDoc, getDocs, deleteDoc, getDoc } from 'firebase/firestore';
import { cn } from '../../lib/utils';

interface Photo {
  id: string;
  url: string;
  ownerId: string;
}

interface PhotoAccess {
  id: string;
  requesterId: string;
  ownerId: string;
  status: 'pending' | 'approved' | 'rejected';
}

interface PrivateVaultProps {
  ownerId: string;
  isOwner?: boolean;
}

export default function PrivateVault({ ownerId, isOwner = false }: PrivateVaultProps) {
  const { user } = useAuth();
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [access, setAccess] = useState<PhotoAccess | null>(null);
  const [loading, setLoading] = useState(true);
  const [pendingRequests, setPendingRequests] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;

    // Load photos
    const photosRef = collection(db, 'users', ownerId, 'photos');
    const unsubscribePhotos = onSnapshot(photosRef, (snapshot) => {
      setPhotos(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Photo)));
    }, (err) => {
      // Expected if not owner and not approved
      console.log("Photo access restricted");
    });

    if (!isOwner) {
      // Check access status
      const accessDocId = `${user.uid}_${ownerId}`;
      const unsubscribeAccess = onSnapshot(doc(db, 'photoAccess', accessDocId), (docSnap) => {
        if (docSnap.exists()) {
          setAccess({ id: docSnap.id, ...docSnap.data() } as PhotoAccess);
        } else {
          setAccess(null);
        }
        setLoading(false);
      });
      return () => {
        unsubscribePhotos();
        unsubscribeAccess();
      };
    } else {
      // Load pending requests if owner
      const requestsQuery = query(
        collection(db, 'photoAccess'),
        where('ownerId', '==', user.uid),
        where('status', '==', 'pending')
      );
      
      const unsubscribeRequests = onSnapshot(requestsQuery, async (snapshot) => {
        const reqs = await Promise.all(snapshot.docs.map(async d => {
          const data = d.data();
          const userSnap = await getDoc(doc(db, 'users', data.requesterId));
          return {
            id: d.id,
            ...data,
            user: userSnap.exists() ? userSnap.data() : { displayName: 'Usuário' }
          };
        }));
        setPendingRequests(reqs);
        setLoading(false);
      });

      return () => {
        unsubscribePhotos();
        unsubscribeRequests();
      };
    }
  }, [user, ownerId, isOwner]);

  const requestAccess = async () => {
    if (!user) return;
    try {
      const accessDocId = `${user.uid}_${ownerId}`;
      await setDoc(doc(db, 'photoAccess', accessDocId), {
        requesterId: user.uid,
        ownerId: ownerId,
        status: 'pending',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
    } catch (err) {
      setError('Erro ao solicitar acesso.');
    }
  };

  const handleAction = async (requestId: string, status: 'approved' | 'rejected') => {
    try {
      await updateDoc(doc(db, 'photoAccess', requestId), {
        status,
        updatedAt: new Date().toISOString()
      });
    } catch (err) {
      setError('Erro ao atualizar solicitação.');
    }
  };

  const addPhoto = async () => {
    // Para demo, adicionamos uma foto estática
    const photosRef = collection(db, 'users', ownerId, 'photos');
    await addDoc(photosRef, {
      url: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=600&auto=format&fit=crop&q=80',
      ownerId: ownerId,
      createdAt: new Date().toISOString()
    });
  };

  const deletePhoto = async (id: string) => {
    await deleteDoc(doc(db, 'users', ownerId, 'photos', id));
  };

  if (loading) return <div className="p-8 text-center text-brand-muted">Carregando cofre...</div>;

  const canSeePhotos = isOwner || access?.status === 'approved';

  return (
    <div className="flex flex-col h-full bg-brand-bg">
      <div className="p-6 border-b border-brand-primary border-opacity-10 bg-white flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-brand-text flex items-center gap-2">
            {canSeePhotos ? <Unlock className="text-brand-accent" size={20} /> : <Lock className="text-brand-primary" size={20} />}
            Cofre de Fotos
          </h2>
          <p className="text-xs text-brand-muted">Fotos exclusivas e privadas</p>
        </div>
        {isOwner && (
          <button 
            onClick={addPhoto}
            className="p-2 bg-brand-primary text-white rounded-xl hover:scale-105 transition-all"
          >
            <Upload size={18} />
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        {isOwner && pendingRequests.length > 0 && (
          <div className="mb-8 space-y-4">
            <h3 className="text-sm font-bold text-brand-text uppercase tracking-wider flex items-center gap-2">
              <Clock size={16} className="text-brand-accent" />
              Solicitações Pendentes ({pendingRequests.length})
            </h3>
            <div className="grid gap-3">
              {pendingRequests.map(req => (
                <div key={req.id} className="bg-white p-4 rounded-2xl border border-brand-primary border-opacity-10 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-brand-primary/10 flex items-center justify-center font-bold text-brand-primary overflow-hidden">
                      {req.user.photoURL ? <img src={req.user.photoURL} className="w-full h-full object-cover" /> : req.user.displayName[0]}
                    </div>
                    <span className="font-semibold text-brand-text">{req.user.displayName} quer ver suas fotos</span>
                  </div>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => handleAction(req.id, 'approved')}
                      className="p-2 bg-brand-accent text-white rounded-lg hover:scale-110 transition-all"
                    >
                      <Check size={18} />
                    </button>
                    <button 
                      onClick={() => handleAction(req.id, 'rejected')}
                      className="p-2 bg-brand-primary text-white rounded-lg hover:scale-110 transition-all"
                    >
                      <X size={18} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {canSeePhotos ? (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {photos.length > 0 ? photos.map(photo => (
              <div key={photo.id} className="relative aspect-square rounded-3xl overflow-hidden group shadow-lg">
                <img src={photo.url} className="w-full h-full object-cover" alt="Private" />
                {isOwner && (
                  <button 
                    onClick={() => deletePhoto(photo.id)}
                    className="absolute top-2 right-2 p-1.5 bg-black/50 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            )) : (
              <div className="col-span-full py-12 flex flex-col items-center justify-center text-brand-muted opacity-50">
                <ImageIcon size={48} className="mb-2" />
                <p>Nenhuma foto no momento</p>
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-24 h-24 bg-brand-primary/10 rounded-[40px] flex items-center justify-center mb-6 relative">
              <Lock size={40} className="text-brand-primary" />
              <div className="absolute -bottom-2 -right-2 bg-brand-primary text-white p-2 rounded-full border-4 border-white">
                <Clock size={16} />
              </div>
            </div>
            <h3 className="text-xl font-bold text-brand-text mb-2">Conteúdo Protegido</h3>
            <p className="text-brand-muted max-w-xs mb-8">
              Este cofre é privado. Você precisa de autorização para ver estas fotos.
            </p>
            
            {access?.status === 'pending' ? (
              <div className="bg-brand-primary/10 px-6 py-3 rounded-2xl text-brand-primary font-bold flex items-center gap-2">
                <Clock size={18} />
                Solicitação Enviada
              </div>
            ) : (
              <button 
                onClick={requestAccess}
                className="px-8 py-4 bg-brand-primary text-white rounded-2xl font-bold shadow-xl shadow-brand-primary/20 hover:scale-105 transition-all flex items-center gap-2"
              >
                Solicitar Acesso
              </button>
            )}
            
            {access?.status === 'rejected' && (
              <p className="text-brand-primary mt-4 text-sm font-medium">Sua solicitação foi recusada.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
