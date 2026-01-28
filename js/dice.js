const DICE_ROTATION = {
  1: "rotateX(0deg) rotateY(0deg)",
  2: "rotateX(90deg) rotateY(0deg)",
  3: "rotateX(0deg) rotateY(-90deg)",
  4: "rotateX(0deg) rotateY(90deg)",
  5: "rotateX(-90deg) rotateY(0deg)",
  6: "rotateX(0deg) rotateY(180deg)",
};

const cubeState = [
  { rotX: 0, rotY: 0 },
  { rotX: 0, rotY: 0 },
  { rotX: 0, rotY: 0 },
];

const ROTATION_AXIS = [
  { x: 1,   y: 1 },
  { x: 0.8, y: 1 },
  { x: 1,   y: 0.8 },
];

const cubes = [
  document.getElementById("dice1"),
  document.getElementById("dice2"),
  document.getElementById("dice3"),
];

function randomAxis() {
  // 必ず斜めになるように固定レンジを使う
  const sign = () => (Math.random() < 0.5 ? -1 : 1);

  const x = (0.4 + Math.random() * 0.6) * sign();
  const y = (0.4 + Math.random() * 0.6) * sign();
  const z = (0.4 + Math.random() * 0.6) * sign();

  return { x, y, z };
}

function startDiceAnimation() {
  cubes.forEach(cube => {
    const axis = randomAxis();

    cube.style.setProperty("--ax", axis.x);
    cube.style.setProperty("--ay", axis.y);
    cube.style.setProperty("--az", axis.z);

    cube.classList.add("rolling");
  });
}


function stopDiceAnimation(result) {
  cubes.forEach((cube, i) => {
    cube.classList.remove("rolling");

    // ★ 最初から正面角度に着地
    cube.style.transform = DICE_ROTATION[result[i]];
  });
}

function rollDice() {
  // ★ 並び替えない
  return [rand(), rand(), rand()];
}

function rand() {
  return Math.floor(Math.random() * 6) + 1;
}
