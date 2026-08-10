const fs = require('fs');
fetch("https://stock.indianapi.in/commodities", { headers: { "x-api-key": "sk-live-o0ICvTn9KV81tb7KpzlzfOQsUMmUYAphAgIY8E46" } })
  .then(res => res.json())
  .then(data => console.log(JSON.stringify(data.filter(d => d.product.includes("SILVER") || d.product.includes("CRUDEOIL")), null, 2)))
  .catch(console.error);
