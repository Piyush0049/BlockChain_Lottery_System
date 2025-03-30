// require("@nomiclabs/hardhat-waffle");
require("hardhat-deploy");
require("solidity-coverage");
require("hardhat-gas-reporter");
require("hardhat-contract-sizer");
require("@nomicfoundation/hardhat-chai-matchers");
require("@nomicfoundation/hardhat-verify");
require("dotenv").config();

/** @type import('hardhat/config').HardhatUserConfig */
if (!process.env.RPC_URL || !process.env.PRIVATE_KEY) {
  console.log(process.env.RPC_URL, process.env.PRIVATE_KEY);
  console.error("Missing environment variables. Check your .env file.");
  process.exit(1);
}

module.exports = {
  defaultNetwork: "hardhat",
  networks: {
    sepolia: {
      url: process.env.RPC_URL,
      accounts: [process.env.PRIVATE_KEY],
      chainId: 11155111,
    },
    localhost: {
      url: "http://localhost:8545",
      chainId: 31337,
    },
  },
  etherscan: {
    apiKey: process.env.ETHERSCAN_API_KEY,
  },
  sourcify: {
    enabled: true,
  },
  namedAccounts: {
    deployer: {
      default: 0,
    },
  },
  gasReporter: {
    enabled: true,
    outputFile: "output.txt",
    currency: "USD",
    gasPriceApi: `https://api.etherscan.io/api?module=proxy&action=eth_gasPrice&apikey=${process.env.ETHERSCAN_API_KEY}`,
    coinmarketcap: process.env.COINMARKETCAP_API_KEY,
    noColors: false,
  },
  mocha: {
    timeout: 50000000, // 500 seconds max for running tests
  },
  solidity: "0.8.28",
};
