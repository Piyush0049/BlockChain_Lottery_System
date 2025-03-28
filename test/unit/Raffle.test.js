const { network, deployments, getNamedAccounts, ethers } = require("hardhat");
const {
  developmentChains,
  networkConfig,
} = require("../../helper-hardhat-config");
const { assert, expect } = require("chai");

!developmentChains.includes(network.name)
  ? describe.skip()
  : describe("Raffle", function () {
      const eth = ethers.parseEther("0.2");
      const chainId = network.config.chainId;
      let raffleContract,
        connectedRaffle,
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
        connectedRaffle = raffleContract.connect(accounts[1]);
        VRFCoordinatorV2Mock = await ethers.getContractAt(
          "VRFCoordinatorV2Mock",
          VRFCoordinatorV2MockDep.address
        );
      });
      describe("Constructor", async function () {
        it("Initialises contracts properly...", async function () {
          interval = await raffleContract.getInterval();
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
          const startingTimeStamp = await connectedRaffle.getLastTimeStamp();
          for (let i = startIndex; i < startIndex + total; i++) {
            connectedRaffle = raffleContract.connect(accounts[i]);
            await connectedRaffle.enterRaffle({ value: eth });
            console.log(i, "th account entered!");
          }
          await new Promise((resolve, reject) => {
            connectedRaffle.once("Winner Picked", async function () {
              console.log("Winner event fired...");
              try {
                const recentWinner = await connectedRaffle.getRecentWinner();
                const raffleState = await connectedRaffle.getRaffleState();
                const winnerBalance = await accounts[2].getBalance();
                const endingTimeStamp =
                  await connectedRaffle.getLastTimeStamp();
                await expect(connectedRaffle.getPlayer(0)).to.be.reverted;
                assert.equal(recentWinner.toString(), accounts[2].address);
                assert.equal(raffleState, 0);
                assert.equal(
                  winnerBalance.toString(),
                  startingBalance
                    .add(
                      raffleEntranceFee
                        .mul(additionalEntrances)
                        .add(raffleEntranceFee)
                    )
                    .toString()
                );
                assert(endingTimeStamp > startingTimeStamp);
                resolve();
              } catch (e) {
                reject(e);
              }
            });
          });
        });
      });
    });
