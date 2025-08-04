import { solanaService } from "../solanaService";
import { storage } from "../storage";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  try {
    const { walletAddress, signature, message } = req.body;

    const isValidSignature = await solanaService.verifySignature(
      walletAddress,
      message,
      signature
    );

    if (!isValidSignature) {
      return res.status(400).json({ error: "Invalid signature" });
    }

    const user = await storage.createOrGetUser(walletAddress);
    res.status(200).json(user);
  } catch (error) {
    res.status(500).json({ error: "Registration failed" });
  }
}