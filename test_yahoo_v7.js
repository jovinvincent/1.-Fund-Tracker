async function test() {
  const symbols = ["SI=F", "CL=F", "^NSEI", "INR=X", "RELIANCE.NS"];
  const url = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(symbols.join(","))}`;
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
      }
    });
    console.log(`Status: ${res.status}`);
    if (res.ok) {
      const data = await res.json();
      const results = data?.quoteResponse?.result;
      if (results) {
        for (const item of results) {
          console.log(`- ${item.symbol}: price=${item.regularMarketPrice}, change%=${item.regularMarketChangePercent}, name=${item.longName || item.shortName}`);
        }
      } else {
        console.log("No result in quoteResponse", JSON.stringify(data));
      }
    } else {
      const txt = await res.text();
      console.log("Error response:", txt);
    }
  } catch (e) {
    console.log("Fetch error:", e);
  }
}
test();
