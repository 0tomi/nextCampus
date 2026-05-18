import { Suspense } from 'react'
import { LoginForm } from './LoginForm'

// useSearchParams requiere un boundary de Suspense a nivel de ruta.
export default function AdminLoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  )
}
