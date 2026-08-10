const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const regex = /\/\/\s*Intercept SILVER and CRUDEOIL to fetch accurate real-time values from IndianAPI[\s\S]*?if \(BYPASS_SYMBOLS\.has\(cleanSym\)\) \{/m;

const replacement = `// Intercept SILVER and CRUDEOIL to calculate using Yahoo Finance global benchmarks
    if (cleanSym === "SILVER" || cleanSym === "CRUDEOIL") {
      const cached = quoteCache.get(cleanSym);
      if (cached && (now - cached.timestamp < CACHE_TTL_MS)) {
        return cached.quote;
      }
      
      try {
        const inrData = await fetchSingleChartQuote("INR=X");
        const inrPrice = inrData.price;
        const inrPrev = inrData.previousClose;
        
        let price = 0, prev = 0;
        
        if (cleanSym === "SILVER") {
          const siData = await fetchSingleChartQuote("SI=F"); // USD per troy ounce
          // 1 kg = 32.1507 troy ounces
          price = siData.price * inrPrice * 32.1507;
          prev = siData.previousClose * inrPrev * 32.1507;
        } else {
          const clData = await fetchSingleChartQuote("CL=F"); // USD per barrel
          price = clData.price * inrPrice;
          prev = clData.previousClose * inrPrev;
        }
        
        const change = price - prev;
        const pct = (change / prev) * 100;
        
        const liveQuote = {
          symbol: sym,
          price: Number(price.toFixed(2)),
          change: Number(change.toFixed(2)),
          changePercent: Number(pct.toFixed(4)),
          previousClose: Number(prev.toFixed(2)),
          name: cleanSym === "SILVER" ? "SILVER (Global Proxy 1kg INR)" : "CRUDEOIL (Global Proxy 1bbl INR)",
          source: "YahooFinance-Global"
        };
        
        quoteCache.set(cleanSym, { quote: liveQuote, timestamp: now });
        return liveQuote;
      } catch (err) {
        return getFallbackQuote(sym);
      }
    }
    
    if (BYPASS_SYMBOLS.has(cleanSym)) {`;

code = code.replace(regex, replacement);
fs.writeFileSync('server.ts', code);
console.log("Patched SILVER/CRUDE calculation");
