import React from 'react';
import { TbMoneybag } from "react-icons/tb";
import { MdCasino } from 'react-icons/md'; // Import the icon
import { MdGamepad } from 'react-icons/md'; // Import the icon
import Web3 from 'web3';

const GameState = ({ currentPot, gameState, gameData }) => {
  return (
    <div className="flex flex-col items-center w-full">
      <p className="flex text-lg mb-4 bg-yellow-300 rounded text-xl items-center font-bold p-3 px-5">
        <TbMoneybag className="mr-2" /> Current Pot: {currentPot === '0' ? '0' : Web3.utils.fromWei(currentPot, 'ether')}
      </p>
      {gameState === 'Joining' && <p className="flex text-lg items-center text-xl mb-3">Waiting for players to join...</p>}
      {gameState === 'Determine Winner' && <p className="flex text-lg items-center text-xl mb-3">{gameData.winner}</p>}
      {gameData.currentBet !== '0' && <p className="flex text-lg items-center text-xl mb-3">Current Bet: {Web3.utils.fromWei(gameData.currentBet.toString(), 'ether')}</p>}
      <p className="flex text-lg items-center">
        <MdGamepad className="mr-2" /> Game State:&nbsp;<b>{gameState}</b>
      </p>
    </div>
  );
};

export default GameState;