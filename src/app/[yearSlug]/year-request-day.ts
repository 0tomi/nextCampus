import { connection } from 'next/server'
import { todayKeyAR } from '@/lib/utils'

export async function getYearRequestDay() {
  await connection()
  return todayKeyAR()
}
