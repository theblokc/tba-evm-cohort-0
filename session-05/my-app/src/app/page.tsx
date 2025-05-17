"use client";
import { useState, useEffect } from "react";
import { CONTRACT_ADDRESS, CONTRACT_ABI } from "../../lib/NotepadABI";
import { ethers } from "ethers";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, AlertCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

// Define the Note type based on your contract
interface Note {
  author: string;
  content: string;
  timestamp: bigint | number; // Updated to handle BigInt
}

// Base Sepolia network configuration
const BASE_SEPOLIA_CONFIG = {
  chainId: "84532", // 84532 in hex
  chainName: "Base Sepolia",
  nativeCurrency: {
    name: "Ethereum",
    symbol: "ETH",
    decimals: 18,
  },
  rpcUrls: ["https://sepolia.base.org"],
  blockExplorerUrls: ["https://sepolia.basescan.org"],
};

export default function Home() {
  const [wallet, setWallet] = useState<string | null>(null);
  const [notes, setNotes] = useState<Note[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isCorrectNetwork, setIsCorrectNetwork] = useState(false);
  const [networkSwitching, setNetworkSwitching] = useState(false);

  // Check if connected to the correct network
  const checkNetwork = async () => {
    if (!window.ethereum) return false;

    try {
      // For ethers v6
      const provider = new ethers.BrowserProvider(window.ethereum);
      const network = await provider.getNetwork();
      const isBase = Number(network.chainId) === 84532; // Base Sepolia chain ID
      setIsCorrectNetwork(isBase);
      return isBase;
    } catch (error) {
      console.error("Error checking network:", error);
      return false;
    }
  };

  // Switch to Base Sepolia network
  const switchToBaseSepolia = async () => {
    if (!window.ethereum) {
      setError("MetaMask is not installed");
      return false;
    }

    setNetworkSwitching(true);
    try {
      // Try to switch to the network
      await window.ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: BASE_SEPOLIA_CONFIG.chainId }],
      });

      // Check if switch was successful
      const success = await checkNetwork();
      return success;
    } catch (switchError) {
      // This error code indicates that the chain has not been added to MetaMask
      if (switchError.code === 4902) {
        try {
          await window.ethereum.request({
            method: "wallet_addEthereumChain",
            params: [BASE_SEPOLIA_CONFIG],
          });

          // Check if add was successful
          const success = await checkNetwork();
          return success;
        } catch (addError) {
          console.error("Error adding network:", addError);
          setError("Failed to add Base Sepolia network to MetaMask");
          return false;
        }
      } else {
        console.error("Error switching network:", switchError);
        setError("Failed to switch to Base Sepolia network");
        return false;
      }
    } finally {
      setNetworkSwitching(false);
    }
  };

  // Connect wallet and ensure correct network
  const connectWallet = async () => {
    setError(null);
    if (!window.ethereum) {
      setError("Please install MetaMask to use this application!");
      return;
    }

    try {
      setIsLoading(true);
      // For ethers v6
      const provider = new ethers.BrowserProvider(window.ethereum);
      const accounts = await provider.send("eth_requestAccounts", []);
      setWallet(accounts[0]);

      // Check if on correct network
      const onCorrectNetwork = await checkNetwork();
      if (!onCorrectNetwork) {
        setError("Please switch to Base Sepolia network");
      }
    } catch (error) {
      console.error("Failed to connect wallet:", error);
      setError("Failed to connect wallet. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // Check connection and network on component mount
  useEffect(() => {
    const checkConnection = async () => {
      if (window.ethereum) {
        try {
          // For ethers v6
          const provider = new ethers.BrowserProvider(window.ethereum);
          const accounts = await provider.listAccounts();
          if (accounts.length > 0) {
            setWallet(accounts[0].address);
            await checkNetwork();
          }
        } catch (error) {
          console.error("Failed to check wallet connection:", error);
        }
      }
    };

    checkConnection();

    // Listen for network changes
    if (window.ethereum) {
      window.ethereum.on("chainChanged", () => {
        checkNetwork();
      });
    }

    return () => {
      // Clean up listeners
      if (window.ethereum && window.ethereum.removeListener) {
        window.ethereum.removeListener("chainChanged", checkNetwork);
      }
    };
  }, []);

  // Fetch notes when wallet connects and network is correct
  useEffect(() => {
    if (wallet && isCorrectNetwork) {
      fetchNotes();
    }
  }, [wallet, isCorrectNetwork]);

  const fetchNotes = async () => {
    if (!wallet || !isCorrectNetwork) return;

    try {
      setIsLoading(true);
      setError(null);

      // For ethers v6
      const provider = new ethers.BrowserProvider(window.ethereum);
      const contract = new ethers.Contract(
        CONTRACT_ADDRESS,
        CONTRACT_ABI,
        provider
      );

      // Use getAllNotes instead of getNotes based on your ABI
      const allNotes = await contract.getAllNotes();
      console.log("Fetched notes:", allNotes);

      // Process notes to handle BigInt values
      const processedNotes = allNotes.map((note) => ({
        author: note.author,
        content: note.content,
        timestamp: note.timestamp, // Keep as BigInt for now
      }));

      setNotes(processedNotes);
    } catch (error) {
      console.error("Failed to fetch notes:", error);
      setError("Failed to fetch notes. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const addNote = async () => {
    if (!wallet) {
      setError("Please connect your wallet first!");
      return;
    }

    if (!isCorrectNetwork) {
      setError("Please switch to Base Sepolia network!");
      return;
    }

    const trimmedInput = input.trim();
    if (!trimmedInput) {
      setError("Note cannot be empty!");
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      // For ethers v6
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(
        CONTRACT_ADDRESS,
        CONTRACT_ABI,
        signer
      );

      console.log("Sending transaction with content:", trimmedInput);

      // Set a manual gas limit to avoid estimation issues - using BigInt for ethers v6
      const options = {
        gasLimit: BigInt(300000), // Use native BigInt for gas limit
      };

      // Call addNote with the correct parameter name (_content)
      const tx = await contract.addNote(trimmedInput, options);
      console.log("Transaction sent:", tx.hash);

      try {
        // Wait for exactly 1 confirmation
        const receipt = await tx.wait(1);
        console.log(
          "Transaction confirmed in block:",
          receipt.blockNumber.toString()
        );

        // Clear input and refresh notes only if transaction was successful
        if (receipt.status === 1) {
          setInput(""); // Clear input after successful transaction
          fetchNotes(); // Refresh notes list
        } else {
          throw new Error("Transaction failed");
        }
      } catch (confirmError) {
        console.error("Error confirming transaction:", confirmError);
        setError(
          "Transaction was sent but confirmation failed. Please check the transaction status in your wallet."
        );
        return;
      }
    } catch (err) {
      console.error("Transaction failed:", err);

      // Extract a more user-friendly error message
      let errorMessage = "Transaction failed. Please try again.";
      if (err.message && err.message.includes("execution reverted")) {
        // Try to extract a more specific error if available
        errorMessage =
          "Transaction reverted by the contract. There might be a validation rule you're not meeting.";
      }

      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // Safely convert BigInt to number for display
  const formatTimestamp = (timestamp: bigint | number) => {
    try {
      // Convert BigInt to number safely
      let timestampNumber: number;

      if (typeof timestamp === "bigint") {
        // For BigInt, convert to string first, then to number to avoid precision issues
        timestampNumber = Number(timestamp.toString());
      } else {
        timestampNumber = timestamp;
      }

      // Multiply by 1000 to convert from seconds to milliseconds
      return new Date(timestampNumber * 1000).toLocaleString();
    } catch (error) {
      console.error("Error formatting timestamp:", error);
      return "Invalid date";
    }
  };

  const truncateAddress = (address: string) => {
    return `${address.substring(0, 6)}...${address.substring(
      address.length - 4
    )}`;
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-md">
      <header className="text-2xl font-bold text-center mb-8">
        Public Notepad
      </header>

      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {wallet && !isCorrectNetwork && (
        <Alert className="mb-4 bg-yellow-50 border-yellow-200">
          <AlertCircle className="h-4 w-4 text-yellow-600" />
          <AlertTitle className="text-yellow-600">Wrong Network</AlertTitle>
          <AlertDescription className="text-yellow-700">
            You are connected to the wrong network. Please switch to Base
            Sepolia.
            <Button
              onClick={switchToBaseSepolia}
              variant="outline"
              className="mt-2 w-full border-yellow-300 bg-yellow-50 hover:bg-yellow-100"
              disabled={networkSwitching}
            >
              {networkSwitching ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Switching Network...
                </>
              ) : (
                "Switch to Base Sepolia"
              )}
            </Button>
          </AlertDescription>
        </Alert>
      )}

      <div className="mb-6">
        {!wallet ? (
          <Button
            onClick={connectWallet}
            className="w-full"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Connecting...
              </>
            ) : (
              "Connect Wallet"
            )}
          </Button>
        ) : (
          <div className="p-4 bg-gray-100 rounded-md mb-4">
            <p className="text-sm font-medium">Connected:</p>
            <p className="text-xs truncate">{wallet}</p>
            <div className="mt-2 flex items-center">
              <div
                className={`h-2 w-2 rounded-full mr-2 ${
                  isCorrectNetwork ? "bg-green-500" : "bg-red-500"
                }`}
              ></div>
              <p className="text-xs">
                {isCorrectNetwork ? "Base Sepolia" : "Wrong Network"}
              </p>
            </div>
          </div>
        )}
      </div>

      {wallet && isCorrectNetwork && (
        <>
          <div className="flex flex-col gap-2 mb-6">
            <Input
              placeholder="Add note"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={isLoading}
              className="w-full"
            />
            <Button
              onClick={addNote}
              disabled={isLoading || !input.trim()}
              className="w-full"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                "Add Note"
              )}
            </Button>
          </div>

          <div className="mt-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold">Public Notes</h2>
              <Button
                variant="outline"
                size="sm"
                onClick={fetchNotes}
                disabled={isLoading}
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Refresh"
                )}
              </Button>
            </div>

            {notes.length > 0 ? (
              <ul className="space-y-3">
                {notes.map((note, index) => (
                  <li key={index} className="p-3 bg-gray-50 rounded-md border">
                    <div className="flex justify-between items-start mb-1">
                      <span className="text-xs bg-gray-200 px-2 py-1 rounded-full">
                        {note.author === wallet
                          ? "You"
                          : truncateAddress(note.author)}
                      </span>
                      <span className="text-xs text-gray-500">
                        {formatTimestamp(note.timestamp)}
                      </span>
                    </div>
                    <p className="mt-2">{note.content}</p>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="text-center text-gray-500 py-8">
                {isLoading ? (
                  <div className="flex flex-col items-center">
                    <Loader2 className="h-8 w-8 animate-spin mb-2" />
                    <p>Loading notes...</p>
                  </div>
                ) : (
                  <p>No notes found. Be the first to add a note!</p>
                )}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
