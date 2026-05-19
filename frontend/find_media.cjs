const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'modules', 'user', 'pages', 'Create', 'CreatePage.jsx');
const content = fs.readFileSync(filePath, 'utf8');

const lines = content.split('\n');
lines.forEach((line, idx) => {
  if (line.includes('getUserMedia') || line.includes('MediaRecorder') || line.includes('audio:')) {
    console.log(`${idx + 1}: ${line.trim()}`);
  }
});
