# Dice Poker on Blockchain

## Overview
This project introduces a decentralized Dice Poker game, inspired by "The Witcher's" iconic gameplay, leveraging the cutting-edge features of blockchain technology. We've integrated LightLink's Layer 2 solutions for scalability, API3's Quantum Random Number Generator (QRNG) for true randomness, and Moon's innovative account abstraction for a simplified user experience. This blend of technologies ensures that each game is not only fair and transparent but also accessible to a wider audience beyond traditional blockchain enthusiasts.

## Features
- **Decentralized Gameplay:** Ensures fairness and transparency, with each action recorded on the blockchain.
- **API3 QRNG Integration:** Utilizes quantum randomness for dice rolls, making the game truly unpredictable and enhancing the gaming experience.
- **LightLink's L2 Solutions:** Provides scalability, enabling faster transactions and lower fees, crucial for a seamless gaming experience.
- **Moon Wallet Integration:** Simplifies the blockchain experience through account abstraction, making it easier for players to manage their funds and interact with the game.

## Game Mechanics
The game follows the traditional Dice Poker rules with a twist, incorporating blockchain's immutability and transparency. Players can join a game, place bets, raise, call, or fold, and roll dice in a series of rounds to determine the winner. The use of QRNG for dice rolls means each game is as unpredictable as it would be in the real world, but with the added security and fairness of blockchain technology.

## Key files
1. contract.sol - Complete contract code.
2. App.jsx
3. Controls.jsx
4. GameState.jsx
5. PlayerState.jsx

## Getting Started
To play Dice Poker on the blockchain, follow these steps:

1. **Connect Your Wallet:** Use Moon to connect your wallet seamlessly.
2. **Join a Game:** Enter an ongoing game or start a new one.
3. **Place Your Bets:** Participate in the betting rounds using ETH.
4. **Roll the Dice:** Engage in the core gameplay, where strategy meets luck.
5. **Win and Withdraw:** Collect your winnings directly through the smart contract.

## Technologies Used
- **Smart Contracts:** Written in Solidity, deployed on Ethereum.
- **API3's QRNG:** For generating unpredictable and verifiable random numbers.
- **LightLink's L2:** For scalable and efficient blockchain transactions.
- **Moon:** For easy wallet management and user-friendly blockchain interactions.

## Available Scripts

In the project directory, you can run:

### `npm start`
Runs the app in the development mode. Open [http://localhost:3000](http://localhost:3000) to view it in the browser. The page will reload if you make edits. You will also see any lint errors in the console.

### `npm run build`
Builds the app for production to the `build` folder. It correctly bundles React in production mode and optimizes the build for the best performance. The build is minified and the filenames include the hashes. Your app is ready to be deployed! See the section about [deployment](https://facebook.github.io/create-react-app/docs/deployment) for more information.