const GameState = {
  version: 1,
  calcMode: "all",
  skipAnimation: false,
  autoRoll: false,
  extraRules: true,

  volumeLevel: 3,

  turn: 0,
  rollCount: 0,
  turnEffects: [],
  revolution: false,
  redoQueue: [],
  redoOriginTurn: null,
  loggedYaku: new Set(),
  sanzoPending: false,
};
