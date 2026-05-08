export default class GameManager {
  constructor(playerCount) {
    this.playerCount = 1; // demo: single player
    this.currentPlayer = 0;
    this.isAnimating = false;
    this.players = [{
      id: 0,
      currentNodeId: "node1"
    }];
  }

  nextTurn() {
    // single player demo — no turn change needed
  }
}
