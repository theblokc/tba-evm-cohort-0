'use client';

import { useEffect, useState } from "react";
import { ethers } from "ethers";
import { contractAddress, contractABI } from "@/lib/contract";
import { MetaMaskInpageProvider } from "@metamask/providers";

declare global {
  interface Window {
    ethereum?: MetaMaskInpageProvider;
  }
}
export default function Home() {
  const [account, setAccount] = useState<string | null>(null);
  const [contract, setContract] = useState<ethers.Contract | null>(null);

  const connectWallet = async () => {
    if (window.ethereum) {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      try {
        const accounts = (await window.ethereum.request({
          method: "eth_requestAccounts",
        })) as string[];

        if (accounts && accounts.length > 0) {
          setAccount(accounts[0]);
          const contractInstance = new ethers.Contract(
            contractAddress,
            contractABI,
            signer
          );
          setContract(contractInstance);
        } else {
          alert("No accounts found.");
        }
      } catch (error) {
        alert("Error connecting to wallet.");
        console.error(error);
      }
    } else {
      alert("Please install MetaMask.");
    }
  };

  useEffect(() => {
    connectWallet();
  }, []);


  const mint = async () => {
    if (contract) {
      const tx = await contract.mint();
      await tx.wait();
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900">
      <h1 className="text-3xl font-bold mb-4">Mint DApp</h1>
      {account ? (
        <p className="mb-2">Connected Account: {account}</p>
      ) : (
        <button
          onClick={connectWallet}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 cursor-pointer"
        >
          Connect Wallet
        </button>
      )}
      <div className="space-x-4 mt-3">
        <button
          onClick={mint}
          className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 cursor-pointer"
        >
          Mint
        </button>
      </div>
    </div>
  );
}