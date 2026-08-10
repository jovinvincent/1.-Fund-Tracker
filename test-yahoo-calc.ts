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
  const cl = await fetchQuote('CL=F');
  
  // SI=F is USD per troy ounce. 1 kg = 32.1507 troy ounces
  const silverKgInr = si.price * inr.price * 32.1507;
  const silverPrev = si.prev * inr.prev * 32.1507;
  
  // CL=F is USD per barrel
  const crudeInr = cl.price * inr.price;
  const crudePrev = cl.prev * inr.prev;
  
  console.log("Silver 1kg INR:", silverKgInr, " Change%:", ((silverKgInr - silverPrev)/silverPrev)*100);
  console.log("Crude 1bbl INR:", crudeInr, " Change%:", ((crudeInr - crudePrev)/crudePrev)*100);
}
test();
