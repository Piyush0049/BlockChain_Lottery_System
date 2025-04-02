const { ethers, network } = require("hardhat");
const fs = require("fs");

const FRONTEND_ADDRESS_LOCATION = "D:/smart_contract_lottery/frontend/src/constants/contractAddress.json";
const FRONTEND_ABI_LOCATION = "D:/smart_contract_lottery/frontend/src/constants/abi.json";

module.exports = async ({ getNamedAccounts, deployments }) => {
  if (process.env.UPDATE_FRONTEND) {
    console.log("Updating Frontend...");
    await updateFrontendAddress();
    await updateFrontendAbi();
  }
};

const updateFrontendAddress = async () => {
  const raffleDeployment = await deployments.get("Raffle");
  const chainId = network.config.chainId.toString();
  const raffle = await ethers.getContractAt("Raffle", raffleDeployment.address);
  // Write the ABI to the specified file
  fs.writeFileSync(FRONTEND_ABI_LOCATION, JSON.stringify(raffle.interface.fragments, null, 2));
};

const updateFrontendAbi = async () => {
  const raffleDeployment = await deployments.get("Raffle");
  const chainId = network.config.chainId.toString();
  const raffle = await ethers.getContractAt("Raffle", raffleDeployment.address);

  let currentAddresses = {};
  try {
    const fileContent = fs.readFileSync(FRONTEND_ADDRESS_LOCATION, "utf8");
    // Check if file content is not empty
    if (fileContent.trim().length > 0) {
      currentAddresses = JSON.parse(fileContent);
    }
  } catch (error) {
    console.log("Error reading contractAddress.json, creating a new one...", error);
    currentAddresses = {};
  }

  // Update the contract address for this chainId
  if (chainId in currentAddresses) {
    if (!currentAddresses[chainId].includes(raffle.target)) {
      currentAddresses[chainId].push(raffle.target);
    }
  } else {
    currentAddresses[chainId] = [raffle.target];
  }
  
  // Write the updated addresses using JSON.stringify, not JSON.parse
  fs.writeFileSync(FRONTEND_ADDRESS_LOCATION, JSON.stringify(currentAddresses, null, 2));
};

module.exports.tags = ["all", "frontend"];
