# Texas Hold'em Poker

A simple client-side Texas Hold'em poker game.

## How to Run

1.  Open `index.html` in your browser.

## Features

*   Basic Texas Hold'em game logic
*   2 players
*   Fold, Call, Raise actions

## To Do

*   Implement proper hand evaluation
*   Add more players
*   Improve UI
*   Add betting logic
    evaluateHand(cards) {
        // Sort cards by value
        const sortedCards = cards.sort((a, b) => {
            const valueA = this.getCardValue(a.value);
            const valueB = this.getCardValue(b.value);
            return valueA - valueB;
        });

        const values = sortedCards.map(card => card.value);
        const suits = sortedCards.map(card => card.suit);

        const valueCounts = {};
        for (const value of values) {
            valueCounts[value] = (valueCounts[value] || 0) + 1;
        }

        const suitCounts = {};
        for (const suit of suits) {
            suitCounts[suit] = (suitCounts[suit] || 0) + 1;
        }

        const isFlush = Object.values(suitCounts).some(count => count >= 5);

        let isStraight = false;
        let straightCount = 1;
        for (let i = 1; i < values.length; i++) {
            if (this.getCardValue(values[i]) === this.getCardValue(values[i - 1]) + 1) {
                straightCount++;
                if (straightCount >= 5) {
                    isStraight = true;
                    break;
                }
            } else if (values[i] !== values[i - 1]) {
                straightCount = 1;
            }
        }

        // Check for wheel straight (A, 2, 3, 4, 5)
        if (!isStraight && values.includes('2') && values.includes('3') && values.includes('4') && values.includes('5') && values.includes('A')) {
            isStraight = true;
        }

        const pairs = [];
        let threeOfAKind = false;
        let fourOfAKind = false;

        for (const value in valueCounts) {
            if (valueCounts[value] === 2) {
                pairs.push(value);
            } else if (valueCounts[value] === 3) {
                threeOfAKind = true;
            } else if (valueCounts[value] === 4) {
                fourOfAKind = true;
            }
        }

        if (isStraight && isFlush) {
            return 9; // Straight Flush
        } else if (fourOfAKind) {
            return 8; // Four of a Kind
        } else if (threeOfAKind && pairs.length > 0) {
            return 7; // Full House
        } else if (isFlush) {
            return 6; // Flush
        } else if (isStraight) {
            return 5; // Straight
        } else if (threeOfAKind) {
            return 4; // Three of a Kind
        } else if (pairs.length >= 2) {
            return 3; // Two Pair
        } else if (pairs.length === 1) {
            return 2; // One Pair
        } else {
            return 1; // High Card
        }
    }

    getCardValue(value) {
        if (value === 'J') return 11;
        if (value === 'Q') return 12;
        if (value === 'K') return 13;
        if (value === 'A') return 14;
        return parseInt(value);
    }

    constructor(players) {
        this.players = players;
        this.deck = [];
        this.communityCards = [];
        this.pot = 0;
        this.currentBet = 0;
        this.gameStage = 'preflop'; // preflop, flop, turn, river
        this.currentPlayerIndex = 0;
        this.smallBlind = 1;
        this.bigBlind = 2;
        this.maxBet = 50;
        this.lastAggressor = null; // Track the last player who raised
    }

    startGame() {
        this.deck = this.createDeck();
        this.shuffleDeck();
        this.dealCards();
        this.collectBlinds();
        this.currentBet = this.bigBlind; // Set initial bet to big blind
        this.lastAggressor = this.players[1]; // Big blind is the initial aggressor
        this.updateUI();
    }

    handlePlayerAction(playerId, action, amount) {
        const player = this.players.find(p => p.id === playerId);
        const currentPlayer = this.players[this.currentPlayerIndex];

        if (!player) {
            console.error("Player not found");
            return;
        }

        if (player.id !== currentPlayer.id) {
            this.displayMessage("It's not your turn!");
            return;
        }

        if (player.folded) {
            this.displayMessage("You have already folded.");
            return;
        }

        switch (action) {
            case 'fold':
                player.folded = true;
                this.displayMessage(`${player.name} folds.`);
                break;
            case 'call':
                const callAmount = this.currentBet - player.bet;
                if (callAmount > player.chips) {
                    // All-in
                    this.pot += player.chips;
                    player.bet += player.chips;
                    player.chips = 0;
                    this.displayMessage(`${player.name} calls and is all-in.`);
                } else {
                    this.pot += callAmount;
                    player.chips -= callAmount;
                    player.bet += callAmount;
                    this.displayMessage(`${player.name} calls.`);
                }
                break;
            case 'raise':
                if (amount <= this.currentBet) {
                    this.displayMessage("Raise must be higher than the current bet.");
                    return;
                }
                if (amount > this.maxBet) {
                    amount = this.maxBet;
                }
                const raiseAmount = amount - player.bet;
                if (raiseAmount > player.chips) {
                    // All-in
                    this.pot += player.chips;
                    player.bet += player.chips;
                    player.chips = 0;
                    this.currentBet = player.bet; // Set current bet to player's all-in amount
                    this.displayMessage(`${player.name} raises to ${amount} and is all-in.`);
                } else {
                    this.pot += raiseAmount;
                    player.chips -= raiseAmount;
                    player.bet = amount;
                    this.currentBet = amount;
                    this.lastAggressor = player;
                    this.displayMessage(`${player.name} raises to ${amount}.`);
                }
                break;
            case 'check':
                if (this.currentBet > player.bet) {
                    this.displayMessage("You must call or raise.");
                    return;
                }
                this.displayMessage(`${player.name} checks.`);
                break;
            default:
                console.warn("Invalid action");
        }

        this.advanceToNextPlayer();
        this.updateUI();
    }

    advanceToNextPlayer() {
        this.currentPlayerIndex = (this.currentPlayerIndex + 1) % this.players.length;
        // Skip folded players
        if (this.players[this.currentPlayerIndex].folded) {
            this.advanceToNextPlayer();
        }
    }

    nextStage() {
        // Check if all players have acted (either folded, called, or are all-in)
        if (this.hasRoundEnded()) {
            if (this.gameStage === 'preflop') {
                this.gameStage = 'flop';
                this.communityCards = [this.deck.pop(), this.deck.pop(), this.deck.pop()];
            } else if (this.gameStage === 'flop') {
                this.gameStage = 'turn';
                this.communityCards.push(this.deck.pop());
            } else if (this.gameStage === 'turn') {
                this.gameStage = 'river';
                this.communityCards.push(this.deck.pop());
            } else if (this.gameStage === 'river') {
                this.gameStage = 'showdown';
                this.determineWinner();
            }
            this.currentBet = 0; // Reset current bet for the next stage
            this.currentPlayerIndex = 0; // Reset to the first player
            this.updateUI();
        } else {
            this.displayMessage("Waiting for other players to act.");
        }
    }

    hasRoundEnded() {
        // Check if all active players have matched the current bet or are all-in
        let playersToAct = this.players.filter(player => !player.folded && player.chips > 0);
        if (playersToAct.length === 0) return true; // No active players

        for (let player of playersToAct) {
            if (player.bet < this.currentBet) {
                return false; // There are players who still need to act
            }
        }
        return true; // All active players have acted
    }

    updateUI() {
        const communityCardsDiv = document.getElementById('community-cards');
        communityCardsDiv.innerHTML = 'Community Cards: ';
        for (let card of this.communityCards) {
            communityCardsDiv.innerHTML += `<span class="card">${card.value} ${card.suit}</span>`;
        }

        const playerAreaDiv = document.getElementById('player-area');
        playerAreaDiv.innerHTML = ''; // Clear existing players
        for (let player of this.players) {
            const playerDiv = document.createElement('div');
            playerDiv.classList.add('player');
            if (player.folded) {
                playerDiv.classList.add('folded'); // Add a class for folded players
            }
            playerDiv.innerHTML = `
                <h3>${player.name} ${this.players[this.currentPlayerIndex].id === player.id ? '(Acting)' : ''}</h3>
                <p>Chips: ${player.chips}</p>
                <p>Bet: ${player.bet}</p>
                <p>Hand: ${player.hand.map(card => `${card.value} ${card.suit}`).join(', ')}</p>
            `;
            playerAreaDiv.appendChild(playerDiv);
        }

        const potDiv = document.getElementById('pot-size');
        potDiv.innerText = `Pot Size: ${this.pot}`;

        const currentBetDiv = document.getElementById('current-bet');
        currentBetDiv.innerText = `Current Bet: ${this.currentBet}`;
    }
