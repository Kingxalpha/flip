import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import CoinFlip from "@/components/CoinFlip";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAtom } from "jotai";
import { ProofAtom, SeedAtom, GameIdAtom, SelectedSideAtom } from "./store";

interface GameInterfaceProps {
  isConnected: boolean;
  publicKey: string | null;
  balance: string;
  onGameUpdate: (stats: any) => void;
}

export default function GameInterface({
  isConnected,
  publicKey,
  balance,
  onGameUpdate,
}: GameInterfaceProps) {
  // Core game state
  const [betAmount, setBetAmount] = useState("0.1");
  const [selectedSide, setSelectedSide] = useState<"heads" | "tails">("heads");
  const [isFlipping, setIsFlipping] = useState(false);
  const [lastResult, setLastResult] = useState<"heads" | "tails" | null>(null);
  const [debugMode, setDebugMode] = useState(
    window.location.search.includes("debug=true")
  );

  // Game mode state
  const [gameMode, setGameMode] = useState<"manual" | "auto">("manual");
  const [showAutoSettings, setShowAutoSettings] = useState(false);

  // Auto bet state
  const [isAutoBetting, setIsAutoBetting] = useState(false);
  const [autoFlips, setAutoFlips] = useState("10");
  const [onWinAction, setOnWinAction] = useState<"reset" | "increase">("reset");
  const [onLoseAction, setOnLoseAction] = useState<"reset" | "increase">(
    "increase"
  );
  const [winMultiplier, setWinMultiplier] = useState("2.0");
  const [loseMultiplier, setLoseMultiplier] = useState("2.0");
  const [currentAutoFlip, setCurrentAutoFlip] = useState(0);
  const [autoBetQueue, setAutoBetQueue] = useState<number>(0);
  const [autoBetTimeout, setAutoBetTimeout] = useState<NodeJS.Timeout | null>(
    null
  );

  // External hooks
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setProofAtom] = useAtom(ProofAtom);
  const [, setSeedAtom] = useAtom(SeedAtom);
  const [, setGameIdAtom] = useAtom(GameIdAtom);
  const [, setSelectedSideAtom] = useAtom(SelectedSideAtom);

  // Clean up timeouts on unmount
  useEffect(() => {
    return () => {
      if (autoBetTimeout) {
        clearTimeout(autoBetTimeout);
      }
    };
  }, [autoBetTimeout]);

  // Handle auto bet queue
  useEffect(() => {
    if (autoBetQueue > 0 && isAutoBetting && !isFlipping) {
      setAutoBetQueue((q) => q - 1);
      handleFlipCoin();
    }
  }, [autoBetQueue, isAutoBetting, isFlipping]);

  // Mutation for coin flip
  const flipCoinMutation = useMutation({
    mutationFn: async (gameData: {
      betAmount: string;
      selectedSide: string;
      publicKey: string;
    }) => {
      const response = await apiRequest("POST", "/api/games/flip", gameData);
      const result = await response.json();
      console.log(result);
      
      setProofAtom(result?.game?.vrfProof);
      setSeedAtom(result?.game?.vrfSeed);
      setGameIdAtom(result?.game?.id);
      setSelectedSideAtom(selectedSide);
      return result;
    },
    onSuccess: (data) => {
      setLastResult(data.result);
      onGameUpdate({
        ...data.gameStats,
        betAmount: betAmount,
        winAmount: data.winAmount || "0",
        won: data.won,
        lastGameResult: data.result,
      });

      // Show result toast immediately
      showResultToast(data.won, data.winAmount, data.multiplier);

      setTimeout(() => {
        setIsFlipping(false);

        if (isAutoBetting) {
          handleAutoBettingResult(data.won);
        }
      }, 2000);

      invalidateQueries();
    },
    onError: (error) => {
      console.error("Flip error:", error);
      setIsFlipping(false);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
      stopAutoBetting();
    },
  });

  // Helper functions
  const invalidateQueries = () => {
    queryClient.invalidateQueries({ queryKey: ["/api/games/history"] });
    queryClient.invalidateQueries({
      queryKey: ["/api/games/history", publicKey],
    });
    if (debugMode) {
      queryClient.invalidateQueries({
        queryKey: ["/api/games/history", "test-wallet-address"],
      });
    }
  };

  const showResultToast = (
    won: boolean,
    winAmount: string,
    multiplier: string
  ) => {
    toast({
      title: won ? "You Won! 🎉" : "You Lost!",
      description: won
        ? `+${winAmount} SOL (${multiplier}×)`
        : `-${betAmount} SOL`,
      variant: won ? "default" : "destructive",
    });
  };

  const calculateNextBetAmount = (won: boolean): string => {
    let newAmount = betAmount;

    if (won && onWinAction === "increase") {
      newAmount = (parseFloat(betAmount) * parseFloat(winMultiplier)).toFixed(
        3
      );
    } else if (!won && onLoseAction === "increase") {
      newAmount = (parseFloat(betAmount) * parseFloat(loseMultiplier)).toFixed(
        3
      );
    }

    // Prevent betting more than balance
    const maxAmount = parseFloat(debugMode ? "10.0" : balance);
    if (parseFloat(newAmount) > maxAmount) {
      toast({
        title: "Max Bet Reached",
        description: `Reduced bet to ${maxAmount} SOL (your balance)`,
        variant: "default",
      });
      return maxAmount.toFixed(3);
    }

    return newAmount;
  };

  // Core game functions
  const handleFlipCoin = async () => {
    const testKey = debugMode ? "test-wallet-address" : publicKey;
    const testBalance = debugMode ? "10.0" : balance;
    const testConnected = debugMode ? true : isConnected;

    if (!testConnected || !testKey) {
      toast({
        title: "Wallet Not Connected",
        description: "Please connect your Phantom wallet first",
        variant: "destructive",
      });
      return;
    }

    if (parseFloat(betAmount) <= 0) {
      toast({
        title: "Invalid Bet",
        description: "Please enter a valid bet amount",
        variant: "destructive",
      });
      return;
    }

    if (parseFloat(betAmount) > parseFloat(testBalance)) {
      toast({
        title: "Insufficient Balance",
        description: "You don't have enough SOL for this bet",
        variant: "destructive",
      });
      return;
    }

    setIsFlipping(true);
    try {
      await flipCoinMutation.mutateAsync({
        betAmount,
        selectedSide,
        publicKey: testKey,
      });
    } catch (error) {
      console.error("Error in mutation:", error);
      setIsFlipping(false);
    }
  };

  // Auto betting functions
  const handleAutoBettingResult = (won: boolean) => {
    if (!isAutoBetting) return;

    const newBetAmount = calculateNextBetAmount(won);
    setBetAmount(newBetAmount);

    const nextFlip = currentAutoFlip + 1;
    setCurrentAutoFlip(nextFlip);

    if (parseFloat(newBetAmount) <= 0) {
      stopAutoBetting();
      toast({
        title: "Auto Betting Stopped",
        description: "Bet amount became zero",
        variant: "destructive",
      });
      return;
    }

    if (nextFlip < parseInt(autoFlips)) {
      const timeout = setTimeout(() => {
        setAutoBetQueue((q) => q + 1);
      }, 3000);
      setAutoBetTimeout(timeout);
    } else {
      // For the final flip, show the completion message after a delay
      setTimeout(() => {
        stopAutoBetting();
        toast({
          title: "Auto Betting Complete",
          description: `Completed ${autoFlips} flips`,
          variant: "default",
        });
      }, 2000); // Wait 2 seconds to ensure result toast is shown first
    }
  };

  const startAutoBetting = () => {
    const testConnected = debugMode ? true : isConnected;
    const testKey = debugMode ? "test-wallet-address" : publicKey;

    if (!testConnected || !testKey) {
      toast({
        title: "Wallet Not Connected",
        description: "Please connect your wallet first",
        variant: "destructive",
      });
      return;
    }

    if (!parseInt(autoFlips) || parseInt(autoFlips) <= 0) {
      toast({
        title: "Invalid Settings",
        description: "Please enter a valid number of flips",
        variant: "destructive",
      });
      return;
    }

    if (parseFloat(betAmount) <= 0) {
      toast({
        title: "Invalid Bet",
        description: "Please enter a valid bet amount",
        variant: "destructive",
      });
      return;
    }

    setIsAutoBetting(true);
    setCurrentAutoFlip(0);
    setAutoBetQueue(1);
  };

  const stopAutoBetting = () => {
    if (autoBetTimeout) {
      clearTimeout(autoBetTimeout);
      setAutoBetTimeout(null);
    }
    setIsAutoBetting(false);
    setCurrentAutoFlip(0);
    setAutoBetQueue(0);
  };

  // UI constants
  const quickBetAmounts = ["0.01", "0.1", "0.5", "1.0"];

  return (
    <div className="bg-gradient-to-br from-slate-800/60 to-slate-900/80 backdrop-blur-sm rounded-2xl p-8 border border-gray-600/50 relative overflow-hidden shadow-2xl">
      {/* Background pattern */}
      <div className="absolute inset-0 opacity-5">
        <div
          className="w-full h-full"
          style={{
            backgroundImage:
              "radial-gradient(circle, var(--coin-orange) 1px, transparent 1px)",
            backgroundSize: "20px 20px",
          }}
        ></div>
      </div>

      <div className="relative z-10">
        {/* Coin flip visualization */}
        <div className="flex justify-center mb-8">
          <CoinFlip
            isFlipping={isFlipping}
            result={lastResult}
            selectedSide={selectedSide}
          />
        </div>

        {/* Heads/Tails selection */}
        <div className="flex justify-center space-x-4 mb-6">
          {(["heads", "tails"] as const).map((side) => (
            <button
              key={side}
              onClick={() => setSelectedSide(side)}
              disabled={isFlipping}
              className={`flex flex-col items-center space-y-2 px-8 py-4 rounded-xl transition-all duration-200 font-semibold disabled:opacity-50 min-w-[120px] ${
                selectedSide === side
                  ? "bg-gradient-to-r from-amber-500 to-amber-600 shadow-lg shadow-amber-500/25 scale-105 text-white"
                  : "bg-stake-dark/40 hover:bg-stake-dark/60 border border-gray-600 text-gray-300 hover:text-white"
              }`}
              data-testid={`button-${side}`}
            >
              <div
                className={`w-12 h-12 rounded-full flex items-center justify-center ${
                  selectedSide === side
                    ? "bg-gradient-to-br from-amber-300 to-amber-600"
                    : "bg-gradient-to-br from-amber-400/30 to-amber-600/30"
                } border-2 ${
                  selectedSide === side
                    ? "border-amber-200/40"
                    : "border-amber-400/20"
                }`}
              >
                <span
                  className={`text-2xl font-bold ${
                    selectedSide === side ? "text-amber-900" : "text-amber-400"
                  }`}
                >
                  {side === "heads" ? "H" : "T"}
                </span>
              </div>
              <span className="text-sm font-bold">{side.toUpperCase()}</span>
            </button>
          ))}
        </div>

        {/* Main game interface */}
        <div className="space-y-4">
          {/* Bet amount input */}
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">
              Bet Amount (SOL)
            </label>
            <div className="relative">
              <Input
                type="number"
                placeholder="0.1"
                step="0.01"
                min="0.01"
                value={betAmount}
                onChange={(e) => setBetAmount(e.target.value)}
                className="w-full bg-slate-800/60 border border-gray-500 rounded-lg px-4 py-3 text-white font-mono text-lg focus:border-orange-400 focus:ring-2 focus:ring-orange-400/20 outline-none pr-16"
                data-testid="input-bet-amount"
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                SOL
              </div>
            </div>

            {/* Quick bet buttons */}
            <div className="flex space-x-2 mt-2">
              {quickBetAmounts.map((amount) => (
                <Button
                  key={amount}
                  variant="outline"
                  size="sm"
                  onClick={() => setBetAmount(amount)}
                  className="px-3 py-1 bg-stake-blue/60 border-gray-600 rounded text-sm hover:bg-stake-blue"
                  data-testid={`button-bet-${amount}`}
                >
                  {amount}
                </Button>
              ))}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setBetAmount(balance)}
                className="px-3 py-1 bg-stake-blue/60 border-gray-600 rounded text-sm hover:bg-stake-blue"
                data-testid="button-max"
              >
                MAX
              </Button>
            </div>
          </div>

          {/* Main action button */}
          <Button
            onClick={() => {
              if (gameMode === "auto") {
                isAutoBetting ? stopAutoBetting() : startAutoBetting();
              } else {
                handleFlipCoin();
              }
            }}
            disabled={
              isFlipping ||
              (!isConnected && !debugMode) ||
              flipCoinMutation.isPending
            }
            className={`w-full py-4 rounded-xl font-bold text-lg hover:scale-105 transition-all duration-200 shadow-lg disabled:opacity-50 disabled:hover:scale-100 disabled:cursor-not-allowed ${
              gameMode === "auto" && isAutoBetting
                ? "bg-gradient-to-r from-red-500 to-red-600 hover:shadow-red-500/25"
                : gameMode === "auto"
                ? "bg-gradient-to-r from-purple-500 to-purple-600 hover:shadow-purple-500/25"
                : "bg-gradient-to-r from-green-500 to-green-600 hover:shadow-green-500/25"
            }`}
            data-testid="button-flip"
            type="button"
          >
            {isFlipping && (
              <div
                className="w-4 h-4 border-2 border-white rounded-full mr-2 animate-spin"
                style={{ borderTopColor: "transparent" }}
              ></div>
            )}
            {gameMode === "auto" && isAutoBetting
              ? "STOP AUTO BETTING"
              : gameMode === "auto"
              ? "START AUTO BETTING"
              : isFlipping
              ? "FLIPPING..."
              : "FLIP COIN"}
            {!isConnected && !debugMode && " (Connect Wallet)"}
          </Button>

          {/* Debug mode toggle */}
          <div className="flex items-center mt-4 p-2 bg-yellow-500/20 rounded-lg border border-yellow-500/30">
            <input
              type="checkbox"
              checked={debugMode}
              onChange={(e) => setDebugMode(e.target.checked)}
              className="mr-2"
            />
            <span className="text-yellow-400 text-sm">
              Debug Mode (Bypass Wallet)
            </span>
          </div>

          {/* Game mode selector */}
          <div className="mb-6">
            <div className="flex bg-slate-800/50 rounded-xl p-2 border border-gray-600/50">
              <Button
                onClick={() => {
                  setGameMode("manual");
                  setShowAutoSettings(false);
                  stopAutoBetting();
                }}
                className={`flex-1 py-3 px-6 text-base font-semibold rounded-lg transition-all duration-200 ${
                  gameMode === "manual"
                    ? "bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg shadow-blue-500/25"
                    : "bg-transparent text-gray-400 hover:text-white hover:bg-gray-700/50"
                }`}
                data-testid="button-manual-mode"
              >
                Manual
              </Button>
              <Button
                onClick={() => {
                  setGameMode("auto");
                  setShowAutoSettings(true);
                }}
                className={`flex-1 py-3 px-6 text-base font-semibold rounded-lg transition-all duration-200 ${
                  gameMode === "auto"
                    ? "bg-gradient-to-r from-purple-500 to-purple-600 text-white shadow-lg shadow-purple-500/25"
                    : "bg-transparent text-gray-400 hover:text-white hover:bg-gray-700/50"
                }`}
                data-testid="button-auto-mode"
              >
                Auto
              </Button>
            </div>
          </div>

          {/* Auto betting settings */}
          {showAutoSettings && (
            <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-600/50 space-y-4">
              <h3 className="text-lg font-semibold mb-4 text-white">
                Auto Betting Settings
              </h3>

              <div>
                <label className="block text-sm text-gray-400 mb-2">
                  Number of Flips
                </label>
                <Input
                  type="number"
                  min="1"
                  max="1000"
                  value={autoFlips}
                  onChange={(e) => setAutoFlips(e.target.value)}
                  className="w-full bg-slate-700/50 border border-gray-600 rounded-lg px-4 py-2 text-white"
                  data-testid="input-auto-flips"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-2">
                    On Win
                  </label>
                  <select
                    value={onWinAction}
                    onChange={(e) =>
                      setOnWinAction(e.target.value as "reset" | "increase")
                    }
                    className="w-full bg-slate-700/50 border border-gray-600 rounded-lg px-4 py-2 text-white"
                  >
                    <option value="reset">Reset Bet</option>
                    <option value="increase">Increase Bet</option>
                  </select>
                  {onWinAction === "increase" && (
                    <Input
                      type="number"
                      step="0.1"
                      value={winMultiplier}
                      onChange={(e) => setWinMultiplier(e.target.value)}
                      placeholder="2.0"
                      className="w-full bg-slate-700/50 border border-gray-600 rounded-lg px-4 py-1 text-white mt-2 text-sm"
                    />
                  )}
                </div>

                <div>
                  <label className="block text-sm text-gray-400 mb-2">
                    On Loss
                  </label>
                  <select
                    value={onLoseAction}
                    onChange={(e) =>
                      setOnLoseAction(e.target.value as "reset" | "increase")
                    }
                    className="w-full bg-slate-700/50 border border-gray-600 rounded-lg px-4 py-2 text-white"
                  >
                    <option value="reset">Reset Bet</option>
                    <option value="increase">Increase Bet</option>
                  </select>
                  {onLoseAction === "increase" && (
                    <Input
                      type="number"
                      step="0.1"
                      value={loseMultiplier}
                      onChange={(e) => setLoseMultiplier(e.target.value)}
                      placeholder="2.0"
                      className="w-full bg-slate-700/50 border border-gray-600 rounded-lg px-4 py-1 text-white mt-2 text-sm"
                    />
                  )}
                </div>
              </div>

              {isAutoBetting && (
                <div className="bg-purple-500/20 rounded-lg p-3 border border-purple-500/30">
                  <div className="text-purple-300 text-sm font-medium">
                    Auto Betting Active: {currentAutoFlip}/{autoFlips} flips
                  </div>
                  <div className="w-full bg-gray-700 rounded-full h-2 mt-2">
                    <div
                      className="bg-purple-500 h-2 rounded-full transition-all duration-300"
                      style={{
                        width: `${
                          (currentAutoFlip / parseInt(autoFlips)) * 100
                        }%`,
                      }}
                    ></div>
                  </div>
                </div>
              )}

              <Button
                onClick={isAutoBetting ? stopAutoBetting : startAutoBetting}
                disabled={isFlipping}
                className={`w-full py-3 rounded-lg font-semibold text-lg transition-all ${
                  isAutoBetting
                    ? "bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700"
                    : "bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700"
                }`}
                data-testid="button-start-auto"
              >
                {isAutoBetting ? "Stop Auto Betting" : "Start Auto Betting"}
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
