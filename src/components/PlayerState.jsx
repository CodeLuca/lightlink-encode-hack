import React from 'react';

const PlayerState = ({ address, diceState }) => {
  return (
    <div>
      <h2 className="font-semibold">Player State</h2>
      <p>Address: {address}</p>
      <p>Dice State: {diceState}</p>
    </div>
  );
};

export default PlayerState;