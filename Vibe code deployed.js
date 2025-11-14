import React, { useState } from 'react';
import { Rocket, Copy, Check, Code, Wallet, AlertCircle, ExternalLink, Shield, Zap } from 'lucide-react';

export default function VibeTokenDeployer() {
  const [step, setStep] = useState(1);
  const [copied, setCopied] = useState('');
  const [contractAddress, setContractAddress] = useState('');
  const [deploymentTx, setDeploymentTx] = useState('');
  const [network, setNetwork] = useState('polygon');

  const solidityContract = `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

/**
 * @title VibeToken
 * @dev ERC20 token for VibeCheck platform with reward distribution
 */
contract VibeToken is ERC20, ERC20Burnable, Ownable, ReentrancyGuard {
    
    // Maximum supply: 1 billion tokens
    uint256 public constant MAX_SUPPLY = 1_000_000_000 * 10**18;
    
    // Reward pool allocation
    uint256 public rewardPool;
    
    // Mapping to track user claims
    mapping(address => uint256) public userRewards;
    mapping(address => uint256) public lastClaimTime;
    
    // Minimum time between claims (24 hours)
    uint256 public constant CLAIM_COOLDOWN = 24 hours;
    
    // Events
    event RewardAdded(address indexed user, uint256 amount);
    event RewardClaimed(address indexed user, uint256 amount);
    event RewardPoolFunded(uint256 amount);
    
    constructor() ERC20("Vibe Token", "VIBE") {
        // Mint initial supply to owner
        // 70% to reward pool, 30% to treasury
        uint256 rewardAllocation = (MAX_SUPPLY * 70) / 100;
        uint256 treasuryAllocation = (MAX_SUPPLY * 30) / 100;
        
        _mint(address(this), rewardAllocation);
        _mint(msg.sender, treasuryAllocation);
        
        rewardPool = rewardAllocation;
    }
    
    /**
     * @dev Add rewards for a user (called by backend/oracle)
     */
    function addReward(address user, uint256 amount) external onlyOwner {
        require(user != address(0), "Invalid address");
        require(amount > 0, "Amount must be positive");
        require(rewardPool >= amount, "Insufficient reward pool");
        
        userRewards[user] += amount;
        emit RewardAdded(user, amount);
    }
    
    /**
     * @dev Batch add rewards for multiple users
     */
    function addRewardsBatch(
        address[] calldata users, 
        uint256[] calldata amounts
    ) external onlyOwner {
        require(users.length == amounts.length, "Array length mismatch");
        
        for (uint256 i = 0; i < users.length; i++) {
            if (users[i] != address(0) && amounts[i] > 0) {
                userRewards[users[i]] += amounts[i];
                emit RewardAdded(users[i], amounts[i]);
            }
        }
    }
    
    /**
     * @dev Claim accumulated rewards
     */
    function claimRewards() external nonReentrant {
        uint256 reward = userRewards[msg.sender];
        require(reward > 0, "No rewards to claim");
        require(
            block.timestamp >= lastClaimTime[msg.sender] + CLAIM_COOLDOWN,
            "Claim cooldown active"
        );
        require(rewardPool >= reward, "Insufficient reward pool");
        
        userRewards[msg.sender] = 0;
        lastClaimTime[msg.sender] = block.timestamp;
        rewardPool -= reward;
        
        _transfer(address(this), msg.sender, reward);
        emit RewardClaimed(msg.sender, reward);
    }
    
    /**
     * @dev Check pending rewards for an address
     */
    function getPendingRewards(address user) external view returns (uint256) {
        return userRewards[user];
    }
    
    /**
     * @dev Check if user can claim (cooldown passed)
     */
    function canClaim(address user) external view returns (bool) {
        if (userRewards[user] == 0) return false;
        return block.timestamp >= lastClaimTime[user] + CLAIM_COOLDOWN;
    }
    
    /**
     * @dev Get time until next claim is available
     */
    function timeUntilNextClaim(address user) external view returns (uint256) {
        uint256 nextClaimTime = lastClaimTime[user] + CLAIM_COOLDOWN;
        if (block.timestamp >= nextClaimTime) return 0;
        return nextClaimTime - block.timestamp;
    }
    
    /**
     * @dev Fund the reward pool (only owner)
     */
    function fundRewardPool(uint256 amount) external onlyOwner {
        require(amount > 0, "Amount must be positive");
        require(balanceOf(msg.sender) >= amount, "Insufficient balance");
        
        _transfer(msg.sender, address(this), amount);
        rewardPool += amount;
        emit RewardPoolFunded(amount);
    }
    
    /**
     * @dev Emergency withdraw (only owner)
     */
    function emergencyWithdraw(uint256 amount) external onlyOwner {
        require(amount <= balanceOf(address(this)), "Insufficient balance");
        _transfer(address(this), msg.sender, amount);
    }
}`;

  const remixUrl = `https://remix.ethereum.org/#code=${encodeURIComponent(solidityContract)}&lang=sol&optimize=true&runs=200&evmVersion=null`;

  const deploymentGuide = [
    {
      title: "Install MetaMask & Get Test Tokens",
      icon: Wallet,
      content: [
        "Install MetaMask browser extension from metamask.io",
        "Create or import a wallet",
        "Switch to Polygon Mumbai Testnet (for testing)",
        "Get free test MATIC from faucet.polygon.technology",
        "For mainnet: Purchase MATIC on an exchange and transfer to your wallet"
      ]
    },
    {
      title: "Deploy Contract on Remix",
      icon: Code,
      content: [
        "Click 'Open in Remix' button below",
        "Wait for Remix to load the contract",
        "Go to 'Solidity Compiler' tab (left sidebar)",
        "Click 'Compile VibeToken.sol'",
        "Go to 'Deploy & Run Transactions' tab",
        "Select 'Injected Provider - MetaMask' as environment",
        "Click 'Deploy' button",
        "Confirm transaction in MetaMask popup"
      ]
    },
    {
      title: "Verify Contract (Optional but Recommended)",
      icon: Shield,
      content: [
        "Go to polygonscan.com (or mumbai.polygonscan.com for testnet)",
        "Search for your contract address",
        "Click 'Contract' tab then 'Verify and Publish'",
        "Select 'Solidity (Single file)'",
        "Compiler: 0.8.20, Optimization: Yes (200 runs)",
        "Paste the contract code",
        "Click 'Verify and Publish'"
      ]
    },
    {
      title: "Integrate with VibeCheck App",
      icon: Zap,
      content: [
        "Copy your deployed contract address",
        "Update VIBE_TOKEN_ADDRESS in the VibeCheck app",
        "Update TREASURY_ADDRESS with your wallet address",
        "Test reward distribution using addReward function",
        "Users can now claim real tokens!"
      ]
    }
  ];

  const copyToClipboard = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(''), 2000);
  };

  const networkInfo = {
    polygon: {
      name: "Polygon Mainnet",
      chainId: "0x89",
      rpc: "https://polygon-rpc.com/",
      explorer: "https://polygonscan.com/",
      currency: "MATIC",
      faucet: null,
      recommended: true
    },
    mumbai: {
      name: "Mumbai Testnet",
      chainId: "0x13881",
      rpc: "https://rpc-mumbai.maticvigil.com/",
      explorer: "https://mumbai.polygonscan.com/",
      currency: "Test MATIC",
      faucet: "https://faucet.polygon.technology/",
      recommended: false
    },
    ethereum: {
      name: "Ethereum Mainnet",
      chainId: "0x1",
      rpc: "https://eth.llamarpc.com",
      explorer: "https://etherscan.io/",
      currency: "ETH",
      faucet: null,
      recommended: false
    },
    sepolia: {
      name: "Sepolia Testnet",
      chainId: "0xaa36a7",
      rpc: "https://rpc.sepolia.org",
      explorer: "https://sepolia.etherscan.io/",
      currency: "Test ETH",
      faucet: "https://sepoliafaucet.com/",
      recommended: false
    }
  };

  const backendCode = `// Backend API for managing rewards (Node.js + Express)
const express = require('express');
const Web3 = require('web3');
require('dotenv').config();

const app = express();
app.use(express.json());

// Initialize Web3
const web3 = new Web3(process.env.RPC_URL);

// Add your wallet account
const account = web3.eth.accounts.privateKeyToAccount(process.env.PRIVATE_KEY);
web3.eth.accounts.wallet.add(account);

// Contract ABI
const VIBE_TOKEN_ABI = [
  {
    "inputs": [{"name": "user", "type": "address"}, {"name": "amount", "type": "uint256"}],
    "name": "addReward",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{"name": "users", "type": "address[]"}, {"name": "amounts", "type": "uint256[]"}],
    "name": "addRewardsBatch",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{"name": "user", "type": "address"}],
    "name": "getPendingRewards",
    "outputs": [{"name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  }
];

// Create contract instance
const contract = new web3.eth.Contract(VIBE_TOKEN_ABI, process.env.VIBE_TOKEN_ADDRESS);

// Helper function to validate Ethereum address
const isValidAddress = (address) => {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
};

// Endpoint to add rewards for a user
app.post('/api/rewards/add', async (req, res) => {
  try {
    const { userAddress, amount } = req.body;
    
    // Validate input
    if (!isValidAddress(userAddress)) {
      return res.status(400).json({ error: 'Invalid address' });
    }
    
    // Convert to wei (18 decimals)
    const amountWei = web3.utils.toWei(amount.toString(), 'ether');
    
    // Send transaction
    const tx = await contract.methods.addReward(userAddress, amountWei).send({
      from: account.address,
      gas: 200000
    });
    
    res.json({
      success: true,
      txHash: tx.transactionHash,
      amount: amount,
      user: userAddress
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Endpoint to check pending rewards
app.get('/api/rewards/:address', async (req, res) => {
  try {
    const { address } = req.params;
    
    if (!isValidAddress(address)) {
      return res.status(400).json({ error: 'Invalid address' });
    }
    
    const rewards = await contract.methods.getPendingRewards(address).call();
    const rewardsEth = web3.utils.fromWei(rewards, 'ether');
    
    res.json({
      address: address,
      pendingRewards: rewardsEth
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Batch add rewards (for multiple users)
app.post('/api/rewards/batch', async (req, res) => {
  try {
    const { rewards } = req.body; // [{address, amount}, ...]
    
    const addresses = rewards.map(r => r.address);
    const amounts = rewards.map(r => web3.utils.toWei(r.amount.toString(), 'ether'));
    
    const tx = await contract.methods.addRewardsBatch(addresses, amounts).send({
      from: account.address,
      gas: 500000
    });
    
    res.json({
      success: true,
      txHash: tx.transactionHash,
      count: rewards.length
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(\`Reward API running on port \${PORT}\`);
});`;

  const envExample = `# .env file
RPC_URL=https://polygon-rpc.com/
PRIVATE_KEY=your_wallet_private_key_here
VIBE_TOKEN_ADDRESS=your_deployed_contract_address_here
PORT=3000`;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Rocket className="w-16 h-16 text-purple-400" />
            <h1 className="text-5xl font-bold text-white">VIBE Token Deployer</h1>
          </div>
          <p className="text-purple-200 text-lg">
            Deploy your own ERC-20 token with built-in reward system
          </p>
        </div>

        {/* Network Selection */}
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 mb-6 border border-white/20">
          <h2 className="text-white font-bold text-xl mb-4 flex items-center gap-2">
            <Wallet className="w-6 h-6 text-blue-400" />
            Choose Network
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Object.entries(networkInfo).map(([key, info]) => (
              <button
                key={key}
                onClick={() => setNetwork(key)}
                className={`p-4 rounded-xl border-2 transition-all text-left ${
                  network === key
                    ? 'border-purple-500 bg-purple-500/20'
                    : 'border-white/20 bg-white/5 hover:bg-white/10'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-white font-bold">{info.name}</h3>
                  {info.recommended && (
                    <span className="text-xs px-2 py-1 bg-green-500 text-white rounded-full">
                      Recommended
                    </span>
                  )}
                </div>
                <p className="text-purple-200 text-sm mb-1">Currency: {info.currency}</p>
                {info.faucet && (
                  <a
                    href={info.faucet}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-400 hover:text-blue-300 text-xs flex items-center gap-1"
                    onClick={(e) => e.stopPropagation()}
                  >
                    Get test tokens
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Contract Code */}
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 mb-6 border border-white/20">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-white font-bold text-xl flex items-center gap-2">
              <Code className="w-6 h-6 text-green-400" />
              Smart Contract Code
            </h2>
            <div className="flex gap-2">
              <button
                onClick={() => copyToClipboard(solidityContract, 'contract')}
                className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-semibold transition-all"
              >
                {copied === 'contract' ? (
                  <>
                    <Check className="w-4 h-4" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    Copy
                  </>
                )}
              </button>
              <a
                href={remixUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg font-semibold transition-all"
              >
                <ExternalLink className="w-4 h-4" />
                Open in Remix
              </a>
            </div>
          </div>
          
          <div className="bg-slate-900 rounded-xl p-4 overflow-x-auto">
            <pre className="text-green-400 text-sm">
              <code>{solidityContract}</code>
            </pre>
          </div>

          <div className="mt-4 bg-blue-500/20 border border-blue-400/50 rounded-lg p-4">
            <div className="flex gap-3">
              <AlertCircle className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-100">
                <p className="font-semibold mb-1">Contract Features:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>ERC-20 compliant token (1 billion supply)</li>
                  <li>Built-in reward pool (70% for rewards, 30% treasury)</li>
                  <li>Batch reward distribution</li>
                  <li>24-hour claim cooldown</li>
                  <li>ReentrancyGuard for security</li>
                  <li>Ownable for admin functions</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Deployment Steps */}
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 mb-6 border border-white/20">
          <h2 className="text-white font-bold text-2xl mb-6">Deployment Guide</h2>
          
          <div className="space-y-6">
            {deploymentGuide.map((step, idx) => {
              const Icon = step.icon;
              return (
                <div key={idx} className="bg-white/5 rounded-xl p-5 border border-white/10">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 bg-purple-500 rounded-full flex items-center justify-center text-white font-bold">
                      {idx + 1}
                    </div>
                    <div className="flex items-center gap-2 flex-1">
                      <Icon className="w-6 h-6 text-purple-400" />
                      <h3 className="text-white font-bold text-lg">{step.title}</h3>
                    </div>
                  </div>
                  <ul className="space-y-2 ml-13">
                    {step.content.map((item, i) => (
                      <li key={i} className="text-purple-200 flex items-start gap-2">
                        <span className="text-purple-400 mt-1">•</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        </div>

        {/* Backend Integration */}
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 mb-6 border border-white/20">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-white font-bold text-xl">Backend API (Node.js)</h2>
            <button
              onClick={() => copyToClipboard(backendCode, 'backend')}
              className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-semibold transition-all"
            >
              {copied === 'backend' ? (
                <>
                  <Check className="w-4 h-4" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  Copy
                </>
              )}
            </button>
          </div>

          <div className="bg-slate-900 rounded-xl p-4 overflow-x-auto mb-4">
            <pre className="text-green-400 text-sm">
              <code>{backendCode}</code>
            </pre>
          </div>

          <div className="bg-slate-900 rounded-xl p-4 overflow-x-auto">
            <pre className="text-yellow-400 text-sm">
              <code>{envExample}</code>
            </pre>
          </div>

          <div className="mt-4 space-y-3">
            <div className="text-purple-200 text-sm">
              <p className="font-semibold mb-2">Installation:</p>
              <div className="bg-slate-900 rounded-lg p-3">
                <code className="text-green-400">
                  npm install express web3 dotenv
                </code>
              </div>
            </div>
            
            <div className="text-purple-200 text-sm">
              <p className="font-semibold mb-2">Run the server:</p>
              <div className="bg-slate-900 rounded-lg p-3">
                <code className="text-green-400">
                  node server.js
                </code>
              </div>
            </div>
          </div>
        </div>

        {/* Contract Address Input */}
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
          <h2 className="text-white font-bold text-xl mb-4">After Deployment</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-purple-200 mb-2 text-sm font-semibold">
                Your Deployed Contract Address:
              </label>
              <input
                type="text"
                value={contractAddress}
                onChange={(e) => setContractAddress(e.target.value)}
                placeholder="0x..."
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-purple-300 focus:outline-none focus:border-purple-500"
              />
            </div>

            <div>
              <label className="block text-purple-200 mb-2 text-sm font-semibold">
                Deployment Transaction Hash:
              </label>
              <input
                type="text"
                value={deploymentTx}
                onChange={(e) => setDeploymentTx(e.target.value)}
                placeholder="0x..."
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-purple-300 focus:outline-none focus:border-purple-500"
              />
            </div>

            {contractAddress && (
              <div className="bg-green-500/20 border border-green-400/50 rounded-lg p-4">
                <p className="text-green-100 font-semibold mb-2">✅ Success! Next Steps:</p>
                <ul className="text-green-100 text-sm space-y-1">
                  <li>1. Update VIBE_TOKEN_ADDRESS in VibeCheck app to: <code className="bg-black/30 px-2 py-1 rounded">{contractAddress}</code></li>
                  <li>2. Update backend .env file with this address</li>
                  <li>3. Verify contract on {networkInfo[network].explorer}</li>
                  <li>4. Test reward distribution</li>
                  <li>5. Launch your app!</li>
                </ul>
                {deploymentTx && (
                  <a
                    href={`${networkInfo[network].explorer}tx/${deploymentTx}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 mt-3 text-blue-300 hover:text-blue-200"
                  >
                    View on Block Explorer
                    <ExternalLink className="w-4 h-4" />
                  </a>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Quick Links */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          <a
            href="https://remix.ethereum.org"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 p-4 bg-purple-500 hover:bg-purple-600 text-white rounded-xl font-bold transition-all"
          >
            <Code className="w-5 h-5" />
            Remix IDE
            <ExternalLink className="w-4 h-4" />
          </a>
          
          <a
            href="https://metamask.io"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 p-4 bg-orange-500 hover:bg-orange-600 text-white rounded-xl font-bold transition-all"
          >
            <Wallet className="w-5 h-5" />
            MetaMask
            <ExternalLink className="w-4 h-4" />
          </a>
          
          <a
            href={networkInfo[network].explorer}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 p-4 bg-blue-500 hover:bg-blue-600 text-white rounded-xl font-bold transition-all"
          >
            <ExternalLink className="w-5 h-5" />
            Block Explorer
          </a>
        </div>
      </div>
    </div>
  );
}
