async function fetchSingleChartQuote(symbol) {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=1d`;
  const res = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
      "Accept": "application/json",
    }
  });
  const data = await res.json();
  const meta = data.chart.result[0].meta;
  return { price: meta.regularMarketPrice, previousClose: meta.chartPreviousClose };
}
async function test() {
  const inrData = await fetchSingleChartQuote("INR=X");
  const inrPrice = inrData.price;
  const inrPrev = inrData.previousClose;
  const siData = await fetchSingleChartQuote("SI=F");
  const price = siData.price * inrPrice * 32.1507;
  const prev = siData.previousClose * inrPrev * 32.1507;
  console.log("SILVER:", price);
  const clData = await fetchSingleChartQuote("CL=F");
  const clPrice = clData.price * inrPrice;
  const clPrev = clData.previousClose * inrPrev;
  console.log("CRUDE:", clPrice);
}
test();
