import { SignJWT, jwtVerify } from 'jose'

const DEFAULT_SECRET = 'pathik-sco-super-secret-jwt-key-2026-very-secure'

function getSecretKey(): Uint8Array {
  const secret = process.env.JWT_SECRET || DEFAULT_SECRET
  return new TextEncoder().encode(secret)
}

export interface SessionPayload {
  id: string
  email: string
  role: 'ADMIN' | 'RESIDENT'
  [key: string]: any
}

export async function signSessionToken(payload: SessionPayload): Promise<string> {
  const secretKey = getSecretKey()
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(secretKey)
}

export async function verifySessionToken(token: string): Promise<SessionPayload | null> {
  try {
    const secretKey = getSecretKey()
    const { payload } = await jwtVerify(token, secretKey)
    return payload as unknown as SessionPayload
  } catch {
    return null
  }
}
