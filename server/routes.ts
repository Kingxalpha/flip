import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { VRFService } from "./services/vrfService";
import { solanaService } from "./services/solanaService";
import { gameService } from "./services/gameService";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);

  // WebSocket server for real-time updates
  const wss = new WebSocketServer({ server: httpServer, path: "/ws" });

  wss.on("connection", (ws) => {
    console.log("WebSocket client connected");

    ws.on("message", (message) => {
      try {
        const data = JSON.parse(message.toString());
        // Handle WebSocket messages if needed
        console.log("Received WebSocket message:", data);
      } catch (error) {
        console.error("Error parsing WebSocket message:", error);
      }
    });

    ws.on("close", () => {
      console.log("WebSocket client disconnected");
    });

    // Send initial connection confirmation
    ws.send(JSON.stringify({ type: "connected", timestamp: Date.now() }));
  });

  // Broadcast to all connected clients
  const broadcast = (data: any) => {
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify(data));
      }
    });
  };

  // API Routes

  // User authentication/registration
  app.post("/api/auth/register", async (req, res) => {
    try {
      const { walletAddress, signature, message } = req.body;

      // Verify wallet signature
      const isValidSignature = await solanaService.verifySignature(
        walletAddress,
        message,
        signature
      );

      if (!isValidSignature) {
        return res.status(400).json({ error: "Invalid signature" });
      }

      const user = await storage.createOrGetUser(walletAddress);
      res.json(user);
    } catch (error) {
      console.error("Registration error:", error);
      res.status(500).json({ error: "Registration failed" });
    }
  });

  // Get user balance
  app.get("/api/user/balance/:walletAddress", async (req, res) => {
    try {
      const { walletAddress } = req.params;
      const balance = await solanaService.getBalance(walletAddress);
      res.json({ balance: balance.toString() });
    } catch (error) {
      console.error("Balance fetch error:", error);
      res.status(500).json({ error: "Failed to fetch balance" });
    }
  });

  // Create a new coinflip game
  app.post("/api/games/flip", async (req, res) => {
    try {
      const gameData = z
        .object({
          betAmount: z.string(),
          selectedSide: z.enum(["heads", "tails"]),
          publicKey: z.string(),
        })
        .parse(req.body);

      // Get or create user
      const user = await storage.createOrGetUser(gameData.publicKey);

      // Create game
      const game = await storage.createGame({
        userId: user.id,
        gameType: "coinflip",
        betAmount: gameData.betAmount,
        selectedSide: gameData.selectedSide,
        publicKey: gameData.publicKey,
      });

      // Generate VRF proof and result
      // const vrfResult = await vrfService.generateResult(game.id, gameData.selectedSide);

      const vrfResult = await new VRFService().generateResult(
        game.id,
        gameData.selectedSide,
        gameData.betAmount // Pass betAmount instead of publicKey
      );

      // Update game with result
      const updatedGame = await storage.updateGame(game.id, {
        result: vrfResult.result,
        multiplier: vrfResult.multiplier.toString(),
        winAmount: isNaN(vrfResult.winAmount) ? "0" : vrfResult.winAmount.toString(),
        vrfProof: vrfResult.proof,
        vrfSeed: vrfResult.seed,
        status: "completed",
        completedAt: new Date(),
      });

      // Update user streak
      const gameStats = await gameService.updateUserStreak(
        user.id,
        vrfResult.won
      );

      // Broadcast game update to WebSocket clients
      broadcast({
        type: "gameUpdate",
        gameId: game.id,
        result: vrfResult.result,
        won: vrfResult.won,
      });

      res.json({
        game: updatedGame,
        result: vrfResult.result,
        won: vrfResult.won,
        winAmount: isNaN(vrfResult.winAmount) ? 0 : vrfResult.winAmount,
        multiplier: vrfResult.multiplier,
        gameStats,
      });
    } catch (error:any) {
      console.error("Game creation error:", error);
      res.status(500).json({ error: "Failed to create game" });
    }
  });

  // Get game history
  app.get("/api/games/history", async (req, res) => {
    try {
      const { walletAddress, limit = "20", offset = "0" } = req.query;

      if (!walletAddress) {
        return res.status(400).json({ error: "Wallet address required" });
      }

      // Handle debug mode test wallet
      if (walletAddress === "test-wallet-address") {
        // Return mock game history for debug mode
        const mockHistory = Array.from(
          { length: Math.min(10, parseInt(limit as string)) },
          (_, i) => ({
            id: `debug-${i}`,
            selectedSide: Math.random() > 0.5 ? "heads" : "tails",
            result: Math.random() > 0.5 ? "heads" : "tails",
            betAmount: (Math.random() * 0.5 + 0.1).toFixed(3),
            winAmount:
              Math.random() > 0.5
                ? (Math.random() * 1.0 + 0.1).toFixed(3)
                : "0",
            multiplier: (Math.random() * 2 + 1).toFixed(1),
            createdAt: new Date(Date.now() - i * 60000).toISOString(),
          })
        );
        return res.json(mockHistory);
      }

      const user = await storage.getUserByWalletAddress(
        walletAddress as string
      );
      if (!user) {
        return res.json([]);
      }

      const history = await storage.getGameHistory(
        user.id,
        parseInt(limit as string),
        parseInt(offset as string)
      );

      res.json(history);
    } catch (error) {
      console.error("History fetch error:", error);
      res.status(500).json({ error: "Failed to fetch game history" });
    }
  });

  // Get user statistics
  app.get("/api/games/stats/:walletAddress", async (req, res) => {
    try {
      const { walletAddress } = req.params;
      const user = await storage.getUserByWalletAddress(walletAddress);

      if (!user) {
        return res.json({
          currentStreak: 0,
          maxStreak: 0,
          currentMultiplier: 1.0,
          totalGames: 0,
          totalWinnings: "0",
        });
      }

      const stats = await storage.getUserStats(user.id);
      res.json(stats);
    } catch (error) {
      console.error("Stats fetch error:", error);
      res.status(500).json({ error: "Failed to fetch statistics" });
    }
  });

  // VRF proof verification
  app.post("/api/vrf/verify", async (req, res) => {
    console.log("Verification request received:", {
      proof: req.body.proof?.length,
      seed: req.body.seed?.length,
      publicKey: req.body.publicKey,
      gameId: req.body.gameId,
      selectedSide: req.body.selectedSide,
    });
    console.log("Full request body:", req.body);

    try {
      const { proof, seed, publicKey, gameId, selectedSide } = req.body;

      if (!proof || !seed || !publicKey || !gameId || !selectedSide) {
        return res.status(400).json({
          error: "Proof, seed, publicKey, gameId, and selectedSide are required",
          verified: false,
        });
      }

      const verified = await new VRFService().verifyProof(
        proof,
        seed,
        publicKey,
        gameId,
        selectedSide,
      );

      console.log(`VRF Verification Result: ${verified}`);

      res.json({
        verified,
        publicKey: publicKey,
        proofLength: proof.length,
        seedLength: seed.length,
        details: verified ? "Proof is valid" : "Proof is invalid",
        gameId: gameId,
        selectedSide: selectedSide,
      });
    } catch (error: any) {
      console.error("VRF verification error:", error);
      res.status(500).json({
        error: "Verification failed",
        details: error?.message,
        verified: false,
      });
    }
  });

  // Get leaderboard
  app.get("/api/leaderboard", async (req, res) => {
    try {
      const { period = "daily", limit = "10" } = req.query;
      const leaderboard = await storage.getLeaderboard(
        period as string,
        parseInt(limit as string)
      );
      res.json(leaderboard);
    } catch (error) {
      console.error("Leaderboard fetch error:", error);
      res.status(500).json({ error: "Failed to fetch leaderboard" });
    }
  });

  return httpServer;
}
