import { Button } from "@/components/ui/button";
import { usePhantomWallet } from "@/hooks/usePhantomWallet";

export default function WalletConnection() {
  const { isConnected, publicKey, balance, connect, disconnect, isConnecting } = usePhantomWallet();

  const formatWalletAddress = (address: string) => {
    return `${address.slice(0, 4)}...${address.slice(-4)}`;
  };

  console.log(publicKey);
  

  if (isConnected && publicKey) {
    return (
      <div className="flex items-center space-x-4">
        <div className="hidden md:flex items-center space-x-3 bg-slate-800/50 px-4 py-2 rounded-lg border border-gray-600/50">
          <div className="w-6 h-6 bg-purple-500 rounded-full flex items-center justify-center">
            <div className="w-3 h-3 bg-white rounded-full"></div>
          </div>
          <div className="text-sm text-gray-400">
            <div data-testid="wallet-address">{formatWalletAddress(publicKey)}</div>
            <div className="font-mono font-semibold text-white" data-testid="wallet-balance">
              {balance} SOL
            </div>
          </div>
        </div>
        <Button 
          variant="outline"
          onClick={disconnect}
          className="border-gray-600 hover:bg-gray-700 text-white"
          data-testid="button-disconnect"
        >
          Disconnect
        </Button>
      </div>
    );
  }

  return (
    <Button 
      onClick={connect}
      disabled={isConnecting}
      className="bg-gradient-to-r from-orange-500 to-blue-500 text-white px-6 py-2 rounded-lg font-semibold hover:scale-105 transition-all duration-200 disabled:opacity-50 shadow-lg"
      data-testid="button-connect"
    >
      <div className="flex items-center space-x-2">
        <div className="w-4 h-4 bg-white rounded-full"></div>
        <span>{isConnecting ? 'Connecting...' : 'Connect Phantom'}</span>
      </div>
    </Button>
  );
}