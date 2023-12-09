import { HardhatUserConfig } from 'hardhat/config';
import '@nomicfoundation/hardhat-toolbox';
require('dotenv').config();

const config: HardhatUserConfig = {
  solidity: '0.8.20',

  networks: {
    hardhat: {
      chainId: 1337,
    },
    localhost: {
      url: 'http://localhost:8545',
    },
    goerli: {
      url: process.env.GOERLI_RPC || '',
      accounts: [
        process.env.DEPLOYER_PRIVATE_KEY1 || '',
        process.env.DEPLOYER_PRIVATE_KEY2 || '',
      ],
    },
  },
};

export default config;
