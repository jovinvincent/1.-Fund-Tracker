async function test() {
  const url = `https://www.amfiindia.com/spages/NAVAll.txt`;
  try {
    const res = await fetch(url, {
            headers: {
              "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
              "Accept": "*/*",
            }
          });
    if (res.ok) {
      console.log("AMFI is working");
    } else {
      console.log("AMFI status:", res.status);
    }
  } catch(e) {
    console.log("AMFI error:", e.message);
  }
}
test();
