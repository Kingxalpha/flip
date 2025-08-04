import { storage } from "../storage";

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).end();

  const { walletAddress, limit = "20", offset = "0" } = req.query;

  if (!walletAddress) {
    return res.status(400).json({ error: "Wallet address required" });
  }

  if (walletAddress === "test-wallet-address") {
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
    return res.status(200).json(mockHistory);
  }

  const user = await storage.getUserByWalletAddress(walletAddress as string);
  if (!user) {
    return res.status(200).json([]);
  }

  const history = await storage.getGameHistory(
    user.id,
    parseInt(limit as string),
    parseInt(offset as string)
  );

  res.status(200).json(history);
}