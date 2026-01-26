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
  document.getElementById("rollBtn").disabled = true;

  // ① 回り始める
  startDiceAnimation();

  // ② 出目はこの時点で確定（内部）
  const dice = rollDice();
  const sortedDice = [...dice].sort((a, b) => a - b);
  const y = judgeYaku(sortedDice);

  let displayYakuName = y.name;
  if (y.name === "目あり" && y.sub != null) {
    displayYakuName = `目あり（${y.sub}）`;
  }

  // ③ 約1秒後に一斉停止
  setTimeout(() => {
    stopDiceAnimation(dice);
  }, 1000);

  // ④ 停止後に結果処理（完全に分離）
  setTimeout(() => {
    GameState.rollCount++;

    showResult(`${dice.join(",")} → ${displayYakuName}`);

    const isConfirmed =
      y.name !== "目なし" || GameState.rollCount === 3;

    if (!isConfirmed) {
      document.getElementById("rollBtn").disabled = false;
      updateTurn();
      return;
    }

    // --- 確定処理 ---
    p.yaku = y.name;
    p.yakuRank = y.rank;
    p.sub = y.sub ?? null;

    if (y.effect && GameState.version === 2) {
      GameState.turnEffects.push(y.effect);
    }

    GameState.loggedYaku.clear();

    let logText = `${p.name}：${displayYakuName}`;
    const mul = YAKU_MULTIPLIER[y.name] ?? y.mul ?? 1;

    if (mul !== 1 && !GameState.loggedYaku.has(y.name)) {
      logText += `（×${mul}）`;
      GameState.loggedYaku.add(y.name);
    }

    addLog(logText);

    GameState.turn++;
    GameState.rollCount = 0;

    if (GameState.turn >= players.length) {
      const weakest = weakestPlayers(players);
      const cups = calculateCups(players);

      showFinalResult(weakest, cups);

      // ★ 別行でまとめて表示
      showSpecialEffects(GameState.turnEffects);

      showNextTurnButton();
      showBackToSetup();
      return;
    }

    document.getElementById("rollBtn").disabled = false;
    updateTurn();
  }, 1200);
};

document.getElementById("nextTurnBtn").onclick = () => {
  GameState.turn = 0;
  GameState.rollCount = 0;

  GameState.turnEffects = [];
  GameState.loggedYaku.clear();

  resetPlayersForNextTurn();
  resetGameUI();
  updateTurn();
};

document.getElementById("backToSetupBtn").onclick = () => {
  document.getElementById("game").classList.add("hidden");
  document.getElementById("setup").classList.remove("hidden");

  GameState.turnEffects = [];
  GameState.loggedYaku.clear();

  resetGameUI();
  document.getElementById("backToSetupBtn").classList.add("hidden");
};

