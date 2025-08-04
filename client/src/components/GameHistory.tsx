import { useQuery } from "@tanstack/react-query";
import { getQueryFn } from "@/lib/queryClient";

interface GameHistoryItem {
  id: string;
  selectedSide: 'heads' | 'tails';
  result: 'heads' | 'tails';
  betAmount: string;
  winAmount: string;
  multiplier: string;
  createdAt: string;
}

interface GameHistoryProps {
  walletAddress?: string | null;
}

export default function GameHistory({ walletAddress }: GameHistoryProps) {
  const { data: history = [], isLoading } = useQuery<GameHistoryItem[]>({
    queryKey: ['/api/games/history', walletAddress],
    queryFn: () => 
      fetch(`/api/games/history?walletAddress=${walletAddress}&limit=20&offset=0`)
        .then(res => res.json())
        .catch(() => []),
    enabled: !!walletAddress,
    staleTime: 1000, // Shorter stale time for debug mode
    refetchInterval: walletAddress === 'test-wallet-address' ? 5000 : 30000, // More frequent refetch for debug
  });

  if (isLoading) {
    return (
      <div className="bg-stake-blue/30 backdrop-blur-sm rounded-xl p-6 border border-gray-700">
        <h3 className="text-lg font-semibold mb-4 flex items-center">
          <i className="fas fa-history mr-2"></i>
          Recent Flips
        </h3>
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse p-3 bg-stake-dark/40 rounded-lg h-16"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-stake-blue/30 backdrop-blur-sm rounded-xl p-6 border border-gray-700">
      <h3 className="text-lg font-semibold mb-4 flex items-center">
        <i className="fas fa-history mr-2"></i>
        Recent Flips
      </h3>

      <div className="space-y-2" data-testid="game-history">
        {history.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            <i className="fas fa-coins text-4xl mb-4 opacity-50"></i>
            <p>No games played yet</p>
            <p className="text-sm">Start flipping to see your history!</p>
          </div>
        ) : (
          history.map((game) => (
            <div 
              key={game.id} 
              className="flex justify-between items-center p-3 bg-stake-dark/40 rounded-lg"
              data-testid={`history-item-${game.id}`}
            >
              <div className="flex items-center space-x-3">
                {/* Coin result indicator */}
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 bg-gradient-to-br from-amber-300 to-amber-600 border-amber-200/40`}>
                    <span className="text-amber-900 text-lg font-bold">
                      {game.result === 'heads' ? 'H' : 'T'}
                    </span>
                  </div>
                <div className="flex flex-col">
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-medium capitalize">{game.result}</span>
                    {parseFloat(game.winAmount) > 0 ? (
                      <span className="px-2 py-1 text-xs bg-green-500/20 text-green-400 rounded-full font-medium">
                        WIN
                      </span>
                    ) : (
                      <span className="px-2 py-1 text-xs bg-red-500/20 text-red-400 rounded-full font-medium">
                        LOSS
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-gray-500">
                    Bet: {game.selectedSide} • {game.betAmount} SOL
                  </div>
                </div>
              </div>

              <div className="text-right">
                <div className={`font-semibold ${
                  parseFloat(game.winAmount) > 0 ? 'neon-green' : 'neon-red'
                }`}>
                  {parseFloat(game.winAmount) > 0 ? '+' : '-'}{Math.abs(parseFloat(game.winAmount || game.betAmount)).toFixed(3)} SOL
                </div>
                <div className="text-xs text-gray-400">
                  {parseFloat(game.multiplier || '0').toFixed(1)}×
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {history.length > 0 && (
        <button 
          className="w-full mt-4 text-coin-blue hover:text-coin-orange transition-colors text-sm"
          data-testid="button-view-all"
        >
          View All History →
        </button>
      )}
    </div>
  );
}