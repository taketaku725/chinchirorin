const VOLUME_MAP = {
  0: 0.0,
  1: 0.3,
  2: 0.6,
  3: 1.0,
};

const sounds = {
  roll: new Audio("sounds/roll.mp3"),
};

function playSE(key) {
  const level = GameState.volumeLevel;
  if (level === 0) return;

  const audio = sounds[key];
  if (!audio) return;

  audio.volume = VOLUME_MAP[level];
  audio.currentTime = 0;
  audio.play().catch(() => {
    // iOS対策
  });
}
