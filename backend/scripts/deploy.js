const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  const AuditAnchor = await hre.ethers.getContractFactory("AuditAnchor");
  const anchor = await AuditAnchor.deploy();

  await anchor.waitForDeployment();

  const address = await anchor.getAddress();
  console.log("AuditAnchor deployed to:", address);

  const addressPath = path.join(__dirname, '..', 'contract_address.txt');
  fs.writeFileSync(addressPath, address);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
