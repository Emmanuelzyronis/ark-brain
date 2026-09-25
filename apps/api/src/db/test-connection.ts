import { Pool } from '@neondatabase/serverless'
import dotenv from 'dotenv'
dotenv.config()

async function test() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL! })
  try {
    const result = await pool.query('SELECT current_database(), current_schema()')
    console.log('Connected:', result.rows[0])
  } finally {
    await pool.end()
  }
}
test()
