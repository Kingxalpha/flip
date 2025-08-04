import { Button } from "@/components/ui/button";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAtom } from "jotai";
import {
  ProofAtom,
  SeedAtom,
  GameIdAtom,
  SelectedSideAtom,
} from "./store";
import { usePhantomWallet } from "@/hooks/usePhantomWallet";

export default function VRFVerification() {
  const [proofResult] = useAtom(ProofAtom);
  const [seedResult] = useAtom(SeedAtom);
  const [gameId] = useAtom(GameIdAtom);
  const [selectedSide] = useAtom(SelectedSideAtom);
  const { publicKey } = usePhantomWallet();
  const { toast } = useToast();

  const verifyProofMutation = useMutation({
    mutationFn: async (verificationData: {
      proof: string;
      seed: string;
      publicKey: string;
      gameId: string;
      selectedSide: "heads" | "tails";
    }) => {
      const response = await apiRequest("POST", "/api/vrf/verify", {
        proof: verificationData.proof,
        seed: verificationData.seed,
        publicKey: verificationData.publicKey,
        gameId: verificationData.gameId,
        selectedSide: verificationData.selectedSide,
      });
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: data.verified
          ? "✅ Verification Successful"
          : "❌ Verification Failed",
        description: data.verified
          ? "The game result was fairly generated"
          : data.error || "Could not verify the game result",
        variant: data.verified ? "default" : "destructive",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Verification Error",
        description: error.message || "Failed to verify proof",
        variant: "destructive",
      });
    },
  });

  const handleVerifyProof = () => {
    if (!proofResult || !seedResult) {
      toast({
        title: "Cannot Verify",
        description: "Game data is not available yet",
        variant: "destructive",
      });
      return;
    }

    if (!publicKey) {
      toast({
        title: "Wallet Not Connected",
        description: "Please connect your Phantom wallet first",
        variant: "destructive",
      });
      return;
    }

    if (!gameId || !selectedSide) {
      toast({
        title: "Missing Game Info",
        description: "Game ID or selected side is missing",
        variant: "destructive",
      });
      return;
    }

    verifyProofMutation.mutate({
      proof: proofResult,
      seed: seedResult,
      publicKey: publicKey.toString(),
      gameId,
      selectedSide,
    });
  };

  return (
    <div className="bg-stake-blue/30 backdrop-blur-sm rounded-xl p-6 border border-gray-700">
      <h3 className="text-lg font-semibold mb-4 flex items-center">
        <i className="fas fa-shield-alt text-neon-green mr-2"></i>
        Provably Fair VRF
      </h3>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-400 mb-1">
            VRF Proof
          </label>
          <div className="font-mono bg-stake-dark/60 p-3 rounded-lg text-xs break-all">
            {proofResult || "No proof available"}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-400 mb-1">
            Game Seed
          </label>
          <div className="font-mono bg-stake-dark/60 p-3 rounded-lg text-xs break-all">
            {seedResult || "No seed available"}
          </div>
        </div>

        <Button
          onClick={handleVerifyProof}
          disabled={
            verifyProofMutation.isPending ||
            !proofResult ||
            !seedResult ||
            !publicKey
          }
          className="w-full mt-4 bg-neon-green/20 hover:bg-neon-green/30 text-neon-green border border-neon-green/30 py-3 rounded-lg font-medium transition-colors"
          data-testid="button-verify"
        >
          {verifyProofMutation.isPending ? (
            <>
              <i className="fas fa-spinner fa-spin mr-2"></i>
              Verifying...
            </>
          ) : (
            <>
              <i className="fas fa-check-circle mr-2"></i>
              Verify Fairness
            </>
          )}
        </Button>

        {verifyProofMutation.isError && (
          <div className="text-red-400 text-sm mt-2">
            <i className="fas fa-exclamation-circle mr-2"></i>
            {verifyProofMutation.error.message}
          </div>
        )}
      </div>
    </div>
  );
}
