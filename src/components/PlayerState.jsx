import React from 'react';

const diceUnicodeMap = {
  0: '⚀',
  1: '⚁',
  2: '⚂',
  3: '⚃',
  4: '⚄',
  5: '⚅',
};
const shortenAddress = (address, charsToShow = 6, breakChar = '...') => {
  const front = address.substring(0, charsToShow);
  const back = address.substring(address.length - charsToShow);
  return `${front}${breakChar}${back}`;
};

const PlayerState = ({ address, diceState, playerNumber, isPlayer }) => {
  return (
    <div className="text-center">
      <h2 className="font-semibold">Player {playerNumber} {isPlayer && "(You)"}</h2>
      {
        address === '0x0000000000000000000000000000000000000000'
          ? 'Waiting for someone to join...' : (
            <div>
              <p className="mb-1 mt-1">Dice:</p>
              <div>
                {diceState?.map((dice, index) => (
                  <span key={index} style={{ fontSize: '5em' }} className="text-xl">
                    {diceUnicodeMap[dice]}
                  </span>
                ))}
              </div>
              <small>{shortenAddress(address)}</small>
            </div>
          )
      }
    </div>
  );
};

export default PlayerState;