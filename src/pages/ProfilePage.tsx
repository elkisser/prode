import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import toast from 'react-hot-toast';

export function ProfilePage() {
  const { user, profile, updateProfile, signOut } = useAuthStore();
  const [username, setUsername] = useState(profile?.username || '');
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    if (username.trim().length < 3) {
      toast.error('El nombre debe tener al menos 3 caracteres');
      return;
    }
    setIsSaving(true);
    try {
      await updateProfile({ username });
      setIsEditing(false);
      toast.success('Perfil actualizado');
    } catch {
      toast.error('Error al actualizar');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSignOut = async () => {
    if (window.confirm('¿Quieres cerrar sesión?')) {
      await signOut();
    }
  };

  return (
    <div className="min-h-screen bg-dark-950 text-dark-50">
      <header className="sticky top-0 z-30 bg-dark-900 border-b border-white/5">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <Link to="/dashboard" className="group flex items-center gap-2 text-dark-400 hover:text-white transition-colors font-bold uppercase text-xs tracking-widest">
            <span className="group-hover:-translate-x-1 transition-transform">←</span>
            Dashboard
          </Link>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-12">
        <div className="glass-card rounded-[3rem] p-10 border-white/5 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 p-10 opacity-5">
            <div className="text-9xl">👤</div>
          </div>

          <div className="flex flex-col items-center mb-12 relative z-10">
            <div className="relative group">
              <div className="absolute inset-0 bg-gradient-to-tr from-primary-500 to-secondary-500 rounded-[2rem] blur-xl opacity-20 group-hover:opacity-40 transition-opacity"></div>
              {profile?.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt=""
                  className="w-32 h-32 rounded-[2.5rem] mb-6 object-cover border-4 border-dark-800 relative z-10"
                />
              ) : (
                <div className="w-32 h-32 rounded-[2.5rem] bg-dark-800 flex items-center justify-center text-5xl font-black text-white border-4 border-dark-700 mb-6 relative z-10">
                  {profile?.username?.charAt(0).toUpperCase() || 'U'}
                </div>
              )}
            </div>

            {isEditing ? (
              <div className="w-full max-w-xs animate-in fade-in slide-in-from-top-2">
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full px-6 py-3 glass-input rounded-2xl text-center text-2xl font-black text-white"
                  placeholder="Tu nombre"
                  autoFocus
                />
              </div>
            ) : (
              <h2 className="text-4xl font-black text-white tracking-tight">{profile?.username}</h2>
            )}
            <p className="text-dark-500 font-bold uppercase tracking-widest text-[10px] mt-2">Perfil de Jugador</p>
          </div>

          <div className="space-y-8 relative z-10">
            <div className="grid grid-cols-1 gap-6">
              <div className="p-6 bg-dark-800/30 rounded-3xl border border-white/5">
                <label className="block text-[10px] font-black uppercase tracking-widest text-dark-500 mb-2 px-1">
                  ID de Usuario (Email)
                </label>
                <div className="text-dark-200 font-bold px-1 break-all">
                  {user?.email || 'No disponible'}
                </div>
              </div>

              <div className="p-6 bg-dark-800/30 rounded-3xl border border-white/5">
                <label className="block text-[10px] font-black uppercase tracking-widest text-dark-500 mb-2 px-1">
                  Nombre de Usuario
                </label>
                {isEditing ? (
                  <p className="text-dark-400 text-sm px-1 italic">Edita tu nombre arriba</p>
                ) : (
                  <div className="text-white text-xl font-black px-1">
                    {profile?.username || 'Sin nombre'}
                  </div>
                )}
              </div>
            </div>

            <div className="pt-6 flex gap-4">
              {isEditing ? (
                <>
                  <button
                    onClick={() => setIsEditing(false)}
                    className="flex-1 px-6 py-4 bg-dark-800 hover:bg-dark-700 text-white rounded-2xl transition-all font-bold border border-white/5"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="flex-1 btn-primary py-4 rounded-2xl text-lg"
                  >
                    {isSaving ? 'Guardando...' : 'Confirmar'}
                  </button>
                </>
              ) : (
                <button
                  onClick={() => setIsEditing(true)}
                  className="flex-1 btn-primary py-4 rounded-2xl text-lg flex items-center justify-center gap-2"
                >
                  <span>✏️</span> Editar Perfil
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="mt-8 flex justify-center">
          <button
            onClick={handleSignOut}
            className="group flex items-center gap-2 px-8 py-4 text-red-400/60 hover:text-red-400 transition-all font-black uppercase text-xs tracking-[0.2em]"
          >
            <span className="group-hover:scale-125 transition-transform">🚪</span>
            Cerrar Sesión
          </button>
        </div>
      </main>
    </div>
  );
}