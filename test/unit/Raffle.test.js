const { network, deployments, getNamedAccounts, ethers } = require("hardhat");
const { developmentChains, networkConfig } = require("../../helper-hardhat-config");
const { assert, expect } = require("chai");

!developmentChains.includes(network.name)
  ? describe.skip()
  : describe("Raffle", function () {
    const chainId = network.config.chainId;
      let raffleContract, VRFCoordinatorV2Mock;
      beforeEach(async function () {
        await deployments.fixture(["all"]);
        const deployer = (await getNamedAccounts()).deployer;
        const raffleContractDep = await deployments.get("Raffle");
        const VRFCoordinatorV2MockDep = await deployments.get("VRFCoordinatorV2Mock");
        raffleContract = await ethers.getContractAt("Raffle", raffleContractDep.address); 
        VRFCoordinatorV2Mock = await ethers.getContractAt("VRFCoordinatorV2Mock", VRFCoordinatorV2MockDep.address); 
      });
      describe("Constructor", async function () {
        it("Initialises contracts properly...", async function () {
            const interval = await raffleContract.getInterval();
            assert.equal(interval.toString(), networkConfig[chainId].interval)
        })
      })
    });
