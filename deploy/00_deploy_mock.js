const { network, ethers } = require("hardhat");
const { developmentChains } = require("../helper-hardhat-config");

const func = async ({ getNamedAccounts, deployments }) => {
  const BASE_FEE = ethers.parseEther("0.25");
  const PRICE_FEE = 1e9;
  const { deploy, log } = deployments;
  const { deployer } = await getNamedAccounts();
  const chainId = network.config.chainId;
  if (developmentChains.includes(network.name)) {
    log("Local Network Detected. Deploying Mock Contracts...");
    const raffle = await deploy("VRFCoordinatorV2Mock", {
      from: deployer,
      args: [BASE_FEE, PRICE_FEE],
      log: true,
      waitConfirmations: 1,
    });
    // console.log(raffle);
  }
};

module.exports = func;
module.exports.tags = ["all", "mocks"];