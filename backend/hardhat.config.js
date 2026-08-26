require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

module.exports = {
  solidity: "0.8.20",
  networks: {
    sepolia: {
      url: "https://ethereum-sepolia-rpc.publicnode.com",
      accounts: process.env.POLYGON_AMOY_PRIVATE_KEY ? [process.env.POLYGON_AMOY_PRIVATE_KEY] : []
    }
  }
};
