const { network, deployments, getNamedAccounts, ethers } = require("hardhat");
const { developmentChains, networkConfig } = require("../../helper-hardhat-config");
const { assert, expect } = require("chai");

!developmentChains.includes(network.name)
  ? describe.skip("Raffle", function () {
      // Skipping tests on non-development chains if needed.
    })
  : describe("Raffle", function () {
      // Extend timeout to 5 minutes (300,000 ms) for staging tests
      this.timeout(300000);

      const eth = ethers.parseEther("0.01");
      const chainId = network.config.chainId;
      let raffleContract, accounts, deployer;

      beforeEach(async function () {
        console.log("beforeEach: Fetching signers and deployments...");
        accounts = await ethers.getSigners();
        deployer = (await getNamedAccounts()).deployer;
        console.log("beforeEach: Deployer is", deployer);
        const raffleContractDep = await deployments.get("Raffle");
        console.log("beforeEach: Raffle contract deployment record fetched:");
        raffleContract = await ethers.getContractAt("Raffle", raffleContractDep.address);
        console.log("beforeEach: Raffle contract instance obtained at", raffleContract.target);
      });

      describe("fulfillRandomWords", function () {
        it("works with live chainlink keeper and chainlink VRF, we get a random winner", async function () {
          console.log("Test: Starting test for fulfillRandomWords");
          const lastTimeStamp = await raffleContract.getLastTimeStamp();
          console.log("Test: Last time stamp fetched:", lastTimeStamp.toString());
          console.log("Test: Entering raffle...");
          const txEnter = await raffleContract.enterRaffle({ value: eth });
          await txEnter.wait(1);
          const winnerStartingBalance = await ethers.provider.getBalance(accounts[0].address);
          console.log("Test: Winner starting balance:", winnerStartingBalance.toString());

          await new Promise((resolve, reject) => {
            raffleContract.once("winnerPicked", async () => {
              try {
                console.log("Event: winnerPicked event fired!");
                const recentWinner = await raffleContract.getRecentWinner();
                console.log("Event: Recent winner:", recentWinner);

                const raffleState = await raffleContract.getRaffleState();
                console.log("Event: Raffle state:", raffleState.toString());

                const winnerEndingBalance = await ethers.provider.getBalance(accounts[0].address);
                console.log("Event: Winner ending balance:", winnerEndingBalance.toString());

                const endingTimeStamp = await raffleContract.getLastTimeStamp();
                console.log("Event: Ending time stamp:", endingTimeStamp.toString());

                // Assert that there is no player at index 0 (array reset)
                await expect(raffleContract.callStatic.getPlayer(0)).to.be.reverted;

                // Check that the recent winner is as expected.
                // NOTE: This test expects accounts[0] to be the winner.
                assert.equal(
                  recentWinner.toString(),
                  accounts[0].address,
                  "Recent winner mismatch"
                );
                assert.equal(raffleState.toString(), "0", "Raffle state not reset");
                // Check if winner's balance increased correctly
                assert.equal(
                  winnerEndingBalance.toString(),
                  winnerStartingBalance.add(eth).toString(),
                  "Winner balance did not increase correctly"
                );
                resolve();
              } catch (error) {
                console.error("Error in event listener:", error);
                reject(error);
              }
            });
          });
        });
      });
    });
