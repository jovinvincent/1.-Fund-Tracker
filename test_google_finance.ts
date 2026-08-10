async function fetchGoogleFinanceQuote(symbol: string): Promise<any> {
  const isIndex = symbol === "^NSEI" || symbol === "^NSEMDCP";
  const gSymbol = isIndex ? (symbol === "^NSEI" ? "NIFTY_50:INDEXNSE" : "NIFTY_MIDCAP_100:INDEXNSE") : `${symbol.replace(/\.(NS|BO)$/, "")}:NSE`;
  const url = `https://www.google.com/finance/quote/${gSymbol}`;
  const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" } });
  const html = await res.text();
  
  // Extract price
  const priceMatch = html.match(/class="[^"]*"[^>]*data-last-price="([\d\.]+)"/);
  console.log("Price Match data-last-price:", priceMatch?.[1]);
  
  // Another way:
  const altPriceMatch = html.match(/class="YMlKec fxKbKc"[^>]*>(?:₹)?([\d,]+\.\d*)/);
  console.log("Alt Price Match YMlKec:", altPriceMatch?.[1]);
  
  // Let's try finding Prev Close
  const prevCloseMatch = html.match(/Previous close<\/div><div class="P6K39c"[^>]*>(?:₹)?([\d,]+\.\d*)/);
  console.log("Prev Close P6K39c:", prevCloseMatch?.[1]);
  
  const altPrevCloseMatch = html.match(/>Previous close<.*?>(?:₹)?([\d,]+\.\d*)</);
  console.log("Alt Prev Close:", altPrevCloseMatch?.[1]);
}
fetchGoogleFinanceQuote("RELIANCE.NS");
