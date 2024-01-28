import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMoonSDK } from './hooks/moon';
import abi from "./abi.json";
import Web3 from 'web3';
import GameState from './components/GameState';
import PlayerState from './components/PlayerState';
import Controls from './components/Controls';
import LoginControls from './components/LoginControls';

const GameStateEnum = {
  Joining: 0,
  Player1Bet: 1,
  Player2BetOrCall: 2,
  Player1RaiseOrCall: 3,
  Player2RaiseOrCall: 4,
  Player1Fold: 5,
  Player2Fold: 6,
  Player1RollDice: 7,
  Player2RollDice: 8,
  DetermineWinner: 9,
  GameEnded: 10
};

const App = () => {
  const [accounts, setAccounts] = useState(null);
  const [loggedIn, setLoggedIn] = useState(false);
  const [gameState, setGameState] = useState(null);
  const [gameData, setGameData] = useState(null);
  const [isPlayer1, setIsPlayer1] = useState(false);
  const [isPlayer2, setIsPlayer2] = useState(false);
  const [isMyTurn, setIsMyTurn] = useState(false);

  const contractAddress = '0x9c0999d9843B7A2A06eCd848692ADA6050451008';
  const contractABI = abi;
  const { moon } = useMoonSDK();
  const web3 = new Web3(window.ethereum);
  const contract = new web3.eth.Contract(contractABI, contractAddress);

  const getGameStateInWords = (gameStateNumber) => {
    const gameStateMapping = {
      [GameStateEnum.Joining]: 'Joining',
      [GameStateEnum.Player1Bet]: 'Player 1 Bet',
      [GameStateEnum.Player2BetOrCall]: 'Player 2 Bet or Call',
      [GameStateEnum.Player1RaiseOrCall]: 'Player 1 Raise or Call',
      [GameStateEnum.Player2RaiseOrCall]: 'Player 2 Raise or Call',
      [GameStateEnum.Player1Fold]: 'Player 1 Fold',
      [GameStateEnum.Player2Fold]: 'Player 2 Fold',
      [GameStateEnum.Player1RollDice]: 'Player 1 Roll Dice',
      [GameStateEnum.Player2RollDice]: 'Player 2 Roll Dice',
      [GameStateEnum.DetermineWinner]: 'Determine Winner',
      [GameStateEnum.GameEnded]: 'Game Ended',
    };

    return gameStateMapping[gameStateNumber];
  };

  useEffect(() => {
    if (moon?.MoonAccount.isAuth) {
      setLoggedIn(true);
      getAccounts();
    }
  }, [moon]);

  useEffect(() => {
    if (accounts && accounts[0]) {
      getGameState();
    }
  }, [accounts]);

  useEffect(() => {
    let subscription;

    if (web3) {
      web3.eth.subscribe('newBlockHeaders', (error, result) => {
        if (!error) {
          getGameState();
        }
      })
        .then(sub => {
          subscription = sub;
        })
        .catch(console.error);
    }

    // Cleanup function
    return () => {
      if (subscription) {
        // Unsubscribe when the component is unmounted
        subscription.unsubscribe((error, success) => {
          if (success) {
            console.log('Successfully unsubscribed!');
          } else {
            console.error('Failed to unsubscribe:', error);
          }
        });
      }
    };
  }, [web3, accounts, contract]); // Dependencies


  const getAccounts = async () => {
    try {
      const accountsResponse = await moon?.getAccountsSDK().listAccounts();
      setAccounts(accountsResponse?.data.data.keys || []);
    } catch (error) {
      console.error("Error fetching accounts:", error);
      moon.logout();
    }
  };

  const createWallet = async () => {
    try {
      await moon.getAccountsSDK().createAccount();
      getAccounts();
    } catch (error) {
      console.error("Error creating wallet:", error);
    }
  };

  const callContractMethod = async (methodName, args = []) => {
    if (!contract) {
      console.error('Contract is not initialized');
      return;
    }

    try {
      const method = contract.methods[methodName];
      if (!method) {
        console.error(`Method ${methodName} does not exist on the contract`);
        return;
      }

      const result = await method(...args).call({ from: accounts[0] });
      return web3.utils.toBigInt(result).toString();
    } catch (error) {
      console.error(`Error calling ${methodName} method:`, error);
    }
  };

  const sendTransaction = async (methodName, args = [], transactionOptions = {}) => {
    if (!contract) {
      console.error('Contract is not initialized');
      return;
    }

    try {
      const method = contract.methods[methodName];
      if (!method) {
        console.error(`Method ${methodName} does not exist on the contract`);
        return;
      }

      // Create the transaction
      const transaction = {
        to: contractAddress,
        data: method(...args).encodeABI(),
        ...transactionOptions,
      };

      console.log({ transaction });

      // Sign the transaction
      const signedTransaction = await moon.getAccountsSDK().signTransaction(accounts[0], transaction);

      // Get the raw transaction
      const rawTransaction = signedTransaction.data.data.transactions.at(0).raw_transaction;
      console.log({ rawTransaction })

      // Broadcast the transaction
      const result = await moon.getAccountsSDK().broadcastTx(accounts[0], {
        chainId: '1891', // Use the chain ID from transactionOptions, or default to '1891'
        rawTransaction,
      });

      return result;
    } catch (error) {
      console.error(`Error sending transaction to ${methodName} method:`, error);
    }
  };

  const getGameState = async () => {
    const currentBet = await callContractMethod('currentBet');
    const player2 = await callContractMethod('player2');
    const player1 = await callContractMethod('player1');
    const winner = await callContractMethod('winner');
    const currentBettor = await callContractMethod('currentBettor');
    const gS = await callContractMethod('currentState');

    setIsPlayer1(accounts[0] === player1);
    setIsPlayer2(accounts[0] === player2);
    setIsMyTurn(accounts[0] === currentBettor);
    setGameData({
      currentBet, player2, player1, winner,
      currentBettor
    });

    setGameState(gS);
  };

  const gameStateInWords = getGameStateInWords(gameState);
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 text-gray-900 px-4">
      {!loggedIn && (
        <>
          <LoginControls />
          <Link to="/signup" className="mt-4">
            <button className="py-2 px-4 bg-green-600 text-white rounded-md hover:bg-green-500">Signup</button>
          </Link>
        </>
      )}
      {loggedIn && (
        <div className="max-w-6xl">
          {!accounts && <p>Loading...</p>}
          {accounts && !accounts[0] && (
            <button onClick={createWallet} className="mt-4 py-2 px-4 bg-indigo-600 text-white rounded-md hover:bg-indigo-500">Create a Wallet</button>
          )}
          {accounts && accounts[0] &&
            <div className="mt-4 text-sm font-semibold mb-4">Logged in as: {accounts[0]}</div>
          }
          {gameData && (
            <>
              <div className="w-full bg-white p-6 rounded-lg shadow-lg mb-4">
                <GameState currentPot={gameData.currentBet} gameState={gameStateInWords} />
              </div>
              <div className="w-full flex justify-between mb-4 gap-4">
                {accounts && accounts[0] &&
                  <div className="w-1/2 bg-white p-6 rounded-lg shadow-lg">
                    <PlayerState address={accounts[0]} diceState={gameData.player1} />
                  </div>
                }
                {accounts &&
                  <div className="w-1/2 bg-white p-6 rounded-lg shadow-lg">
                    <PlayerState address={accounts[1]} diceState={gameData.player2} />
                  </div>
                }
              </div>
              <div className="w-full bg-white p-6 rounded-lg shadow-lg">
                <Controls web3={web3} accountAddress={accounts[0]} sendTransaction={sendTransaction} loggedIn={loggedIn} gameState={gameStateInWords} currentPlayer={gameData.currentBettor} isPlayer1={isPlayer1} isPlayer2={isPlayer2} isMyTurn={isMyTurn} />
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
export default App;
