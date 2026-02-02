const YAKU_MULTIPLIER = {
  "ピンゾロ": 5,
  "奇数ゾロ": 3,
  "暴走": 3,
  "シゴロ": 2,
  "目あり": 1,
  "目なし": 1,
  "ヒフミ": 2,
  "逆暴走": 3,
  "偶数ゾロ": 3,
  "ローゾロ": 5,
};

const YAKU_V2 = {
  111: { name: "ピンゾロ", sub: null, mul: 1, effect: "ALL_CHEERS" },
  222: { name: "ツーゾロ", sub: null, mul: 2, effect: "NEIGHBOR" },
  333: { name: "サンゾロ", sub: null, mul: 2, effect: "RETRY_LAST" },
  444: { name: "ヨンゾロ", sub: null, mul: 2, effect: "CHOOSE_ONE" },
  555: { name: "ゴゾロ", sub: null, mul: 2, effect: "NULLIFY" },
  666: { name: "ローゾロ", sub: null, mul: 2, effect: "REVOLUTION" },
};

const MAX_RANK_V1 = 13;
const MAX_RANK_V2 = 15;

// v1
const V1_STRONG_MAX_RANK = 3;   // ここまでが「強い層」
const V1_WEAK_MIN_RANK   = 11;  // ここからが「弱い層」
// v2
const V2_STRONG_MAX_RANK = 9;   // ゴゾロ〜目あり
const V2_WEAK_MIN_RANK   = 12;  // ヒフミ〜？？？


function judgeYaku(dice) {
  const [a, b, c] = dice;
  const key = `${a}${b}${c}`;

  // バージョン2.1：ゾロ目イベント
  if (GameState.version == 2 && YAKU_V2[key]) {
    const y = YAKU_V2[key];
    return {
      name: y.name,
      sub: null,
      mul: y.mul,
      effect: y.effect,
    };
  }

  // ピンゾロ
  if (a === 1 && b === 1 && c === 1) {
    return { name: "ピンゾロ", sub: null };
  }

  // 奇数ゾロ
  if (a === b && b === c && (a === 3 || a === 5)) {
    return { name: "奇数ゾロ", sub: null };
  }

  // 偶数ゾロ
  if (a === b && b === c && (a === 2 || a === 4)) {
    return { name: "偶数ゾロ", sub: null };
  }

  // ローゾロ
  if (a === 6 && b === 6 && c === 6) {
    return { name: "ローゾロ", sub: null };
  }

  // 暴走（135）
  if (a === 1 && b === 3 && c === 5) {
    // ★ バージョン2では目なし扱い
    if (GameState.version === 2) {
      return { name: "目なし", sub: null };
    }
    return { name: "暴走", sub: null };
  }

  // 逆暴走（246）
  if (a === 2 && b === 4 && c === 6) {
    // ★ バージョン2では目なし扱い
    if (GameState.version === 2) {
      return { name: "目なし", sub: null };
    }
    return { name: "逆暴走", sub: null };
  }

  // シゴロ
  if (a === 4 && b === 5 && c === 6) {
    return {
      name: "シゴロ",
      sub: null,
      mul: GameState.version === 2 ? 2 : undefined,
    };
  }

  // ヒフミ
  if (a === 1 && b === 2 && c === 3) {
    return {
      name: "ヒフミ",
      sub: null,
      mul: GameState.version === 2 ? 2 : undefined,
    };
  }


  // 目あり
  if (a === b || b === c) {
    const pair = a === b ? c : a;
    return {
      name: "目あり",
      sub: pair,
    };
  }

  // 目なし
  return { name: "目なし", sub: null };
}

function getYakuRank(name, sub, player) {
  return GameState.version === 1
    ? getRankV1(name, sub)
    : getRankV2(name, sub);
}

function getRankV1(name, sub) {
  switch (name) {
    case "ピンゾロ": return 1;
    case "奇数ゾロ":
    case "暴走": return 2;
    case "シゴロ": return 3;
    case "目なし": return 10;
    case "ヒフミ": return 11;
    case "逆暴走": 
    case "偶数ゾロ": return 12;
    case "ローゾロ": return 13;
  }

  if (name === "目あり") {
    return 10 - sub; // 6→4, 1→9
  }

  return 999;
}

function getRankV2(name, sub) {
  switch (name) {
    case "ゴゾロ": return 1;
    case "サンゾロ": return 2;
    case "シゴロ": return 3;
    case "ピンゾロ": return 4;
    case "目なし": return 11;
    case "ヒフミ": return 12;
    case "ツーゾロ": 
    case "ヨンゾロ": return 13;
    case "ローゾロ": return 14;
    case "？？？": return 0;
  }

  if (name === "目あり") {
    return 10 - sub; // 6→4, 1→9 → 4～9
  }

  return 999;
}

function weakestPlayers(players) {
  if (!players || players.length === 0) return [];

  const movable = players.filter(p => p.yaku !== "ゴゾロ");
  if (movable.length === 0) return players;

  let targetRank;

  if (GameState.revolution) {
    // 革命中：rank が最小の人が最弱
    targetRank = Math.min(...movable.map(p => p.yakuRank));
  } else {
    // 通常：rank が最大の人が最弱
    targetRank = Math.max(...movable.map(p => p.yakuRank));
  }

  let weakest = movable.filter(p => p.yakuRank === targetRank);

  // 目あり同士の tie-break
  if (weakest.every(p => p.yaku === "目あり")) {
    const worstSub = GameState.revolution
      ? Math.min(...weakest.map(p => p.sub))
      : Math.max(...weakest.map(p => p.sub));
    weakest = weakest.filter(p => p.sub === worstSub);
  }

  return weakest;
}

function getPlayerMultiplier(p) {
  if (GameState.version === 2) {
    return p.mul ?? 1;
  }
  return YAKU_MULTIPLIER[p.yaku] ?? 1;
}

function calculateCups(players) {

  // ===== 新モード：最強 × 最弱 =====
  if (GameState.calcMode === "strongWeak") {

    const { strongMax, weakMin } = getStrongWeakBoundary();

    const strongCandidates = players.filter(
      p => p.yakuRank <= strongMax
    );

    const weakCandidates = players.filter(
      p => p.yakuRank >= weakMin
    );

    // 強 × 弱 が両方ある場合
    if (strongCandidates.length > 0 && weakCandidates.length > 0) {

      // 最強（rank 最小）
      const strongest = strongCandidates.reduce(
        (a, b) => (a.yakuRank < b.yakuRank ? a : b)
      );

      // 最弱（rank 最大）
      const weakest = weakCandidates.reduce(
        (a, b) => (a.yakuRank > b.yakuRank ? a : b)
      );

      return (
        getPlayerMultiplier(strongest) *
        getPlayerMultiplier(weakest)
      );
    }

    // 強い層しかいない → 最強1人分
    if (strongCandidates.length > 0) {
      const strongest = strongCandidates.reduce(
        (a, b) => (a.yakuRank < b.yakuRank ? a : b)
      );
      return getPlayerMultiplier(strongest);
    }

    // 弱い層しかいない → 最弱1人分
    if (weakCandidates.length > 0) {
      const weakest = weakCandidates.reduce(
        (a, b) => (a.yakuRank > b.yakuRank ? a : b)
      );
      return getPlayerMultiplier(weakest);
    }

    // 中間しかいない（目あり／目なしのみ）
    return 1;
  }
  
  // ===== 既存モード：全役掛け =====
  const uniqueYaku = new Set(players.map(p => p.yaku));
  let cups = 1;

  uniqueYaku.forEach(yaku => {
    const p = players.find(pl => pl.yaku === yaku);
    const mul = getPlayerMultiplier(p);
    cups *= mul;
  });

  return cups;
}

function getStrongWeakBoundary() {
  if (GameState.version === 1) {
    return {
      strongMax: V1_STRONG_MAX_RANK,
      weakMin: V1_WEAK_MIN_RANK,
    };
  }
  return {
    strongMax: V2_STRONG_MAX_RANK,
    weakMin: V2_WEAK_MIN_RANK,
  };
}

window.getStrongWeakBoundary = getStrongWeakBoundary;
window.weakestPlayers = weakestPlayers;
window.getYakuRank = getYakuRank;

