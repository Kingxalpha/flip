export interface GameData {
     id: string;
     userId: string;
     gameType: string;
     betAmount: string;
     selectedSide: string;
     result: string;
     multiplier: string;
     winAmount: string | number;
     vrfProof: string;
     vrfSeed: string;
     transactionSignature: string | null;
     status: string;
     createdAt: string;
     completedAt: string;
   }

   export interface GameStats {
     currentStreak: number;
     maxStreak: number;
     currentMultiplier: number;
     maxWin: number;
     houseEdge: number;
   }

   export interface FlipResult {
     game: GameData;
     result: string;
     won: boolean;
     winAmount: number;
     multiplier: number;
     gameStats: GameStats;
   }

   export interface VerifyProofResponse {
     verified: boolean;
     message?: string;
   }