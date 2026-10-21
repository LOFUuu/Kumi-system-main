const fs = require('fs');
const content = fs.readFileSync('lib/db.ts', 'utf8');
const lines = content.split(/\r?\n/);

let currentFunc = null;
let funcBody = [];
const funcsWithoutOnlineCheck = [];

lines.forEach((line, idx) => {
  const m = line.match(/^export (?:async )?function (\w+)/);
  if (m) {
    if (currentFunc) {
      const bodyStr = funcBody.join('\n');
      if (bodyStr.includes('dbConnect()') && !bodyStr.includes('isOnlineMode()')) {
        funcsWithoutOnlineCheck.push(currentFunc);
      }
    }
    currentFunc = m[1];
    funcBody = [line];
  } else if (currentFunc) {
    funcBody.push(line);
  }
});

if (currentFunc) {
  const bodyStr = funcBody.join('\n');
  if (bodyStr.includes('dbConnect()') && !bodyStr.includes('isOnlineMode()')) {
    funcsWithoutOnlineCheck.push(currentFunc);
  }
}

console.log('Functions with dbConnect() but MISSING isOnlineMode():', funcsWithoutOnlineCheck);
