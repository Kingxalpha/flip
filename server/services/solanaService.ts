import { Connection, PublicKey, Transaction, SystemProgram, LAMPORTS_PER_SOL } from '@solana/web3.js';
import * as nacl from 'tweetnacl';
import * as bs58 from 'bs58';

class SolanaService {
  private connection: Connection;
  private gameWalletPublicKey: string;

  constructor() {
    this.connection = new Connection(
      process.env.NODE_ENV === 'production' 
        ? 'https://api.mainnet-beta.solana.com'
        : 'https://api.devnet.solana.com'
    );
    
    // In production, this would be your game's treasury wallet
    this.gameWalletPublicKey = process.env.GAME_WALLET_PUBLIC_KEY || 'GDfnBCDhJh1hg8xKGKMQwKQJ7h8xKGKMQwKQJ7h8xKGK';
  }

  /**
   * Get SOL balance for a wallet address
   */
  async getBalance(walletAddress: string): Promise<number> {
    try {
      const publicKey = new PublicKey(walletAddress);
      const balance = await this.connection.getBalance(publicKey);
      return balance / LAMPORTS_PER_SOL;
    } catch (error) {
      console.error('Error getting balance:', error);
      throw new Error('Failed to get wallet balance');
    }
  }

  /**
   * Verify a wallet signature for authentication
   */
  async verifySignature(walletAddress: string, message: string, signature: string): Promise<boolean> {
    try {
      const publicKey = new PublicKey(walletAddress);
      const messageBytes = new TextEncoder().encode(message);
      const signatureBytes = bs58.default.decode(signature);
      
      return nacl.sign.detached.verify(
        messageBytes,
        signatureBytes,
        publicKey.toBytes()
      );
    } catch (error) {
      console.error('Error verifying signature:', error);
      return false;
    }
  }

  /**
   * Create a transaction for bet payment
   */
  async createBetTransaction(fromWallet: string, amount: number): Promise<Transaction> {
    try {
      const fromPublicKey = new PublicKey(fromWallet);
      const toPublicKey = new PublicKey(this.gameWalletPublicKey);
      
      const transaction = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: fromPublicKey,
          toPubkey: toPublicKey,
          lamports: amount * LAMPORTS_PER_SOL,
        })
      );

      const { blockhash } = await this.connection.getLatestBlockhash();
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = fromPublicKey;

      return transaction;
    } catch (error) {
      console.error('Error creating bet transaction:', error);
      throw new Error('Failed to create bet transaction');
    }
  }

  /**
   * Create a transaction for payout
   */
  async createPayoutTransaction(toWallet: string, amount: number): Promise<Transaction> {
    try {
      const fromPublicKey = new PublicKey(this.gameWalletPublicKey);
      const toPublicKey = new PublicKey(toWallet);
      
      const transaction = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: fromPublicKey,
          toPubkey: toPublicKey,
          lamports: amount * LAMPORTS_PER_SOL,
        })
      );

      const { blockhash } = await this.connection.getLatestBlockhash();
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = fromPublicKey;

      return transaction;
    } catch (error) {
      console.error('Error creating payout transaction:', error);
      throw new Error('Failed to create payout transaction');
    }
  }

  /**
   * Confirm a transaction
   */
  async confirmTransaction(signature: string): Promise<boolean> {
    try {
      const confirmation = await this.connection.confirmTransaction(signature);
      return !confirmation.value.err;
    } catch (error) {
      console.error('Error confirming transaction:', error);
      return false;
    }
  }

  /**
   * Get transaction details
   */
  async getTransaction(signature: string) {
    try {
      return await this.connection.getTransaction(signature);
    } catch (error) {
      console.error('Error getting transaction:', error);
      return null;
    }
  }

  /**
   * Get recent transactions for a wallet
   */
  async getRecentTransactions(walletAddress: string, limit: number = 10) {
    try {
      const publicKey = new PublicKey(walletAddress);
      const signatures = await this.connection.getSignaturesForAddress(publicKey, { limit });
      
      const transactions = await Promise.all(
        signatures.map(sig => this.connection.getTransaction(sig.signature))
      );

      return transactions.filter(tx => tx !== null);
    } catch (error) {
      console.error('Error getting recent transactions:', error);
      return [];
    }
  }
}

export const solanaService = new SolanaService();
