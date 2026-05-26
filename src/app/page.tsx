'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'

export default function RootPage() {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (loading) return
    router.replace(user ? '/dashboard' : '/auth/login')
  }, [user, loading, router])

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="w-6 h-6 rounded-full border-2 border-green-600 border-t-transparent animate-spin" />
    </div>
  )
}
