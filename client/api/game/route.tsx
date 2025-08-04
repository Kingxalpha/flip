import { z } from "zod";
import { storage } from "../storage";
import { VRFService } from "../vrfService";
import { gameService } from "../gameService";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  try {
    const gameData = z
      .object({
        betAmount: z.string(),
        selectedSide: z.enum(["heads", "tails"]),
        publicKey: z.string(),
      })
      .parse(req.body);

    const user = await storage.createOrGetUser(gameData.publicKey);

    const game = await storage.createGame({
      userId: user.id,
      gameType: "coinflip",
      betAmount: gameData.betAmount,
      selectedSide: gameData.selectedSide,
      publicKey: gameData.publicKey,
    });

    const vrfResult = await new VRFService().generateResult(
      game.id,
      gameData.selectedSide,
      gameData.betAmount
    );

    const updatedGame = await storage.updateGame(game.id, {
      result: vrfResult.result,
      multiplier: vrfResult.multiplier.toString(),
      winAmount: isNaN(vrfResult.winAmount) ? "0" : vrfResult.winAmount.toString(),
      vrfProof: vrfResult.proof,
      vrfSeed: vrfResult.seed,
      status: "completed",
      completedAt: new Date(),
    });

    const gameStats = await gameService.updateUserStreak(
      user.id,
      vrfResult.won
    );

    res.status(200).json({
      game: updatedGame,
      result: vrfResult.result,
      won: vrfResult.won,
      winAmount: isNaN(vrfResult.winAmount) ? 0 : vrfResult.winAmount,
      multiplier: vrfResult.multiplier,
      gameStats,
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to create game" });
  }
}