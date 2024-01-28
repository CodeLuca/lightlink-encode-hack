import React, { useState } from 'react';

const Controls = ({ loggedIn, gameState, currentPlayer, isPlayer1, isPlayer2, isMyTurn, sendTransaction, accountAddress, web3 }) => {
  const [betAmount, setBetAmount] = useState('');

  const handleAction = async (action, args = [], transactionOptions = {}) => {
    // Convert gasPrice and gas to hexadecimal strings
    if (transactionOptions.gasPrice) {
      transactionOptions.gasPrice = `0x${parseInt(transactionOptions.gasPrice).toString(16)}`;
    }
    if (transactionOptions.gas) {
      transactionOptions.gas = `0x${parseInt(transactionOptions.gas).toString(16)}`;
    }

    // Calculate nonce
    const nonce = await web3.eth.getTransactionCount(accountAddress);
    transactionOptions.nonce = `0x${nonce.toString(16)}`;

    // Calculate value
    let etherAmount = '0';
    if (action === 'bet') {
      etherAmount = betAmount;
      const value = web3.utils.toWei(etherAmount, 'ether');
      transactionOptions.value = `0x${parseInt(value).toString(16)}`;
    }

    // Remove '0x' from transactionOptions values if they are hexadecimal
    for (let key in transactionOptions) {
      if (transactionOptions[key].startsWith('0x')) {
        transactionOptions[key] = transactionOptions[key].slice(2);
      }
    }

    transactionOptions.chainId = '1891';
    transactionOptions.encoding = 'utf-8';

    await sendTransaction(action, args, transactionOptions);
  };

  return (
    <div>
      <h2 className="font-semibold text-2xl mb-4">Controls</h2>
      {
        loggedIn ? (
          <>
            <p className="text-lg mb-2">Current Player: {gameState}</p>

            {
              gameState === 'Joining' && <button onClick={() => handleAction('joinGame', [], { gasPrice: '1000000000', gas: '200000' })} className="py-2 px-4 bg-blue-600 text-white rounded-md hover:bg-blue-500">Join Game</button>
            }
            {
              gameState !== 'Joining' && gameState !== 'Game Ended' && isMyTurn && (
                <>
                  <input type="number" value={betAmount} onChange={e => setBetAmount(e.target.value)} placeholder="Bet amount" className="mb-2 py-2 px-4 rounded-md border-2 border-gray-300" />
                  <button onClick={() => handleAction('bet', [betAmount], { gasPrice: '1000000000', gas: '200000' })} className="py-2 px-4 bg-green-600 text-white rounded-md hover:bg-green-500">Make Bet</button>
                  <button onClick={() => handleAction('call', [], { gasPrice: '1000000000', gas: '200000' })} className="py-2 px-4 bg-yellow-600 text-white rounded-md hover:bg-yellow-500">Call</button>
                  <button onClick={() => handleAction('fold', [], { gasPrice: '1000000000', gas: '200000' })} className="py-2 px-4 bg-red-600 text-white rounded-md hover:bg-red-500">Fold</button>
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
          </>
        ) : (
          <p className="text-lg">Please log in to see controls.</p>
        )
      }
    </div>
  );
};

export default Controls;