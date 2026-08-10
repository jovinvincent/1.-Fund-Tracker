async function test() {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/RELIANCE.NS?interval=1d&range=1d`;
  try {
    const res = await fetch(url, {
            headers: {
              "User-Agent": "Mozilla/5.0",
              "Accept": "application/json",
            }
          });
    if (res.ok) {
      console.log("Yahoo is working");
    } else {
      console.log("Yahoo status:", res.status);
    }
  } catch(e) {
    console.log("Yahoo error:", e.message);
  }
}
test();
