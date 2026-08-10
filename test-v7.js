fetch("https://query1.finance.yahoo.com/v7/finance/quote?symbols=RELIANCE.NS,ZOMATO.NS", {headers:{"User-Agent":"Mozilla/5.0"}})
.then(r => r.json()).then(d => console.log(d.quoteResponse.result.map(x => x.symbol))).catch(console.error);
