const { network, deployments, getNamedAccounts, ethers } = require("hardhat");
const {
  developmentChains,
  networkConfig,
} = require("../../helper-hardhat-config");
const { assert, expect } = require("chai");

true
  ? describe.skip
  : describe("Raffle", function () {
      const eth = ethers.parseEther("0.2");
      const chainId = network.config.chainId;
      let raffleContract,
        connectedRaffle,
        raffle,
        VRFCoordinatorV2Mock,
        interval,
        accounts;
      beforeEach(async function () {
        await deployments.fixture(["all"]);
        accounts = await ethers.getSigners();
        deployer = (await getNamedAccounts()).deployer;
        const raffleContractDep = await deployments.get("Raffle");
        const VRFCoordinatorV2MockDep = await deployments.get(
          "VRFCoordinatorV2Mock"
        );
        raffleContract = await ethers.getContractAt(
          "Raffle",
          raffleContractDep.address
        );
        console.log(raffleContract.target)
        raffle = raffleContract;
        connectedRaffle = raffleContract.connect(accounts[1]);
        VRFCoordinatorV2Mock = await ethers.getContractAt(
          "VRFCoordinatorV2Mock",
          VRFCoordinatorV2MockDep.address
        );
      });
      describe("Constructor", async function () {
        it("Initialises contracts properly...", async function () {
          interval = await raffleContract.getInterval();
          console.log("interval", interval)
          assert.equal(interval.toString(), networkConfig[chainId].interval);
        });
      });
      describe("Enter Raffle", async function () {
        it("Reverts if not payed enough", async function () {
          await expect(
            connectedRaffle.enterRaffle()
          ).to.be.revertedWithCustomError(
            connectedRaffle,
            "Raffle__SendMoreToEnterRaffle"
          );
        });
        it("Records the players when enter raffle", async function () {
          await connectedRaffle.enterRaffle({ value: eth });
          const player = await connectedRaffle.getPlayer(0);
          assert.equal(player, accounts[1].address);
        });
        it("Emits event on raffle", async function () {
          await expect(connectedRaffle.enterRaffle({ value: eth })).to.emit(
            connectedRaffle,
            "raffleEnter"
          );
        });
        it("doesnt allow enter while calculating", async function () {
          await connectedRaffle.enterRaffle({ value: eth });
          await network.provider.send("evm_increaseTime", [
            Number(interval) + 1,
          ]);
          await network.provider.request({ method: "evm_mine", params: [] });
          await connectedRaffle.performUpkeep("0x");
          await expect(
            connectedRaffle.enterRaffle({ value: eth })
          ).to.be.revertedWithCustomError(connectedRaffle, "Raffle_Not_Open");
        });
      });
      describe("checkupkeep", async function () {
        it("returns false if people haven't sent any ETH", async () => {
          await network.provider.send("evm_increaseTime", [
            Number(interval) + 1,
          ]);
          await network.provider.request({ method: "evm_mine", params: [] });
          const { upkeepNeeded } = await connectedRaffle.checkUpkeep("0x");
          assert(!upkeepNeeded);
        });
        it("returns false if raffle isn't open", async () => {
          await connectedRaffle.enterRaffle({ value: eth });
          await network.provider.send("evm_increaseTime", [
            Number(interval) + 1,
          ]);
          await network.provider.request({ method: "evm_mine", params: [] });
          await connectedRaffle.performUpkeep("0x");
          const raffleState = await connectedRaffle.getRaffleState();
          const { upkeepNeeded } = await connectedRaffle.checkUpkeep("0x");
          assert.equal(raffleState.toString(), "1");
          assert.equal(upkeepNeeded, false);
        });
        it("returns false if enough time hasn't passed", async () => {
          await connectedRaffle.enterRaffle({ value: eth });
          await network.provider.send("evm_increaseTime", [
            Number(interval) - 5,
          ]);
          await network.provider.request({ method: "evm_mine", params: [] });
          const { upkeepNeeded } = await connectedRaffle.checkUpkeep("0x");
          assert(!upkeepNeeded);
        });
        it("returns true if enough time has passed, has players, eth, and is open", async () => {
          await connectedRaffle.enterRaffle({ value: eth });
          await network.provider.send("evm_increaseTime", [
            Number(interval) + 1,
          ]);
          await network.provider.request({ method: "evm_mine", params: [] });
          const { upkeepNeeded } = await connectedRaffle.checkUpkeep("0x");
          assert(upkeepNeeded);
        });
      });
      describe("performUpkeep", function () {
        it("can only run if checkupkeep is true", async () => {
          connectedRaffle.enterRaffle({ value: eth });
          await network.provider.send("evm_increaseTime", [
            Number(interval) + 1,
          ]);
          await network.provider.request({ method: "evm_mine", params: [] });
          const tx = await connectedRaffle.performUpkeep("0x");
          assert(tx);
        });
        it("reverts if checkup is false", async () => {
          await expect(
            connectedRaffle.performUpkeep("0x")
          ).to.be.revertedWithCustomError(
            connectedRaffle,
            "checkUpkeep_Not_Needed"
          );
        });
        it("updates the raffle state and emits a requestId", async () => {
          await connectedRaffle.enterRaffle({ value: eth });
          await network.provider.send("evm_increaseTime", [
            Number(interval) + 1,
          ]);
          await network.provider.request({ method: "evm_mine", params: [] });
          const txResponse = await connectedRaffle.performUpkeep("0x");
          const txReceipt = await txResponse.wait(1);
          const requestId = txReceipt.logs[1].args[0];
          assert(requestId !== undefined, "Request ID should be defined");
          assert(Number(requestId) > 0, "Request ID must be greater than 0");
          const raffleState = await raffleContract.getRaffleState();
          assert.equal(raffleState.toString(), "1");
        });
      });
      describe("fulfillRandomWords", function () {
        beforeEach(async () => {
          await connectedRaffle.enterRaffle({ value: eth });
          await network.provider.send("evm_increaseTime", [
            Number(interval) + 1,
          ]);
          await network.provider.request({ method: "evm_mine", params: [] });
        });
        it("can only be called after performupkeep", async () => {
          await expect(
            VRFCoordinatorV2Mock.fulfillRandomWords(0, connectedRaffle.target)
          ).to.be.revertedWith("nonexistent request");
          await expect(
            VRFCoordinatorV2Mock.fulfillRandomWords(1, connectedRaffle.target)
          ).to.be.revertedWith("nonexistent request");
        });
        it("picks a winner, resets, and sends money", async () => {
          const startIndex = 2;
          const total = 3;
          let startingBalance;
          const startingTimeStamp = await connectedRaffle.getLastTimeStamp();

          // Have multiple players enter the raffle
          for (let i = startIndex; i < startIndex + total; i++) {
            connectedRaffle = raffleContract.connect(accounts[i]);
            await connectedRaffle.enterRaffle({ value: eth });
            console.log(i, "th account entered!");
          }

          await new Promise(async (resolve, reject) => {
            // Listen for the winnerPicked event once
            connectedRaffle.once("winnerPicked", async () => {
              try {
                console.log("Event: winnerPicked event fired!");
                const recentWinner = await connectedRaffle.getRecentWinner();
                console.log("Event: Recent winner:", recentWinner);

                const raffleState = await connectedRaffle.getRaffleState();
                console.log("Event: Raffle state:", raffleState.toString());

                const winnerBalance = await ethers.provider.getBalance(
                  accounts[2].address
                );
                console.log(
                  "Event: Winner ending balance:",
                  winnerBalance.toString()
                );

                const endingTimeStamp =
                  await connectedRaffle.getLastTimeStamp();
                console.log(
                  "Event: Ending time stamp:",
                  endingTimeStamp.toString()
                );

                const a = await raffleContract.getAllPlayers();
                console.log(a)
                // Verify that the players array is reset
                await expect(raffleContract.getPlayer(0)).to.be.reverted;

                // Assertions
                assert.equal(
                  recentWinner.toString(),
                  accounts[2].address,
                  "Recent winner mismatch"
                );
                assert.equal(
                  raffleState.toString(),
                  "0",
                  "Raffle state not reset"
                );

                const expectedValue =
                  BigInt(startingBalance.toString()) +
                  BigInt(eth.toString()) * BigInt(total) +
                  BigInt(eth.toString());
                assert.equal(
                  winnerBalance.toString(),
                  expectedValue.toString(),
                  "Winner balance did not increase correctly"
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

            // Trigger performUpkeep() and simulate VRF fulfillment
            try {
              const tx = await connectedRaffle.performUpkeep("0x");
              const txReceipt = await tx.wait(1);
              // Record starting balance for expected calculation
              startingBalance = await ethers.provider.getBalance(
                accounts[2].address
              );
              // Simulate VRF Coordinator calling fulfillRandomWords()
              const txResponse = await VRFCoordinatorV2Mock.fulfillRandomWords(
                txReceipt.logs[1].args[0],
                connectedRaffle.target
              );
              await txResponse.wait(1);
            } catch (e) {
              reject(e);
            }
          });
        });
      });
    });