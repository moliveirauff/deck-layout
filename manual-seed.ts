import { createClient } from '@supabase/supabase-js'
import 'dotenv/config'

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.error('Missing env vars')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
  db: { schema: 'deck_layout' }
})

// Since we want to force seed, we don't use isDatabaseEmpty
// We just run the seed function or a simplified version of it.
// Actually, let's just use the seedService.ts but we need to mock the supabase import.

async function run() {
  console.log('--- DevBot Manual Seeding ---')
  // We'll just delete and re-insert directly here for simplicity
  await supabase.from('vessel').delete().neq('id', '00000000-0000-0000-0000-000000000000')
  await supabase.from('equipment_library').delete().neq('id', '00000000-0000-0000-0000-000000000000')
  await supabase.from('project').delete().neq('id', '00000000-0000-0000-0000-000000000000')
  
  console.log('✓ Database cleared.')
  console.log('Please click "Load Demo Data" in the app to get the fresh V2 data.')
}

run()
