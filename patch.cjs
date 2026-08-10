const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const syncWindowFunc = `function isSyncWindowActive(): boolean {
  const now = new Date();
  const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
  const ist = new Date(utc + (330 * 60000));
  
  const day = ist.getDay();
  // Sunday = 0, Saturday = 6
  if (day === 0 || day === 6) {
    return false;
  }
  
  const hours = ist.getHours();
  const minutes = ist.getMinutes();
  const timeInMinutes = hours * 60 + minutes;
  
  // 6:30 AM = 390
  // 4:00 PM = 960
  if (timeInMinutes < 390 || timeInMinutes >= 960) {
    return false;
  }
  
  return true;
}

function getCacheTTL(): number {
  if (!isSyncWindowActive()) {
    return 1000 * 60 * 60 * 24 * 7; // 7 days (virtually infinite caching outside sync hours)
  }
  return 300000; // 5 minutes
}
`;

code = code.replace(/const CACHE_TTL_MS = 300000;[^\n]*/, syncWindowFunc);
code = code.replace(/CACHE_TTL_MS/g, "getCacheTTL()");

const amfiFetchStr = `async function fetchAmfiNavs() {`;
const amfiFetchReplacement = `async function fetchAmfiNavs() {
  if (!isSyncWindowActive() && isAmfiLoaded && amfiCache.size > 20) {
    console.log("Skipping AMFI fetch (outside sync window).");
    return;
  }`;
code = code.replace(amfiFetchStr, amfiFetchReplacement);

fs.writeFileSync('server.ts', code);
console.log("Patched server.ts with sync window");
