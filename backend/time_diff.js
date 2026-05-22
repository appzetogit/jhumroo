import fetch from 'node-fetch';

async function run() {
  try {
    const start = Date.now();
    const res = await fetch('https://www.google.com');
    const end = Date.now();
    const serverDateStr = res.headers.get('date');
    if (!serverDateStr) {
      console.error('No Date header returned from Google');
      return;
    }
    const serverTime = new Date(serverDateStr).getTime();
    const localTime = Math.round((start + end) / 2);
    const diff = serverTime - localTime;
    console.log('Google Server Time:', new Date(serverTime).toISOString());
    console.log('Local Server Time: ', new Date(localTime).toISOString());
    console.log('Difference (Server - Local) in ms:', diff);
    console.log('Difference in seconds:', diff / 1000);
  } catch (err) {
    console.error('Error fetching date:', err.message);
  }
}

run();
