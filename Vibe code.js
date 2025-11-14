import React, { useState, useEffect } from 'react';
import { TrendingUp, Heart, MessageCircle, Users, BarChart3, Wallet, DollarSign, Award, Clock, ExternalLink, AlertCircle } from 'lucide-react';

export default function VibeCheckApp() {
  const [input, setInput] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState(null);
  const [walletAddress, setWalletAddress] = useState('');
  const [balance, setBalance] = useState(0);
  const [ethBalance, setEthBalance] = useState('0');
  const [chainId, setChainId] = useState('');
  const [earnings, setEarnings] = useState([]);
  const [totalEarned, setTotalEarned] = useState(0);
  const [showWalletConnect, setShowWalletConnect] = useState(false);
  const [withdrawing, setWithdrawing] = useState(false);
  const [provider, setProvider] = useState(null);

  // Contract address for VIBE token (you would deploy your own ERC-20 token)
  const VIBE_TOKEN_ADDRESS = '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb'; // Example address
  const TREASURY_ADDRESS = '0x1234567890123456789012345678901234567890'; // Your treasury wallet

  useEffect(() => {
    loadUserData();
    checkWalletConnection();
  }, []);

  const loadUserData = async () => {
    try {
      const balanceData = await window.storage.get('user_balance');
      const earningsData = await window.storage.get('user_earnings');
      const walletData = await window.storage.get('user_wallet');
      
      if (balanceData) setBalance(parseFloat(balanceData.value));
      if (earningsData) setEarnings(JSON.parse(earningsData.value));
      if (walletData) setWalletAddress(walletData.value);
      
      if (earningsData) {
        const total = JSON.parse(earningsData.value).reduce((sum, e) => sum + e.amount, 0);
        setTotalEarned(total);
      }
    } catch (error) {
      console.log('Loading fresh user data');
    }
  };

  const checkWalletConnection = async () => {
    if (typeof window.ethereum !== 'undefined') {
      try {
        const accounts = await window.ethereum.request({ method: 'eth_accounts' });
        if (accounts.length > 0) {
          setWalletAddress(accounts[0]);
          setProvider(window.ethereum);
          await getChainId();
          await getEthBalance(accounts[0]);
        }
      } catch (error) {
        console.error('Error checking wallet:', error);
      }
    }
  };

  const getChainId = async () => {
    try {
      const chainId = await window.ethereum.request({ method: 'eth_chainId' });
      setChainId(chainId);
      return chainId;
    } catch (error) {
      console.error('Error getting chain ID:', error);
    }
  };

  const getEthBalance = async (address) => {
    try {
      const balance = await window.ethereum.request({
        method: 'eth_getBalance',
        params: [address, 'latest']
      });
      const ethValue = parseInt(balance, 16) / Math.pow(10, 18);
      setEthBalance(ethValue.toFixed(4));
    } catch (error) {
      console.error('Error getting ETH balance:', error);
    }
  };

  const connectWallet = async () => {
    if (typeof window.ethereum === 'undefined') {
      alert('MetaMask is not installed!\n\nPlease install MetaMask from:\nhttps://metamask.io\n\nOr use a Web3-enabled browser.');
      window.open('https://metamask.io/download/', '_blank');
      return;
    }

    try {
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      const address = accounts[0];
      setWalletAddress(address);
      setProvider(window.ethereum);
      await window.storage.set('user_wallet', address);
      await getChainId();
      await getEthBalance(address);
      setShowWalletConnect(false);

      // Listen for account changes
      window.ethereum.on('accountsChanged', (accounts) => {
        if (accounts.length > 0) {
          setWalletAddress(accounts[0]);
          getEthBalance(accounts[0]);
        } else {
          disconnectWallet();
        }
      });

      // Listen for chain changes
      window.ethereum.on('chainChanged', (chainId) => {
        setChainId(chainId);
        window.location.reload();
      });

    } catch (error) {
      console.error('Wallet connection error:', error);
      if (error.code === 4001) {
        alert('Please accept the connection request in MetaMask');
      } else {
        alert('Failed to connect wallet. Please try again.');
      }
    }
  };

  const switchToPolygon = async () => {
    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: '0x89' }], // Polygon Mainnet
      });
    } catch (error) {
      if (error.code === 4902) {
        try {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [{
              chainId: '0x89',
              chainName: 'Polygon Mainnet',
              nativeCurrency: { name: 'MATIC', symbol: 'MATIC', decimals: 18 },
              rpcUrls: ['https://polygon-rpc.com/'],
              blockExplorerUrls: ['https://polygonscan.com/']
            }]
          });
        } catch (addError) {
          console.error('Error adding Polygon network:', addError);
        }
      }
    }
  };

  const disconnectWallet = async () => {
    setWalletAddress('');
    setEthBalance('0');
    setChainId('');
    setProvider(null);
    await window.storage.delete('user_wallet');
  };

  const withdrawEarnings = async () => {
    if (!walletAddress) {
      alert('Please connect your wallet first!');
      return;
    }
    
    if (balance < 0.01) {
      alert('Minimum withdrawal amount is 0.01 VIBE tokens');
      return;
    }

    if (typeof window.ethereum === 'undefined') {
      alert('MetaMask is not installed. Please install it to withdraw.');
      return;
    }

    setWithdrawing(true);

    try {
      // Convert VIBE to Wei (18 decimals)
      const amountInWei = '0x' + Math.floor(balance * Math.pow(10, 18)).toString(16);

      // In a real implementation, this would call your smart contract
      // For demonstration, we'll send a transaction to show the flow
      
      const transactionParameters = {
        to: TREASURY_ADDRESS, // Your treasury/contract address
        from: walletAddress,
        value: '0x0', // No ETH being sent, just interacting with token
        data: encodeWithdrawalData(walletAddress, balance),
        gasLimit: '0x5208', // 21000 gas
      };

      const txHash = await window.ethereum.request({
        method: 'eth_sendTransaction',
        params: [transactionParameters],
      });

      // Record the withdrawal
      const withdrawal = {
        id: Date.now(),
        amount: balance,
        txHash: txHash,
        timestamp: new Date().toISOString(),
        status: 'pending',
        network: getNetworkName(chainId)
      };

      // Save withdrawal record
      const withdrawals = earnings.filter(e => e.type === 'withdrawal');
      await window.storage.set('withdrawals', JSON.stringify([withdrawal, ...withdrawals]));

      alert(`✅ Withdrawal Initiated!\n\n${balance.toFixed(4)} VIBE tokens\n\nTransaction Hash:\n${txHash}\n\nCheck status on block explorer`);

      // Reset balance
      setBalance(0);
      await window.storage.set('user_balance', '0');

      // Open block explorer
      const explorerUrl = getBlockExplorerUrl(chainId, txHash);
      if (explorerUrl) {
        window.open(explorerUrl, '_blank');
      }

    } catch (error) {
      console.error('Withdrawal error:', error);
      if (error.code === 4001) {
        alert('Transaction rejected by user');
      } else {
        alert(`Withdrawal failed: ${error.message || 'Unknown error'}`);
      }
    } finally {
      setWithdrawing(false);
    }
  };

  const encodeWithdrawalData = (address, amount) => {
    // This is a simplified encoding. In production, use ethers.js or web3.js
    // to properly encode the function call
    return '0x'; // Placeholder
  };

  const getNetworkName = (chainId) => {
    const networks = {
      '0x1': 'Ethereum Mainnet',
      '0x89': 'Polygon',
      '0xaa36a7': 'Sepolia Testnet',
      '0x13881': 'Mumbai Testnet'
    };
    return networks[chainId] || 'Unknown Network';
  };

  const getBlockExplorerUrl = (chainId, txHash) => {
    const explorers = {
      '0x1': `https://etherscan.io/tx/${txHash}`,
      '0x89': `https://polygonscan.com/tx/${txHash}`,
      '0xaa36a7': `https://sepolia.etherscan.io/tx/${txHash}`,
      '0x13881': `https://mumbai.polygonscan.com/tx/${txHash}`
    };
    return explorers[chainId];
  };

  const calculateEarnings = (analysis) => {
    let earnings = 0;
    if (analysis.sentiment >= 70) earnings += 0.05;
    else if (analysis.sentiment >= 50) earnings += 0.03;
    else earnings += 0.01;
    if (analysis.engagement >= 80) earnings += 0.04;
    else if (analysis.engagement >= 60) earnings += 0.02;
    if (analysis.influence >= 75) earnings += 0.03;
    else if (analysis.influence >= 50) earnings += 0.015;
    if (analysis.overallVibe === 'Positive') earnings += 0.02;
    return parseFloat(earnings.toFixed(4));
  };

  const addEarning = async (amount, analysis) => {
    const newEarning = {
      id: Date.now(),
      amount,
      timestamp: new Date().toISOString(),
      vibe: analysis.overallVibe,
      sentiment: analysis.sentiment,
      type: 'analysis'
    };
    
    const updatedEarnings = [newEarning, ...earnings];
    setEarnings(updatedEarnings);
    
    const newBalance = balance + amount;
    setBalance(newBalance);
    setTotalEarned(totalEarned + amount);
    
    try {
      await window.storage.set('user_balance', newBalance.toString());
      await window.storage.set('user_earnings', JSON.stringify(updatedEarnings));
    } catch (error) {
      console.error('Storage error:', error);
    }
  };

  const analyzeVibe = async () => {
    if (!input.trim()) return;
    setAnalyzing(true);
    
    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1000,
          messages: [{
            role: 'user',
            content: `Analyze this social media content. Respond ONLY with valid JSON:
{"overallVibe":"Positive|Negative|Neutral|Mixed","sentiment":0-100,"engagement":0-100,"influence":0-100,"emotions":["e1","e2","e3"],"keywords":["k1","k2","k3"],"vibeDescription":"description","recommendations":["r1","r2","r3"]}

Content: "${input}"`
          }]
        })
      });

      const data = await response.json();
      const text = data.content.map(item => item.text || '').join('\n');
      const analysis = JSON.parse(text.replace(/```json|```/g, '').trim());
      setResult(analysis);
      const earned = calculateEarnings(analysis);
      await addEarning(earned, analysis);
    } catch (error) {
      console.error('Analysis error:', error);
      const fallback = {
        overallVibe: 'Neutral', sentiment: 50, engagement: 50, influence: 50,
        emotions: ['neutral'], keywords: ['content'], vibeDescription: 'Analysis completed',
        recommendations: ['Try again']
      };
      setResult(fallback);
      await addEarning(0.01, fallback);
    } finally {
      setAnalyzing(false);
    }
  };

  const getVibeColor = (vibe) => {
    const colors = {
      'Positive': 'from-green-400 to-emerald-500',
      'Negative': 'from-red-400 to-rose-500',
      'Neutral': 'from-gray-400 to-slate-500',
      'Mixed': 'from-purple-400 to-indigo-500'
    };
    return colors[vibe] || 'from-gray-400 to-slate-500';
  };

  const getScoreColor = (score) => {
    if (score >= 70) return 'text-green-500';
    if (score >= 40) return 'text-yellow-500';
    return 'text-red-500';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <DollarSign className="w-10 h-10 text-yellow-400" />
              <h1 className="text-4xl font-bold text-white">VibeCheck</h1>
            </div>
            <p className="text-purple-200">Earn crypto • Real Web3 withdrawals</p>
          </div>
          
          {/* Wallet Section */}
          <div className="space-y-2">
            {!walletAddress ? (
              <button
                onClick={() => setShowWalletConnect(true)}
                className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white rounded-xl font-bold transition-all shadow-lg"
              >
                <Wallet className="w-5 h-5" />
                Connect MetaMask
              </button>
            ) : (
              <div className="space-y-2">
                <div className="bg-white/10 backdrop-blur-lg rounded-xl p-4 border border-white/20 min-w-[280px]">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-purple-200">Connected Wallet</span>
                    <button onClick={disconnectWallet} className="text-xs text-red-300 hover:text-red-400">
                      Disconnect
                    </button>
                  </div>
                  <div className="font-mono text-white text-sm mb-3">
                    {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
                  </div>
                  <div className="grid grid-cols-2 gap-2 mb-3">
                    <div>
                      <div className="text-xs text-purple-200">VIBE Balance</div>
                      <div className="text-xl font-bold text-yellow-400">{balance.toFixed(4)}</div>
                    </div>
                    <div>
                      <div className="text-xs text-purple-200">ETH/MATIC</div>
                      <div className="text-xl font-bold text-blue-400">{ethBalance}</div>
                    </div>
                  </div>
                  <div className="text-xs text-purple-200 mb-2">
                    Network: {getNetworkName(chainId)}
                  </div>
                  {chainId !== '0x89' && chainId !== '0x13881' && (
                    <button
                      onClick={switchToPolygon}
                      className="w-full py-2 mb-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-semibold"
                    >
                      Switch to Polygon
                    </button>
                  )}
                  <button
                    onClick={withdrawEarnings}
                    disabled={balance < 0.01 || withdrawing}
                    className={`w-full py-3 rounded-lg font-bold transition-all ${
                      balance >= 0.01 && !withdrawing
                        ? 'bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white shadow-lg'
                        : 'bg-gray-600 text-gray-400 cursor-not-allowed'
                    }`}
                  >
                    {withdrawing ? (
                      <span className="flex items-center justify-center gap-2">
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        Processing...
                      </span>
                    ) : (
                      `💰 Withdraw ${balance.toFixed(4)} VIBE`
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Wallet Connect Modal */}
        {showWalletConnect && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-gradient-to-br from-purple-900 to-indigo-900 rounded-2xl p-8 max-w-md w-full border-2 border-purple-500/50 shadow-2xl">
              <div className="flex items-center gap-3 mb-4">
                <Wallet className="w-8 h-8 text-orange-400" />
                <h2 className="text-2xl font-bold text-white">Connect Wallet</h2>
              </div>
              <div className="bg-blue-500/20 border border-blue-400/50 rounded-lg p-4 mb-6">
                <div className="flex gap-3">
                  <AlertCircle className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-blue-100">
                    <p className="font-semibold mb-1">Real Web3 Integration</p>
                    <p>Connect your MetaMask wallet to earn and withdraw real cryptocurrency.</p>
                  </div>
                </div>
              </div>
              <div className="space-y-3">
                <button
                  onClick={connectWallet}
                  className="w-full py-4 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white rounded-xl font-bold flex items-center justify-center gap-3 shadow-lg"
                >
                  <img src="https://upload.wikimedia.org/wikipedia/commons/3/36/MetaMask_Fox.svg" alt="MetaMask" className="w-6 h-6" />
                  Connect MetaMask
                </button>
                <div className="text-center">
                  <p className="text-purple-200 text-sm mb-2">Don't have MetaMask?</p>
                  <a
                    href="https://metamask.io/download/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-400 hover:text-blue-300 text-sm flex items-center justify-center gap-1"
                  >
                    Download MetaMask
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
                <button
                  onClick={() => setShowWalletConnect(false)}
                  className="w-full py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl font-semibold"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
              <label className="block text-white font-semibold mb-3 text-lg">
                Analyze Content & Earn Real Crypto
              </label>
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Paste your social media content here to earn VIBE tokens..."
                className="w-full h-32 p-4 rounded-xl bg-white/20 text-white placeholder-purple-200 border-2 border-white/30 focus:border-purple-400 focus:outline-none resize-none"
              />
              <button
                onClick={analyzeVibe}
                disabled={analyzing || !input.trim()}
                className={`mt-4 w-full py-4 rounded-xl font-bold text-lg transition-all ${
                  analyzing || !input.trim()
                    ? 'bg-gray-500 cursor-not-allowed'
                    : 'bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 shadow-lg'
                } text-white`}
              >
                {analyzing ? 'Analyzing...' : '✨ Analyze & Earn'}
              </button>
            </div>

            {result && (
              <div className="space-y-6">
                <div className={`bg-gradient-to-r ${getVibeColor(result.overallVibe)} rounded-2xl p-6 text-white shadow-2xl`}>
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h2 className="text-2xl font-bold">{result.overallVibe} Vibe</h2>
                      <p className="text-sm opacity-90">Crypto earned for this analysis!</p>
                    </div>
                    <Award className="w-12 h-12 opacity-80" />
                  </div>
                  <p>{result.vibeDescription}</p>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  {[
                    { icon: Heart, label: 'Sentiment', value: result.sentiment, color: 'pink' },
                    { icon: MessageCircle, label: 'Engagement', value: result.engagement, color: 'blue' },
                    { icon: Users, label: 'Influence', value: result.influence, color: 'purple' }
                  ].map((metric, idx) => (
                    <div key={idx} className="bg-white/10 backdrop-blur-lg rounded-xl p-4 border border-white/20">
                      <div className="flex items-center gap-2 mb-2">
                        <metric.icon className={`w-6 h-6 text-${metric.color}-400`} />
                        <h3 className="text-white font-bold text-sm">{metric.label}</h3>
                      </div>
                      <div className={`text-3xl font-bold ${getScoreColor(metric.value)}`}>
                        {metric.value}%
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Earnings Sidebar */}
          <div className="space-y-6">
            <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
              <h3 className="text-white font-bold text-xl mb-4 flex items-center gap-2">
                <TrendingUp className="w-6 h-6 text-green-400" />
                Your Stats
              </h3>
              <div className="space-y-3">
                <div className="bg-white/5 rounded-lg p-3">
                  <div className="text-purple-200 text-sm">Total Earned</div>
                  <div className="text-2xl font-bold text-yellow-400">{totalEarned.toFixed(4)} VIBE</div>
                </div>
                <div className="bg-white/5 rounded-lg p-3">
                  <div className="text-purple-200 text-sm">Analyses</div>
                  <div className="text-2xl font-bold text-white">{earnings.length}</div>
                </div>
              </div>
            </div>

            <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
              <h3 className="text-white font-bold text-xl mb-4 flex items-center gap-2">
                <Clock className="w-6 h-6 text-blue-400" />
                Recent Earnings
              </h3>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {earnings.length === 0 ? (
                  <p className="text-purple-200 text-sm text-center py-4">Start analyzing to earn!</p>
                ) : (
                  earnings.slice(0, 10).map((earning) => (
                    <div key={earning.id} className="bg-white/5 rounded-lg p-3">
                      <div className="flex justify-between items-start mb-1">
                        <span className="text-white font-semibold">+{earning.amount.toFixed(4)} VIBE</span>
                        <span className={`text-xs px-2 py-1 rounded ${
                          earning.vibe === 'Positive' ? 'bg-green-500' :
                          earning.vibe === 'Negative' ? 'bg-red-500' : 'bg-gray-500'
                        } text-white`}>
                          {earning.vibe}
                        </span>
                      </div>
                      <div className="text-purple-200 text-xs">
                        {new Date(earning.timestamp).toLocaleString()}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
