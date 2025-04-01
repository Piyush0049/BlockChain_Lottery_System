const { network, deployments, getNamedAccounts, ethers } = require("hardhat");
const {
  developmentChains,
  networkConfig,
} = require("../../helper-hardhat-config");
const { assert, expect } = require("chai");

developmentChains.includes(network.name)
  ? describe.skip("Raffle", function () {})
  : describe("Raffle", function () {
      this.timeout(30000000);
      const eth = ethers.parseEther("0.001");
      let raffleContract, accounts, deployer;

      beforeEach(async function () {
        console.log("beforeEach: Fetching signers and deployments...");
        accounts = await ethers.getSigners();
        deployer = (await getNamedAccounts()).deployer;
        console.log("beforeEach: Deployer is", deployer);
        const raffleContractDep = await deployments.get("Raffle");
        console.log("beforeEach: Raffle contract deployment record fetched:");
        raffleContract = await ethers.getContractAt(
          "Raffle",
          raffleContractDep.address
        );
        console.log(
          "beforeEach: Raffle contract instance obtained at",
          raffleContract.target
        );
      });

      describe("fulfillRandomWords", function () {
        it("works with live chainlink keeper and chainlink VRF, we get a random winner", async function () {
          console.log("Test: Starting test for fulfillRandomWords");

          const lastTimeStamp = await raffleContract.getLastTimeStamp();
          console.log(
            "Test: Last time stamp fetched:",
            lastTimeStamp.toString()
          );

          console.log("Test: Entering raffle...");
          const txEnter = await raffleContract.enterRaffle({ value: eth });
          await txEnter.wait(1);

          const winnerStartingBalance = await ethers.provider.getBalance(
            accounts[0].address
          );
          console.log(
            "Test: Winner starting balance:",
            winnerStartingBalance.toString()
          );

          await new Promise(async (resolve, reject) => {
            const timeout = setTimeout(() => {
              reject(
                new Error(
                  "Timeout: winnerPicked event did not fire within 120 seconds"
                )
              );
            }, 120000);
            let a;

            raffleContract.once("WinnerPicked", async () => {
              clearTimeout(timeout);
              try {
                console.log("Event: winnerPicked event fired!");
                const recentWinner = await raffleContract.getRecentWinner();
                console.log("Event: Recent winner:", recentWinner);

                const raffleState = await raffleContract.getRaffleState();
                console.log("Event: Raffle state:", raffleState.toString());

                const winnerEndingBalance = await ethers.provider.getBalance(
                  accounts[0].address
                );
                console.log(
                  "Event: Winner ending balance:",
                  winnerEndingBalance.toString()
                );

                const endingTimeStamp = await raffleContract.getLastTimeStamp();
                console.log(
                  "Event: Ending time stamp:",
                  endingTimeStamp.toString()
                );

                await expect(raffleContract.getPlayer(0)).to.be.reverted;

                // Assertions
                assert.equal(
                  recentWinner.toString(),
                  accounts[0].address,
                  "Recent winner mismatch"
                );
                assert.equal(
                  raffleState.toString(),
                  "0",
                  "Raffle state not reset"
                );
                // assert.equal(
                //   winnerEndingBalance.toString(),
                //   (
                //     BigInt(winnerStartingBalance.toString()) +
                //     a.cumulativeGasUsed * a.gasPrice +
                //     BigInt(contractBalance.toString())
                //   ).toString(),
                //   "Winner balance did not increase correctly"
                // );
                assert(
                  endingTimeStamp > lastTimeStamp,
                  "Ending timestamp not greater than starting timestamp"
                );
                resolve();
              } catch (error) {
                console.error("Error in event listener:", error);
                reject(error);
              }
            });
            console.log("Performing performUpkeep...");
            contractBalance = await raffleContract.getBalance();
            await raffleContract.performUpkeep();
          });
        });
      });
    });
