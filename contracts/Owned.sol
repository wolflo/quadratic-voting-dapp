pragma solidity ^0.4.24;

/**
@title Owned
@dev establishes contract owner, implements modifier to require owner 
status, and allows transfer of ownership
*/
contract Owned {

    address public owner;

    constructor() internal { owner = msg.sender; }
    modifier onlyOwner { require (msg.sender == owner); _; }

    function transferOwnership(address newOwner) onlyOwner public { 
        owner = newOwner; 
    }
}