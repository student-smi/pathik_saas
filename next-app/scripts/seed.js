const fs = require('fs')
const path = require('path')
const { Client } = require('pg')

// Load env
const envPath = path.join(__dirname, '../.env.local')
if (fs.existsSync(envPath)) {
  require('dotenv').config({ path: envPath })
}

const dbUrl = process.env.DATABASE_URL || "postgresql://postgres:JtHGn7C0kDmUfifJ@db.dmrunwrkapxxbwykrdik.supabase.co:5432/postgres"

async function runSeed() {
  console.log('🌱 Executing seed_supabase.sql on Supabase PostgreSQL...')
  const sqlFile = path.join(__dirname, '../seed_supabase.sql')
  if (!fs.existsSync(sqlFile)) {
    console.error(`❌ seed_supabase.sql not found at ${sqlFile}`)
    return
  }

  const sqlContent = fs.readFileSync(sqlFile, 'utf8')
  console.log(`📄 Read ${sqlContent.length} bytes from seed_supabase.sql`)

  const client = new Client({
    connectionString: dbUrl,
    ssl: { rejectUnauthorized: false }
  })

  try {
    await client.connect()
    console.log('⚡ Connected to Supabase PostgreSQL!')

    await client.query(sqlContent)

    // Grant schema permissions so PostgREST API can access public schema
    await client.query(`
      GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
      GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
      GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
      ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated, service_role;
      ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO anon, authenticated, service_role;
    `)

    console.log('✅ seed_supabase.sql executed successfully!')

    const resUsers = await client.query('SELECT count(*) FROM users')
    const resSocieties = await client.query('SELECT count(*) FROM societies')
    const resHouses = await client.query('SELECT count(*) FROM houses')
    const resResidents = await client.query('SELECT count(*) FROM residents')
    const resBills = await client.query('SELECT count(*) FROM monthly_bills')
    const resEntries = await client.query('SELECT count(*) FROM bill_entries')

    console.log('\n📊 Database Summary:')
    console.log(`   - Users:        ${resUsers.rows[0].count}`)
    console.log(`   - Societies:    ${resSocieties.rows[0].count}`)
    console.log(`   - Houses:       ${resHouses.rows[0].count}`)
    console.log(`   - Residents:    ${resResidents.rows[0].count}`)
    console.log(`   - MonthlyBills: ${resBills.rows[0].count}`)
    console.log(`   - BillEntries:  ${resEntries.rows[0].count}`)

  } catch (err) {
    console.error('❌ Error running seed script:', err)
  } finally {
    await client.end()
  }
}

runSeed()
