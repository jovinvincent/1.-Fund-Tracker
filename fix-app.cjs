const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const target = `  // Status indicators`;
const syncWindowFunc = `  const isSyncWindowActive = () => {
    const now = new Date();
    const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
    const ist = new Date(utc + (330 * 60000));
    const day = ist.getDay();
    if (day === 0 || day === 6) return false;
    const timeInMinutes = ist.getHours() * 60 + ist.getMinutes();
    if (timeInMinutes < 390 || timeInMinutes >= 960) return false;
    return true;
  };
  const marketOpen = isSyncWindowActive();

  // Status indicators`;

code = code.replace(target, syncWindowFunc);

fs.writeFileSync('src/App.tsx', code);
console.log("Fixed App.tsx");
