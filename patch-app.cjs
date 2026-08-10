const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

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

  // Settings / Admin state`;

code = code.replace(/  \/\/ Settings \/ Admin state/g, syncWindowFunc);

const intervalLogic = `    if (autoRefresh && marketOpen) {`;
code = code.replace(/    if \(autoRefresh\) \{/g, intervalLogic);

const liveFeedStr = `<span>{isFallback ? "Fallback Mode" : "Live Feed"}</span>`;
const marketClosedStr = `<span>{!marketOpen ? "Market Closed" : isFallback ? "Fallback Mode" : "Live Feed"}</span>`;
code = code.replace(liveFeedStr, marketClosedStr);

const dotStr = `animate-pulse`;
// wait, we can just replace "Live Feed Active" or similar.

fs.writeFileSync('src/App.tsx', code);
console.log("Patched App.tsx with sync window frontend logic");
