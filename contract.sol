// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract DicePoker {
    enum GameState {
        Joining,
        Player1Bet,
        Player2BetOrCall,
        Player1RaiseOrCall,
        Player2RaiseOrCall,
        Player1Fold,
        Player2Fold,
        Player1RollDice,
        Player2RollDice,
        DetermineWinner,
        GameEnded
    }

    GameState public currentState;
    address[2] public players;
    uint256[2] public bets;
    uint8[5][2] public playerDice;
    bool[2] public hasRolled;
    bool[2] public hasRerolled;
    bool public gameStarted;
    address public currentBettor;
    uint8 public roundNumber;
    address public winner;
    address private owner;
    uint256 public currentBet;
    address public player1;
    address public player2;

    modifier onlyOwner() {
        require(
            msg.sender == owner,
            "Only the contract owner can call this function"
        );
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    event PlayerJoined(address player);
    event BetPlaced(address player, uint256 amount);
    event DiceRolled(address player, uint8[5] dice);
    event WinnerDeclared(address winner, uint256 payout);

    function getQRNGNumber() private view returns (uint8[5] memory) {
        uint8[5] memory result;
        for (uint i = 0; i < 5; i++) {
            result[i] = uint8(
                (uint256(
                    keccak256(abi.encodePacked(block.timestamp, msg.sender, i))
                ) % 6) + 1
            );
        }
        return result;
    }

    function joinGame() public {
        require(
            currentState == GameState.Joining,
            "Cannot join game at this stage"
        );
        require(
            players[0] != msg.sender && players[1] != msg.sender,
            "Player already in the game"
        );
        require(
            players[0] == address(0) || players[1] == address(0),
            "Game is full"
        );
        uint8 playerIndex = players[0] == address(0) ? 0 : 1;
        players[playerIndex] = msg.sender;

        // Update player1 and player2 variables
        if (playerIndex == 0) {
            player1 = msg.sender;
        } else {
            player2 = msg.sender;
        }

        emit PlayerJoined(msg.sender);
        if (players[1] != address(0)) {
            currentState = GameState.Player1Bet;
            gameStarted = true;
            currentBettor = players[0];
        }
    }

    function placeBet(uint256 betAmount) public payable {
        require(gameStarted, "Game not started");
        require(
            (currentState == GameState.Player1Bet &&
                msg.sender == players[0]) ||
                (currentState == GameState.Player2BetOrCall &&
                    msg.sender == players[1]),
            "Not your turn to bet"
        );
        require(msg.value == betAmount, "Sent ether does not match bet amount");
        uint8 playerIndex = msg.sender == players[0] ? 0 : 1;

        bets[playerIndex] += betAmount;
        currentBet = betAmount; // Update the current bet amount

        emit BetPlaced(msg.sender, betAmount);
        currentBettor = players[1 - playerIndex]; // Switch the current bettor
        currentState = currentState == GameState.Player1Bet
            ? GameState.Player2BetOrCall
            : GameState.Player1RollDice;
    }

    function raise(uint256 raiseAmount) public payable {
        require(gameStarted, "Game not started");
        require(
            (currentState == GameState.Player1RaiseOrCall &&
                msg.sender == players[0]) ||
                (currentState == GameState.Player2RaiseOrCall &&
                    msg.sender == players[1]),
            "Not your turn to raise"
        );
        require(
            msg.value == raiseAmount,
            "Sent ether does not match raise amount"
        );
        uint8 playerIndex = msg.sender == players[0] ? 0 : 1;

        bets[playerIndex] += raiseAmount;
        currentBet += raiseAmount; // Update the current bet amount

        emit BetPlaced(msg.sender, raiseAmount);
        currentBettor = players[1 - playerIndex]; // Switch the current bettor
        currentState = currentState == GameState.Player1RaiseOrCall
            ? GameState.Player2RaiseOrCall
            : GameState.Player1RaiseOrCall;
    }

    function call() public payable {
        require(gameStarted, "Game not started");
        require(
            (currentState == GameState.Player1RaiseOrCall &&
                msg.sender == players[0]) ||
                (currentState == GameState.Player2RaiseOrCall &&
                    msg.sender == players[1]),
            "Not your turn to call"
        );
        uint8 playerIndex = msg.sender == players[0] ? 0 : 1;
        require(
            msg.value + bets[playerIndex] == currentBet,
            "Sent ether does not match current bet"
        );

        bets[playerIndex] += msg.value;

        emit BetPlaced(msg.sender, msg.value);
        currentState = currentState == GameState.Player1RaiseOrCall
            ? GameState.Player1RollDice
            : GameState.Player2RollDice;
    }

    function fold() public {
        require(gameStarted, "Game not started");
        require(
            (currentState == GameState.Player1RaiseOrCall &&
                msg.sender == players[0]) ||
                (currentState == GameState.Player2RaiseOrCall &&
                    msg.sender == players[1]),
            "Not your turn to fold"
        );
        uint8 playerIndex = msg.sender == players[0] ? 0 : 1;

        currentState = playerIndex == 0
            ? GameState.Player1Fold
            : GameState.Player2Fold;
        determineWinner();
    }

    function rollDice(uint8[5] memory diceToRoll) public {
        require(
            (currentState == GameState.Player1RollDice &&
                msg.sender == players[0]) ||
                (currentState == GameState.Player2RollDice &&
                    msg.sender == players[1]),
            "Not your turn to roll dice"
        );
        require(gameStarted, "Game not started");
        uint8 playerIndex = msg.sender == players[0] ? 0 : 1;
        require(!hasRolled[playerIndex], "Already rolled");
        for (uint8 i = 0; i < 5; i++) {
            require(
                diceToRoll[i] >= 1 && diceToRoll[i] <= 6,
                "Dice value out of range"
            );
            if (diceToRoll[i] == 1) {
                playerDice[playerIndex][i] = getQRNGNumber()[i];
            }
        }
        hasRolled[playerIndex] = true;
        emit DiceRolled(msg.sender, playerDice[playerIndex]);
        roundNumber++;
        if (roundNumber == 2) {
            determineWinner();
        } else {
            currentBettor = players[0]; // Reset the current bettor for the next betting round
        }
        currentState = currentState == GameState.Player1RollDice
            ? GameState.Player2RollDice
            : GameState.DetermineWinner;
    }

    function determineWinner() private {
        require(
            currentState == GameState.DetermineWinner ||
                currentState == GameState.Player1Fold ||
                currentState == GameState.Player2Fold,
            "Cannot determine winner at this stage"
        );
        if (currentState == GameState.Player1Fold) {
            winner = players[1];
        } else if (currentState == GameState.Player2Fold) {
            winner = players[0];
        } else {
            // Detailed logic to evaluate and compare the poker hands
            winner = evaluateWinner();
        }
        uint256 payoutAmount = address(this).balance;
        payable(winner).transfer(payoutAmount);
        emit WinnerDeclared(winner, payoutAmount);
        currentState = GameState.GameEnded;
        resetGame();
    }

    function countFrequencies(
        uint8[5] memory diceRolls
    ) private pure returns (uint8[6] memory) {
        uint8[6] memory frequencies;
        for (uint8 i = 0; i < diceRolls.length; i++) {
            frequencies[diceRolls[i] - 1]++;
        }
        return frequencies;
    }

    function compareHands(
        uint8[5] memory dice1,
        uint8[5] memory dice2
    ) public pure returns (address player1, address player2, uint winner) {
        uint8[6] memory freq1 = countFrequencies(dice1);
        uint8[6] memory freq2 = countFrequencies(dice2);

        uint score1 = scoreHand(freq1);
        uint score2 = scoreHand(freq2);

        if (score1 > score2) {
            return (player1, player2, 1); // Player 1 wins
        } else if (score2 > score1) {
            return (player1, player2, 2); // Player 2 wins
        } else {
            return (player1, player2, 0); // Tie
        }
    }

    function scoreHand(
        uint8[6] memory frequencies
    ) private pure returns (uint16) {
        uint16 score = 0;
        bool isThreeOfAKind = false;
        bool isPair = false;
        uint consecutive = 0;
        uint maxConsecutive = 0;

        for (uint i = 0; i < 6; i++) {
            if (frequencies[i] == 2) {
                isPair = true;
                score += 200; // Pair
            }
            if (frequencies[i] == 3) {
                isThreeOfAKind = true;
                score += 300; // Three of a Kind
            }
            if (frequencies[i] == 4) {
                score += 400; // Four of a Kind
            }
            if (frequencies[i] == 5) {
                return 5000; // Five of a Kind (Highest possible)
            }
            if (frequencies[i] > 0) {
                consecutive++;
                if (consecutive > maxConsecutive) {
                    maxConsecutive = consecutive;
                }
            } else {
                consecutive = 0;
            }
        }

        if (isThreeOfAKind && isPair) {
            score += 600; // Full House
        }
        if (maxConsecutive >= 5) {
            score += 500; // Straight
        }

        return score;
    }

    function resetGame() public onlyOwner {
        require(
            currentState == GameState.GameEnded,
            "Cannot reset game at this stage"
        );
        currentBet = 0;
        delete players;
        delete bets;
        delete playerDice;
        for (uint i = 0; i < 2; i++) {
            hasRolled[i] = false;
            hasRerolled[i] = false;
        }
        gameStarted = false;
        roundNumber = 0;
        currentState = GameState.Joining;
    }

    function evaluateWinner() private returns (address) {
        uint8[5] memory player1Dice = playerDice[0];
        uint8[5] memory player2Dice = playerDice[1];

        uint8[6] memory player1Frequencies = countFrequencies(player1Dice);
        uint8[6] memory player2Frequencies = countFrequencies(player2Dice);

        uint16 player1Score = scoreHand(player1Frequencies);
        uint16 player2Score = scoreHand(player2Frequencies);

        if (player1Score > player2Score) {
            return players[0];
        } else if (player2Score > player1Score) {
            return players[1];
        } else {
            revert("It's a tie"); // It's a tie
        }
    }
}
