// SPDX-License-Identifier: SEE LICENSE IN LICENSE
pragma solidity ^0.8.3;
// Raffle
// Enter the lottery (paying some amount)
// Pick a random winner (verifiably random)
// Winner to be selected every X minutes -> completly automate
// Chainlink Oracle -> Randomness, Automated Execution (Chainlink Keepers)

import "@chainlink/contracts/src/v0.8/vrf/VRFConsumerBaseV2.sol";
import "@chainlink/contracts/src/v0.8/vrf/interfaces/VRFCoordinatorV2Interface.sol";

error Raffle__SendMoreToEnterRaffle();
error Raffle_TransferUnsuccessful();

contract Raffle is VRFConsumerBaseV2 {
    uint256 immutable i_entrancefee;
    address payable[] private s_players;
    VRFCoordinatorV2Interface private immutable i_vrfCoordinator;
    uint256 private immutable i_subscriptionId;
    address payable private recentWinner;
    uint32 private immutable i_callbackGasLimit;
    uint32 private constant num_words = 1;
    uint16 private constant request_confirmation = 3;
    bytes32 private immutable i_gasLane;
    event raffleEnter(address indexed player);
    event winnerPicked(address indexed winner);

    constructor(
        address vrfCoordinatorV2,
        uint256 entrancefee,
        uint256 subscriptionId,
        uint32 callbackGasLimit,
        bytes32 gasLane
    ) VRFConsumerBaseV2(vrfCoordinatorV2) {
        i_entrancefee = entrancefee;
        i_vrfCoordinator = VRFCoordinatorV2Interface(vrfCoordinatorV2);
        i_subscriptionId = subscriptionId;
        i_callbackGasLimit = callbackGasLimit;
        i_gasLane = gasLane;
    }

    function requestRandomWinner() public {
        uint256 requestId = i_vrfCoordinator.requestRandomWords(
            i_gasLane,
            uint64(i_subscriptionId),
            request_confirmation,
            i_callbackGasLimit,
            num_words
        );
    }

    function fulfillRandomWords(
        uint256 requestId,
        uint256[] memory randomWords
    ) internal override {
        uint256 index = randomWords[0] % randomWords.length;
        address payable randomWinner = s_players[index];
        recentWinner = randomWinner;
        (bool success,) = recentWinner.call{value : address(this).balance}("");
        if(!success){
            revert Raffle_TransferUnsuccessful();
        }
        emit winnerPicked(recentWinner);
    }

    function enterRaffle() public payable {
        if (msg.value < i_entrancefee) {
            revert Raffle__SendMoreToEnterRaffle();
        }
        s_players.push(payable(msg.sender));
        emit raffleEnter(msg.sender);
    }

    function getRecentWinner() public payable  returns (address) {
        return recentWinner;
    }

    function getenterancefee() public view returns (uint256) {
        return i_entrancefee;
    }

    function getplayer(uint256 index) public view returns (address payable) {
        return s_players[index];
    }
}
