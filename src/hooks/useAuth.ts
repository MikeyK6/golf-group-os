'use client'
import { useState, useEffect } from 'react'
import { onAuthStateChanged, User } from 'firebase/auth'
import { doc, getDoc } from 'firebase/firestore'
import { auth, db } from '@/lib/firebase'

interface AuthState {
  user: User | null
  loading: boolean
  handicap: number
}

export function useAuth(): AuthState {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [handicap, setHandicap] = useState(18)

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u)
      if (u) {
        const snap = await getDoc(doc(db, 'users', u.uid))
        if (snap.exists()) setHandicap(snap.data().handicap ?? 18)
      }
      setLoading(false)
    })
    return unsub
  }, [])

  return { user, loading, handicap }
}
