import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut as firebaseSignOut,
  updateProfile,
  User,
} from 'firebase/auth'
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore'
import { auth, db } from './firebase'

const googleProvider = new GoogleAuthProvider()

export async function signUpWithEmail(
  email: string,
  password: string,
  displayName: string,
  handicap: number
): Promise<User> {
  const cred = await createUserWithEmailAndPassword(auth, email, password)
  await updateProfile(cred.user, { displayName })
  await createUserDoc(cred.user.uid, { displayName, email, handicap })
  return cred.user
}

export async function signInWithEmail(email: string, password: string): Promise<User> {
  const cred = await signInWithEmailAndPassword(auth, email, password)
  return cred.user
}

export async function signInWithGoogle(): Promise<User> {
  const cred = await signInWithPopup(auth, googleProvider)
  const exists = await userDocExists(cred.user.uid)
  if (!exists) {
    await createUserDoc(cred.user.uid, {
      displayName: cred.user.displayName ?? 'Golfer',
      email: cred.user.email ?? '',
      handicap: 18,
    })
  }
  return cred.user
}

export async function signOut() {
  await firebaseSignOut(auth)
}

async function userDocExists(uid: string): Promise<boolean> {
  const snap = await getDoc(doc(db, 'users', uid))
  return snap.exists()
}

async function createUserDoc(
  uid: string,
  data: { displayName: string; email: string; handicap: number }
) {
  await setDoc(doc(db, 'users', uid), {
    ...data,
    groups: [],
    createdAt: serverTimestamp(),
  })
}

export function getInitials(name: string): string {
  return name
    .split(' ')
    .map(w => w[0] ?? '')
    .join('')
    .toUpperCase()
    .substring(0, 2)
}
