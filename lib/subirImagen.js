import { crearClienteNavegador } from '@/lib/supabase/client';

// Sube una imagen a "fotos/<usuario>/..." y devuelve su dirección pública
export async function subirImagen(archivo, prefijo = 'logo') {
  if (!archivo) throw new Error('Elige una imagen.');
  if (!archivo.type.startsWith('image/')) throw new Error('Elige una imagen (JPG o PNG).');
  if (archivo.size > 3 * 1024 * 1024) throw new Error('La imagen debe pesar menos de 3 MB.');
  const supabase = crearClienteNavegador();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Debes iniciar sesión.');
  const extension = archivo.name.split('.').pop()?.toLowerCase() || 'png';
  const ruta = `${user.id}/${prefijo}-${Date.now()}.${extension}`;
  const { error } = await supabase.storage.from('fotos').upload(ruta, archivo);
  if (error) throw new Error(`No se pudo subir la imagen: ${error.message}`);
  return supabase.storage.from('fotos').getPublicUrl(ruta).data.publicUrl;
}
