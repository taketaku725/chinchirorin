function updateTurn() {
  const p = currentPlayer();
  document.getElementById("turnInfo").textContent =
    `${p.name} の番（${GameState.rollCount + 1}/3）`;
}

function showResult(text) {
  document.getElementById("result").textContent = text;
}

function addLog(text) {
  const log = document.getElementById("log");
  log.innerHTML += `<div>${text}</div>`;
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

