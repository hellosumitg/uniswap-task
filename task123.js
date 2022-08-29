const axios = require("axios");
const URL = "https://api.thegraph.com/subgraphs/name/uniswap/uniswap-v3";

query = `
    {
        pools(orderBy: totalValueLockedUSD, orderDirection: desc, first:10){
            id
            token0 {id, symbol, name}
            token1 {id, symbol, name}
            totalValueLockedUSD
        }
    }
`;

async function main() {
  const result = await axios.post(URL, { query: query });
  const pools = result.data.data.pools;
  console.log("pools", pools);
}

main();
