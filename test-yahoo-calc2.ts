async function fetchQuote(sym) {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${sym}?interval=1d&range=1d`;
  const res = await fetch(url);
  const data = await res.json();
  const meta = data.chart.result[0].meta;
  return { price: meta.regularMarketPrice, prev: meta.chartPreviousClose };
}
async function test() {
  const inr = await fetchQuote('INR=X');
  const si = await fetchQuote('SI=F');
  
  console.log("SI=F price:", si.price);
  console.log("INR=X price:", inr.price);
  const silverKgInr = si.price * inr.price * 32.1507;
  console.log("Silver 1kg INR:", silverKgInr);
}
test();
