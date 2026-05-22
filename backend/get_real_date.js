import fetch from 'node-fetch'; // wait, check if node-fetch is in package.json or if we can use native fetch (available in Node 18+)
async function run() {
  try {
    const res = await fetch('https://www.google.com');
    console.log('Google Date Header:', res.headers.get('date'));
  } catch (err) {
    console.error('Fetch error:', err.message);
  }
}
run();
