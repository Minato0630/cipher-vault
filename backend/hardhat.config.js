require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

module.exports = {
  solidity: "0.8.20",
  networks: {
    amoy: {
      url: "https://rpc-amoy.polygon.technology",
      accounts: process.env.POLYGON_AMOY_PRIVATE_KEY ? [process.env.POLYGON_AMOY_PRIVATE_KEY] : []
    }
  }
};
