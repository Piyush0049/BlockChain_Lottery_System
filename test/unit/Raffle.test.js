const { network, deployments, getNamedAccounts, ethers } = require("hardhat");
const {
  developmentChains,
  networkConfig,
} = require("../../helper-hardhat-config");
const { assert, expect } = require("chai");

!developmentChains.includes(network.name)
  ? describe.skip("Raffle", function () {})
  : describe("Raffle", function () {
      this.timeout(30000000);

      const eth = ethers.parseEther("0.2");
      const chainId = network.config.chainId;
      let raffleContract, connectedRaffle, interval, accounts, deployer;

      beforeEach(async function () {
        await deployments.fixture(["all"]);
        accounts = await ethers.getSigners();
        deployer = (await getNamedAccounts()).deployer;
        const raffleContractDep = await deployments.get("Raffle");
        raffleContract = await ethers.getContractAt(
          "Raffle",
          raffleContractDep.address
        );
        console.log("Contract deployed at:", raffleContract.target);
        connectedRaffle = raffleContract.connect(accounts[1]);
        interval = await raffleContract.getInterval();
        console.log("Interval:", interval.toString());
      });

      describe("Constructor", function () {
        it("Initialises contracts properly...", async function () {
          assert.equal(interval.toString(), networkConfig[chainId].interval);
        });
      });

      describe("Enter Raffle", function () {
        it("Reverts if not paid enough", async function () {
          await expect(
            connectedRaffle.enterRaffle()
          ).to.be.revertedWithCustomError(
            connectedRaffle,
            "Raffle__SendMoreToEnterRaffle"
          );
        });
        it("Records the player when entering the raffle", async function () {
          await connectedRaffle.enterRaffle({ value: eth });
          const player = await connectedRaffle.getPlayer(0);
          assert.equal(player, accounts[1].address);
        });
        it("Emits event on entering the raffle", async function () {
          await expect(connectedRaffle.enterRaffle({ value: eth }))
            .to.emit(connectedRaffle, "RaffleEnter")
            .withArgs(accounts[1].address);
        });
      });

      describe("checkUpkeep", function () {
        it("Returns false if no ETH is sent (no players, no balance)", async function () {
          await network.provider.send("evm_increaseTime", [
            Number(interval) + 1,
          ]);
          await network.provider.request({ method: "evm_mine", params: [] });
          const upkeepNeeded = await raffleContract.checkUpkeep();
          assert(!upkeepNeeded);
        });
      });

      describe("performUpkeep", function () {
        it("Can only run if checkUpkeep is true", async function () {
          await connectedRaffle.enterRaffle({ value: eth });
          await network.provider.send("evm_increaseTime", [
            Number(interval) + 1,
          ]);
          await network.provider.request({ method: "evm_mine", params: [] });
          const tx = await raffleContract.performUpkeep();
          assert(tx);
        });

        it("Reverts if checkUpkeep is false", async function () {
          await expect(raffleContract.performUpkeep()).to.be.revertedWith(
            "checkUpkeep_Not_Needed"
          );
        });
      });

      describe("fulfillRandomWords (Complete Flow)", function () {
        beforeEach(async () => {
          await connectedRaffle.enterRaffle({ value: eth });
          await network.provider.send("evm_increaseTime", [
            Number(interval) + 1,
          ]);
          await network.provider.request({ method: "evm_mine", params: [] });
        });
        it("Picks a winner, resets, and sends money", async () => {
          const startIndex = 2;
          const total = 3;
          let startingBalance;
          const startingTimeStamp = await raffleContract.getLastTimeStamp();
          for (let i = startIndex; i < startIndex + total; i++) {
            const raffleForAccount = raffleContract.connect(accounts[i]);
            await raffleForAccount.enterRaffle({ value: eth });
            console.log(i, "th account entered!");
          }
          await new Promise(async (resolve, reject) => {
            const timeout = setTimeout(() => {
              reject(
                new Error(
                  "Timeout: WinnerPicked event did not fire within 60 seconds"
                )
              );
            }, 60000);

            raffleContract.once("WinnerPicked", async () => {
              clearTimeout(timeout);
              try {
                console.log("Event: WinnerPicked event fired!");
                const recentWinner = await raffleContract.getRecentWinner();
                console.log("Event: Recent winner:", recentWinner);

                const raffleState = await raffleContract.getRaffleState();
                console.log("Event: Raffle state:", raffleState.toString());

                const winnerBalance = await ethers.provider.getBalance(
                  accounts[2].address
                );
                console.log(
                  "Event: Winner ending balance:",
                  winnerBalance.toString()
                );

                const endingTimeStamp = await raffleContract.getLastTimeStamp();
                console.log(
                  "Event: Ending time stamp:",
                  endingTimeStamp.toString()
                );
                await expect(raffleContract.getPlayer(0)).to.be.reverted;
                assert.equal(
                  raffleState.toString(),
                  "0",
                  "Raffle state not reset"
                );
                assert(
                  endingTimeStamp > startingTimeStamp,
                  "Timestamp did not update"
                );
                resolve();
              } catch (error) {
                console.error("Error in event listener:", error);
                reject(error);
              }
            });

            try {
              const players = await raffleContract.getAllPlayers();
              console.log(players);
              const tx = await raffleContract.performUpkeep();
              const txReceipt = await tx.wait(2);
              startingBalance = await ethers.provider.getBalance(
                accounts[2].address
              );
            } catch (e) {
              reject(e);
            }
          });
        });
      });
    });
