import { useEffect, useState } from "react";
import WalletConnection from "@/components/WalletConnection";
import GameInterface from "@/components/GameInterface";
import VRFVerification from "@/components/VRFVerification";
import GameHistory from "@/components/GameHistory";
import LoadingOverlay from "@/components/LoadingOverlay";
import Notifications from "@/components/Notifications";
import { usePhantomWallet } from "@/hooks/usePhantomWallet";
import { useWebSocket } from "@/hooks/useWebSocket";

export default function Game() {
  const { isConnected, publicKey, balance, fetchBalance } = usePhantomWallet();
  const [debugBalance, setDebugBalance] = useState("10.000");
  const [gameStats, setGameStats] = useState({
    currentStreak: 0,
    currentMultiplier: 1.0,
    maxWin: 1027604,
    houseEdge: 2.0
  });

  const isDebugMode = window.location.search.includes('debug=true');
  const effectiveBalance = isDebugMode ? debugBalance : balance;

  const { sendMessage, lastMessage } = useWebSocket('/ws');

  useEffect(() => {
    if (lastMessage) {
      const data = JSON.parse(lastMessage.data);
      if (data.type === 'gameStats') {
        setGameStats(data.stats);
      }
    }
  }, [lastMessage]);

  const handleGameUpdate = (stats: any) => {
    setGameStats(prevStats => ({
      ...prevStats,
      ...stats
    }));
    
    // Update debug balance if in debug mode
    if (isDebugMode) {
      const betAmount = parseFloat(stats.betAmount || stats.lastBetAmount || "0");
      const winAmount = parseFloat(stats.winAmount || stats.lastWinAmount || "0");
      const won = stats.won || winAmount > 0;
      
      console.log('Debug balance update:', { betAmount, winAmount, won, currentBalance: debugBalance });
      
      if (won && winAmount > 0) {
        // Won - add net winnings (winAmount already includes the bet back)
        setDebugBalance(prev => {
          const newBalance = (parseFloat(prev) + winAmount).toFixed(3);
          console.log('Won: updating balance from', prev, 'to', newBalance);
          return newBalance;
        });
      } else if (!won && betAmount > 0) {
        // Lost - subtract bet amount
        setDebugBalance(prev => {
          const newBalance = Math.max(0, parseFloat(prev) - betAmount).toFixed(3);
          console.log('Lost: updating balance from', prev, 'to', newBalance);
          return newBalance;
        });
      }
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 text-white">
      {/* Header */}
      <header className="border-b border-gray-700/50 bg-slate-900/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-r from-orange-500 to-blue-500 rounded-lg flex items-center justify-center shadow-lg">
              <div className="w-6 h-6 rounded-full bg-white/90"></div>
            </div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-orange-400 to-blue-400 bg-clip-text text-transparent">
              SolFlip
            </h1>
            <span className="text-xs bg-green-500/20 text-green-400 px-2 py-1 rounded-full border border-green-500/30">
              Provably Fair
            </span>
          </div>
          <WalletConnection />
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Game Interface */}
          <div className="lg:col-span-2">
            {/* Game Stats Bar */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-4 border border-gray-600/50 shadow-lg">
                <div className="text-gray-400 text-sm mb-1">Current Streak</div>
                <div className="text-2xl font-bold text-green-400" data-testid="current-streak">
                  {gameStats.currentStreak}
                </div>
              </div>
              <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-4 border border-gray-600/50 shadow-lg">
                <div className="text-gray-400 text-sm mb-1">Multiplier</div>
                <div className="text-2xl font-bold text-orange-400" data-testid="current-multiplier">
                  {gameStats.currentMultiplier.toFixed(2)}×
                </div>
              </div>
              <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-4 border border-gray-600/50 shadow-lg">
                <div className="text-gray-400 text-sm mb-1">Max Win</div>
                <div className="text-2xl font-bold text-blue-400">
                  {gameStats.maxWin.toLocaleString()}×
                </div>
              </div>
              <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-4 border border-gray-600/50 shadow-lg">
                <div className="text-gray-400 text-sm mb-1">House Edge</div>
                <div className="text-2xl font-bold text-gray-400">
                  {gameStats.houseEdge.toFixed(2)}%
                </div>
              </div>
            </div>

            <GameInterface 
              isConnected={isConnected}
              publicKey={publicKey}
              balance={effectiveBalance}
              onGameUpdate={handleGameUpdate}
            />
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <VRFVerification />
            <GameHistory walletAddress={publicKey || (window.location.search.includes('debug=true') ? 'test-wallet-address' : null)} />
          </div>
        </div>
      </main>

      <Notifications />
    </div>
  );
}
