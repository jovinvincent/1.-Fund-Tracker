async function test() {
  const url = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=RELIANCE.NS,ZOMATO.NS,LT.NS,TCS.NS`;
  const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" }});
  const data = await res.json();
  data.quoteResponse.result.forEach(q => {
    console.log(q.symbol, q.regularMarketPrice, q.regularMarketPreviousClose);
  });
}
test();
