// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;
import "@api3/airnode-protocol/contracts/rrp/requesters/RrpRequesterV0.sol";

contract DicePoker is RrpRequesterV0 {
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
        Tie,
        GameEnded
    }
    event RequestedUint256Array(bytes32 indexed requestId, uint256 size);
    event WithdrawalRequested(address indexed airnode, address indexed sponsorWallet);

    address public airnode;                 // The address of the QRNG Airnode
    bytes32 public endpointIdUint256;       // The endpoint ID for requesting a single random number
    bytes32 public endpointIdUint256Array;  // The endpoint ID for requesting an array of random numbers
    address public sponsorWallet;           // The wallet that will cover the gas costs of the request

    uint256[] public randomNumbers;

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

    mapping(bytes32 => bool) public expectingRequestWithIdToBeFulfilled;

    modifier onlyOwner() {
        require(
            msg.sender == owner,
            "Only the contract owner can call this function"
        );
        _;
    }

    constructor(address _airnodeRrp) RrpRequesterV0(_airnodeRrp) {
        owner = msg.sender;
    }

    event PlayerJoined(address player);
    event BetPlaced(address player, uint256 amount);
    event DiceRolled(address player, uint8[5] dice);
    event WinnerDeclared(address winner, uint256 payout);

      /// @notice Retrieves the dice states for both players.
      /// @return dicePlayer1 The dice array for player 1.
      /// @return dicePlayer2 The dice array for player 2.
      function getPlayersDice() public view returns (uint8[5] memory dicePlayer1, uint8[5] memory dicePlayer2) {
          dicePlayer1 = playerDice[0];
          dicePlayer2 = playerDice[1];
          return (dicePlayer1, dicePlayer2);
      }

    function getCallAmount() public view returns (uint256) {
        require(gameStarted, "Game not started");
        uint8 playerIndex = msg.sender == players[0] ? 0 : 1;

        return currentBet - bets[playerIndex];
    }
        
    function getAllDice() public view returns (uint8[10] memory) {
        uint8[10] memory allDice;
        for (uint i = 0; i < 5; i++) {
            allDice[i] = playerDice[0][i];
            allDice[i + 5] = playerDice[1][i];
        }
        return allDice;
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

      function placeBet(uint256 amount) public payable {
          require(gameStarted, "Game not started");
          require(msg.value == amount, "Sent ether does not match the input amount");

          uint8 playerIndex = msg.sender == players[0] ? 0 : 1;
          require(
              (currentState == GameState.Joining && (playerIndex == 0 || playerIndex == 1)) ||
              (currentState == GameState.Player1Bet && msg.sender == players[0]) ||
              (currentState == GameState.Player2BetOrCall && msg.sender == players[1]) ||
              (currentState == GameState.Player1RaiseOrCall && msg.sender == players[0]) ||
              (currentState == GameState.Player2RaiseOrCall && msg.sender == players[1]),
              "Not your turn"
          );

          if (currentState == GameState.Joining || currentState == GameState.Player1Bet) {
              currentBet = amount;
              currentState = (playerIndex == 0) ? GameState.Player2BetOrCall : GameState.Player1RaiseOrCall;
          } else {
              uint256 totalBet = bets[playerIndex] + msg.value;
              require(totalBet >= currentBet, "Total bet must be at least equal to the current bet to call or raise");

              if (totalBet > currentBet) {
                  currentBet = totalBet;
                  currentState = (playerIndex == 0) ? GameState.Player2RaiseOrCall : GameState.Player1RaiseOrCall;
              } else if (totalBet == currentBet) {
                  if (currentState == GameState.Player2BetOrCall || currentState == GameState.Player2RaiseOrCall) {
                      currentState = GameState.Player1RollDice;
                  } else if (currentState == GameState.Player1RaiseOrCall) {
                      currentState = GameState.Player2RollDice;
                  }
              }
          }

          bets[playerIndex] += msg.value;
          emit BetPlaced(msg.sender, msg.value);

          if (bets[0] >= currentBet && bets[1] >= currentBet) {
              currentState = determineNextPhase();
          }
      }

      function determineNextPhase() private returns (GameState) {
          if (!hasRolled[0] && !hasRolled[1]) {
              return GameState.Player1RollDice;
          } else if (hasRolled[0] && !hasRolled[1]) {
              return GameState.Player2RollDice;
          } else if (hasRolled[0] && hasRolled[1]) {
              return GameState.DetermineWinner;
          }
          return GameState.Joining; // Fallback, should not reach here in a normal flow
      }


    function raise(uint256 raiseAmount) public payable {
        require(gameStarted, "Game not started");
        require(
            (currentState == GameState.Player1Bet && msg.sender == players[0]) ||
            (currentState == GameState.Player2BetOrCall && msg.sender == players[1]) ||
            (currentState == GameState.Player1RaiseOrCall && msg.sender == players[0]) ||
            (currentState == GameState.Player2RaiseOrCall && msg.sender == players[1]),
            "Not your turn to raise"
        );

        uint8 playerIndex = msg.sender == players[0] ? 0 : 1;
        // The raiseAmount includes the amount to call plus the additional raise
        uint256 totalRequiredBet = currentBet - bets[playerIndex] + raiseAmount;

        require(
            msg.value == totalRequiredBet,
            "Raise amount does not match the required total bet amount"
        );

        bets[playerIndex] += msg.value;
        currentBet += raiseAmount; // Increment the currentBet by the raiseAmount only

        emit BetPlaced(msg.sender, msg.value);

        // Advance the game state to the next appropriate state
        currentState = (playerIndex == 0) ? GameState.Player2BetOrCall : GameState.Player1Bet;
    }


    function call() public payable {
        require(gameStarted, "Game not started");
        require(
            currentState == GameState.Player2BetOrCall && msg.sender == players[1] ||
            currentState == GameState.Player1RaiseOrCall && msg.sender == players[0] ||
            currentState == GameState.Player2RaiseOrCall && msg.sender == players[1],
            "Not your turn to call"
        );

        uint8 playerIndex = msg.sender == players[0] ? 0 : 1;
        uint256 callAmount = currentBet - bets[playerIndex];

        require(
            msg.value == callAmount,
            "Call amount does not match the required bet amount"
        );

        bets[playerIndex] += msg.value;

        emit BetPlaced(msg.sender, msg.value);

        // Advance the game state
        if (currentState == GameState.Player2BetOrCall || currentState == GameState.Player2RaiseOrCall) {
            currentState = GameState.Player1RollDice;
        } else if (currentState == GameState.Player1RaiseOrCall) {
            currentState = GameState.Player2RollDice;
        }

        // Check if both players have placed their bets and are ready to roll the dice
        if (bets[0] == bets[1] && currentState != GameState.Joining) {
            currentState = GameState.Player1RollDice;
        }
    }

    function fold() public {
        require(gameStarted, "Game not started");
        require(
            (currentState == GameState.Player1Bet && msg.sender == players[0]) ||
            (currentState == GameState.Player2BetOrCall && msg.sender == players[1]) ||
            (currentState == GameState.Player1RaiseOrCall && msg.sender == players[0]) ||
            (currentState == GameState.Player2RaiseOrCall && msg.sender == players[1]),
            "Not your turn to fold"
        );
        uint8 playerIndex = msg.sender == players[0] ? 0 : 1;

        // Assign the win to the other player
        winner = players[1 - playerIndex];
        emit WinnerDeclared(winner, address(this).balance);
        payoutAndReset(); // Transfer the pot to the winner and reset the game
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
              uint256 randomNumber;
              if (randomNumbers.length > 0) {
                  // Take a random number from the global array  
                  randomNumber = randomNumbers[randomNumbers.length - 1];
                  randomNumbers.pop();
              } else {
                  // Generate a new random number using the current RNG method
                  randomNumber = uint256(keccak256(abi.encodePacked(block.timestamp, msg.sender)));
              }
			  playerDice[playerIndex][i] = uint8(randomNumber);
              replenishPool();
            }
        }
        hasRolled[playerIndex] = true;
        emit DiceRolled(msg.sender, playerDice[playerIndex]);
        roundNumber++;
        if (roundNumber == 2) {
            currentState = GameState.DetermineWinner;
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
            address winningPlayer = evaluateWinner();
            if (winningPlayer == address(0)) {
                currentState = GameState.Tie; // Set state to Tie if there's no clear winner
            } else {
                winner = winningPlayer;
            }
        }
        payoutAndReset();
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
        currentState = GameState.Joining;
        delete players; // Clears the players array
        for (uint256 i = 0; i < bets.length; i++) {
            bets[i] = 0; // Resets all bets to 0
        }
        for (uint256 i = 0; i < playerDice.length; i++) {
            for (uint256 j = 0; j < playerDice[i].length; j++) {
                playerDice[i][j] = 0; // Resets dice values to 0
            }
        }
        for (uint256 i = 0; i < hasRolled.length; i++) {
            hasRolled[i] = false; // Resets roll status for both players
        }
        for (uint256 i = 0; i < hasRerolled.length; i++) {
            hasRerolled[i] = false; // Resets reroll status for both players
        }
        gameStarted = false; // Indicates the game is not started
        currentBettor = address(0); // Resets current bettor
        roundNumber = 0; // Resets the round number
        winner = address(0); // Clears the winner
        currentBet = 0; // Resets the current bet to 0
        player1 = address(0); // Resets player 1 address
        player2 = address(0); // Resets player 2 address
        delete randomNumbers; // Clears the randomNumbers array
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
            return address(0); // It's a tie
        }
    }

    function payoutAndReset() private {
        uint256 payoutAmount = address(this).balance;
        if (currentState != GameState.Tie) {
            payable(winner).transfer(payoutAmount);
            emit WinnerDeclared(winner, payoutAmount);
        } else {
			// Assuming players[0] and players[1] are the addresses of the players
			uint256 splitAmount = payoutAmount / 2;

			// In case of an odd number of wei in the pot, add the remainder to the first player's split.
			uint256 remainder = payoutAmount % 2;

			if (players[0] != address(0)) {
				payable(players[0]).transfer(splitAmount + remainder);
			}
			if (players[1] != address(0)) {
				payable(players[1]).transfer(splitAmount);
			}
        }
        resetGame();
    }

    // QRNG	
    function replenishPool() public {
        if (randomNumbers.length < 10) { // Replenish the pool if there are less than 10 random numbers left
            getQRNGNumber(); // Use an arbitrary seed
        }
    }

    function getQRNGNumber() public {
        bytes32 requestId = airnodeRrp.makeFullRequest(
            airnode,
            endpointIdUint256Array, // Use the endpoint for requesting an array
            address(this),
            sponsorWallet,
            address(this),
            this.fulfillUint256Array.selector, // Use the fulfill function for an array
            abi.encode(bytes32("1u"), bytes32("size"), 20) // Request an array of size 20
        );
        expectingRequestWithIdToBeFulfilled[requestId] = true;
        emit RequestedUint256Array(requestId, 20);
    }

    /// @notice Sets the parameters for making requests
    function setRequestParameters(
        address _airnode,
        bytes32 _endpointIdUint256,
        bytes32 _endpointIdUint256Array,
        address _sponsorWallet
    ) external {
        airnode = _airnode;
        endpointIdUint256 = _endpointIdUint256;
        endpointIdUint256Array = _endpointIdUint256Array;
        sponsorWallet = _sponsorWallet;
    }

    /// @notice To receive funds from the sponsor wallet and send them to the owner.
    receive() external payable {
        payable(owner).transfer(msg.value);
        emit WithdrawalRequested(airnode, sponsorWallet);
    }


    /// @notice Requests a `uint256[]`
    /// @param size Size of the requested array
    function makeRequestUint256Array(uint256 size) external {
        bytes32 requestId = airnodeRrp.makeFullRequest(
            airnode,
            endpointIdUint256Array,
            address(this),
            sponsorWallet,
            address(this),
            this.fulfillUint256Array.selector,
            // Using Airnode ABI to encode the parameters
            abi.encode(bytes32("1u"), bytes32("size"), size)
        );
        expectingRequestWithIdToBeFulfilled[requestId] = true;
        emit RequestedUint256Array(requestId, size);
    }

    /// @notice Called by the Airnode through the AirnodeRrp contract to
    /// fulfill the request
    function fulfillUint256Array(bytes32 requestId, bytes calldata data)
        external
        onlyAirnodeRrp
    {
        require(
            expectingRequestWithIdToBeFulfilled[requestId],
            "Request ID not known"
        );
        expectingRequestWithIdToBeFulfilled[requestId] = false;
        uint256[] memory qrngUint256Array = abi.decode(data, (uint256[]));
        
        if (qrngUint256Array.length > 0) {
            for (uint256 i = 0; i < qrngUint256Array.length; i++) {
                uint8 adjustedRandomNumber = uint8(qrngUint256Array[i] % 6) + 1;
                randomNumbers.push(adjustedRandomNumber);
            }
        }
    }

    /// @notice To withdraw funds from the sponsor wallet to the contract.
    function withdraw() external onlyOwner {
        airnodeRrp.requestWithdrawal(
        airnode,
        sponsorWallet
        );
    }
}
