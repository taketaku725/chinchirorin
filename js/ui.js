function initToggles() {
  document.querySelectorAll(".menu-toggle").forEach(btn => {
    const key = btn.dataset.key;

    function refresh() {
      const on = GameState[key];
      btn.textContent = on ? "ON" : "OFF";
      btn.classList.toggle("on", on);
    }

    btn.onclick = () => {
      GameState[key] = !GameState[key];
      refresh();
    };

    refresh();
  });
}

function initSegments() {
  document.querySelectorAll(".menu-segment").forEach(seg => {
    const key = seg.dataset.key;
    const buttons = seg.querySelectorAll("button");

    buttons.forEach(btn => {
      btn.onclick = () => {
        const val = btn.dataset.value;
        GameState[key] =
          key === "version" ? Number(val) : val;

        buttons.forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
      };

      // 初期状態
      if (
        String(GameState[key]) === btn.dataset.value
      ) {
        btn.classList.add("active");
      }
    });
  });
}


function updateTurn() {
  GameState.pinzoroLock = false;
  const p = currentPlayer();
  if (!p.sums) p.sums = [];
  document.getElementById("turnInfo").textContent =
    `${p.name} の番（${GameState.rollCount + 1}/3）`;
}

function showResult(text) {
  document.getElementById("result").textContent = text;
}

function addLog(text, playerName, options = {}) {
  const log = document.getElementById("log");
  let div = null;

  // ★ 既存ログを探す（replace用）
  if (options.replace && playerName) {
    div = log.querySelector(
      `div[data-player="${playerName}"]`
    );
  }

  // ★ 無ければ新規作成
  if (!div) {
    div = document.createElement("div");
    if (playerName) {
      div.dataset.player = playerName;
    }
    log.appendChild(div);
  }

  const match = text.match(/（×(\d+)）/);

  if (match) {
    const mul = Number(match[1]);
    let className = "";

    if (options.weakMultiplier) {
      className = "weak";
    } else if (options.strongMultiplier) {
      className = "strong";
    } else if (
      options.autoColor &&
      playerName &&
      Array.isArray(players)
    ) {
      const p = players.find(pl => pl.name === playerName);
      if (p) {
        const { strongMax, weakMin } = getStrongWeakBoundary();
        if (p.yakuRank <= strongMax) className = "strong";
        if (p.yakuRank >= weakMin) className = "weak";
      }
    }

    if (className) {
      div.innerHTML = text.replace(
        `（×${mul}）`,
        `（<span class="mul ${className}">×${mul}</span>）`
      );
    } else {
      div.textContent = text;
    }
  } else {
    div.textContent = text;
  }

  // ★ 常に一番下へスクロール
  log.scrollTop = log.scrollHeight;
}


function highlightWeakestInLog() {
  const log = document.getElementById("log");
  const rows = log.querySelectorAll("div");

  // 一旦全部リセット
  rows.forEach(row => {
    row.classList.remove("weakest");
  });

  // まだ確定してない人は除外
  const confirmed = players.filter(p => p.yakuRank !== null);
  if (confirmed.length < 2) return;

  // ★ 既存ロジックをそのまま使う
  const weakest = weakestPlayers(confirmed);
  const weakestNames = weakest.map(p => p.name);

  rows.forEach(row => {
    const name = row.dataset.player;
    if (weakestNames.includes(name)) {
      row.classList.add("weakest");
    }
  });
}

function refreshStrongWeakLog() {
  const log = document.getElementById("log");

  // ★ strongWeak 以外では何もしない
  if (GameState.calcMode !== "strongWeak") return;

  // ★ ここから先は strongWeak 専用処理
  log.querySelectorAll("div[data-player]").forEach(row => {
    row.innerHTML = row.innerHTML.replace(
      /（<span class="mul.*?<\/span>）/,
      ""
    );
  });

  const confirmed = players.filter(p => p.yakuRank !== null);
  if (confirmed.length === 0) return;

  const { strongMax, weakMin } = getStrongWeakBoundary();

  let strong, weak;

  if (GameState.revolution) {
    strong = confirmed
      .filter(p => p.yakuRank >= weakMin)
      .sort((a, b) => b.yakuRank - a.yakuRank)[0];

    weak = confirmed
      .filter(p => p.yakuRank <= strongMax)
      .sort((a, b) => a.yakuRank - b.yakuRank)[0];
  } else {
    strong = confirmed
      .filter(p => p.yakuRank <= strongMax)
      .sort((a, b) => a.yakuRank - b.yakuRank)[0];

    weak = confirmed
      .filter(p => p.yakuRank >= weakMin)
      .sort((a, b) => b.yakuRank - a.yakuRank)[0];
  }

  [strong, weak].forEach(p => {
    if (!p) return;
    const row = log.querySelector(`div[data-player="${p.name}"]`);
    if (!row) return;

    const mul = getPlayerMultiplier(p);
    if (mul === 1) return;

    const className = p === strong ? "strong" : "weak";
    row.innerHTML += `（<span class="mul ${className}">×${mul}</span>）`;
  });
}

function addHistoryLog(text) {
  const area = document.getElementById("historyLog");
  const div = document.createElement("div");
  div.textContent = text;
  area.appendChild(div);

  // 常に一番下へスクロール
  area.scrollTop = area.scrollHeight;
}

function resetHistoryLog() {
  document.getElementById("historyLog").innerHTML = "";
}

function showFinalResult(weakest, cups) {
  const names = weakest.map(p => p.name).join("、");
  document.getElementById("result").textContent =
    `🍶 最弱：${names} ／ ${cups}杯`;
}

function resetGameUI() {
  document.getElementById("result").textContent = "";
  document.getElementById("log").innerHTML = "";
  document.getElementById("rollBtn").disabled = false;
  document.getElementById("nextTurnBtn").classList.add("hidden");
}

function showNextTurnButton() {
  document.getElementById("nextTurnBtn").classList.remove("hidden");
}

function showSpecialEffects(effects) {
  const area = document.getElementById("effectResult");
  area.innerHTML = "";

  if (!effects || effects.length === 0) return;

  effects.forEach(effect => {
    const div = document.createElement("div");
    div.textContent = effect;
    area.appendChild(div);
  });
}

function showInstantMessage(text) {
  const area = document.getElementById("instantMessage");
  area.textContent = text;
  area.classList.remove("hidden");
}

function clearInstantMessage() {
  const area = document.getElementById("instantMessage");
  area.textContent = "";
}

function renderPlayerSetup(list) {
  const area = document.getElementById("playerList");
  area.innerHTML = "";

  list.forEach((p, index) => {
    const row = document.createElement("div");
    row.className = `player-row ${p.active ? "" : "rest"}`;
    row.draggable = true;
    row.dataset.index = index;

    const isFirst = index === 0;
    const isLast = index === list.length - 1;

    row.innerHTML = `
      <span class="name">${p.name}</span>

      <div class="actions">
        <button class="toggle">
          ${p.active ? "休憩" : "復帰"}
        </button>
        <button class="remove">×</button>
      </div>

      <div class="order">
        <button
          onclick="movePlayer(${index}, -1)"
          ${isFirst ? "disabled" : ""}
        >▲</button>
        <button
          onclick="movePlayer(${index}, 1)"
          ${isLast ? "disabled" : ""}
        >▼</button>
      </div>
    `;

    // --- 休憩 / 復帰 ---
    row.querySelector(".toggle").onclick = () => {
      p.active = !p.active;
      savePlayersConfig(list);
      renderPlayerSetup(list);
    };

    // --- 削除 ---
    row.querySelector(".remove").onclick = () => {
      list.splice(index, 1);
      savePlayersConfig(list);
      renderPlayerSetup(list);
    };

    // --- ドラッグ並び替え（補助） ---
    addDragHandlers(row, list);

    area.appendChild(row);
  });
}



function showBackToSetup() {
  document.getElementById("backToSetupBtn").classList.remove("hidden");
}

let dragIndex = null;

function addDragHandlers(row, list) {
  row.addEventListener("dragstart", e => {
    dragIndex = Number(row.dataset.index);
    row.classList.add("dragging");
  });

  row.addEventListener("dragend", () => {
    row.classList.remove("dragging");
  });

  row.addEventListener("dragover", e => {
    e.preventDefault();
  });

  row.addEventListener("drop", e => {
    e.preventDefault();
    const dropIndex = Number(row.dataset.index);
    if (dragIndex === null || dragIndex === dropIndex) return;

    const moved = list.splice(dragIndex, 1)[0];
    list.splice(dropIndex, 0, moved);

    savePlayersConfig(list);
    renderPlayerSetup(list);
  });
}

const soundBtn = document.getElementById("soundToggle");

function updateSoundIcon() {
  const level = GameState.volumeLevel;
  soundBtn.style.backgroundImage =
    `url(img/volume_${level}.png)`;
}

soundBtn.onclick = () => {
  GameState.volumeLevel =
    (GameState.volumeLevel + 1) % 4;

  updateSoundIcon();
};

document.getElementById("yakuHelpBtn").onclick = () => {
  openYakuHelp();
};

document.getElementById("closeYakuHelp").onclick = () => {
  closeYakuHelp();
};

function openYakuHelp() {
  renderYakuHelp();
  document.getElementById("yakuHelp").classList.remove("hidden");
}

function closeYakuHelp() {
  document.getElementById("yakuHelp").classList.add("hidden");
}

function renderYakuHelp() {
  const area = document.getElementById("yakuHelpContent");
  area.innerHTML = "";

  if (GameState.version === 0) {
    area.innerHTML = `
      <div>ピンゾロ：５倍付け</div>
      <div>アラシ  ：３倍付け</div>
      <div>シゴロ  ：２倍付け</div>
      <div>目あり</div>
      <div>目なし</div>
      <div>ションベン</div>
      <div>ヒフミ  ：２倍払い</div>
    `;
  } else if (GameState.version === 1) {
    area.innerHTML = `
      <div>ラッキーセブン：７倍付け<div>
      <div>ピンゾロ   ：５倍付け</div>
      <div>奇数ゾロ   ：３倍付け</div>
      <div>暴走(135)  ：３倍付け</div>
      <div>シゴロ     ：２倍付け</div>
      <div>目あり</div>
      <div>目なし</div>
      <div>ションベン</div>
      <div>ヒフミ     ：２倍払い</div>
      <div>逆暴走(246)：３倍払い</div>
      <div>偶数ゾロ   ：３倍払い</div>
      <div>ローゾロ   ：５倍払い</div>
    `;
  } else {
    area.innerHTML = `
      <div>ピンゾロ：みんなで乾杯(1倍付け)</div>
      <div>ツーゾロ：左右と乾杯(２倍払い)</div>
      <div>サンゾロ：現状最弱振り直し(２倍付け)</div>
      <div>ヨンゾロ：好きな人と乾杯(２倍払い)</div>
      <div>ゴゾロ  ：特殊効果無効(２倍付け)</div>
      <div>ローゾロ：革命(２倍払い)</div>
      <div>シゴロ     ：２倍付け</div>
      <div>目あり</div>
      <div>目なし</div>
      <div>ションベン</div>
      <div>ヒフミ     ：２倍払い</div>
      <div>？？？  ：３連目なしかつ合計が同じ(７倍付け)</div>
    `;
  }
}

function renderYakuHelpInline() {
  const area = document.getElementById("yakuHelpInline");
  if (!area) return;

  if (GameState.version === 0) {
    area.innerHTML = `
      <strong>役一覧（V0）</strong><br>
      <div>ピンゾロ：５倍付け</div>
      <div>アラシ  ：３倍付け</div>
      <div>シゴロ  ：２倍付け</div>
      <div>目あり</div>
      <div>目なし</div>
      <div>ヒフミ  ：２倍払い</div>
    `;
  } else if (GameState.version === 1) {
    area.innerHTML = `
      <strong>役一覧（V1）</strong><br>
      <div>ピンゾロ   ：５倍付け</div>
      <div>奇数ゾロ   ：３倍付け</div>
      <div>暴走(135)  ：３倍付け</div>
      <div>シゴロ     ：２倍付け</div>
      <div>目あり</div>
      <div>目なし</div>
      <div>ヒフミ     ：２倍払い</div>
      <div>逆暴走(246)：３倍払い</div>
      <div>偶数ゾロ   ：３倍払い</div>
      <div>ローゾロ   ：５倍払い</div>
    `;
  } else {
    area.innerHTML = `
      <strong>役一覧（V2）</strong><br>
      <div>ピンゾロ：みんなで乾杯(1倍付け)</div>
      <div>ツーゾロ：左右と乾杯(２倍払い)</div>
      <div>サンゾロ：現状最弱振り直し(２倍付け)</div>
      <div>ヨンゾロ：好きな人と乾杯(２倍払い)</div>
      <div>ゴゾロ  ：特殊効果無効(２倍付け)</div>
      <div>ローゾロ：革命(２倍払い)</div>
      <div>シゴロ     ：２倍付け</div>
      <div>目あり</div>
      <div>目なし</div>
      <div>ヒフミ     ：２倍払い</div>
      <div>？？？  ：３連目なしかつ合計が同じ(７倍付け)</div>
    `;
  }
}

initToggles();
initSegments();
updateSoundIcon();

