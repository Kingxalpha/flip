import { PublicKey } from "@solana/web3.js";
import { proovNetworkVRF } from "../../client/api/proovNetwork";
import { storage } from "server/storage";

interface VRFResult {
  result: "heads" | "tails";
  proof: string;
  seed: string;
  won: boolean;
  multiplier: number;
  winAmount: number;
}

export class VRFService {
  async generateResult(
    gameId: string,
    selectedSide: "heads" | "tails",
    publicKey: string // Add Phantom public key
  ): Promise<VRFResult> {
    // Generate proof using the SAME public key that will verify it
    const result = await proovNetworkVRF.generateResult(
      gameId,
      selectedSide,
      publicKey // Pass Phantom key to Proov
    );

    await storage.createVrfProof({
      gameId,
      proof: result.proof,
      seed: result.seed,
      publicKey: publicKey, // Store Phantom key for verification
      message: `coinflip:${gameId}:${selectedSide}`,
    });

    return result;
  }

  async verifyProof(
    proof: string,
    seed: string,
    publicKey: string,
    gameId: string,
    selectedSide: "heads" | "tails"
  ): Promise<boolean> {
    try {
      // Validate inputs
      if (!proof || !seed || !publicKey || !gameId || !selectedSide) {
        console.error("VRF verification failed: Missing required parameters");
        return false;
      }

      // Construct the message exactly as in generateResult
      const message = `SOLFLIP:${gameId}:${selectedSide}:${seed}`;
      return proovNetworkVRF.verifyProof(
        publicKey,
        message,      
        proof        
      );
    } catch (error:any) {
      console.error("VRF verification failed:", error);
      return false;
    }
  }
}
