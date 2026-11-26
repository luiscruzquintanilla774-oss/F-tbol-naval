'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { crearClienteNavegador } from '@/lib/supabase/client';
import { subirImagen } from '@/lib/subirImagen';

export default function CambiarLogo({ equipoId, tieneLogo }) {
  const router = useRouter();
  const [estado, setEstado] = useState('');

  async function subir(e) {
    try {
      setEstado('Subiendo…');
      const logo = await subirImagen(e.target.files?.[0], 'logo');
      const { error } = await crearClienteNavegador().rpc('cambiar_logo_equipo', { p_equipo: equipoId, p_logo_url: logo });
      if (error) throw error;
      setEstado('');
      router.refresh();
    } catch (err) {
      setEstado(err.message);
    }
  }

  return (
    <label style={{ display: 'inline-flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', fontSize: 13 }}>
      <span className={tieneLogo ? 'btn ghost' : 'btn'}>{tieneLogo ? 'Cambiar logo' : 'Subir logo'}</span>
      <input type="file" accept="image/*" onChange={subir} style={{ position: 'absolute', opacity: 0, width: 1 }} />
      {estado && <span className={estado === 'Subiendo…' ? '' : 'err'}>{estado}</span>}
    </label>
  );
}
