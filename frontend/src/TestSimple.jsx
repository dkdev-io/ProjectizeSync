// Simple test component to verify React works without dependencies
export default function TestSimple() {
  return (
    <div style={{ padding: '20px', fontFamily: 'Arial' }}>
      <h1 style={{ color: 'green' }}>✅ React Mounted Successfully</h1>
      <p>This confirms React is working and the build is functional.</p>
      <p>Environment test: {import.meta.env.VITE_SUPABASE_URL ? '✅ Env vars loaded' : '❌ No env vars'}</p>
    </div>
  )
}