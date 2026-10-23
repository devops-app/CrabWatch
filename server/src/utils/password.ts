import bcrypt from 'bcryptjs'

/**
 * Single source of truth for the bcrypt work factor.
 *
 * Every hashing path (registration, password reset, password change) MUST go
 * through `hashPassword` so the cost can never drift again. Previously
 * registration used cost 10 while reset/change used cost 12, which created
 * weaker hashes at signup.
 */
export const BCRYPT_COST = 12

// Pre-computed cost-12 hash of a random string. Used so that a login attempt
// for an unknown email still performs a full bcrypt comparison, keeping the
// response time identical to a real account (prevents user enumeration via
// timing).
const DUMMY_HASH = '$2a$12$8wgbIl9QPJ6xRAaXbxj5eerbsC10aAwI3smqEDhIwu9.OkFX/Fv6W'

export const hashPassword = (plain: string): Promise<string> =>
  bcrypt.hash(plain, BCRYPT_COST)

/**
 * Compare a plaintext password against a stored hash. When no hash exists
 * (unknown user) we compare against a dummy hash so the operation takes the
 * same amount of time, then return `false`.
 */
export async function verifyPassword(
  plain: string,
  hash: string | null | undefined
): Promise<boolean> {
  const ok = await bcrypt.compare(plain, hash ?? DUMMY_HASH)
  return ok && !!hash
}

/**
 * True when a stored hash was produced with a work factor lower than the
 * current `BCRYPT_COST`. Callers should re-hash the (just-verified) plaintext
 * on the next successful login to transparently upgrade legacy hashes.
 */
export const needsRehash = (hash: string): boolean =>
  bcrypt.getRounds(hash) < BCRYPT_COST
