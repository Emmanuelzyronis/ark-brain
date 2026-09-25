import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import dotenv from 'dotenv'
import { Pool } from '@neondatabase/serverless'

dotenv.config()

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

async function runSchema() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is required')
  }

  const pool = new Pool({ connectionString: process.env.DATABASE_URL })

  try {
    const schemaPath = join(__dirname, 'schema.sql')
    const schema = readFileSync(schemaPath, 'utf-8')

    console.log('Running ArkBrain schema...')
    await pool.query(schema)
    console.log('Schema applied successfully!')
  } catch (error) {
    console.error('Schema error:', error)
    throw error
  } finally {
    await pool.end()
  }
}

runSchema()
