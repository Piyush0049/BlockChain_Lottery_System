const { ethers } = require("hardhat");

const networkConfig = {
  11155111: {
    name: "sepolia",
    vrfCoordinatorV2: "0x9DdfaCa8183c41ad55329BdeeD9F6A8d53168B1B",
    entranceFee: ethers.parseEther("0.01"),
    gasLane:
      "0x787d74caea10b2b357790d5b5247c2f63d1d91572a9846f780606e4d953677ae",
    subscriptionId: "27717986899295127811168858702949635493186843711053243279688145205671846029891",
    callbackGasLimit: "500000",
    interval: 60
  },
  31337: {
    name: "hardhat",
    entranceFee: ethers.parseEther("0.01"),
    gasLane:
      "0x787d74caea10b2b357790d5b5247c2f63d1d91572a9846f780606e4d953677ae",
    callbackGasLimit: "500000",
    interval: 60
  },
};

const developmentChains = ["localhost", "hardhat"];
const DECIMALS = 8;
const INITIAL_ANSWER = 200000000000;

module.exports = {
  networkConfig,
  developmentChains,
  INITIAL_ANSWER,
  DECIMALS,
};
