async function fetchQuote(sym) {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${sym}?interval=1d&range=1d`;
  const res = await fetch(url);
  return res.ok;
}
async function test() {
  const symbols = ["RELIANCE.NS", "SONACOMS.NS", "LT.NS", "AEGISLOG.NS", "ZOMATO.NS"];
  for (const sym of symbols) {
    const ok = await fetchQuote(sym);
    console.log(sym, ":", ok);
  }
}
test();
