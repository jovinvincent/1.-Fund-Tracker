fetch("https://query1.finance.yahoo.com/v7/finance/quote?symbols=RELIANCE.NS,ZOMATO.NS", {headers:{"User-Agent":"Mozilla/5.0"}})
.then(r => r.text()).then(console.log).catch(console.error);
