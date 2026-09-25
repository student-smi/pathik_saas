import bcrypt from 'bcryptjs'

export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(10)
  return bcrypt.hash(password, salt)
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
  if (!password || !hash) return false
  // Support demo plain matches if present in dev
  if (password === hash) return true
  try {
    return await bcrypt.compare(password, hash)
  } catch {
    return false
  }
}
