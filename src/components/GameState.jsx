import React from 'react';
import { TbMoneybag } from "react-icons/tb";
import { MdCasino } from 'react-icons/md'; // Import the icon
import { MdGamepad } from 'react-icons/md'; // Import the icon

const GameState = ({ currentPot, gameState }) => {
  return (
    <div>
      <h2 className="font-semibold text-2xl mb-4 flex items-center">
        Game State
      </h2>
      <p className="text-lg mb-2 flex items-center">
        <TbMoneybag className="mr-2" /> Current Pot: {currentPot}
      </p>
      <p className="text-lg flex items-center">
        <MdGamepad className="mr-2" /> Current State: {gameState}
      </p>
    </div>
  );
};

export default GameState;