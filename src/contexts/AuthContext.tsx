import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, onAuthStateChanged } from 'firebase/auth';
import { auth, db } from '../lib/firebase';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';

interface AuthContextType {
  user: User | null;
  profile: any | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({ user: null, profile: null, loading: true });

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    return onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
        const userDoc = doc(db, 'users', firebaseUser.uid);
        const snap = await getDoc(userDoc);
        
        if (snap.exists()) {
          setProfile(snap.data());
        } else {
          const newProfile = {
            uid: firebaseUser.uid,
            displayName: firebaseUser.displayName || 'Usuário',
            photoURL: firebaseUser.photoURL || '',
            bio: '',
            neighborhood: '',
            createdAt: new Date().toISOString(),
          };
          await setDoc(userDoc, newProfile);
          setProfile(newProfile);
        }

        onSnapshot(userDoc, (doc) => {
          if (doc.exists()) {
            setProfile(doc.data());
          }
        });
      } else {
        // MODO DEMO: Se não houver usuário real, injeta o mock mas NÃO inicia listeners do Firestore
        const mockUid = 'guest_user_123';
        setUser({ uid: mockUid, displayName: 'Visitante' } as any);
        setProfile({
          uid: mockUid,
          displayName: 'Visitante',
          neighborhood: 'Jardim Paulista',
          bio: 'Estou testando o aplicativo Amigo!',
          photoURL: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?q=80&w=150&auto=format&fit=crop',
        });
      }
      setLoading(false);
    });
  }, []);

  return (
    <AuthContext.Provider value={{ user, profile, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
