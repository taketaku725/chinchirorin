const STORAGE_KEY = "sakakasu_players";


let players = [];

function initPlayers(names) {
  players = names.map(name => ({
    name,
    yaku: null,
    yakuRank: null,
    sub: null,
  }));
}

function currentPlayer() {
  return players[GameState.turn % players.length];
}

function resetPlayersForNextTurn() {
  players.forEach(p => {
    p.yaku = null;
    p.yakuRank = null;
    p.sub = null;
  });
}

function savePlayersConfig(config) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
}

function loadPlayersConfig() {
  const data = localStorage.getItem(STORAGE_KEY);
  return data ? JSON.parse(data) : [];
}
