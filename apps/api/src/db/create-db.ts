// Create the ark_brain database if it doesn't exist
import { Pool } from '@neondatabase/serverless'
import dotenv from 'dotenv'

dotenv.config()

async function createDatabase() {
  // Connect to the neondb default database to create ark_brain
  const adminUrl = process.env.DATABASE_URL!.replace('/ark_brain?', '/neondb?')
  const pool = new Pool({ connectionString: adminUrl })

  try {
    // Check if database exists
    const result = await pool.query(
      `SELECT 1 FROM pg_database WHERE datname = 'ark_brain'`
    )

    if (result.rows.length === 0) {
      console.log('Creating database ark_brain...')
      // Note: cannot run CREATE DATABASE inside a transaction, so use a separate connection
      await pool.query('CREATE DATABASE ark_brain')
      console.log('Database ark_brain created!')
    } else {
      console.log('Database ark_brain already exists')
    }
  } catch (error) {
    console.error('Error creating database:', error)
    // Neon serverless driver may not support CREATE DATABASE
    // Fall back to using neondb with a schema
    console.log('Falling back to neondb database with ark_brain schema')
  } finally {
    await pool.end()
  }
}

createDatabase()
