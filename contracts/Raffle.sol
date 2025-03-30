// SPDX-License-Identifier: SEE LICENSE IN LICENSE
pragma solidity ^0.8.3;

import "@chainlink/contracts/src/v0.8/vrf/VRFConsumerBaseV2.sol";
import "@chainlink/contracts/src/v0.8/vrf/interfaces/VRFCoordinatorV2Interface.sol";
import "@chainlink/contracts/src/v0.8/automation/AutomationCompatible.sol";

// Raffle
// Enter the lottery (paying some amount)
// Pick a random winner (verifiably random)
// Winner to be selected every X minutes -> completly automate
// Chainlink Oracle -> Randomness, Automated Execution (Chainlink Keepers)

error Raffle__SendMoreToEnterRaffle();
event RequestedRandomWords(uint256 indexed requestId);
error Raffle_TransferUnsuccessful();
error Raffle_Not_Open();
error checkUpkeep_Not_Needed(
    uint256 currentBalance,
    uint256 numPlayers,
    uint256 raffleState
);

contract Raffle is VRFConsumerBaseV2, AutomationCompatible {
    uint256 immutable i_entrancefee;
    address payable[] private s_players;
    VRFCoordinatorV2Interface private immutable i_vrfCoordinator;
    uint256 private immutable i_subscriptionId;
    address payable private recentWinner;
    uint32 private immutable i_callbackGasLimit;
    uint32 private constant num_words = 1;
    uint16 private constant request_confirmation = 3;
    bytes32 private immutable i_gasLane;
    uint256 private s_isOpen;
    uint256 private immutable i_interval;
    uint256 private s_lastTimeStamp;

    enum RaffleState {
        OPEN,
        CALCULATING
    }

    RaffleState private s_raffle_state;

    event raffleEnter(address indexed player);
    event winnerPicked(address indexed winner);

    constructor(
        address vrfCoordinatorV2,
        uint256 entrancefee,
        uint256 subscriptionId,
        uint32 callbackGasLimit,
        bytes32 gasLane,
        uint256 interval
    ) VRFConsumerBaseV2(vrfCoordinatorV2) {
        i_entrancefee = entrancefee;
        i_vrfCoordinator = VRFCoordinatorV2Interface(vrfCoordinatorV2);
        i_subscriptionId = subscriptionId;
        i_callbackGasLimit = callbackGasLimit;
        i_gasLane = gasLane;
        s_raffle_state = RaffleState.OPEN;
        i_interval = interval;
        s_lastTimeStamp = block.timestamp;
    }

    function checkUpkeep(
        bytes memory
    ) public view override returns (bool upkeepNeeded, bytes memory) {
        bool isOpen = (s_raffle_state == RaffleState.OPEN);
        bool timePassed = (block.timestamp - s_lastTimeStamp) > i_interval;
        bool hasPlayers = s_players.length > 0;
        bool hasBalance = address(this).balance > 0;
        upkeepNeeded = (isOpen && timePassed && hasPlayers && hasBalance);
    }

    function performUpkeep(bytes calldata) external override {
    (bool upkeepNeeded, ) = checkUpkeep("");
    if (!upkeepNeeded) {
        revert checkUpkeep_Not_Needed(
            address(this).balance,
            s_players.length,
            uint256(s_raffle_state)
        );
    }
    s_raffle_state = RaffleState.CALCULATING;
    uint256 requestId = i_vrfCoordinator.requestRandomWords(
        i_gasLane,
        uint64(i_subscriptionId),
        request_confirmation,
        i_callbackGasLimit,
        num_words
    );
    emit RequestedRandomWords(requestId);
    }

    function fulfillRandomWords(
        uint256,
        uint256[] memory randomWords
    ) internal override {
        s_raffle_state = RaffleState.CALCULATING;
        uint256 index = randomWords[0] % s_players.length;
        address payable randomWinner = s_players[index];
        recentWinner = randomWinner;
        s_raffle_state = RaffleState.OPEN;
        s_players = new address payable[](0);
        s_lastTimeStamp = block.timestamp;
        (bool success, ) = recentWinner.call{value: address(this).balance}("");
        if (!success) {
            revert Raffle_TransferUnsuccessful();
        }
        emit winnerPicked(recentWinner);
    }

    function enterRaffle() public payable {
        if (s_raffle_state != RaffleState.OPEN) {
            revert Raffle_Not_Open();
        }
        if (msg.value < i_entrancefee) {
            revert Raffle__SendMoreToEnterRaffle();
        }
        s_players.push(payable(msg.sender));
        emit raffleEnter(msg.sender);
    }

    function changerafflestate() public {
        if (s_raffle_state == RaffleState.OPEN) {
            s_raffle_state = RaffleState.CALCULATING;
        } else {
            s_raffle_state = RaffleState.OPEN;
        }
    }

    function getRecentWinner() public view returns (address) {
        return recentWinner;
    }

    function getPlayers() public view returns (address payable[] memory) {
        return s_players;
    }

    function getRaffleState() public view returns (RaffleState) {
        return s_raffle_state;
    }

    function getLastTimeStamp() public view returns (uint256) {
        return s_lastTimeStamp;
    }    

    function getEntranceFee() public view returns (uint256) {
        return i_entrancefee;
    }

    function getPlayer(uint256 index) public view returns (address payable) {
        return s_players[index];
    }

    function getInterval() public view returns (uint256) {
        return i_interval;
    }
}
