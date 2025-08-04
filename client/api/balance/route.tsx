import { solanaService } from "../solanaService";

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).end();

  const { walletAddress } = req.query;
  try {
    const balance = await solanaService.getBalance(walletAddress as string);
    res.status(200).json({ balance: balance.toString() });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch balance" });
  }
}