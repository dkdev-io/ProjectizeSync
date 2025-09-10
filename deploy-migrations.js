const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Supabase configuration
const supabaseUrl = 'https://kyyovrswnucxzvupffvv.supabase.co';
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt5eW92cnN3bnVjeHp2dXBmZnZ2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzQ2NjEyOCwiZXhwIjoyMDczMDQyMTI4fQ.qkRvU43DDNLxWMoohh2DQlBwrlvP09XsfW2liIx_22Q';

// Create Supabase client with service role key
const supabase = createClient(supabaseUrl, serviceRoleKey);

async function deployMigrations() {
  console.log('🚀 Starting migration deployment...');
  
  try {
    // Read migration files
    const migrationsDir = path.join(__dirname, 'supabase', 'migrations');
    const migrationFiles = [
      '20240909200000_create_mvp_schema.sql',
      '20240909200001_setup_rls_policies.sql'
    ];
    
    for (const filename of migrationFiles) {
      console.log(`\n📄 Deploying ${filename}...`);
      
      const migrationPath = path.join(migrationsDir, filename);
      const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
      
      // Split the migration into individual statements
      const statements = migrationSQL
        .split(';')
        .map(stmt => stmt.trim())
        .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));
      
      console.log(`   Found ${statements.length} SQL statements`);
      
      // Execute each statement
      for (let i = 0; i < statements.length; i++) {
        const statement = statements[i] + ';';
        
        try {
          const { error } = await supabase.rpc('exec_sql', { sql: statement });
          
          if (error) {
            console.log(`   ⚠️  Statement ${i + 1}: ${error.message}`);
            // Some errors are expected (like "already exists" errors)
            if (!error.message.includes('already exists') && 
                !error.message.includes('does not exist')) {
              throw error;
            }
          } else {
            console.log(`   ✅ Statement ${i + 1}: Success`);
          }
        } catch (err) {
          console.log(`   ❌ Statement ${i + 1}: ${err.message}`);
          // Continue with other statements even if one fails
        }
      }
      
      console.log(`✅ Completed ${filename}`);
    }
    
    console.log('\n🎉 Migration deployment completed!');
    
    // Test the deployment by checking if tables exist
    console.log('\n🔍 Verifying deployment...');
    
    const tables = ['profiles', 'projects', 'project_members', 'task_syncs', 'user_integrations', 'sync_logs'];
    
    for (const table of tables) {
      try {
        const { count, error } = await supabase
          .from(table)
          .select('*', { count: 'exact', head: true });
        
        if (error) {
          console.log(`   ❌ Table ${table}: ${error.message}`);
        } else {
          console.log(`   ✅ Table ${table}: Exists (${count} rows)`);
        }
      } catch (err) {
        console.log(`   ❌ Table ${table}: ${err.message}`);
      }
    }
    
    console.log('\n✅ Verification completed!');
    
  } catch (error) {
    console.error('❌ Migration deployment failed:', error.message);
    process.exit(1);
  }
}

// Alternative approach: Direct SQL execution
async function executeSQLDirect() {
  console.log('\n🔄 Trying direct SQL execution approach...');
  
  const migrationPath = path.join(__dirname, 'supabase', 'migrations', '20240909200000_create_mvp_schema.sql');
  const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
  
  try {
    // Try to execute the full migration at once
    const { data, error } = await supabase.rpc('exec_sql', { 
      sql: migrationSQL 
    });
    
    if (error) {
      console.log('❌ Direct execution failed:', error.message);
      return false;
    } else {
      console.log('✅ Direct execution succeeded');
      return true;
    }
  } catch (err) {
    console.log('❌ Direct execution error:', err.message);
    return false;
  }
}

// Run the deployment
deployMigrations().catch(console.error);