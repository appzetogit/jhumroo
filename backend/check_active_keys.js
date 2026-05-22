import fetch from 'node-fetch';

async function run() {
  try {
    const res = await fetch('https://www.googleapis.com/service_accounts/v1/metadata/x509/firebase-adminsdk-fbsvc%40jhumroo-e265a.iam.gserviceaccount.com');
    if (!res.ok) {
      console.error('Failed to fetch:', res.status, res.statusText);
      return;
    }
    const certs = await res.json();
    console.log('Active certificate key IDs on Google servers:');
    console.log(Object.keys(certs));
    
    const ourKeyId = '3b063602ea8b0d62be8c72c8c6173bbdf1e4eac4';
    if (certs[ourKeyId]) {
      console.log(`SUCCESS: Our key ID ${ourKeyId} IS listed as active!`);
    } else {
      console.log(`ERROR: Our key ID ${ourKeyId} is NOT listed! It has been REVOKED/DELETED!`);
    }
  } catch (err) {
    console.error('Error fetching active keys:', err.message);
  }
}

run();
