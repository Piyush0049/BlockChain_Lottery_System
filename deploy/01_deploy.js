const { network, ethers } = require("hardhat");
const {
  developmentChains,
  networkConfig,
} = require("../helper-hardhat-config");

module.exports = async function ({ getNamedAccounts, deployments }) {
  const FUND_AMOUNT = ethers.utils.parseEther("0.5")
  const VRF_SUB_FUND_AMOUNT = ethers.parseEther("0.2");
  const { deploy, log } = deployments;
  const { deployer } = await getNamedAccounts();
  const chainId = network.config.chainId;
  let VRFCoordinatorV2MockAddress, subscriptionId;
  if (developmentChains.includes(network.name)) {
    const VRFCoordinatorV2Mock = await deployments.get("VRFCoordinatorV2Mock");
    VRFCoordinatorV2MockAddress = VRFCoordinatorV2Mock.address;
    const contract = await ethers.getContractAt(
      "VRFCoordinatorV2Mock",
      VRFCoordinatorV2Mock.address
    );
    const response = await contract.createSubscription();
    const reciept = await response.wait(1);
    // console.log("Receipt events:", reciept.events);
    subscriptionId = reciept.logs[0].args[1]
    await VRFCoordinatorV2Mock.fundSubscription(subscriptionId, FUND_AMOUNT)
  } else {
    VRFCoordinatorV2MockAddress = networkConfig[chainId].vrfCoordinatorV2;
  }
  const entranceFee = networkConfig[chainId].entranceFee;
  const gasLane = networkConfig[chainId].gasLane;
  const args = [VRFCoordinatorV2MockAddress, entranceFee, gasLane, subscriptionId];
  log("Sepolia Network Detected. Deploying Contracts...");
  const raffle = await deploy("Raffle", {
    from: deployer,
    args: [],
    log: true,
    waitConfirmations: 1,
  });
  console.log(raffle);
};
