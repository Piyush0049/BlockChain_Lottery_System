const { ethers } = require("hardhat");

const networkConfig = {
  11155111: {
    name: "sepolia",
    vrfCoordinatorV2: "0x8103B0A8A00be2DDC778e6e7eaa21791Cd364625",
    entranceFee: ethers.parseEther("0.0005"),
    gasLane:
      "0x787d74caea10b2b357790d5b5247c2f63d1d91572a9846f780606e4d953677ae",
    subscriptionId:
      "91546372465876843905762096909685071615158347404357919444137868504617160605776",
    callbackGasLimit: "500000",
    interval: 60,
  },
  31337: {
    name: "hardhat",
    entranceFee: ethers.parseEther("0.0005"),
    gasLane:
      "0x787d74caea10b2b357790d5b5247c2f63d1d91572a9846f780606e4d953677ae",
    callbackGasLimit: "500000",
    interval: 60,
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
