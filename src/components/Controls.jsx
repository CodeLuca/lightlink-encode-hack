import React, { useState } from 'react';

const Controls = ({ loggedIn, gameState, gameData, isPlayer1, isPlayer2, isMyTurn, sendTransaction, accountAddress, web3 }) => {
  const [betAmount, setBetAmount] = useState('');
  const [diceToRoll, setDiceToRoll] = useState([1, 1, 1, 1, 1]);

  const handleAction = async (action, args = [], transactionOptions = {}) => {
    transactionOptions.gasPrice = '1000000000';
    transactionOptions.gas = '200000';

    // const nonceToUse = Number(await web3.eth.getTransactionCount(accountAddress, 'pending'));
    const nonceToUse = 10;
    console.log(`Performing action ${action} with nonce ${nonceToUse}`);

    transactionOptions.nonce = web3.utils.toHex(nonceToUse + 2);
    console.log({ nonceToUse, transactionOptions });

    if (action === 'placeBet' || action === 'call') {
      const valueInWei = web3.utils.toWei(betAmount, 'ether');
      transactionOptions.value = valueInWei;
      args = [valueInWei];
    }

    if (action === 'rollDice') {
      args = [diceToRoll.map(dice => dice === 1 ? 1 : 6)]; // Pass diceToRoll state as argument
    }

    for (let key in transactionOptions) {
      if (transactionOptions[key].startsWith('0x')) {
        transactionOptions[key] = transactionOptions[key].slice(2);
      }
    }

    transactionOptions.chain_id = '1891';
    transactionOptions.encoding = 'utf-8';

    await sendTransaction(action, args, transactionOptions);
  };

  const handleDiceChange = (index) => {
    const newDiceToRoll = [...diceToRoll];
    newDiceToRoll[index] = newDiceToRoll[index] === 1 ? 6 : 1;
    setDiceToRoll(newDiceToRoll);
  };

  return (
    <div className="text-center">
      <h2 className="font-semibold text-xl">Controls {isMyTurn.toString()}</h2>
      {
        loggedIn ? (
          <div className="my-2">
            {
              gameState === 'Joining' && !isPlayer1 && !isPlayer2 && <button onClick={() => handleAction('joinGame', [], { gasPrice: '1000000000', gas: '200000' })} className="py-2 px-4 bg-blue-600 text-white rounded-md hover:bg-blue-500">Join Game</button>
            }
            {
              gameState === 'Determine Winner' && <button onClick={() => handleAction('resetGame', [], { gasPrice: '1000000000', gas: '200000' })} className="py-2 px-4 bg-blue-600 text-white rounded-md hover:bg-blue-500">Reset Game</button>
            }
            {
              (gameState === 'Player 1 Roll Dice' && isPlayer1 && isMyTurn) || (gameState === 'Player 2 Roll Dice' && isPlayer2 && isMyTurn) ? (
                <>
                  <div className="flex mb-2 justify-center">
                    {diceToRoll.map((dice, index) => (
                      <label key={index} className="flex items-center mr-2">
                        <input type="checkbox" checked={dice === 1} onChange={() => handleDiceChange(index)} className="mr-1" />
                        Dice {index + 1}
                      </label>
                    ))}
                  </div>
                  <button onClick={() => handleAction('rollDice', [], { gasPrice: '1000000000', gas: '200000' })} className="py-2 px-4 bg-purple-600 text-white rounded-md hover:bg-purple-500">Roll Dice</button>
                </>
              ) : null
            }
            {
              gameState !== 'Joining' && gameState !== 'Game Ended' && gameState !== 'Player 1 Roll Dice' && gameState !== 'Player 2 Roll Dice' && gameState !== 'Determine Winner' && isMyTurn && (
                <>
                  <input type="number" value={betAmount} onChange={e => setBetAmount(e.target.value)} placeholder="Bet amount" className="mb-2 py-2 px-4 w-36 rounded-md border-2 border-gray-300" />
                  <button onClick={() => handleAction('placeBet', [betAmount], { gasPrice: '1000000000', gas: '200000' })} className="py-2 px-8 w-36 bg-green-600 text-white rounded-md hover:bg-green-500">{gameState === 'Player 1 Bet' ? "Bet" : "Raise"}</button>
                  <br />
                  {
                    gameState !== 'Player 1 Bet' && (
                      <>
                        <button
                          onClick={() => handleAction('placeBet', [gameData.currentBet], { gasPrice: '1000000000', gas: '200000' })}
                          className={`py-2 px-8 bg-yellow-600 text-white rounded-md hover:bg-yellow-500 w-36 mb-2 ${!isMyTurn && 'opacity-50 cursor-not-allowed'}`}
                          disabled={!isMyTurn}
                        >
                          Call
                        </button>
                        <br />
                      </>
                    )
                  }
                  <button onClick={() => handleAction('fold', [], { gasPrice: '1000000000', gas: '200000' })} className="py-2 px-8 bg-red-600 text-white rounded-md  w-36 hover:bg-red-500">Fold</button>
                </>
              )
            }
            {
              gameState !== 'Joining' && gameState !== 'Game Ended' && !isMyTurn && (
                <p className="text-lg">Waiting for your turn...</p>
              )
            }
            {
              gameState === 'Game Ended' && (
                <p className="text-lg">Game has ended.</p>
              )
            }
          </div>
        ) : (
          <p className="text-lg">Please log in to see controls.</p>
        )
      }
      {
        (isPlayer1 || isPlayer2) && <h2 className="font-semibold">You are player {isPlayer1 && "1"}{isPlayer2 && "2"}</h2>
      }
    </div >
  );
};

export default Controls;