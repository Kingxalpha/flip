import { storage } from "../storage";

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).end();

  const { period = "daily", limit = "10" } = req.query;
  try {
    const leaderboard = await storage.getLeaderboard(
      period as string,
      parseInt(limit as string)
    );
    res.status(200).json(leaderboard);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch leaderboard" });
  }
}