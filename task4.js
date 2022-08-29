const { ethers } = require("ethers");
const {
  abi: IUniswapV3PoolABI,
} = require("@uniswap/v3-core/artifacts/contracts/interfaces/IUniswapV3Pool.sol/IUniswapV3Pool.json");
const {
  abi: SwapRouterABI,
} = require("@uniswap/v3-periphery/artifacts/contracts/interfaces/ISwapRouter.sol/ISwapRouter.json");
const { getPoolImmutables, getPoolState } = require("./helpers");
const ERC20ABI = require("./abi.json");

require("dotenv").config();
const INFURA_URL_TESTNET = process.env.INFURA_URL_TESTNET;
const WALLET_ADDRESS = process.env.WALLET_ADDRESS;
const WALLET_SECRET = process.env.WALLET_SECRET;

const provider = new ethers.providers.JsonRpcProvider(INFURA_URL_TESTNET); // Rinkeby or Ropsten
const poolAddress = "0x4D7C363DED4B3b4e1F954494d2Bc3955e49699cC"; // used for Swapping WETH for Uniswap Tokens
const swapRouterAddress = "0xE592427A0AEce92De3Edee1F18E0157C05861564"; // taken from 'https://docs.uniswap.org/protocol/reference/deployments'

const name0 = "Wrapped Ether";
const symbol0 = "WETH";
const decimals0 = 18;
const address0 = "0xc778417e063141139fce010982780140aa0cd5ab";

const name1 = "Uniswap Token";
const symbol1 = "UNI";
const decimals1 = 18;
const address1 = "0x1f9840a85d5af5bf1d1762f925bdaddc4201f984";

async function main() {
  const poolContract = new ethers.Contract(
    poolAddress,
    IUniswapV3PoolABI,
    provider
  ); // Creating poolContract instance

  const immutables = await getPoolImmutables(poolContract); // here getPoolImmutables() is taken from helpers.js and this variable don't change for a specific pool
  const state = await getPoolState(poolContract); // here getPoolImmutables() is taken from helpers.js and this variable do change for any pool

  const wallet = new ethers.Wallet(WALLET_SECRET); // Creating Wallet instance
  const connectedWallet = wallet.connect(provider);

  const swapRouterContract = new ethers.Contract(
    swapRouterAddress,
    SwapRouterABI,
    provider
  ); // Creating a swapRouterContract instance

  const inputAmount = 0.001;
  // .001 => 1 000 000 000 000 000
  const amountIn = ethers.utils.parseUnits(inputAmount.toString(), decimals0);

  const approvalAmount = (amountIn * 100000).toString(); // here we are giving Uniswap unlimited access to the `ETH` or `WETH` present in our wallet(don't do this if working on Mainnet)
  const tokenContract0 = new ethers.Contract(address0, ERC20ABI, provider); // Creating instance for `WETH` contract(i.e tokenContract0)

  const approvalResponse = await tokenContract0
    .connect(connectedWallet)
    .approve(swapRouterAddress, approvalAmount); // as given in 'https://eips.ethereum.org/EIPS/eip-20'
  // i.e "approve" => Allows _spender to withdraw from your account multiple times, up to the _value amount.
  // If this function is called again it overwrites the current allowance with _value.
  // function approve(address _spender, uint256 _value) public returns (bool success)

  // Below parameters are taken from `https://docs.uniswap.org/protocol/reference/periphery/interfaces/ISwapRouter#exactinputsingleparams`
  const params = {
    tokenIn: immutables.token1, // UNI
    tokenOut: immutables.token0, // WETH
    fee: immutables.fee,
    recipient: WALLET_ADDRESS,
    deadline: Math.floor(Date.now() / 1000) + 60 * 10, // Math.floor( Current time in seconds) + (No. of seconds in 10 mins)
    //{i.e setting a deadline time of 10 mins so that miners can easily execute the transaction}
    amountIn: amountIn,
    amountOutMinimum: 0, // this says only swap tokens if we get at least this much `amountOut` as we are working with `Testnet` so we are doing otherwise don't do this on `Mainnet`
    sqrtPriceLimitX96: 0, // Similarly don't do this on `Mainnet`
  };

  // Below `exactInputSingle()` is taken from `https://docs.uniswap.org/protocol/reference/periphery/SwapRouter#exactinputsingle`
  const transaction = swapRouterContract
    .connect(connectedWallet)
    .exactInputSingle(params, {
      gasLimit: ethers.utils.hexlify(1000000), // Manually setting gas limit to 1 Million units of gas. Otherwise `ethers.js` will put some outrageous units of gas as default so be careful.
      // Here we can also set other values, such as `gasPrice`, `maxFee`
    })
    .then((transaction) => {
      console.log(transaction);
    });
}

main();
