import { ethers } from 'hardhat';
import { MerkleTree } from 'merkletreejs';
const { ALLOWANCE_MODULE } = require('../utils/constants');
const AllowanceModule = require('../utils/AllowanceModule.json');
const GnosisSafe = require('../utils/GnosisSafe.json');
import { ZeroAddress, parseEther } from 'ethers';

async function main() {
  const [deployer, recipient] = await ethers.getSigners();

  const SAFE_ADDRESS = '0xB56eEC64a82a8E8824c1ED3c6916f2dECD157857';

  //   console.log({ SAFE_ADDRESS });

  console.log('Setting Merkle Root with the account:', deployer.address);

  const disburser = await ethers.deployContract('Disburser', [SAFE_ADDRESS]);

  await disburser.waitForDeployment();

  console.log('Disburser deployed by:', deployer.address);
  console.log('Disburser deployed to:', disburser.target);

  //   Setup Allowances
  const allowanceModule: any = await ethers.getContractAt(
    AllowanceModule,
    ALLOWANCE_MODULE
  );

  const safe: any = await ethers.getContractAt(GnosisSafe, SAFE_ADDRESS);

  const domain = {
    verifyingContract: SAFE_ADDRESS,
    chainId: 5,
  };

  const types = [
    { type: 'address', name: 'to' },
    { type: 'uint256', name: 'value' },
    { type: 'bytes', name: 'data' },
    { type: 'uint8', name: 'operation' },
    { type: 'uint256', name: 'safeTxGas' },
    { type: 'uint256', name: 'baseGas' },
    { type: 'uint256', name: 'gasPrice' },
    { type: 'address', name: 'gasToken' },
    { type: 'address', name: 'refundReceiver' },
    { type: 'uint256', name: 'nonce' },
  ];

  // Add Disburser as delegate
  const nonce = await safe.nonce();
  const addDelegateMessage = {
    to: ALLOWANCE_MODULE,
    value: 0,
    data: allowanceModule.interface.encodeFunctionData('addDelegate', [
      disburser.target,
    ]),
    operation: 0,
    safeTxGas: 0,
    baseGas: 0,
    gasPrice: 0,
    gasToken: '0x0000000000000000000000000000000000000000',
    refundReceiver: '0x0000000000000000000000000000000000000000',
    nonce: nonce,
  };

  const sigs = await deployer.signTypedData(
    domain,
    {
      SafeTx: types,
    },
    addDelegateMessage
  );

  const addDelegateTx = await safe.execTransaction(
    addDelegateMessage.to,
    addDelegateMessage.value,
    addDelegateMessage.data,
    addDelegateMessage.operation,
    0,
    0,
    0,
    '0x0000000000000000000000000000000000000000',
    '0x0000000000000000000000000000000000000000',
    sigs
  );

  await addDelegateTx.wait();
  console.log('Disburser added as delegate');

  // Set Allowance
  const setAllowanceNonce = await safe.nonce();
  const setAllowanceMessage = {
    to: ALLOWANCE_MODULE,
    value: 0,
    data: allowanceModule.interface.encodeFunctionData('setAllowance', [
      disburser.target,
      ZeroAddress,
      parseEther('1'),
      0,
      0,
    ]),
    operation: 0,
    safeTxGas: 0,
    baseGas: 0,
    gasPrice: 0,
    gasToken: '0x0000000000000000000000000000000000000000',
    refundReceiver: '0x0000000000000000000000000000000000000000',
    nonce: setAllowanceNonce,
  };

  const setAllowanceSign = await deployer.signTypedData(
    domain,
    {
      SafeTx: types,
    },
    setAllowanceMessage
  );

  const setAllowanceTx = await safe.execTransaction(
    setAllowanceMessage.to,
    setAllowanceMessage.value,
    setAllowanceMessage.data,
    setAllowanceMessage.operation,
    0,
    0,
    0,
    '0x0000000000000000000000000000000000000000',
    '0x0000000000000000000000000000000000000000',
    setAllowanceSign
  );

  await setAllowanceTx.wait();

  console.log('Allowance set');

  //   Get Current Allowance
  const currentAllowance = await allowanceModule.getTokenAllowance(
    SAFE_ADDRESS,
    disburser.target,
    ZeroAddress
  );

  console.log({ currentAllowance: currentAllowance.toString() });
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
