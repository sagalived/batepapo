import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { db } from '../../lib/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { User, MapPin, AlignLeft, Save, CheckCircle, Shield } from 'lucide-react';
import { cn } from '../../lib/utils';
import PrivateVault from '../Chat/PrivateVault';

export default function ProfileEdit() {
  const { profile } = useAuth();
  const [displayName, setDisplayName] = useState(profile?.displayName || '');
  const [neighborhood, setNeighborhood] = useState(profile?.neighborhood || '');
  const [bio, setBio] = useState(profile?.bio || '');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;

    setSaving(true);
    setSaved(false);
    try {
      await updateDoc(doc(db, 'users', profile.uid), {
        displayName,
        neighborhood,
        bio,
        updatedAt: new Date().toISOString()
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-8 md:p-12 bg-white rounded-[32px] shadow-2xl shadow-brand-primary/5 mt-4 border border-brand-primary/5">
      <div className="flex items-center gap-4 mb-10 border-b border-brand-primary border-opacity-10 pb-6">
        <div className="w-12 h-12 bg-brand-primary/10 rounded-2xl flex items-center justify-center text-brand-primary">
          <User size={28} />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-brand-text">Seu Perfil</h2>
          <p className="text-sm text-brand-muted">Personalize como os outros te veem</p>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-2">
            <label className="block text-xs font-bold text-brand-muted uppercase tracking-wider ml-1">Nome de Exibição</label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full px-5 py-4 rounded-2xl bg-brand-bg text-brand-text border-none focus:ring-2 focus:ring-brand-primary outline-none transition-all shadow-inner"
              placeholder="Ex: Juliana"
              required
            />
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-bold text-brand-muted uppercase tracking-wider ml-1 flex items-center gap-1">
               <MapPin size={14} className="text-brand-primary" /> Seu Bairro
            </label>
            <input
              type="text"
              value={neighborhood}
              onChange={(e) => setNeighborhood(e.target.value)}
              className="w-full px-5 py-4 rounded-2xl bg-brand-bg text-brand-text border-none focus:ring-2 focus:ring-brand-primary outline-none transition-all shadow-inner"
              placeholder="Ex: Pinheiros"
              required
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="block text-xs font-bold text-brand-muted uppercase tracking-wider ml-1 flex items-center gap-1">
             <AlignLeft size={14} className="text-brand-primary" /> Biografia
          </label>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            className="w-full px-5 py-4 rounded-2xl bg-brand-bg text-brand-text border-none focus:ring-2 focus:ring-brand-primary outline-none transition-all h-40 resize-none shadow-inner"
            placeholder="Conte um pouco sobre suas paixões..."
          />
        </div>

        <button
          type="submit"
          disabled={saving}
          className={cn(
            "w-full py-5 rounded-2xl font-bold text-white shadow-xl shadow-brand-primary/20 transition-all active:scale-95 flex items-center justify-center gap-2",
            saved ? "bg-brand-accent" : "bg-brand-primary hover:bg-opacity-90"
          )}
        >
          {saving ? (
            "Salvando..."
          ) : saved ? (
            <><CheckCircle size={20} /> Perfil Atualizado!</>
          ) : (
            <><Save size={20} /> Salvar Alterações</>
          )}
        </button>
      </form>

      <div className="mt-12 pt-12 border-t border-brand-primary border-opacity-10">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 bg-brand-accent/10 rounded-xl flex items-center justify-center text-brand-accent">
            <Shield size={22} />
          </div>
          <div>
            <h3 className="text-xl font-bold text-brand-text">Gerenciar Seu Cofre</h3>
            <p className="text-sm text-brand-muted">Controle quem pode ver suas fotos privadas</p>
          </div>
        </div>
        
        <div className="bg-brand-bg rounded-[32px] overflow-hidden border border-brand-primary border-opacity-5 min-h-[400px]">
          <PrivateVault ownerId={profile.uid} isOwner={true} />
        </div>
      </div>
    </div>
  );
}
