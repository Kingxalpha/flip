import { 
  type User, 
  type InsertUser, 
  type Game, 
  type InsertGame, 
  type GameStreak, 
  type InsertGameStreak,
  type VrfProof,
  type InsertVrfProof
} from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  // User methods
  getUser(id: string): Promise<User | undefined>;
  getUserByWalletAddress(walletAddress: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  createOrGetUser(walletAddress: string): Promise<User>;

  // Game methods
  createGame(game: InsertGame): Promise<Game>;
  getGame(id: string): Promise<Game | undefined>;
  updateGame(id: string, updates: Partial<Game>): Promise<Game>;
  getGameHistory(userId: string, limit: number, offset: number): Promise<Game[]>;

  // Game streak methods
  getUserStreak(userId: string): Promise<GameStreak | undefined>;
  updateUserStreak(userId: string, streak: Partial<GameStreak>): Promise<GameStreak>;

  // VRF methods
  createVrfProof(proof: InsertVrfProof): Promise<VrfProof>;
  getVrfProof(gameId: string): Promise<VrfProof | undefined>;

  // Statistics methods
  getUserStats(userId: string): Promise<any>;
  getLeaderboard(period: string, limit: number): Promise<any[]>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private games: Map<string, Game>;
  private gameStreaks: Map<string, GameStreak>;
  private vrfProofs: Map<string, VrfProof>;

  constructor() {
    this.users = new Map();
    this.games = new Map();
    this.gameStreaks = new Map();
    this.vrfProofs = new Map();
  }

  // User methods
  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByWalletAddress(walletAddress: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.walletAddress === walletAddress
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = {
      id,
      walletAddress: insertUser.walletAddress,
      username: insertUser.username || null,
      balance: "0",
      publicKey: insertUser.publicKey || null,
      createdAt: new Date()
    };
    this.users.set(id, user);
    return user;
  }

  async createOrGetUser(walletAddress: string): Promise<User> {
    const existingUser = await this.getUserByWalletAddress(walletAddress);
    if (existingUser) {
      return existingUser;
    }

    return this.createUser({
      walletAddress,
      username: `user_${walletAddress.slice(-8)}`
    });
  }

  // Game methods
  async createGame(insertGame: InsertGame): Promise<Game> {
    const id = randomUUID();
    const game: Game = {
      id,
      ...insertGame,
      result: null,
      multiplier: null,
      winAmount: null,
      vrfProof: null,
      vrfSeed: null,
      transactionSignature: null,
      status: "pending",
      createdAt: new Date(),
      completedAt: null,
      publicKey: insertGame.publicKey || null
    };
    this.games.set(id, game);
    return game;
  }

  async getGame(id: string): Promise<Game | undefined> {
    return this.games.get(id);
  }

  async updateGame(id: string, updates: Partial<Game>): Promise<Game> {
    const game = this.games.get(id);
    if (!game) {
      throw new Error('Game not found');
    }

    const updatedGame = { ...game, ...updates };
    this.games.set(id, updatedGame);
    return updatedGame;
  }

  async getGameHistory(userId: string, limit: number, offset: number): Promise<Game[]> {
    const userGames = Array.from(this.games.values())
      .filter(game => game.userId === userId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(offset, offset + limit);

    return userGames;
  }

  // Game streak methods
  async getUserStreak(userId: string): Promise<GameStreak | undefined> {
    return Array.from(this.gameStreaks.values()).find(
      streak => streak.userId === userId
    );
  }

  async updateUserStreak(userId: string, updates: Partial<GameStreak>): Promise<GameStreak> {
    const existingStreak = await this.getUserStreak(userId);
    
    if (existingStreak) {
      const updatedStreak = { ...existingStreak, ...updates, updatedAt: new Date() };
      this.gameStreaks.set(existingStreak.id, updatedStreak);
      return updatedStreak;
    } else {
      const id = randomUUID();
      const newStreak: GameStreak = {
        id,
        userId,
        currentStreak: 0,
        maxStreak: 0,
        currentMultiplier: "1.0",
        updatedAt: new Date(),
        ...updates
      };
      this.gameStreaks.set(id, newStreak);
      return newStreak;
    }
  }

  // VRF methods
  async createVrfProof(insertProof: InsertVrfProof): Promise<VrfProof> {
    const id = randomUUID();
    const proof: VrfProof = {
      id,
      ...insertProof,
      verified: false,
      createdAt: new Date()
    };
    this.vrfProofs.set(id, proof);
    return proof;
  }

  async getVrfProof(gameId: string): Promise<VrfProof | undefined> {
    return Array.from(this.vrfProofs.values()).find(
      proof => proof.gameId === gameId
    );
  }

  // Statistics methods
  async getUserStats(userId: string): Promise<any> {
    const userGames = Array.from(this.games.values())
      .filter(game => game.userId === userId);
    
    const streak = await this.getUserStreak(userId);
    
    const totalWinnings = userGames
      .filter(game => game.winAmount)
      .reduce((sum, game) => sum + parseFloat(game.winAmount || '0'), 0);

    return {
      currentStreak: streak?.currentStreak || 0,
      maxStreak: streak?.maxStreak || 0,
      currentMultiplier: parseFloat(streak?.currentMultiplier || '1.0'),
      totalGames: userGames.length,
      totalWinnings: totalWinnings.toString()
    };
  }

  async getLeaderboard(period: string, limit: number): Promise<any[]> {
    // Mock leaderboard data for now
    return [
      { username: "crypto**king", totalWinnings: "127.5", position: 1 },
      { username: "flip**master", totalWinnings: "89.2", position: 2 },
      { username: "lucky**7", totalWinnings: "45.8", position: 3 }
    ].slice(0, limit);
  }
}

export const storage = new MemStorage();
