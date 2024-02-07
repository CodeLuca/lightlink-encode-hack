import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMoonSDK } from './hooks/moon';
import abi from "./abi.json";
import Web3 from 'web3';
import GameState from './components/GameState';
import PlayerState from './components/PlayerState';
import Controls from './components/Controls';
import LoginControls from './components/LoginControls';

const shortenAddress = (address, charsToShow = 6, breakChar = '...') => {
  const front = address.substring(0, charsToShow);
  const back = address.substring(address.length - charsToShow);
  return `${front}${breakChar}${back}`;
};

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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [confirmed, setConfirmed] = useState(null);

  const contractAddress = '0xb605F160EC4f5F94e1A81268e5FdDbD704262bc6';
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
      [GameStateEnum.Tie]: 'Tie',
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
    let intervalId;

    const fetchGameState = async () => {
      if (accounts && accounts[0]) {
        await getGameState();
      }
    };

    fetchGameState(); // Fetch the game state immediately

    intervalId = setInterval(fetchGameState, 10000); // Fetch the game state every 5 seconds

    // Cleanup function
    return () => {
      if (intervalId) {
        clearInterval(intervalId); // Clear the interval when the component is unmounted
      }
    };
  }, [accounts]);

  const getAccounts = async () => {
    try {
      const accountsResponse = await moon?.getAccountsSDK().listAccounts();
      setAccounts(accountsResponse?.data.data.keys || []);
    } catch (error) {
      console.error("Error fetching accounts:", error);
      moon.logout();
      setLoggedIn(false);
      setError("Error fetching accounts");
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

  const callContractMethod = async (methodName, args = [], convertToBigInt = false) => {
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
      return convertToBigInt ? web3.utils.toBigInt(result).toString() : result;
    } catch (error) {
      console.error(`Error calling ${methodName} method:`, error, args);
    }
  };

  const sendTransaction = async (methodName, args = [], transactionOptions = {}) => {
    setLoading(true);
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

      setConfirmed(`Transaction sent successfully for ${methodName}`)
      console.log({ result })

      setLoading(false);
      return result;
    } catch (error) {
      console.error(`Error sending transaction to ${methodName} method:`, error);
      setError(`Error sending transaction to ${methodName} method (${JSON.stringify(error)})`);
      setLoading(false);
    }
  };

  const getGameState = async () => {
    console.log('Getting game state...');
    const currentBet = await callContractMethod('currentBet', [], true);
    const player2 = await callContractMethod('player2');
    const player1 = await callContractMethod('player1');
    const winner = await callContractMethod('winner');
    const currentBettor = await callContractMethod('currentBettor');
    const gS = await callContractMethod('currentState', [], true);
    let diceStates = await callContractMethod('getPlayersDice');

    diceStates = [
      diceStates[0].map(dice => Number(dice)),
      diceStates[1].map(dice => Number(dice)),
    ]

    setIsPlayer1(accounts[0] === player1.toLowerCase());
    setIsPlayer2(accounts[0] === player2.toLowerCase());

    // setIsMyTurn(currentBettor.toLowerCase() === accounts[0].toLowerCase());
    if ((Number(gS) === GameStateEnum.Player1Bet && isPlayer1) || (Number(gS) === GameStateEnum.Player2BetOrCall && isPlayer2)) {
      setIsMyTurn(true);
    }
    if ((Number(gS) === GameStateEnum.Player1RaiseOrCall && isPlayer1) || (Number(gS) === GameStateEnum.Player2RaiseOrCall && isPlayer2)) {
      setIsMyTurn(true);
    }
    if ((Number(gS) === GameStateEnum.Player1RollDice && isPlayer1) || (Number(gS) === GameStateEnum.Player2RollDice && isPlayer2)) {
      setIsMyTurn(true);
    }
    console.log(Number(gS), GameStateEnum.Player1Bet, GameStateEnum.Player2BetOrCall, GameStateEnum.Player1RaiseOrCall, GameStateEnum.Player2RaiseOrCall, GameStateEnum.Player1RollDice, GameStateEnum.Player2RollDice, GameStateEnum.DetermineWinner, GameStateEnum.GameEnded);
    console.log(Number(gS), GameStateEnum.Player2RollDice)
    setGameData({
      currentBet, player2, player1, winner,
      currentBettor, diceStates
    });

    setGameState(gS);
    console.log({ gameData })
  };

  const gameStateInWords = getGameStateInWords(gameState);
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 text-gray-900 px-4">
      {error && <div className="mb-5 bg-red-800 rounded text-white p-2 px-4">{error}</div>}
      {confirmed && <div className="mb-2 text-black p-2 px-4">{confirmed}</div>}
      {loading && <div className="mb-10 bg-gray-800 rounded text-white p-2 px-4 text-center">Loading...</div>}
      {!loggedIn && (
        <>
          <LoginControls />
        </>
      )}
      {loggedIn && (
        <div className="w-full max-w-5xl">
          <h2 className="font-bold text-center text-4xl mb-4 w-full">
            LightLink Dice Poker
          </h2>
          {!accounts && <p className="text-center w-full">Loading...</p>}
          {accounts && !accounts[0] && (
            <button onClick={createWallet} className="mt-4 py-2 px-4 bg-indigo-600 text-white rounded-md hover:bg-indigo-500">Create a Wallet</button>
          )}
          {accounts && accounts[0] &&
            <div className="mt-4 text-xs mb-6 -mt-2 text-center">Logged in as: {accounts[0]}</div>
          }
          {gameData && (
            <>
              <div className="w-full bg-white p-6 rounded-lg shadow-lg mb-4">
                <GameState currentPot={gameData.currentBet} gameData={gameData} gameState={gameStateInWords} />
              </div>
              <div className="w-full flex justify-between mb-4 gap-4">
                {accounts && accounts[0] &&
                  <div className="w-1/2 bg-white p-6 rounded-lg shadow-lg">
                    <PlayerState playerNumber={1} address={gameData.player1} isPlayer={isPlayer1} diceState={gameData.diceStates[0]} />
                  </div>
                }
                {accounts &&
                  <div className="w-1/2 bg-white p-6 rounded-lg shadow-lg">
                    <PlayerState playerNumber={2} address={gameData.player2} isPlayer={isPlayer2} diceState={gameData.diceStates[1]} />
                  </div>
                }
              </div>
              <div className="w-full bg-white p-6 rounded-lg shadow-lg">
                <Controls web3={web3} accountAddress={accounts[0]} sendTransaction={sendTransaction} loggedIn={loggedIn} gameState={gameStateInWords} gameData={gameData} isPlayer1={isPlayer1} isPlayer2={isPlayer2} isMyTurn={isMyTurn} />
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
export default App;
