const YAKU_MULTIPLIER = {
  "ピンゾロ": 5,
  "奇数ゾロ": 3,
  "暴走": 3,
  "シゴロ": 2,
  "目あり": 1,
  "目なし": 1,
  "ヒフミ": 2,
  "逆暴走": 2,
  "偶数ゾロ": 2,
  "ローゾロ": 5,
};

const YAKU_V2 = {
  111: { name: "111", rank: 2, mul: 1, effect: "ALL_CHEERS" },
  222: { name: "222", rank: 3, mul: 2, effect: "NEIGHBOR" },
  333: { name: "333", rank: 4, mul: 2, effect: "RETRY_LAST" },
  444: { name: "444", rank: 5, mul: 2, effect: "CHOOSE_ONE" },
  555: { name: "555", rank: 1, mul: 2, effect: "NULLIFY" },
  666: { name: "666", rank: 6, mul: 2, effect: "REVOLUTION" },
};

function judgeYaku(dice) {
  const [a, b, c] = dice;
  const key = `${a}${b}${c}`;

  // バージョン2.1：ゾロ目イベント
  if (GameState.version == 2 && YAKU_V2[key]) {
    const y = YAKU_V2[key];
    return {
      name: y.name,
      rank: y.rank,
      mul: y.mul,
      effect: y.effect,
    };
  }

  // ピンゾロ
  if (a === 1 && b === 1 && c === 1) {
    return { name: "ピンゾロ", rank: 1 };
  }

  // 奇数ゾロ
  if (a === b && b === c && (a === 3 || a === 5)) {
    return { name: "奇数ゾロ", rank: 2 };
  }

  // 偶数ゾロ
  if (a === b && b === c && (a === 2 || a === 4)) {
    return { name: "偶数ゾロ", rank: 12 };
  }

  // ローゾロ
  if (a === 6 && b === 6 && c === 6) {
    return { name: "ローゾロ", rank: 13 };
  }

  // 暴走（135）
  if (a === 1 && b === 3 && c === 5) {
    return { name: "暴走", rank: 2 };
  }

  // 逆暴走（246）
  if (a === 2 && b === 4 && c === 6) {
    return { name: "逆暴走", rank: 12 };
  }

  // シゴロ
  if (a === 4 && b === 5 && c === 6) {
    return { name: "シゴロ", rank: 3 };
  }

  // ヒフミ
  if (a === 1 && b === 2 && c === 3) {
    return { name: "ヒフミ", rank: 11 };
  }

  // 目あり
  if (a === b || b === c) {
    const pair = a === b ? c : a;
    return {
      name: "目あり",
      rank: 10 - pair, // 6→4, 1→9
      sub: pair,
    };
  }

  // 目なし
  return { name: "目なし", rank: 10 };
}


function weakestPlayers(players) {
  // 1. 役ランクで最弱抽出
  const maxRank = Math.max(...players.map(p => p.yakuRank));
  let weakest = players.filter(p => p.yakuRank === maxRank);

  // 2. 目あり同士ならサブ値で比較
  const meariOnly = weakest.every(p => p.yaku === "目あり");
  if (meariOnly) {
    const minSub = Math.min(...weakest.map(p => p.sub));
    weakest = weakest.filter(p => p.sub === minSub);
  }

  if (GameState.turnEffect === "REVOLUTION") {
    // 最弱 ⇄ 最強 を反転
    const minRank = Math.min(...players.map(p => p.yakuRank));
    weakest = players.filter(p => p.yakuRank === minRank);
  }

  return weakest;
}

function calculateCups(players) {
  const uniqueYaku = new Set(players.map(p => p.yaku));
  let cups = 1;

  uniqueYaku.forEach(yaku => {
    const p = players.find(pl => pl.yaku === yaku);
    const mul =
      YAKU_MULTIPLIER[yaku] ??
      p?.mul ??
      1;
    cups *= mul;
  });

  return cups;
}

