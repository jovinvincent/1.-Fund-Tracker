fetch("https://query1.finance.yahoo.com/v8/finance/chart/RELIANCE.NS?interval=1d&range=1d", {headers:{"User-Agent":"Mozilla/5.0"}})
.then(r => r.json()).then(d => console.log(d.chart.result[0].meta.regularMarketPrice)).catch(console.error);
