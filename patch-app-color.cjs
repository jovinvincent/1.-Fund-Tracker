const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const bgClassOld = `bg-slate-900 border-slate-800 text-slate-300`;
// Wait, the container color is what I want to change.
// Let's use regex.
const indicatorStr = `<span className={\`w-1.5 h-1.5 rounded-full animate-pulse \${isFallback ? "bg-amber-500" : "bg-emerald-500"}\`} />`;
const newIndicatorStr = `<span className={\`w-1.5 h-1.5 rounded-full \${!marketOpen ? "bg-slate-500" : "animate-pulse " + (isFallback ? "bg-amber-500" : "bg-emerald-500")}\`} />`;
code = code.replace(indicatorStr, newIndicatorStr);

fs.writeFileSync('src/App.tsx', code);
console.log("Patched indicator color");
