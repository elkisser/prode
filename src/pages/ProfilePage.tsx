import { useEffect, useState, type ChangeEvent } from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { LogOut, Pencil } from '@/components/Icons';
import { resolveAvatarUrl } from '@/lib/avatar';
import toast from 'react-hot-toast';

type AvatarPreset = {
  id: string;
  label: string;
  url: string;
};

function buildAvatarPresetUrl(params: {
  seed: string;
  skinColor: string;
  top: string;
  mouth: string;
  eyes: string;
  clothing: string;
  clothesColor: string;
}): string {
  const url = new URL('https://api.dicebear.com/9.x/avataaars/png');
  url.searchParams.set('seed', params.seed);
  url.searchParams.set('radius', '36');
  url.searchParams.set('backgroundColor', '0b1220');
  url.searchParams.set('size', '160');
  url.searchParams.set('skinColor', params.skinColor);
  url.searchParams.set('top', params.top);
  url.searchParams.set('mouth', params.mouth);
  url.searchParams.set('eyes', params.eyes);
  url.searchParams.set('clothing', params.clothing);
  url.searchParams.set('clothesColor', params.clothesColor);
  return url.toString();
}

const AVATAR_PRESETS: AvatarPreset[] = [
  { id: 'woman-light-happy', label: 'Mujer Clara (Feliz)', url: buildAvatarPresetUrl({ seed: 'w1', skinColor: 'ffdbb4', top: 'straight02', mouth: 'smile', eyes: 'happy', clothing: 'shirtCrewNeck', clothesColor: '65c9ff' }) },
  { id: 'woman-medium-happy', label: 'Mujer Media (Feliz)', url: buildAvatarPresetUrl({ seed: 'w2', skinColor: 'fd9841', top: 'curly', mouth: 'smile', eyes: 'happy', clothing: 'hoodie', clothesColor: 'ff488e' }) },
  { id: 'woman-dark-happy', label: 'Mujer Oscura (Feliz)', url: buildAvatarPresetUrl({ seed: 'w3', skinColor: 'd08b5b', top: 'fro', mouth: 'smile', eyes: 'happy', clothing: 'shirtVNeck', clothesColor: '3c4f5c' }) },
  { id: 'woman-deep-happy', label: 'Mujer Profunda (Feliz)', url: buildAvatarPresetUrl({ seed: 'w4', skinColor: '614335', top: 'bun', mouth: 'smile', eyes: 'happy', clothing: 'shirtScoopNeck', clothesColor: 'd1d4f9' }) },
  { id: 'man-light-happy', label: 'Varón Claro (Feliz)', url: buildAvatarPresetUrl({ seed: 'm1', skinColor: 'ffdbb4', top: 'shortCurly', mouth: 'smile', eyes: 'happy', clothing: 'shirtCrewNeck', clothesColor: 'a7ffc4' }) },
  { id: 'man-medium-happy', label: 'Varón Medio (Feliz)', url: buildAvatarPresetUrl({ seed: 'm2', skinColor: 'fd9841', top: 'shortFlat', mouth: 'smile', eyes: 'happy', clothing: 'hoodie', clothesColor: '5199e4' }) },
  { id: 'man-dark-happy', label: 'Varón Oscuro (Feliz)', url: buildAvatarPresetUrl({ seed: 'm3', skinColor: 'd08b5b', top: 'frizzle', mouth: 'smile', eyes: 'happy', clothing: 'shirtVNeck', clothesColor: '262e33' }) },
  { id: 'man-deep-happy', label: 'Varón Profundo (Feliz)', url: buildAvatarPresetUrl({ seed: 'm4', skinColor: '614335', top: 'dreads01', mouth: 'smile', eyes: 'happy', clothing: 'shirtCrewNeck', clothesColor: '929598' }) },
  { id: 'grimace', label: 'Grimace', url: buildAvatarPresetUrl({ seed: 'grimace', skinColor: 'ffdbb4', top: 'straight02', mouth: 'grimace', eyes: 'closed', clothing: 'shirtCrewNeck', clothesColor: 'ffffb1' }) },
  { id: 'wink', label: 'Guiño', url: buildAvatarPresetUrl({ seed: 'wink', skinColor: 'fd9841', top: 'shortFlat', mouth: 'twinkle', eyes: 'wink', clothing: 'shirtCrewNeck', clothesColor: 'ffdeb5' }) },
  { id: 'serious', label: 'Serio', url: buildAvatarPresetUrl({ seed: 'serio', skinColor: 'd08b5b', top: 'shortRound', mouth: 'serious', eyes: 'default', clothing: 'blazerAndShirt', clothesColor: '3c4f5c' }) },
  { id: 'surprised', label: 'Sorprendido', url: buildAvatarPresetUrl({ seed: 'surprised', skinColor: 'ffdbb4', top: 'curvy', mouth: 'screamOpen', eyes: 'surprised', clothing: 'shirtCrewNeck', clothesColor: 'ff5c5c' }) },
];

export function ProfilePage() {
  const { user, profile, updateProfile, signOut } = useAuthStore();
  const [username, setUsername] = useState(profile?.username || '');
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatar_url || '');
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isEditing) return;
    setUsername(profile?.username || '');
    setAvatarUrl(profile?.avatar_url || '');
  }, [isEditing, profile?.username, profile?.avatar_url]);

  const handleStartEditing = () => {
    if (!profile) {
      toast.error('Tu perfil todavía se está cargando');
      return;
    }
    setUsername(profile?.username || '');
    setAvatarUrl(profile?.avatar_url || '');
    setIsEditing(true);
  };

  const handleCancelEditing = () => {
    setUsername(profile?.username || '');
    setAvatarUrl(profile?.avatar_url || '');
    setIsEditing(false);
  };

  const handleAvatarUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Selecciona un archivo de imagen válido');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      toast.error('La imagen debe pesar menos de 2MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setAvatarUrl(reader.result);
      }
    };
    reader.readAsDataURL(file);
    event.target.value = '';
  };

  const handleSave = async () => {
    if (username.trim().length < 3) {
      toast.error('El nombre debe tener al menos 3 caracteres');
      return;
    }
    setIsSaving(true);
    try {
      await updateProfile({ username: username.trim(), avatar_url: avatarUrl || null });
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

  const fallbackSeed = profile?.id || user?.id || profile?.username || user?.email || 'prode';
  const currentAvatar = isEditing
    ? resolveAvatarUrl(avatarUrl || null, fallbackSeed, 160)
    : resolveAvatarUrl(profile?.avatar_url, fallbackSeed, 160);

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
              <div className="absolute -inset-6 rounded-[3rem] border border-white/5 opacity-20"></div>
              <div className="absolute -inset-3 rounded-[2.75rem] border border-white/10 opacity-25"></div>
              <div className="absolute inset-0 bg-gradient-to-tr from-primary-500 to-secondary-500 rounded-[2rem] blur-xl opacity-20 group-hover:opacity-40 transition-opacity"></div>
              {currentAvatar ? (
                <img
                  src={currentAvatar}
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
              <div className="w-full max-w-md animate-in fade-in slide-in-from-top-2">
                <label className="block text-[10px] font-black uppercase tracking-widest text-dark-500 mb-2 px-2">
                  Nombre de Usuario
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full px-6 py-3 glass-input rounded-2xl text-center text-2xl font-black text-white"
                  placeholder="Tu nombre"
                  autoFocus
                />
                <p className="text-center text-xs text-dark-400 mt-3">Mínimo 3 caracteres</p>
              </div>
            ) : (
              <h2 className="text-4xl font-black text-white tracking-tight text-center">{profile?.username}</h2>
            )}
            <p className="text-dark-500 font-bold uppercase tracking-widest text-[10px] mt-2">Perfil de Jugador</p>
          </div>

          <div className="space-y-8 relative z-10">
            <div className="grid grid-cols-1 gap-6">
              <div className="p-6 bg-dark-800/40 rounded-3xl border border-white/10">
                <label className="block text-[10px] font-black uppercase tracking-widest text-dark-500 mb-2 px-1">
                  ID de Usuario (Email)
                </label>
                <div className="text-dark-200 font-bold px-1 break-all">
                  {user?.email || 'No disponible'}
                </div>
              </div>

              <div className="p-6 bg-dark-800/40 rounded-3xl border border-white/10">
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

              {isEditing && (
                <div className="p-6 bg-dark-800/40 rounded-3xl border border-white/10 space-y-4">
                  <label className="block text-[10px] font-black uppercase tracking-widest text-dark-500 px-1">
                    Avatar
                  </label>

                  <div className="flex flex-col sm:flex-row gap-3">
                    <label
                      htmlFor="avatar-upload"
                      className="cursor-pointer flex-1 px-4 py-3 bg-dark-800 hover:bg-dark-700 text-white rounded-2xl transition-all font-bold border border-white/10 text-center"
                    >
                      Cargar Imagen
                    </label>
                    <button
                      type="button"
                      onClick={() => setAvatarUrl('')}
                      className="px-4 py-3 bg-dark-800/60 hover:bg-dark-700 text-dark-100 rounded-2xl transition-all font-bold border border-white/10"
                    >
                      Quitar
                    </button>
                    <input id="avatar-upload" type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" />
                  </div>

                  <p className="text-xs text-dark-400 px-1">
                    O elige un avatar predefinido (mujer/varón y tonos de piel):
                  </p>
                  <div className="grid grid-cols-4 gap-3">
                    {AVATAR_PRESETS.map((preset) => (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => setAvatarUrl(preset.url)}
                        className={`rounded-2xl p-1 border transition-all ${avatarUrl === preset.url ? 'border-primary-500 ring-2 ring-primary-500/30' : 'border-white/10 hover:border-white/25'}`}
                        title={preset.label}
                      >
                        <img src={preset.url} alt={preset.label} className="w-full rounded-xl" />
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="pt-2 flex flex-col sm:flex-row gap-4">
              {isEditing ? (
                <>
                  <button
                    onClick={handleCancelEditing}
                    className="flex-1 px-6 py-4 bg-dark-800 hover:bg-dark-700 text-white rounded-2xl transition-all font-bold border border-white/10"
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
                  onClick={handleStartEditing}
                  disabled={!profile}
                  className="flex-1 btn-primary py-4 rounded-2xl text-lg flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  <Pencil className="w-5 h-5" /> Editar Perfil
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="mt-8 flex justify-center">
          <button
            onClick={handleSignOut}
            className="group w-full sm:w-auto flex items-center justify-center gap-3 px-8 py-4 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 hover:border-red-500/50 rounded-2xl text-red-300 hover:text-red-200 transition-all font-black uppercase text-xs tracking-[0.2em] shadow-lg shadow-red-900/20"
          >
            <LogOut className="w-5 h-5 group-hover:translate-x-0.5 transition-transform" />
            Cerrar Sesión
          </button>
        </div>
      </main>
    </div>
  );
}
