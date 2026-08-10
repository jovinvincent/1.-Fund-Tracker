const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const regex = /const finalQuotes = await Promise\.all\(\s*symbolsList\.map\(async \(sym\) => \{([\s\S]*?)\}\s*\)\s*\);/;

const replacement = `
  const finalQuotes = [];
  const concurrencyLimit = 5; // Run 5 concurrent requests maximum
  let activePromises = [];
  
  for (const sym of symbolsList) {
    const task = (async () => {
$1
    })();
    
    activePromises.push(task);
    
    // Once we hit concurrency limit, wait for one to finish
    if (activePromises.length >= concurrencyLimit) {
      await Promise.race(activePromises);
      // Remove settled promises
      activePromises = activePromises.filter(p => {
        let isPending = true;
        p.finally(() => { isPending = false; });
        return isPending;
      });
    }
    
    finalQuotes.push(await task);
  }
`;

// Wait, standard Promise.race wouldn't easily let us filter out the finished ones synchronously unless we await it properly.
// Better way: p-limit or simple queue.
