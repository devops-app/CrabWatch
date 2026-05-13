export const testUsers = {
  admin: {
    email: 'admin@crabwatch.my',
    password: 'SeedPassword2026!Secure',
    name: 'Admin User',
    role: 'ADMIN',
  },
  researcher: {
    email: 'researcher@crabwatch.my',
    password: 'SeedPassword2026!Secure',
    name: 'Researcher User',
    role: 'RESEARCHER',
  },
  user: {
    email: 'citizen@crabwatch.my',
    password: 'SeedPassword2026!Secure',
    name: 'Citizen User',
    role: 'USER',
  },
} as const

export function createTestUser(suffix: number) {
  return {
    name: `Test User ${suffix}`,
    email: `test${suffix}@example.com`,
    password: 'password123',
  }
}
