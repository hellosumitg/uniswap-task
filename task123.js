const axios = require("axios");
const URL = "https://api.thegraph.com/subgraphs/name/uniswap/uniswap-v3";
const { ethers } = require("ethers");
const ERC20ABI = require("./abi.json");
require("dotenv").config();

query = `
    {
        pools(orderBy: totalValueLockedUSD, orderDirection: desc, first:10){
            id
            token0 {id, symbol, name, decimals}
            token1 {id, symbol, name, decimals}
            totalValueLockedUSD
        }
    }
`;

const INFURA_URL_TESTNET = process.env.INFURA_URL_TESTNET;
// const WALLET_ADDRESS = process.env.WALLET_ADDRESS;
const WALLET_SECRET = process.env.WALLET_SECRET;
const provider = new ethers.providers.JsonRpcProvider(INFURA_URL_TESTNET);
const swapRouterAddress = "0xE592427A0AEce92De3Edee1F18E0157C05861564"; // taken from 'https://docs.uniswap.org/protocol/reference/deployments'

async function main() {
  const result = await axios.post(URL, { query: query });
  const pools = result.data.data.pools;
  console.log("pools", pools);

  const token0List = pools.map((i) => i.token0.id); // across all 10 pools
  const token1List = pools.map((i) => i.token1.id); // across all 10 pools

  const wallet = new ethers.Wallet(WALLET_SECRET);
  const connectedWallet = wallet.connect(provider);

  const token0ContractInstanceList = token0List.map(
    (i) => new ethers.Contract(i, ERC20ABI, provider)
  );
  const token1ContractInstanceList = token1List.map(
    (i) => new ethers.Contract(i, ERC20ABI, provider)
  );

  const decimals0List = pools.map((i) => i.token0.decimals); // across all 10 pools
  const decimals1List = pools.map((i) => i.token1.decimals); // across all 10 pools

  const inputAmount = 0.001;
  // .001 => 1 000 000 000 000 000 (for 18 decimal places)
  const amountIn0List = decimals0List.map((i) =>
    ethers.utils.parseUnits(inputAmount.toString(), i)
  );
  const amountIn1List = decimals1List.map((i) =>
    ethers.utils.parseUnits(inputAmount.toString(), i)
  );

  const approvalAmount0List = amountIn0List.map((i) => (i * 100000).toString());
  const approvalAmount1List = amountIn1List.map((i) => (i * 100000).toString());

  const approvalResponse0List = await token0ContractInstanceList.map((i) => {
    i.connect(connectedWallet)
      .approve(
        swapRouterAddress,
        approvalAmount0List.forEach((i) => i)
      )
      .then((approvalResponse0List) => {
        console.log("approvalResponse0List", approvalResponse0List);
      });
  });

  const approvalResponse1List = await token1ContractInstanceList.map((i) => {
    i.connect(connectedWallet)
      .approve(
        swapRouterAddress,
        approvalAmount1List.forEach((i) => i)
      )
      .then((approvalResponse1List) => {
        console.log("approvalResponse1List", approvalResponse1List);
      });
  });
}

main();

