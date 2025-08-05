import { env } from '@yuki/validators/env'

import { PrismaClient } from './generated/client'

const createPrismaClient = () => new PrismaClient()
const globalForPrisma = globalThis as unknown as {
  db: PrismaClient | undefined
}
export const db = globalForPrisma.db ?? createPrismaClient()
if (env.NODE_ENV !== 'production') globalForPrisma.db = db
