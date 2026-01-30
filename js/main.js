const PINZORO_FLASH_PROB = 0.9; // 30%（あとでここだけ変える）

document.addEventListener("dblclick", e => {
  e.preventDefault();
}, { passive: false });

let playerConfig = loadPlayersConfig();

renderPlayerSetup(playerConfig);

function getNameWidth(str) {
  let width = 0;
  for (const ch of str) {
    if (ch.match(/[^\x00-\x7F]/)) {
      width += 2;
    } else {
      width += 1;
    }
  }
  return width;
}

function addPlayer() {
  const input = document.getElementById("newPlayerName");
  const name = input.value.trim();
  if (!name) return;

  if (getNameWidth(name) > 12) {
    alert("プレイヤー名は全角6文字 / 半角12文字までです");
    return;
  }

  playerConfig.push({ name, active: true });
  savePlayersConfig(playerConfig);
  renderPlayerSetup(playerConfig);

  input.value = "";
}

document.getElementById("addPlayerBtn").onclick = addPlayer;

const input = document.getElementById("newPlayerName");
input.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    e.preventDefault();
    addPlayer();
  }
});

function movePlayer(index, dir) {
  const target = index + dir;

  // 範囲外ガード
  if (target < 0 || target >= playerConfig.length) return;

  // 入れ替え
  [playerConfig[index], playerConfig[target]] =
    [playerConfig[target], playerConfig[index]];

  // 保存＆再描画
  savePlayersConfig(playerConfig);
  renderPlayerSetup(playerConfig);
}

// ui.js から呼べるようにする
window.movePlayer = movePlayer;

document.getElementById("startBtn").onclick = () => {
  GameState.loggedYaku.clear();
  GameState.redoQueue = [];
  GameState.redoOriginTurn = null;
  GameState.revolution = false;

  // ★ ① setup画面の設定を読む
  const activeNames = playerConfig
    .filter(p => p.active)
    .map(p => p.name);

  if (activeNames.length < 2) {
    alert("参加中のプレイヤーは2人以上必要です");
    return;
  }

  // ★ ② ここで players を確定させる
  initPlayers(activeNames);

  // ★ ③ ゲーム開始時リセット（ターン専用）
  GameState.turn = 0;
  GameState.rollCount = 0;
  GameState.turnEffects = [];

  resetGameUI();

  // ★ ④ 画面遷移
  document.getElementById("setup").classList.add("hidden");
  document.getElementById("game").classList.remove("hidden");

  const label = document.getElementById("versionLabel");

  label.textContent =
    GameState.version === 2
      ? "バージョン2（特殊効果あり）"
      : "バージョン1（通常ルール）";

  // ★ ⑤ 最初のプレイヤー表示
  updateTurn();
};

const rollBtn = document.getElementById("rollBtn");

document.getElementById("rollBtn").onclick = () => {
  if (GameState.autoRoll && this.disabled) return;

  const btn = rollBtn;

  btn.disabled = true;

  const p = currentPlayer();

  playSE("roll");

  // ① 出目は先に確定
  const dice = rollDice();
  const sum = dice.reduce((a, b) => a + b, 0);
  p.sums.push(sum);
  GameState.rollCount++;

  const sortedDice = [...dice].sort((a, b) => a - b);
  const y = judgeYaku(sortedDice);
    
  // 表示名
  let displayYakuName = y.name;
  if (y.name === "目あり" && y.sub != null) {
    displayYakuName = `${y.sub}`;
  }

  // ② 演出スキップ分岐
  if (GameState.skipAnimation) {
    stopDiceImmediately(dice);
    handleRollResult(dice, y, displayYakuName);
    return;
  }
  
  // ③ 通常演出
  startDiceAnimation();
  
  setTimeout(() => {
    stopDiceAnimation(dice);
  }, 1000);

  setTimeout(() => {
    handleRollResult(dice, y, displayYakuName);
  }, 1200);
};

function handleRollResult(dice, y, displayYakuName) {
  const p = currentPlayer();
  let pinzoroFlashing = false;

  showResult(`出目：${dice.join(",")} ／ 役：${displayYakuName}`);

  const isConfirmed =
    y.name !== "目なし" || GameState.rollCount === 3;

  // ★ バージョン2：目なし3投・合計一致の特例
  if (
    GameState.version === 2 &&
    y.name === "目なし" &&
    GameState.rollCount === 3 &&
    p.sums.length === 3 &&
    p.sums[0] === p.sums[1] &&
    p.sums[1] === p.sums[2]
  ) {
    p.yaku = "？？？";
    p.sub = null;
    p.mul = 7;
    p.yakuRank = getYakuRank("？？？", null);
    
    // ★ ？？？ 確定ログを追加
    const logText = `${p.name}：？？？（×7）`;
    addLog(logText, p.name, { autoColor: true });

    GameState.turn++;
    GameState.rollCount = 0;
    p.sums = [];

    if (GameState.turn >= players.length) {
      const weakest = weakestPlayers(players);
      const cups = calculateCups(players);
      showFinalResult(weakest, cups);
      showNextTurnButton();
      showBackToSetup();
      return;
    }

    updateTurn();
    document.getElementById("rollBtn").disabled = false;
    return;
  }

  if (!isConfirmed) {
    updateTurn();

    document.getElementById("rollBtn").disabled = false;
  
    scheduleAutoRoll();
    return;
  }


  // --- 確定処理 ---
    

  if (GameState.version === 2 && y.name === "ピンゾロ") {
    GameState.turnEffects.push(
      `ピンゾロ！みんなで乾杯！`
    );
  }

  if (
    GameState.version === 2 &&
    y.name === "ピンゾロ" &&
    !GameState.skipAnimation &&
    Math.random() < PINZORO_FLASH_PROB
  ) {
    const btn = document.getElementById("rollBtn");
  
    pinzoroFlashing = true;
  
    btn.disabled = false;
    btn.classList.add("pinzoro-flash");
  
    setTimeout(() => {
      btn.classList.remove("pinzoro-flash");
      btn.disabled = true;
    }, 120);
  }

  if (GameState.version === 2 && y.name === "サンゾロ") {

    const confirmed = players.filter(p => p.yakuRank !== null);
    const weakestNow = weakestPlayers(confirmed);

    weakestNow.forEach(pw => {
      showInstantMessage(`${pw.name} 振り直し！`);
    });
    
    GameState.redoQueue = weakestNow.map(pw =>
      players.indexOf(pw)
    );

    GameState.redoOriginTurn = GameState.turn + 1;
    
    // ★ サンゾロ待機中
    GameState.sanzoPending = true;
  }
        
  if (GameState.version === 2 && y.name === "ヨンゾロ") {
    GameState.turnEffects.push(
      `${p.name}は好きな誰かと乾杯！`
    );
  }

  if (GameState.version === 2 && y.name === "ゴゾロ") {
    GameState.turnEffects.push(
      `${p.name}は特殊効果を受け付けない！`
    );
  }

  if (GameState.version === 2 && y.name === "ローゾロ") {
    GameState.revolution = true;
    GameState.turnEffects.push("革命！");
  }
    
  p.yaku = y.name;
  p.sub = y.sub ?? null;
  p.mul = y.mul ?? 1;
  p.yakuRank = getYakuRank(p.yaku, p.sub, p);

  if (GameState.sanzoPending && GameState.redoQueue.length >= 0) {
    // この確定が「振り直しプレイヤーの確定」なら消す
    clearInstantMessage();
    GameState.sanzoPending = false;
  }


  // ★ 内部判定用キー（倍率・loggedYaku 用）
  const yakuKey = p.yaku ?? y.name;

  // ★ 表示用（目ありは数字、？？？は？？？）
  let logText = `${p.name}：${displayYakuName}`;

  const mul =
    p.specialMul ??
    (GameState.version === 2
      ? p.mul
      : YAKU_MULTIPLIER[yakuKey]) ??
    1;

  if (mul !== 1 && !GameState.loggedYaku.has(yakuKey)) {
    logText += `（×${mul}）`;
    GameState.loggedYaku.add(yakuKey);
  }

  const confirmed = players.filter(pl => pl.yakuRank !== null);
  const weakestNow =
    confirmed.length >= 2
      ? weakestPlayers(confirmed).map(w => w.name)
      : [];
  addLog(logText, p.name, {
    autoColor: true,
    replace: true
  });

  highlightWeakestInLog();
  refreshStrongWeakLog();

  // redo が終わり、再開位置がある場合
  if (
    GameState.redoQueue.length === 0 &&
    GameState.redoOriginTurn !== null
  ) {
    GameState.turn = GameState.redoOriginTurn;
    GameState.redoOriginTurn = null;

    // ★ サンゾロ振り直し終了後は必ず復帰
    document.getElementById("rollBtn").disabled = false;
  }

  /// ★ 振り直しキューがある場合はそちらを優先
  if (GameState.redoQueue.length > 0) {

    GameState.turn = GameState.redoQueue.shift();

    // ★【ここ】redo でも必ず 0 に戻す
    GameState.rollCount = 0;
    
    document.getElementById("rollBtn").disabled = false;
    updateTurn();
    return;
  }
    
  // 通常の次ターン
  GameState.turn++;
  GameState.rollCount = 0;
  p.sums = [];
    
  if (GameState.turn >= players.length) {
    const weakest = weakestPlayers(players);
    const cups = calculateCups(players);
    
    showFinalResult(weakest, cups);
    showSpecialEffects(GameState.turnEffects);
  
    showNextTurnButton();
    showBackToSetup();
    return;
  }

  updateTurn();

  if (!pinzoroFlashing) {
    document.getElementById("rollBtn").disabled = false;
}


}

function scheduleAutoRoll() {
  if (!GameState.autoRoll) return;

  const p = currentPlayer();

  const isRedo =
    GameState.sanzoPending &&
    GameState.redoQueue.length >= 0;

  if (
    (p.yaku === null || isRedo) &&
    GameState.rollCount < 3
  ) {
    setTimeout(() => {
      document.getElementById("rollBtn").click();
    }, GameState.skipAnimation ? 50 : 300);
  }
}


document.getElementById("nextTurnBtn").onclick = () => {
  GameState.turn = 0;
  GameState.rollCount = 0;
  GameState.loggedYaku.clear();
  GameState.turnEffects = [];
  GameState.revolution = false;
  GameState.redoQueue = [];
  GameState.redoOriginTurn = null;

  // ★ 追加：特殊効果表示を消す
  document.getElementById("effectResult").innerHTML = "";

  resetPlayersForNextTurn();
  players.forEach(p => {
    delete p.specialMul;
    p.sums = [];
  });
  
  resetGameUI();
  updateTurn();
};

document.getElementById("backToSetupBtn").onclick = () => {
  document.getElementById("game").classList.add("hidden");
  document.getElementById("setup").classList.remove("hidden");
  
  GameState.rollCount = 0;

  GameState.turnEffects = [];
  GameState.revolution = false;
  GameState.redoQueue = [];
  GameState.redoOriginTurn = null;
  
  document.getElementById("effectResult").innerHTML = "";

  players.forEach(p => {
    delete p.specialMul;
    p.sums = [];
  });

  resetGameUI();
  document.getElementById("backToSetupBtn").classList.add("hidden");
};
