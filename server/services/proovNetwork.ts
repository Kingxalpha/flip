import crypto from 'crypto';

// Proov.Network VRF Implementation for SolFlip
// Based on ECVRF-ED25519-SHA512-TAI suite

const SUITE_ID = Buffer.from([0x03]);
const POINT_BYTES = 32;
const INTERMEDIATE = 16;
const PROOF_BYTES = 80; // 32 (Γ) + 16 (c) + 32 (s)
const _ID = Buffer.alloc(32, 0);

interface VRFResult {
  result: 'heads' | 'tails';
  proof: string;
  seed: string;
  randomness: Buffer;
  won: boolean;
  multiplier: number;
  winAmount: number;
}

class ProovNetworkVRF {
  private readonly houseEdge = 0.02; // 2% house edge

  /**
   * Extend randomness with string
   */
  private extendRandomnessWithString(randomness: Buffer, extension: string): Buffer {
    const prehash = Buffer.concat([randomness, Buffer.from(extension, 'utf8')]);
    return crypto.createHash('sha256').update(prehash).digest();
  }

  /**
   * Extend randomness with integer
   */
  private extendRandomnessWithInt(randomness: Buffer, n: number): Buffer {
    return this.extendRandomnessWithString(randomness, `:${n}`);
  }

  /**
   * Convert randomness to uniform float
   */
  private randomnessToUniformFloat(randomness: Buffer): number {
    // Use first 4 bytes to avoid BigInt ES2020 compatibility issues
    const x = randomness.readUInt32LE(0);
    const outcome = x / 0xFFFFFFFF;
    return outcome;
  }

  /**
   * Convert randomness to uniform integer
   */
  private randomnessToUniformInt(randomness: Buffer, rangeSize: number): number {
    // Use first 4 bytes of randomness to avoid BigInt issues
    const randomValue = randomness.readUInt32LE(0);
    return randomValue % rangeSize;
  }

  /**
   * Simulate coinflip using Proov.Network methodology
   */
  private simulateCoinflip(bet: number, edge: number, randomness: Buffer): { won: boolean; winAmount: number; result: 'heads' | 'tails' } {
    // Simple coinflip: use randomness to determine heads (0) or tails (1)
    const outcome = this.randomnessToUniformInt(randomness, 2);
    const result = outcome === 0 ? 'heads' : 'tails';
    
    // For coinflip, we assume the user always picks one side
    // In a real implementation, this would be compared with selectedSide
    const won = true; // This will be determined by comparing result with selectedSide
    
    if (won) {
      const winMultiplier = 2.0 * (1.0 - edge);
      return {
        won: true,
        winAmount: Math.floor(winMultiplier * bet * 1000000000) / 1000000000, // Round to 9 decimals for SOL
        result
      };
    } else {
      return {
        won: false,
        winAmount: 0,
        result
      };
    }
  }

  /**
   * Generate a simplified VRF proof
   * In production, this would use actual ECVRF-ED25519-SHA512-TAI
   */
  private generateSimplifiedProof(message: string, seed: string): string {
    // Create deterministic proof based on message and seed
    const hash = crypto.createHash('sha512');
    hash.update(SUITE_ID);
    hash.update(Buffer.from(message, 'utf8'));
    hash.update(Buffer.from(seed, 'hex'));
    
    const fullHash = hash.digest();
    
    // Take first 80 bytes to simulate VRF proof structure
    const proof = fullHash.subarray(0, PROOF_BYTES);
    return proof.toString('hex');
  }

  /**
   * Extract randomness from proof
   */
  private proofToRandomness(proof: string): Buffer {
    // In real VRF, this would be the hash of gamma point
    const proofBuffer = Buffer.from(proof, 'hex');
    const hash = crypto.createHash('sha512');
    hash.update(SUITE_ID);
    hash.update(Buffer.from([0x03])); // Hash to randomness mode
    hash.update(proofBuffer.subarray(0, 32)); // Use first 32 bytes as gamma
    hash.update(Buffer.from([0x00]));
    return hash.digest();
  }

  /**
   * Verify a VRF proof (simplified)
   */
  verifyProof(publicKey: string, message: string, proof: string): boolean {
    try {
      // In a real implementation, this would perform ECVRF verification
      // For now, we verify by reconstructing the proof from the message
      
      // Extract seed from the message (last part after the last colon)
      const parts = message.split(':');
      if (parts.length < 4) {
        console.error('Invalid message format for verification');
        return false;
      }
      
      const seed = parts[parts.length - 1]; // Get the seed from the end of the message
      
      // Reconstruct the proof using the same method as generation
      const reconstructedProof = this.generateSimplifiedProof(message, seed);
      
      // Compare the reconstructed proof with the provided proof
      const isValid = proof === reconstructedProof;
      
      console.log('VRF Verification Details:', {
        message,
        seed,
        providedProof: proof,
        reconstructedProof,
        isValid,
        proofLength: proof.length,
        expectedLength: PROOF_BYTES * 2 // hex string length
      });
      
      return isValid;
    } catch (error) {
      console.error('VRF verification error:', error);
      return false;
    }
  }

  /**
   * Generate game result using Proov.Network VRF
   */
  async generateResult(gameId: string, selectedSide: 'heads' | 'tails', betAmount: string = '0.1'): Promise<VRFResult> {
    // Generate cryptographic seed
    const seed = crypto.randomBytes(32).toString('hex');
    
    // Create message for VRF
    const message = `SOLFLIP:${gameId}:${selectedSide}:${seed}`;
    
    // Generate VRF proof
    const proof = this.generateSimplifiedProof(message, seed);
    
    // Extract randomness from proof
    const randomness = this.proofToRandomness(proof);
    
    // Parse bet amount safely
    const bet = parseFloat(betAmount);
    if (isNaN(bet) || bet <= 0) {
      throw new Error(`Invalid bet amount: ${betAmount}`);
    }
    
    // Simulate coinflip
    const flipResult = this.simulateCoinflip(bet, this.houseEdge, randomness);
    
    // Determine if user won by comparing with selected side
    const won = flipResult.result === selectedSide;
    const winAmount = won ? flipResult.winAmount : 0;
    const multiplier = won ? 2.0 * (1 - this.houseEdge) : 0;

    return {
      result: flipResult.result,
      proof,
      seed,
      randomness,
      won,
      multiplier,
      winAmount
    };
  }

  /**
   * Get bet randomness from proof (Proov.Network style)
   */
  getBetRandomness(proof: string): Buffer {
    const proofBuffer = Buffer.from(proof, 'hex');
    return crypto.createHash('sha256').update(proofBuffer).digest();
  }
}

export const proovNetworkVRF = new ProovNetworkVRF();