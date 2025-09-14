// Minimal debug script to test DOM access
console.log('Debug script loaded')
console.log('Root element:', document.getElementById('root'))

try {
  const root = document.getElementById('root')
  if (root) {
    root.innerHTML = '<h1 style="color: red;">Direct DOM manipulation works</h1>'
    console.log('Direct DOM manipulation successful')
  } else {
    console.error('Root element not found')
  }
} catch (error) {
  console.error('DOM manipulation error:', error)
}