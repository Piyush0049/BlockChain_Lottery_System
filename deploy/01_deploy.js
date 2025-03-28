const { network, ethers, run } = require("hardhat");
const { developmentChains, networkConfig } = require("../helper-hardhat-config");

module.exports = async function ({ getNamedAccounts, deployments }) {
  const FUND_AMOUNT = ethers.parseEther("0.5");
  const VRF_SUB_FUND_AMOUNT = ethers.parseEther("0.2");
  const { deploy, log } = deployments;
  const { deployer } = await getNamedAccounts();
  const chainId = network.config.chainId;
  let VRFCoordinatorV2Mock, VRFCoordinatorV2MockAddress, subscriptionId;
  
  if (developmentChains.includes(network.name)) {
    const VRFCoordinatorV2MockDep = await deployments.get("VRFCoordinatorV2Mock");
    VRFCoordinatorV2MockAddress = VRFCoordinatorV2MockDep.address;
    VRFCoordinatorV2Mock = await ethers.getContractAt(
      "VRFCoordinatorV2Mock",
      VRFCoordinatorV2MockDep.address
    );
    const response = await VRFCoordinatorV2Mock.createSubscription();
    const reciept = await response.wait(1);
    subscriptionId = reciept.logs[0].args[0];
    await VRFCoordinatorV2Mock.fundSubscription(subscriptionId, VRF_SUB_FUND_AMOUNT);
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
  const addConsumerTx = await VRFCoordinatorV2Mock.addConsumer(subscriptionId, raffle.address);
  console.log("Consumer added:", addConsumerTx.hash);
  
  if (!developmentChains.includes(network.name)) {
    log("Verifying contract...");
    await run("verify:verify", {
      address: raffle.address,
      constructorArguments: args,
    });
  }
};

module.exports.tags = ["all", "lottery"];
