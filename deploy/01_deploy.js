const { network, ethers, run } = require("hardhat");
const {
  developmentChains,
  networkConfig,
} = require("../helper-hardhat-config");

const func = async ({ getNamedAccounts, deployments }) => {
  const FUND_AMOUNT = ethers.parseEther("0.5");
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
    subscriptionId = reciept.logs[0].args[0];
    await contract.fundSubscription(subscriptionId, VRF_SUB_FUND_AMOUNT);
  } else {
    log("Sepolia Network Detected. Deploying Contracts...");
    VRFCoordinatorV2MockAddress = networkConfig[chainId].vrfCoordinatorV2;
  }
  const callbackGasLimit = networkConfig[chainId].callbackGasLimit;
  const interval = networkConfig[chainId].interval;
  const entranceFee = networkConfig[chainId].entranceFee;
  const gasLane = networkConfig[chainId].gasLane;
  const args = [
    VRFCoordinatorV2MockAddress,
    entranceFee,
    subscriptionId,
    callbackGasLimit,
    gasLane,
    interval,
  ];
  const raffle = await deploy("Raffle", {
    from: deployer,
    args: args,
    log: true,
    waitConfirmations: 1,
  });
  console.log(raffle);
  if (!developmentChains.includes(network.name)) {
    log("Verifying contract...");
    await run("verify:verify", {
      address: VRFCoordinatorV2MockAddress,
      constructorArguments: args,
    });
  }
};

module.exports = func;
module.exports.tags = ["all", "lottery"];