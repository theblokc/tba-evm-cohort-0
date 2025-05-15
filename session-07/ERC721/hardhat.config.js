require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config({path: '.env'});

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: "0.8.28",
  networks: {
    baseSepolia: {
      accounts: [process.env.PRIVATE_KEY],
      url:'https://sepolia.base.org',
      chainId: 84532 
    }
  }
};