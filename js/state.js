const GameState = {
  version: 1,
  turn: 0,
  rollCount: 0,
  turnEffects: [],
  revolution: false,
  redoQueue: [],
  redoOriginTurn: null,
  loggedYaku: new Set(),
};
