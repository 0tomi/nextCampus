import 'server-only'
import { createSupabaseAdminClient } from './supabase/admin'

const BUCKET = process.env.SUPABASE_STORAGE_BUCKET ?? 'apuntes'
const MAX_PDF_BYTES = 20 * 1024 * 1024 // 20 MB

// Sube un PDF de apunte a Supabase Storage. Valida tipo y tamaño server-side.
export async function uploadApuntePdf(
  file: File,
  subjectSlug: string,
): Promise<string> {
  if (file.type !== 'application/pdf') {
    throw new Error('BAD_REQUEST: el archivo debe ser PDF')
  }
  if (file.size > MAX_PDF_BYTES) {
    throw new Error('BAD_REQUEST: el PDF supera el límite de 20 MB')
  }

  const supabase = createSupabaseAdminClient()
  const objectKey = `${subjectSlug}/${crypto.randomUUID()}.pdf`
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(objectKey, file, { contentType: 'application/pdf', upsert: false })

  if (error) {
    throw new Error(`STORAGE: no se pudo subir el PDF (${error.message})`)
  }
  return objectKey
}

// URL firmada temporal para descargar un apunte (bucket privado).
export async function getApuntePdfUrl(
  objectKey: string,
  expiresInSeconds = 60 * 60,
): Promise<string | null> {
  const supabase = createSupabaseAdminClient()
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(objectKey, expiresInSeconds)
  if (error || !data) return null
  return data.signedUrl
}

export async function deleteApuntePdf(objectKey: string): Promise<void> {
  const supabase = createSupabaseAdminClient()
  await supabase.storage.from(BUCKET).remove([objectKey])
}
