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
  "？？？": 7,
};

const YAKU_V2 = {
  111: { name: "ピンゾロ", rank: 2, mul: 1, effect: "ALL_CHEERS" },
  222: { name: "ツーゾロ", rank: 3, mul: 2, effect: "NEIGHBOR" },
  333: { name: "サンゾロ", rank: 4, mul: 2, effect: "RETRY_LAST" },
  444: { name: "ヨンゾロ", rank: 5, mul: 2, effect: "CHOOSE_ONE" },
  555: { name: "ゴゾロ", rank: 1, mul: 2, effect: "NULLIFY" },
  666: { name: "ローゾロ", rank: 6, mul: 2, effect: "REVOLUTION" },
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
    // ★ バージョン2では目なし扱い
    if (GameState.version === 2) {
      return { name: "目なし", rank: 10 };
    }
    return { name: "暴走", rank: 2 };
  }

  // 逆暴走（246）
  if (a === 2 && b === 4 && c === 6) {
    // ★ バージョン2では目なし扱い
    if (GameState.version === 2) {
      return { name: "目なし", rank: 10 };
    }
    return { name: "逆暴走", rank: 12 };
  }

  // シゴロ
  if (a === 4 && b === 5 && c === 6) {
    return {
      name: "シゴロ",
      rank: 3,
      mul: GameState.version === 2 ? 2 : undefined,
    };
  }

  // ヒフミ
  if (a === 1 && b === 2 && c === 3) {
    return {
      name: "ヒフミ",
      rank: 11,
      mul: GameState.version === 2 ? 2 : undefined,
    };
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

  // --- 革命なし：通常処理 ---
  if (!GameState.revolution) {
    const maxRank = Math.max(...players.map(p => p.yakuRank));
    let weakest = players.filter(p => p.yakuRank === maxRank);

    // 目あり同士なら sub が小さい方が弱い
    const meariOnly = weakest.every(p => p.yaku === "目あり");
    if (meariOnly) {
      const minSub = Math.min(...weakest.map(p => p.sub));
      weakest = weakest.filter(p => p.sub === minSub);
    }

    return weakest;
  }

  // --- 革命あり：最強が負け ---
  // ゴゾロ（革命耐性）を除外
  const affected = players.filter(p => !p.noRevolution);

  // 念のため：全員ゴゾロだった場合
  if (affected.length === 0) return [];

  const minRank = Math.min(...affected.map(p => p.yakuRank));
  let weakest = affected.filter(p => p.yakuRank === minRank);

  // 目あり同士なら sub が大きい方が負け（逆転）
  const meariOnly = weakest.every(p => p.yaku === "目あり");
  if (meariOnly) {
    const maxSub = Math.max(...weakest.map(p => p.sub));
    weakest = weakest.filter(p => p.sub === maxSub);
  }

  return weakest;
}

function calculateCups(players) {
  const uniqueYaku = new Set(players.map(p => p.yaku));
  let cups = 1;

  uniqueYaku.forEach(yaku => {
    const p = players.find(pl => pl.yaku === yaku);

    let mul = 1;

    if (GameState.version === 2) {
      // ★ バージョン2：YAKU_V2.mul（= p.mul）を正とする
      mul = p?.mul ?? 1;
    } else {
      // ★ バージョン1：従来通り
      mul = YAKU_MULTIPLIER[yaku] ?? 1;
    }

    cups *= mul;
  });

  return cups;
}
