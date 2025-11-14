import React, { useState, useEffect, useCallback } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, doc, setDoc, onSnapshot, collection, query, addDoc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { setLogLevel } from 'firebase/firestore'; // For debugging

// Global variables provided by the environment for Firebase configuration
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : {};
const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;

// --- Icon Definitions (Lucide-React style for single-file) ---
const Sparkles = (props) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9.9 14.9L2.8 17.2l-2.8-2.8L12.1 4.3l2.8 2.8z"/><path d="M14.2 9.5l-2.8-2.8L20.8 0l2.8 2.8z"/><path d="M12.1 24.3l2.8-2.8L4.3 12.1l-2.8 2.8z"/><path d="M20.8 17.2l-2.8 2.8L24.3 12.1l-2.8-2.8z"/>
  </svg>
);
const Zap = (props) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
  </svg>
);
const MessageCircle = (props) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 11.5a8.38 8.38 0 0 1-5.65 7.64c-.16.08-.2.2-.2.3v3a1 1 0 0 1-1.74.88l-3.23-2.3c-.63-.45-1.3-.67-2.02-.67A8.4 8.4 0 0 1 3 11.5a8.4 8.4 0 0 1 8.5-8.5c4.68 0 8.5 3.82 8.5 8.5z"/>
  </svg>
);
const User = (props) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
  </svg>
);
const Gift = (props) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="8" width="18" height="4" rx="1"/><path d="M12 8v13"/><path d="M19 12h-2c-1.1 0-2 .9-2 2v7h6v-7c0-1.1-.9-2-2-2z"/><path d="M5 12H7c1.1 0 2 .9 2 2v7H3v-7c0-1.1.9-2 2-2z"/><path d="M12 12c-1.1 0-2-.9-2-2V3h4v7c0 1.1-.9 2-2 2z"/>
  </svg>
);
const Clock = (props) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
  </svg>
);
const CheckCircle = (props) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
  </svg>
);
const Send = (props) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/>
  </svg>
);


// --- Utility Functions ---

/**
 * Converts a string of text into its binary representation (8 bits per character).
 * @param {string} text The input string.
 * @returns {string} The binary string.
 */
const textToBinary = (text) => {
    if (typeof text !== 'string') return '';
    return text.split('')
        .map(char => char.charCodeAt(0).toString(2).padStart(8, '0'))
        .join(' ');
};

/**
 * Converts a number into its binary string representation.
 * @param {number} num The input number.
 * @returns {string} The binary string.
 */
const numberToBinary = (num) => {
    if (typeof num !== 'number' || isNaN(num)) return '0';
    return num.toString(2);
};


/**
 * Calculates Firestore paths for public and private data based on app ID and user ID.
 */
const getFirestorePaths = (currentAppId, currentUserId) => {
  const base = `artifacts/${currentAppId}`;
  return {
    userStatsDoc: `${base}/users/${currentUserId}/profile/stats`,     // Private per user
    postsCollection: `${base}/public/data/posts`,                   // Public shared data
    transactionsCollection: `${base}/users/${currentUserId}/transactions`, // Private transaction history
  };
};

// --- Rewards Data: Real-World Payout Architecture ---
const REDEEMABLE_REWARDS = [
    { id: 1, name: "Digital Sticker Pack", cost: 20, description: "A cool pack of digital stickers for your profile (Simulated Digital Reward)." },
    { id: 2, name: "$1 USD Payout", cost: 100, description: "Simulated real cash transfer of $1 USD." },
    { id: 3, name: "Profile Frame Upgrade", cost: 250, description: "A special, animated frame around your profile picture (Simulated Digital Reward)." },
    { id: 4, name: "$5 USD Payout", cost: 500, description: "Simulated real cash transfer of $5 USD." },
    { id: 5, name: "$10 USD Payout", cost: 1000, description: "Simulated real cash transfer of $10 USD." },
];


// --- App Component ---
const App = () => {
  const [db, setDb] = useState(null);
  const [userId, setUserId] = useState(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [userVibes, setUserVibes] = useState(0);
  const [posts, setPosts] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [newPostContent, setNewPostContent] = useState('');
  const [message, setMessage] = useState(''); // Custom message box
  const [page, setPage] = useState('feed'); // 'feed', 'redeem', or 'history'
  const [payoutMethod, setPayoutMethod] = useState(''); // Simulated UPI/Wallet ID

  // 1. Firebase Initialization and Authentication
  useEffect(() => {
    try {
      setLogLevel('debug');
      const app = initializeApp(firebaseConfig);
      const firestore = getFirestore(app);
      const authInstance = getAuth(app);

      setDb(firestore);

      onAuthStateChanged(authInstance, async (user) => {
        if (user) {
          setUserId(user.uid);
        } else {
          try {
            if (initialAuthToken) {
              await signInWithCustomToken(authInstance, initialAuthToken);
            } else {
              await signInAnonymously(authInstance);
            }
          } catch (e) {
            console.error("Auth failed:", e);
            setMessage("Authentication failed. Check console for details.");
          }
        }
        setIsAuthReady(true);
      });
    } catch (e) {
      console.error("Firebase initialization failed:", e);
      setMessage("Failed to initialize Firebase. Check console.");
    }
  }, []);

  // 2. Data Fetching (Vibes, Posts, and Transactions)
  useEffect(() => {
    if (!isAuthReady || !db || !userId) return;

    const paths = getFirestorePaths(appId, userId);

    // a) Listen for User Vibes (Private Data)
    const userStatsRef = doc(db, paths.userStatsDoc);
    const unsubscribeVibes = onSnapshot(userStatsRef, (docSnap) => {
      const data = docSnap.data();
      if (docSnap.exists() && data && data.vibes !== undefined) {
        setUserVibes(data.vibes);
        setPayoutMethod(data.payoutMethod || ''); // Load the stored payout method
      } else {
        const initialStats = { vibes: 50, username: `TeenUser-${userId.substring(0, 4)}`, createdAt: serverTimestamp(), payoutMethod: '' };
        setDoc(userStatsRef, initialStats, { merge: true }).catch(err => console.error("Error initializing user stats:", err));
        setUserVibes(initialStats.vibes);
      }
    }, (error) => {
      console.error("Error fetching user vibes:", error);
    });

    // b) Listen for Public Posts Feed (Public Data)
    const postsColRef = collection(db, paths.postsCollection);
    const unsubscribePosts = onSnapshot(postsColRef, (snapshot) => {
      const postData = snapshot.docs.map(d => ({
        id: d.id,
        ...d.data(),
        timestamp: d.data().createdAt ? d.data().createdAt.toDate().getTime() : 0,
      }));
      postData.sort((a, b) => b.timestamp - a.timestamp);
      setPosts(postData);
    }, (error) => {
      console.error("Error fetching posts:", error);
    });

    // c) Listen for User Transactions (Private Data - Ledger)
    const transactionsColRef = collection(db, paths.transactionsCollection);
    const unsubscribeTransactions = onSnapshot(transactionsColRef, (snapshot) => {
        const txData = snapshot.docs.map(d => ({
            id: d.id,
            ...d.data(),
            timestamp: d.data().timestamp ? d.data().timestamp.toDate().getTime() : 0,
        }));
        txData.sort((a, b) => b.timestamp - a.timestamp);
        setTransactions(txData);
    }, (error) => {
        console.error("Error fetching transactions:", error);
    });


    return () => {
      unsubscribeVibes();
      unsubscribePosts();
      unsubscribeTransactions();
    };
  }, [isAuthReady, db, userId]);

  // --- Core Earning/Spending Functionality ---

  const handleUpdatePayoutMethod = async () => {
    if (!db || !userId || payoutMethod.trim() === '') {
        setMessage("Please enter a valid Payout ID (e.g., UPI ID or Wallet Address).");
        return;
    }
    const paths = getFirestorePaths(appId, userId);
    const userStatsRef = doc(db, paths.userStatsDoc);

    try {
        await setDoc(userStatsRef, { payoutMethod: payoutMethod.trim() }, { merge: true });
        setMessage("Payout method saved successfully! You can now initiate simulated cash payouts.");
    } catch (e) {
        console.error("Error saving payout method:", e);
        setMessage(`Failed to save method: ${e.message}`);
    }
  }

  const handleEarnVibes = async (amount, source) => {
    if (!db || !userId) return;
    const paths = getFirestorePaths(appId, userId);
    const userStatsRef = doc(db, paths.userStatsDoc);
    const transactionsColRef = collection(db, paths.transactionsCollection);
    const newVibes = userVibes + amount;

    try {
      // 1. Update Vibe count
      await setDoc(userStatsRef, { vibes: newVibes }, { merge: true });

      // 2. Log the transaction
      await addDoc(transactionsColRef, {
        type: 'EARN',
        amount: amount,
        description: source,
        status: 'COMPLETED', // Earnings are immediate
        timestamp: serverTimestamp(),
      });

      // No setMessage here, as this function is often called by others.
    } catch (e) {
      console.error("Error earning vibes:", e);
    }
  };

  const handleCreatePost = async (e) => {
    e.preventDefault();
    if (!db || !userId || newPostContent.trim().length === 0) return;

    const paths = getFirestorePaths(appId, userId);
    const postsColRef = collection(db, paths.postsCollection);

    try {
      await addDoc(postsColRef, {
        authorId: userId,
        authorName: `TeenUser-${userId.substring(0, 4)}`,
        content: newPostContent.trim(),
        vibes: 0,
        createdAt: serverTimestamp(),
      });
      setNewPostContent('');
      // Award Vibes for posting
      await handleEarnVibes(5, 'Posting a new Vibe');
      setMessage('+5 Vibes earned for posting!');
    } catch (e) {
      console.error("Error creating post:", e);
      setMessage(`Failed to create post: ${e.message}`);
    }
  };

  const handleLikePost = async (postId, currentVibes) => {
    if (!db || !userId) return;

    const paths = getFirestorePaths(appId, userId);
    const postRef = doc(collection(db, paths.postsCollection), postId);

    try {
      // 1. Update post vibes
      await updateDoc(postRef, { vibes: currentVibes + 1 });

      // 2. Award User vibes for engaging
      await handleEarnVibes(1, 'Giving a Vibe Boost to a post');

      setMessage('+1 Vibe Boosted! +1 Vibe earned.');
    } catch (e) {
      console.error("Error liking post:", e);
      setMessage(`Failed to boost vibe: ${e.message}`);
    }
  };


  const handleRedeem = async (reward) => {
    if (!db || !userId) return;

    if (userVibes < reward.cost) {
        setMessage(`Not enough Vibes! You need ${reward.cost} to redeem ${reward.name}.`);
        return;
    }

    const isPayout = reward.name.includes('Payout');

    if (isPayout && payoutMethod.trim() === '') {
        setMessage("Please set your Payout ID (UPI/Wallet) before redeeming a cash payout!");
        setPage('redeem'); // Ensure user is on the redeem page to set the method
        return;
    }

    const paths = getFirestorePaths(appId, userId);
    const userStatsRef = doc(db, paths.userStatsDoc);
    const transactionsColRef = collection(db, paths.transactionsCollection);
    const newVibes = userVibes - reward.cost;

    try {
        // 1. Deduct Vibe count
        await setDoc(userStatsRef, { vibes: newVibes }, { merge: true });

        // 2. Log the transaction. Cash payouts use PENDING_REVIEW status.
        await addDoc(transactionsColRef, {
            type: 'PAYOUT',
            amount: reward.cost,
            description: `Redemption: ${reward.name} to ${payoutMethod || 'Digital Delivery'}`,
            status: isPayout ? 'PENDING_REVIEW' : 'COMPLETED',
            isCashPayout: isPayout,
            timestamp: serverTimestamp(),
        });

        if (isPayout) {
            setMessage(`Payout for "${reward.name}" initiated! Status is PENDING_REVIEW. A real-world app would now wait for bank/wallet processing.`);
        } else {
            setMessage(`SUCCESS! You redeemed "${reward.name}".`);
        }
    } catch (e) {
        console.error("Error redeeming reward:", e);
        setMessage(`Redemption failed: ${e.message}`);
    }
  };

  // Simulates an administrator or automated system completing the cash transfer.
  const handleUpdateTransactionStatus = async (txId, newStatus) => {
    if (!db || !userId) return;
    const paths = getFirestorePaths(appId, userId);
    const txRef = doc(collection(db, paths.transactionsCollection), txId);

    try {
        await updateDoc(txRef, { status: newStatus });
        setMessage(`Transaction ${txId.substring(0, 6)} updated to ${newStatus}! (Payout is now COMPLETED)`);
    } catch (e) {
        console.error("Error updating transaction status:", e);
        setMessage(`Failed to update transaction: ${e.message}`);
    }
  };

  // --- UI Components ---

  const PostCard = ({ post }) => (
    <div className="bg-white p-4 mb-4 rounded-xl shadow-lg border border-gray-100">
      <div className="flex items-center space-x-2 text-sm text-gray-500 mb-2">
        <User className="w-4 h-4 text-pink-500" />
        <span className="font-semibold text-gray-700">{post.authorName}</span>
        {post.createdAt && (
          <span className="text-xs">
            {post.createdAt.seconds ? new Date(post.createdAt.seconds * 1000).toLocaleTimeString() : 'Just now'}
          </span>
        )}
      </div>
      
      {/* Post Content Displayed in Binary */}
      <div className="mb-3">
        <p className="text-sm font-mono bg-gray-900 text-green-400 p-3 rounded-lg break-all whitespace-pre-wrap">
            {textToBinary(post.content)}
        </p>
      </div>

      <div className="flex justify-between items-center border-t pt-2 mt-2">
        <div className="flex items-center space-x-1">
          <Zap className="w-4 h-4 text-yellow-500" />
          <span className="font-bold text-yellow-600">{post.vibes || 0} Vibes</span>
        </div>
        <button
          onClick={() => handleLikePost(post.id, post.vibes || 0)}
          className="flex items-center space-x-1 text-pink-600 hover:text-pink-800 transition duration-150 p-2 rounded-full hover:bg-pink-50 focus:outline-none focus:ring-2 focus:ring-pink-500"
        >
          <Sparkles className="w-5 h-5 fill-pink-600" />
          <span className="text-sm font-medium">Vibe Boost</span>
        </button>
      </div>
    </div>
  );

  const RedeemPage = () => (
    <section>
        <div className="bg-gradient-to-r from-pink-100 to-purple-100 p-6 rounded-2xl shadow-inner mb-6 text-center border border-pink-300">
            <h2 className="text-3xl font-extrabold text-pink-700 mb-1">The Vibe Store</h2>
            <p className="text-gray-600 mb-4">Trade your hard-earned Vibes for real-world rewards (simulated processing).</p>
            <div className="flex items-center justify-center space-x-2 bg-white p-3 rounded-xl shadow-md inline-block">
                <Zap className="w-6 h-6 text-yellow-500 fill-yellow-500" />
                <span className="text-2xl font-extrabold text-yellow-600">{userVibes} Vibes Available</span>
            </div>
        </div>

        {/* Payout Method Input */}
        <div className="bg-white p-5 rounded-2xl shadow-xl mb-8 border border-blue-200">
            <h3 className="text-xl font-bold text-blue-600 mb-3 flex items-center">
                <Send className="w-5 h-5 mr-2" /> Payout Method (Required for Cash Rewards)
            </h3>
            <p className="text-sm text-gray-500 mb-3">
                Enter your simulated **Payout ID** (e.g., UPI ID or Wallet Address) for cash redemption.
            </p>
            <div className="flex space-x-2">
                <input
                    type="text"
                    placeholder="E.g., vibeuser@okbank / 0x123...abc"
                    className="flex-grow p-3 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 transition-shadow"
                    value={payoutMethod}
                    onChange={(e) => setPayoutMethod(e.target.value)}
                />
                <button
                    onClick={handleUpdatePayoutMethod}
                    disabled={!userId || payoutMethod.trim().length < 5}
                    className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 px-4 rounded-xl shadow-md transition-colors disabled:bg-gray-400"
                >
                    Save
                </button>
            </div>
            {payoutMethod && <p className="mt-2 text-sm text-green-600">Saved Payout ID: <span className="font-mono">{payoutMethod}</span></p>}
        </div>

        <div className="space-y-4">
            {REDEEMABLE_REWARDS.map(reward => {
                const isPayout = reward.name.includes('Payout');
                const requiresPayoutMethod = isPayout && payoutMethod.trim() === '';
                const isDisabled = userVibes < reward.cost || !userId || requiresPayoutMethod;

                return (
                    <div key={reward.id} className="bg-white p-5 rounded-xl shadow-lg flex justify-between items-center border border-gray-100 transition-shadow hover:shadow-xl">
                        <div>
                            <h3 className="text-xl font-bold text-gray-800">{reward.name}</h3>
                            <p className="text-sm text-gray-500">{reward.description}</p>
                            <div className="flex items-center mt-2">
                                <Zap className="w-4 h-4 text-yellow-500 mr-1" />
                                <span className="text-lg font-bold text-yellow-600">{reward.cost} Vibes</span>
                            </div>
                        </div>
                        <button
                            onClick={() => handleRedeem(reward)}
                            disabled={isDisabled}
                            className={`py-2 px-5 rounded-xl font-semibold transition-all ${
                                isDisabled
                                    ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                                    : (isPayout ? 'bg-green-600 hover:bg-green-700 text-white shadow-md' : 'bg-purple-600 hover:bg-purple-700 text-white shadow-md')
                            }`}
                        >
                            {requiresPayoutMethod ? 'Save Payout ID First' : 'Redeem'}
                        </button>
                    </div>
                );
            })}
        </div>
    </section>
  );

  const HistoryPage = () => (
    <section>
        <div className="bg-white p-6 rounded-2xl shadow-xl mb-6 border border-gray-200">
            <h2 className="text-2xl font-extrabold text-gray-800 mb-4 flex items-center">
                <Clock className="w-6 h-6 mr-2 text-blue-500" />
                Vibe Transaction Ledger
            </h2>
            <p className="text-sm text-gray-500 mb-4">Cash payouts require a real-world processing step and are marked PENDING REVIEW until completed by an administrator (simulated).</p>
        </div>

        {transactions.length === 0 && (
            <div className="text-center p-8 bg-white rounded-xl shadow-md text-gray-500">
                No transactions recorded yet. Start earning!
            </div>
        )}

        <div className="space-y-3">
            {transactions.map(tx => {
                const isPayout = tx.type === 'PAYOUT';
                const isPendingReview = isPayout && tx.status === 'PENDING_REVIEW';
                const isCompleted = tx.status === 'COMPLETED';

                let statusColor;
                if (isPendingReview) {
                    statusColor = 'bg-yellow-100 text-yellow-700 border-yellow-300';
                } else if (isCompleted) {
                    statusColor = 'bg-green-100 text-green-700 border-green-300';
                } else {
                    statusColor = 'bg-red-100 text-red-700 border-red-300';
                }

                return (
                    <div key={tx.id} className={`p-4 rounded-xl shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center border ${statusColor}`}>
                        <div className='flex-grow mb-2 sm:mb-0'>
                            <p className="font-semibold text-gray-800">{tx.description}</p>
                            <div className="flex items-center space-x-2 text-sm">
                                <span className={`font-medium ${isPendingReview ? 'text-yellow-700' : (isCompleted ? 'text-green-700' : 'text-red-700')}`}>
                                    {isPendingReview ? '⏳ PENDING REVIEW (Simulated Backend Check)' : (isCompleted ? '✅ PAYOUT SENT/COMPLETED' : 'STATUS UNKNOWN')}
                                </span>
                                <span className='text-xs text-gray-500'>
                                    ({tx.timestamp ? new Date(tx.timestamp).toLocaleString() : 'Processing...'})
                                </span>
                            </div>
                        </div>

                        <div className="flex items-center space-x-3">
                            <div className={`font-bold text-lg flex items-center ${isPayout ? 'text-red-600' : 'text-green-600'}`}>
                                {isPayout ? '-' : '+'}
                                {tx.amount} <Zap className="w-4 h-4 ml-1 fill-current" />
                            </div>

                            {isPendingReview && (
                                <button
                                    onClick={() => handleUpdateTransactionStatus(tx.id, 'COMPLETED')}
                                    className="bg-red-500 hover:bg-red-600 text-white font-medium py-1 px-3 rounded-lg text-sm transition-colors shadow-md flex items-center"
                                >
                                    <CheckCircle className='w-4 h-4 mr-1' />
                                    Simulate Manual Payout
                                </button>
                            )}
                        </div>
                    </div>
                );
            })}
        </div>
    </section>
  );

  const FeedPage = () => (
    <>
      {/* User Profile and Earning Section */}
      <section className="bg-white p-5 rounded-2xl shadow-xl mb-6 border border-pink-200">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">Your Profile</h2>
        {isAuthReady ? (
          <>
            <div className="mb-4 pb-4 border-b">
                <div className="flex items-center space-x-3 mb-2">
                    <User className="w-6 h-6 text-pink-500" />
                    <span className="text-sm font-medium text-gray-600">User ID (Binary Encoded):</span>
                </div>
                <p className="text-xs font-mono bg-gray-900 text-green-400 p-3 rounded-lg break-all whitespace-pre-wrap">
                    {userId ? textToBinary(userId) : 'Loading...'}
                </p>
            </div>

            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 border-b pb-4">
              <div className="flex items-center space-x-2 mb-2 sm:mb-0">
                <Zap className="w-6 h-6 text-yellow-500 fill-yellow-500" />
                <span className="text-lg font-semibold text-gray-700">Total Vibes Earned (Binary):</span>
              </div>
              <div className="text-2xl font-mono bg-gray-900 text-green-400 p-2 rounded-lg">
                {numberToBinary(userVibes)}
              </div>
            </div>

            <button
              onClick={() => handleEarnVibes(10, 'Daily Challenge Completion')}
              disabled={!userId}
              className="w-full bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white font-bold py-3 px-4 rounded-xl shadow-lg transition-transform transform hover:scale-[1.01] disabled:opacity-50 flex items-center justify-center"
            >
              <Sparkles className="w-5 h-5 mr-2" />
              Complete Daily Challenge (+10 Vibes)
            </button>
          </>
        ) : (
          <p className="text-center text-gray-500">Connecting to the VibeGrid...</p>
        )}
      </section>

      {/* Post Creation */}
      <section className="bg-white p-5 rounded-2xl shadow-xl mb-8">
        <h2 className="text-xl font-bold text-gray-800 mb-3">Share Your Vibe</h2>
        <form onSubmit={handleCreatePost}>
          <textarea
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-pink-500 focus:border-pink-500 transition-shadow resize-none"
            rows="3"
            placeholder="What's the vibe today? Post a thought, a quote, or a short status..."
            value={newPostContent}
            onChange={(e) => setNewPostContent(e.target.value)}
            maxLength={280}
            required
          ></textarea>
          <div className="flex justify-between items-center mt-3">
              <span className="text-sm text-gray-500">{280 - newPostContent.length} characters left</span>
              <button
              type="submit"
              disabled={!userId || newPostContent.trim().length === 0}
              className="bg-pink-500 hover:bg-pink-600 text-white font-bold py-2 px-4 rounded-xl shadow-md transition-colors disabled:bg-gray-400"
              >
              Post Vibe
              </button>
          </div>
        </form>
      </section>

      {/* Feed Section */}
      <section>
        <h2 className="text-2xl font-bold text-gray-800 mb-4 flex items-center">
          <MessageCircle className="w-6 h-6 mr-2 text-blue-500" />
          The Vibe Feed
        </h2>
        {posts.length > 0 ? (
          posts.map(post => <PostCard key={post.id} post={post} />)
        ) : (
          <div className="text-center p-8 bg-white rounded-xl shadow-md text-gray-500">
            No vibes yet. Be the first to post!
          </div>
        )}
      </section>
    </>
  );

  // --- Main Render ---
  return (
    <div className="min-h-screen bg-gray-50 font-sans p-4 sm:p-8">
      <script src="https://cdn.tailwindcss.com"></script>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap');
        body { font-family: 'Inter', sans-serif; }
      `}</style>

      <div className="max-w-xl mx-auto">
        <header className="py-4 mb-6 text-center">
          <h1 className="text-4xl font-extrabold text-pink-600 tracking-tighter flex items-center justify-center">
            <Sparkles className="w-8 h-8 mr-2 fill-pink-500" />
            VibeCheck
          </h1>
          <p className="text-gray-500 mt-1">The teen social app that pays you for your shine.</p>
        </header>

        {/* Custom Message Box */}
        {message && (
          <div className="fixed top-4 left-1/2 transform -translate-x-1/2 bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded-lg shadow-lg z-50 transition-opacity duration-300" role="alert" onClick={() => setMessage('')}>
            <p className="font-bold">Heads Up!</p>
            <p className="text-sm">{message}</p>
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="flex mb-8 bg-white rounded-full shadow-lg p-1">
            <button
                onClick={() => setPage('feed')}
                className={`flex-1 flex items-center justify-center py-3 px-2 sm:px-4 rounded-full font-bold text-sm sm:text-lg transition-colors duration-200 ${
                    page === 'feed' ? 'bg-pink-500 text-white shadow-md' : 'text-gray-600 hover:bg-gray-100'
                }`}
            >
                <MessageCircle className="w-5 h-5 mr-1 sm:mr-2" />
                Feed
            </button>
            <button
                onClick={() => setPage('redeem')}
                className={`flex-1 flex items-center justify-center py-3 px-2 sm:px-4 rounded-full font-bold text-sm sm:text-lg transition-colors duration-200 ${
                    page === 'redeem' ? 'bg-pink-500 text-white shadow-md' : 'text-gray-600 hover:bg-gray-100'
                }`}
            >
                <Gift className="w-5 h-5 mr-1 sm:mr-2" />
                Redeem
            </button>
            <button
                onClick={() => setPage('history')}
                className={`flex-1 flex items-center justify-center py-3 px-2 sm:px-4 rounded-full font-bold text-sm sm:text-lg transition-colors duration-200 ${
                    page === 'history' ? 'bg-pink-500 text-white shadow-md' : 'text-gray-600 hover:bg-gray-100'
                }`}
            >
                <Clock className="w-5 h-5 mr-1 sm:mr-2" />
                History
            </button>
        </div>

        {/* Page Content */}
        {page === 'feed' && <FeedPage />}
        {page === 'redeem' && <RedeemPage />}
        {page === 'history' && <HistoryPage />}

      </div>
    </div>
  );
};

export default App;
