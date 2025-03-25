// SPDX-License-Identifier: SEE LICENSE IN LICENSE
pragma solidity ^0.8.3;
Raffle
// Enter the lottery (paying some amount)
// Pick a random winner (verifiably random)
// Winner to be selected every X minutes -> completly automate
// Chainlink Oracle -> Randomness, Automated Execution (Chainlink Keepers)

error Raffle__SendMoreToEnterRaffle();

contract Raffle {
    uint256 payable immutable i_entrancefee;
    address[] payable private funders;

    constructor(uint256 entrancefee) {
        i_entrancefee = entrancefee;
    }

    // function randomWinner()  returns () {
        
    // }


    function enterRaffle() payable public  returns () {
        if (msg.value < i_entrancefee) {
            revert Raffle__SendMoreToEnterRaffle();
        }
        funders.push(payable(msg.sender));
        emit raffleEnter(msg.sender)

    }

    function getenterancefee() public view return (uint256){
        return i_entrancefee;
    }

    function getplayer(uint256 index) public view return (uint256){
        return funders[index];
    }
}