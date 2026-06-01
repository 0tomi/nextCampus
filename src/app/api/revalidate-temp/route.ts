import { revalidateTag } from 'next/cache'
import { NextResponse } from 'next/server'

export async function GET() {
  revalidateTag('year:cuarto', 'max')
  revalidateTag('year:quinto', 'max')
  return NextResponse.json({ success: true, message: 'Caché de los años 4 y 5 limpiado' })
}
