const GameState = {
  version: 0,
  calcMode: "all",
  skipAnimation: false,
  autoRoll: false,
  extraRules: true,

  volumeLevel: 3,

  pinzoroLock: false,
  turn: 0,
  rollCount: 0,
  turnEffects: [],
  revolution: false,
  redoQueue: [],
  redoOriginTurn: null,
  loggedYaku: new Set(),
  sanzoPending: false,
  blockAutoRollOnce: false,
};


