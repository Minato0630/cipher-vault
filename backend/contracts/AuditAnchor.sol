// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract AuditAnchor {
    address public owner;

    // Mapping from caseId to the latest Merkle Root
    mapping(bytes32 => bytes32) public caseRoots;

    event Anchored(bytes32 indexed caseId, bytes32 merkleRoot, uint256 timestamp);

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can anchor");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    function anchor(bytes32 caseId, bytes32 merkleRoot) external onlyOwner {
        caseRoots[caseId] = merkleRoot;
        emit Anchored(caseId, merkleRoot, block.timestamp);
    }
}
