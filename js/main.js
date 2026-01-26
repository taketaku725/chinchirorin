let playerConfig = loadPlayersConfig();

if (playerConfig.length === 0) {
  playerConfig.push({ name: "プレイヤー1", active: true });
}

renderPlayerSetup(playerConfig);

document.getElementById("addPlayerBtn").onclick = () => {
  const input = document.getElementById("newPlayerName");
  const name = input.value.trim();
  if (!name) return;

  playerConfig.push({ name, active: true });
  savePlayersConfig(playerConfig);
  renderPlayerSetup(playerConfig);

  input.value = "";
};

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

  GameState.version =
    Number(document.getElementById("version").value);

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


document.getElementById("rollBtn").onclick = () => {
  const p = currentPlayer();

  GameState.rollCount++;
  startDiceAnimation();

  document.getElementById("rollBtn").disabled = true;

  // ① 回り始める


  // ② 出目はこの時点で確定（内部）
  const dice = rollDice();
  const sortedDice = [...dice].sort((a, b) => a - b);
  const y = judgeYaku(sortedDice);

  let displayYakuName = y.name;

  // ★ 目ありは数字だけ表示
  if (y.name === "目あり" && y.sub != null) {
    displayYakuName = `${y.sub}`;
  }

  // ③ 約1秒後に一斉停止
  setTimeout(() => {
    stopDiceAnimation(dice);
  }, 1000);

  // ④ 停止後に結果処理（完全に分離）
  setTimeout(() => {

    showResult(`${dice.join(",")} → ${displayYakuName}`);

    const isConfirmed =
      y.name !== "目なし" || GameState.rollCount === 3;

    if (!isConfirmed) {
      document.getElementById("rollBtn").disabled = false;
      updateTurn();
      return;
    }

    // --- 確定処理 ---

    if (GameState.version === 2 && y.name === "ピンゾロ") {
      GameState.turnEffects.push("ピンゾロ！みんなで乾杯！");
    }

    if (GameState.version === 2 && y.name === "222") {
      GameState.turnEffects.push(
        `${p.name}は左右の人と一緒に乾杯！`
      );
    }

    if (GameState.version === 2 && y.name === "333") {

      // この時点での「最弱」を取得
      const weakestNow = weakestPlayers(players);
    
      // 表示（人数分）
      weakestNow.forEach(pw => {
        GameState.turnEffects.push(
          `${pw.name}振り直し`
        );
      });
    
      // 振り直しキューを作る（順番保持）
      GameState.redoQueue = weakestNow.map(pw =>
        players.indexOf(pw)
      );
    
      // 再開位置（サンゾロを出した人の次）
      GameState.redoOriginTurn = GameState.turn + 1;
    }
        
    if (GameState.version === 2 && y.name === "444") {
      GameState.turnEffects.push(
        `${p.name}は好きな誰かと乾杯！`
      );
    }

    if (GameState.version === 2 && y.name === "555") {
      GameState.turnEffects.push(
        `${p.name}は特殊効果を受け付けない！`
      );
      p.noRevolution = true;
    }

    if (GameState.version === 2 && y.name === "666") {
      GameState.revolution = true;
      GameState.turnEffects.push("革命！");
    }
    
    p.yaku = y.name;
    p.yakuRank = y.rank;
    p.sub = y.sub ?? null;


    GameState.loggedYaku.clear();

    let logText = `${p.name}：${displayYakuName}`;
    const mul = YAKU_MULTIPLIER[y.name] ?? y.mul ?? 1;

    if (mul !== 1 && !GameState.loggedYaku.has(y.name)) {
      logText += `（×${mul}）`;
      GameState.loggedYaku.add(y.name);
    }

    addLog(logText);

    // redo が終わり、再開位置がある場合
    if (
      GameState.redoQueue.length === 0 &&
      GameState.redoOriginTurn !== null
    ) {
      GameState.turn = GameState.redoOriginTurn;
      GameState.redoOriginTurn = null;
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

    document.getElementById("rollBtn").disabled = false;
  }, 1200);
};

document.getElementById("nextTurnBtn").onclick = () => {
  GameState.turn = 0;
  GameState.rollCount = 0;
  
  GameState.turnEffects = [];
  GameState.revolution = false;
  GameState.loggedYaku.clear();
  GameState.redoQueue = [];
  GameState.redoOriginTurn = null;
  
  resetPlayersForNextTurn();
  players.forEach(p => delete p.noRevolution); // ★ 追加
  
  resetGameUI();
  updateTurn();
};

document.getElementById("backToSetupBtn").onclick = () => {
  document.getElementById("game").classList.add("hidden");
  document.getElementById("setup").classList.remove("hidden");
  
  GameState.roolCount = 0;

  GameState.turnEffects = [];
  GameState.revolution = false;
  GameState.loggedYaku.clear();
  GameState.redoQueue = [];
  GameState.redoOriginTurn = null;

  players.forEach(p => delete p.noRevolution);

  resetGameUI();
  document.getElementById("backToSetupBtn").classList.add("hidden");
};

