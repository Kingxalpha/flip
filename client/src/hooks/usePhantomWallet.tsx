import { useState, useEffect, useCallback } from "react";
import { Connection, PublicKey, LAMPORTS_PER_SOL } from "@solana/web3.js";

interface PhantomWallet {
  isPhantom: boolean;
  isConnected: boolean;
  publicKey: PublicKey | null;
  connect: () => Promise<{ publicKey: PublicKey }>;
  disconnect: () => Promise<void>;
  signTransaction: (transaction: any) => Promise<any>;
  signMessage: (message: Uint8Array) => Promise<{ signature: Uint8Array }>;
}

declare global {
  interface Window {
    phantom?: {
      solana?: PhantomWallet;
    };
  }
}

export function usePhantomWallet() {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [publicKey, setPublicKey] = useState<string | null>(null);
  const [balance, setBalance] = useState("0.000");
  const [phantom, setPhantom] = useState<PhantomWallet | null>(null);

  // const connection = new Connection(
  //   process.env.NODE_ENV === 'production' 
  //     ? 'https://api.mainnet-beta.solana.com'
  //     : 'https://api.devnet.solana.com'
  // );

const rpcUrl = import.meta.env.VITE_SOLANA_RPC || 
  (process.env.NODE_ENV === 'production'
    ? 'https://api.mainnet-beta.solana.com'
    : 'https://api.devnet.solana.com');

const connection = new Connection(rpcUrl);

  useEffect(() => {
    const getProvider = () => {
      if ('phantom' in window) {
        const provider = window.phantom?.solana;
        if (provider?.isPhantom) {
          setPhantom(provider);
          return provider;
        }
      }
      return null;
    };

    // Initial check
    let provider = getProvider();

    // If provider not immediately available, wait a bit
    if (!provider) {
      const timer = setTimeout(() => {
        provider = getProvider();
        if (provider) {
          console.log('Phantom provider found after delay');
          // Check if already connected
          if (provider.isConnected && provider.publicKey) {
            console.log('Wallet already connected:', provider.publicKey.toString());
            setIsConnected(true);
            setPublicKey(provider.publicKey.toString());
            // Fetch balance after setting state
            fetchBalanceForPubKey(provider.publicKey).catch(() => setBalance("0.000"));
          }
        }
      }, 1000);

      return () => clearTimeout(timer);
    } else {
      console.log('Phantom provider found immediately');
      // Check if already connected
      if (provider.isConnected && provider.publicKey) {
        console.log('Wallet already connected:', provider.publicKey.toString());
        setIsConnected(true);
        setPublicKey(provider.publicKey.toString());
        // Fetch balance after setting state
        fetchBalanceForPubKey(provider.publicKey).catch(() => setBalance("0.000"));
      }
    }
  }, [connection]);

  const fetchBalanceForPubKey = useCallback(async (pubKey: PublicKey) => {
    try {
      const balance = await connection.getBalance(pubKey);
      setBalance((balance / LAMPORTS_PER_SOL).toFixed(3));
    } catch (error) {
      console.error('Error fetching balance:', error);
      setBalance("0.000");
    }
  }, [connection]);

  const connect = useCallback(async () => {
    console.log('Connect function called, phantom:', !!phantom);

    if (!phantom) {
      console.log('No phantom provider, opening website');
      window.open('https://phantom.app/', '_blank');
      return;
    }

    try {
      setIsConnecting(true);
      console.log('Attempting to connect to Phantom...');
      const response = await phantom.connect();
      console.log('Connection response:', response);

      setIsConnected(true);
      setPublicKey(response.publicKey.toString());
      console.log('Connected to wallet:', response.publicKey.toString());
      await fetchBalanceForPubKey(response.publicKey);
    } catch (error) {
      console.error('Error connecting to Phantom:', error);
      throw new Error('Failed to connect to Phantom wallet');
    } finally {
      setIsConnecting(false);
    }
  }, [phantom, fetchBalanceForPubKey]);

  const disconnect = useCallback(async () => {
    if (!phantom) return;

    try {
      await phantom.disconnect();
      setIsConnected(false);
      setPublicKey(null);
      setBalance("0.000");
    } catch (error) {
      console.error('Error disconnecting from Phantom:', error);
    }
  }, [phantom]);

  const signTransaction = useCallback(async (transaction: any) => {
    if (!phantom || !isConnected) {
      throw new Error('Wallet not connected');
    }

    try {
      return await phantom.signTransaction(transaction);
    } catch (error) {
      console.error('Error signing transaction:', error);
      throw new Error('Failed to sign transaction');
    }
  }, [phantom, isConnected]);

  const signMessage = useCallback(async (message: string) => {
    if (!phantom || !isConnected) {
      throw new Error('Wallet not connected');
    }

    try {
      const encodedMessage = new TextEncoder().encode(message);
      const response = await phantom.signMessage(encodedMessage);
      return response.signature;
    } catch (error) {
      console.error('Error signing message:', error);
      throw new Error('Failed to sign message');
    }
  }, [phantom, isConnected]);

  return {
    isConnected,
    isConnecting,
    publicKey,
    balance,
    connect,
    disconnect,
    signTransaction,
    signMessage,
    fetchBalance: publicKey ? () => fetchBalanceForPubKey(new PublicKey(publicKey)) : null
  };
}