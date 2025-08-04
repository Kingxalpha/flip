import { storage } from '../storage';

interface GameStats {
  currentStreak: number;
  maxStreak: number;
  currentMultiplier: number;
  maxWin: number;
  houseEdge: number;
}

class GameService {
  private readonly houseEdge = 2.0; // 2% house edge
  private readonly maxWin = 1027604; // Maximum win multiplier

  /**
   * Update user streak based on game result
   */
  async updateUserStreak(userId: string, won: boolean): Promise<GameStats> {
    const currentStreak = await storage.getUserStreak(userId);
    
    if (won) {
      const newCurrentStreak = (currentStreak?.currentStreak || 0) + 1;
      const newMaxStreak = Math.max(newCurrentStreak, currentStreak?.maxStreak || 0);
      const newMultiplier = Math.pow(2, newCurrentStreak);
      
      await storage.updateUserStreak(userId, {
        currentStreak: newCurrentStreak,
        maxStreak: newMaxStreak,
        currentMultiplier: newMultiplier.toString()
      });

      return {
        currentStreak: newCurrentStreak,
        maxStreak: newMaxStreak,
        currentMultiplier: newMultiplier,
        maxWin: this.maxWin,
        houseEdge: this.houseEdge
      };
    } else {
      await storage.updateUserStreak(userId, {
        currentStreak: 0,
        currentMultiplier: "1.0"
      });

      return {
        currentStreak: 0,
        maxStreak: currentStreak?.maxStreak || 0,
        currentMultiplier: 1.0,
        maxWin: this.maxWin,
        houseEdge: this.houseEdge
      };
    }
  }

  /**
   * Get user game statistics
   */
  async getUserStats(userId: string): Promise<GameStats> {
    const streak = await storage.getUserStreak(userId);
    
    return {
      currentStreak: streak?.currentStreak || 0,
      maxStreak: streak?.maxStreak || 0,
      currentMultiplier: parseFloat(streak?.currentMultiplier || "1.0"),
      maxWin: this.maxWin,
      houseEdge: this.houseEdge
    };
  }
}

export const gameService = new GameService();