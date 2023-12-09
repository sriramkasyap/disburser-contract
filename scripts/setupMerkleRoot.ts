import { ethers } from 'hardhat';
import { MerkleTree } from 'merkletreejs';

import { ZeroAddress, parseEther } from 'ethers';

async function main() {
  const [deployer, recipient] = await ethers.getSigners();

  const SAFE_ADDRESS = '0x2036545cbdbB3141cFbb9d9036261df7331aC84c';

  console.log({ SAFE_ADDRESS });

  console.log('Setting Merkle Root with the account:', deployer.address);

  const disburser = await ethers.deployContract('Disburser', [SAFE_ADDRESS]);

  await disburser.waitForDeployment();

  console.log('Disburser deployed by:', deployer.address);
  console.log('Disburser deployed to:', disburser.target);

  //   Create batch of payouts to be made
  const payouts = [
    {
      safeAddress: SAFE_ADDRESS,
      token: ZeroAddress,
      amount: parseEther('0.0001'),
      nonce: 1,
    },
    {
      safeAddress: SAFE_ADDRESS,
      token: ZeroAddress,
      amount: parseEther('0.0002'),
      nonce: 2,
    },
    {
      safeAddress: SAFE_ADDRESS,
      token: ZeroAddress,
      amount: parseEther('0.0003'),
      nonce: 3,
    },
    {
      safeAddress: SAFE_ADDRESS,
      token: ZeroAddress,
      amount: parseEther('0.0004'),
      nonce: 4,
    },
  ];

  const payoutsEncoded = await Promise.all(
    payouts.map((payout) => {
      return disburser.encodeTransactionData(
        payout.token,
        payout.amount,
        payout.nonce
      );
    })
  );

  console.log({ payoutsEncoded });

  //   Create merkle tree
  const payoutTree = new MerkleTree(payoutsEncoded, ethers.keccak256, {
    sortPairs: true,
  });

  //   Create merkle root
  const merkleRoot = payoutTree.getHexRoot();
  console.log({ merkleRoot });

  //   Set merkle root
  let tx = await disburser.updateMerkleRoot(merkleRoot);
  await tx.wait();

  console.log({
    safe: await disburser.owner(),
    merkleRoot: await disburser.merkleRoot(),
  });

  let proofs: any[] = [];
  let leaves = [];

  //   Generate proof for payouts
  for (let i in payouts) {
    let proof = payoutTree.getHexProof(payoutsEncoded[i]);
    // console.log({ i, proof });

    proofs[i] = proof;
    leaves.push(payoutsEncoded[i]);
  }

  //   Ask for Payout
  let initialBalance = await recipient.provider.getBalance(recipient.address);
  let proof = proofs[0];
  let payout = payouts[0];
  let payoutAmount = payout.amount;
  let payoutNonce = payout.nonce;
  let payoutToken = payout.token;
  let payoutSafeAddress = payout.safeAddress;

  console.log({
    payoutAmount,
    payoutNonce,
    payoutToken,
    payoutSafeAddress,
    proof,
  });

  let testEncoding = await disburser.encodeTransactionData(
    payoutToken,
    payoutAmount,
    payoutNonce
  );

  console.log({
    testEncoding,
    leaf: leaves[0],
    bool: leaves[0] == testEncoding,
  });

  let testClaim = await disburser.testClaim(
    payoutToken,
    payoutAmount,
    payoutNonce,
    proof
  );

  console.log({ testClaim });

  let payoutTx = await disburser.claimPayout(
    payoutToken,
    payoutAmount,
    payoutNonce,
    proof
  );

  await payoutTx.wait();

  let finalBalance = await recipient.provider.getBalance(recipient.address);

  console.log({
    initialBalance,
    finalBalance,
    diff: finalBalance - initialBalance,
  });
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
