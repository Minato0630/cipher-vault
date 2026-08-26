const { ethers } = require('ethers');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// We need the deployed contract address. In a real app we'd load this from an env or config.
// For now we will rely on a local file that gets written after deployment.
let contractAddress = null;
const addressPath = path.join(__dirname, 'contract_address.txt');
if (fs.existsSync(addressPath)) {
    contractAddress = fs.readFileSync(addressPath, 'utf8').trim();
}

// Minimal ABI for the anchor function
const abi = [
    "function anchor(bytes32 caseId, bytes32 merkleRoot) external",
    "event Anchored(bytes32 indexed caseId, bytes32 merkleRoot, uint256 timestamp)"
];

// Helper to compute a basic SHA-256 Merkle Root
function computeMerkleRoot(hashes) {
    if (hashes.length === 0) return '0x' + Buffer.alloc(32).toString('hex');
    if (hashes.length === 1) return '0x' + hashes[0];

    let layer = hashes;
    while (layer.length > 1) {
        let nextLayer = [];
        for (let i = 0; i < layer.length; i += 2) {
            const left = layer[i];
            const right = layer[i + 1] || left; // duplicate last if odd
            const combined = left + right;
            const hashed = crypto.createHash('sha256').update(combined).digest('hex');
            nextLayer.push(hashed);
        }
        layer = nextLayer;
    }
    return '0x' + layer[0];
}

async function anchorCaseLogs(caseId, entryHashes) {
    if (!process.env.POLYGON_AMOY_PRIVATE_KEY) throw new Error("Missing Polygon private key");
    if (!contractAddress) throw new Error("Contract not deployed yet");
    
    // In production we'd use process.env.RPC_URL, hardcoding Amoy here as per prompt
    const provider = new ethers.JsonRpcProvider("https://polygon-amoy-bor-rpc.publicnode.com");
    const wallet = new ethers.Wallet(process.env.POLYGON_AMOY_PRIVATE_KEY, provider);
    const contract = new ethers.Contract(contractAddress, abi, wallet);

    const root = computeMerkleRoot(entryHashes);
    // bytes32 caseId representation (pad string or hash it if > 32 bytes)
    // Assuming caseId is UUID, we can just hash it to get bytes32
    const caseIdBytes32 = '0x' + crypto.createHash('sha256').update(caseId).digest('hex');

    const tx = await contract.anchor(caseIdBytes32, root);
    const receipt = await tx.wait();

    return {
        txHash: tx.hash,
        merkleRoot: root,
        timestamp: new Date().toISOString() // Or get block timestamp
    };
}

module.exports = {
    anchorCaseLogs,
    computeMerkleRoot
};
