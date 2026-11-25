'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { crearClienteNavegador } from '@/lib/supabase/client';

export default function SubirFoto({ usuarioId }) {
  const router = useRouter();
  const [estado, setEstado] = useState('');

  async function subir(e) {
    const archivo = e.target.files?.[0];
    if (!archivo) return;
    if (!archivo.type.startsWith('image/')) return setEstado('Elige una imagen (JPG o PNG).');
    if (archivo.size > 3 * 1024 * 1024) return setEstado('La foto debe pesar menos de 3 MB.');
    setEstado('Subiendo…');
    const supabase = crearClienteNavegador();
    const extension = archivo.name.split('.').pop()?.toLowerCase() || 'jpg';
    const ruta = `${usuarioId}/foto-${Date.now()}.${extension}`;
    const { error } = await supabase.storage.from('fotos').upload(ruta, archivo);
    if (error) return setEstado(`No se pudo subir: ${error.message}`);
    const { data } = supabase.storage.from('fotos').getPublicUrl(ruta);
    const { error: e2 } = await supabase.from('perfiles').update({ foto_url: data.publicUrl }).eq('id', usuarioId);
    if (e2) return setEstado(`No se pudo guardar: ${e2.message}`);
    setEstado('Foto actualizada.');
    router.refresh();
  }

  return (
    <label style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', fontSize: 14 }}>
      <span className="btn ghost">Cambiar foto de perfil</span>
      <input type="file" accept="image/*" onChange={subir} style={{ position: 'absolute', opacity: 0, width: 1 }} />
      {estado && <span className={estado.startsWith('No') || estado.startsWith('Elige') || estado.startsWith('La foto') ? 'err' : 'ok'}>{estado}</span>}
    </label>
  );
}
