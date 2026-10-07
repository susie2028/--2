const $ = (id) => document.getElementById(id);
const canvas = $("c");
const ctx = canvas.getContext("2d");
const input = $("inp");

const ENGLISH_WORDS = `
  star moon orbit comet space rocket laser alien planet galaxy meteor sun solar probe pilot crater gravity eclipse saturn jupiter mars venus engine shield boost dock beam pulse signal radar cargo thrust
  mercury uranus neptune pluto asteroid starship spacecraft astronaut telescope rover lander satellite station shuttle capsule airlock spacesuit oxygen aurora stardust moonbase launch mission moonlight starlight launchpad spacewalk
`.trim().split(/\s+/);
const KOREAN_WORDS = `
  우주선 소행성 은하수 별똥별 지구 태양 화성 목성 토성 금성 수성 혜성 위성 궤도 로켓 레이저 외계인 우주인 블랙홀 망원경 중력 일식 월식 운석 충돌 방어막 엔진 추진 발사 착륙 우주복 탐사선 신호 은하 별자리 북극성 산소 연료 비행
  천왕성 해왕성 명왕성 인공위성 큐브위성 우주정거장 발사체 달착륙선 화성탐사차 탐사로봇 로버 우주왕복선 우주유영 도킹 오로라 추진기 공전 자전 행성 달기지 우주기지 우주여행 우주탐사 별빛 달빛 우주먼지 행성고리 달표면 화성표면 화성기지 달탐사 화성탐사 발사대 우주망원경 산소통 연료통 위성통신 우주신호 우주선조종 별관측 달착륙 우주사진 우주식량 우주통신 우주선창
`.trim().split(/\s+/);
const KILLS_PER_DIFFICULTY_STEP = 12;
const MAX_DIFFICULTY_STEPS = 14;
const MAX_HEALTH = 5;

const CHO = "ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ";
const JUNG = "ㅏㅐㅑㅒㅓㅔㅕㅖㅗㅘㅙㅚㅛㅜㅝㅞㅟㅠㅡㅢㅣ";
const JONG = " ㄱㄲㄳㄴㄵㄶㄷㄹㄺㄻㄼㄽㄾㄿㅀㅁㅂㅄㅅㅆㅇㅈㅊㅋㅌㅍㅎ";
const SPLIT_JAMO = {
  ㅘ: "ㅗㅏ",
  ㅙ: "ㅗㅐ",
  ㅚ: "ㅗㅣ",
  ㅝ: "ㅜㅓ",
  ㅞ: "ㅜㅔ",
  ㅟ: "ㅜㅣ",
  ㅢ: "ㅡㅣ",
  ㄳ: "ㄱㅅ",
  ㄵ: "ㄴㅈ",
  ㄶ: "ㄴㅎ",
  ㄺ: "ㄹㄱ",
  ㄻ: "ㄹㅁ",
  ㄼ: "ㄹㅂ",
  ㄽ: "ㄹㅅ",
  ㄾ: "ㄹㅌ",
  ㄿ: "ㄹㅍ",
  ㅀ: "ㄹㅎ",
  ㅄ: "ㅂㅅ",
};
const COLORS = {
  rock: "#7a7f9e",
  gold: "#d9a93a",
  ice: "#7fd0ff",
  bomb: "#c4455a",
};

let language = "ko";
let width;
let height;
let centerX;
let centerY;
let pixelRatio;
let mouseX = 0;
let mouseY = 0;
let state = "menu";
let game;
let bestScore = 0;
let previousFrame = 0;

try {
  bestScore = Number(localStorage.getItem("sd_best")) || 0;
} catch (error) {
  // Local storage may be unavailable in private or restricted contexts.
}

function resizeCanvas() {
  pixelRatio = Math.min(devicePixelRatio || 1, 2);
  width = canvas.clientWidth;
  height = canvas.clientHeight;
  canvas.width = width * pixelRatio;
  canvas.height = height * pixelRatio;
  ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
  centerX = width / 2;
  centerY = height / 2;
  mouseX = centerX;
  mouseY = centerY;
}

window.addEventListener("resize", resizeCanvas);

const stars = Array.from({ length: 130 }, () => ({
  x: Math.random(),
  y: Math.random(),
  z: Math.random() * 0.9 + 0.1,
  phase: Math.random() * 6,
}));

window.addEventListener("pointermove", (event) => {
  mouseX = event.clientX;
  mouseY = event.clientY;
});

function createGame() {
  game = {
    score: 0,
    scorePopups: [],
    combo: 0,
    hp: MAX_HEALTH,
    kills: 0,
    asteroids: [],
    particles: [],
    ghosts: [],
    target: null,
    typed: "",
    angle: -1.57,
    laser: null,
    shake: 0,
    miss: 0,
    freeze: 0,
    spawn: 0.5,
    maxCombo: 0,
  };
}

let countdownTimer = null;
let countdownRemaining = 0;
let pausedFromState = null;
let titleMusicWasPlaying = false;
let gameplayMusicWasPlaying = false;

function runCountdown() {
  countdownTimer = window.setInterval(() => {
    countdownRemaining--;
    if (countdownRemaining === 0) {
      window.clearInterval(countdownTimer);
      countdownTimer = null;
      $("countdown").style.display = "none";
      stopTitleMusic();
      state = "play";
      input.style.display = "block";
      $("pause").style.display = "block";
      updatePauseButton();
      clearInput();
      return;
    }
    $("countdown").textContent = String(countdownRemaining);
  }, 1000);
}

function startGame() {
  if (state === "menu") {
    playTitleMusic();
    fadeOutTitleMusic(3000);
  }
  playGameplayMusic(3000);
  createGame();
  state = "countdown";
  input.blur();
  input.style.display = "none";
  $("pause").style.display = "block";
  $("sound-toggle").style.display = "block";
  $("sound-toggle").style.zIndex = "3";
  $("sound-panel").hidden = true;
  $("sound-toggle").setAttribute("aria-expanded", "false");
  $("title-return").hidden = true;
  $("ov").style.display = "none";

  const countdown = $("countdown");
  countdownRemaining = 3;
  countdown.textContent = String(countdownRemaining);
  countdown.style.display = "grid";
  updatePauseButton();
  runCountdown();
}

function endGame() {
  state = "over";
  pausedFromState = null;
  stopGameplayMusic();
  playShipExplosionSound();
  window.clearInterval(countdownTimer);
  countdownTimer = null;
  $("countdown").style.display = "none";
  input.style.display = "none";
  $("pause").style.display = "none";
  $("sound-toggle").style.display = "none";
  $("sound-panel").hidden = true;
  $("sound-toggle").setAttribute("aria-expanded", "false");
  $("title-return").hidden = false;
  $("language-select").style.display = "";
  $("bonus-help").style.display = "";

  const isNewBest = game.score > bestScore;
  game.isNewBest = isNewBest;
  if (isNewBest) {
    bestScore = game.score;
    try {
      localStorage.setItem("sd_best", bestScore);
    } catch (error) {
      // Keep the current score even if it cannot be saved.
    }
  }

  $("ov").style.display = "flex";
  updateLanguageUI();
}

function returnToTitle() {
  state = "menu";
  pausedFromState = null;
  stopGameplayMusic();
  createGame();
  window.clearInterval(countdownTimer);
  countdownTimer = null;
  $("countdown").style.display = "none";
  input.blur();
  input.value = "";
  input.style.display = "none";
  $("pause").style.display = "none";
  $("sound-toggle").style.display = "none";
  $("sound-panel").hidden = true;
  $("sound-toggle").setAttribute("aria-expanded", "false");
  $("language-select").style.display = "";
  $("bonus-help").style.display = "";
  $("title-return").hidden = true;
  $("ov").style.display = "flex";
  playTitleMusic();
  updateLanguageUI();
}

function pauseGame() {
  if (state === "paused") {
    resumeGame();
    return;
  }
  if (state !== "play" && state !== "countdown") return;

  pausedFromState = state;
  titleMusicWasPlaying = !titleMusic.paused;
  gameplayMusicWasPlaying = !gameplayMusic.paused;
  if (state === "countdown") {
    window.clearInterval(countdownTimer);
    countdownTimer = null;
    $("countdown").style.display = "none";
  }
  window.clearInterval(titleMusicFadeTimer);
  titleMusicFadeTimer = null;
  window.clearInterval(gameplayMusicFadeTimer);
  gameplayMusicFadeTimer = null;
  titleMusic.pause();
  state = "paused";
  gameplayMusic.pause();
  input.blur();
  input.style.display = "none";
  $("pause").style.display = "block";
  $("pause").style.zIndex = "6";
  updatePauseButton();
  $("sound-toggle").style.display = "block";
  $("sound-toggle").style.zIndex = "6";
  $("language-select").style.display = "none";
  $("bonus-help").style.display = "none";
  $("ov").style.display = "flex";
  updateLanguageUI();
}

function resumeGame() {
  if (state !== "paused") return;

  const resumeState = pausedFromState;
  pausedFromState = null;
  $("ov").style.display = "none";
  $("language-select").style.display = "";
  $("bonus-help").style.display = "";
  $("pause").style.display = "block";
  $("pause").style.zIndex = "3";
  $("sound-toggle").style.display = "block";
  $("sound-toggle").style.zIndex = "3";
  $("sound-panel").hidden = true;
  $("sound-toggle").setAttribute("aria-expanded", "false");

  if (resumeState === "countdown") {
    state = "countdown";
    $("countdown").textContent = String(countdownRemaining);
    $("countdown").style.display = "grid";
    if (titleMusicWasPlaying) {
      titleMusic.play().then(updatePauseButton).catch(updatePauseButton);
      fadeOutTitleMusic(countdownRemaining * 1000);
    }
    if (gameplayMusicWasPlaying) {
      gameplayMusic.play().catch(() => {});
      fadeGameplayMusicToVolume(countdownRemaining * 1000);
    }
    input.style.display = "none";
    runCountdown();
  } else {
    state = "play";
    if (gameplayMusicWasPlaying) gameplayMusic.play().catch(() => {});
    input.style.display = "block";
    input.focus();
  }
  updatePauseButton();
}

const buttonClickSound = new Audio("assets/creatorshome-digital-click-357350.mp3");
const titleMusic = new Audio("assets/sergequadrado-cool-hip-hop-loop-275527.mp3");
const gameplayMusic = new Audio("assets/sergequadrado-be-more-serious-loop-275528.mp3");
const TITLE_MUSIC_VOLUME = 0.25;
const GAMEPLAY_MUSIC_VOLUME = 0.25;
let musicVolumeScale = 1;
let effectsVolumeScale = 1;
buttonClickSound.volume = effectsVolumeScale;
titleMusic.loop = true;
titleMusic.preload = "auto";
titleMusic.volume = TITLE_MUSIC_VOLUME * musicVolumeScale;
gameplayMusic.loop = true;
gameplayMusic.preload = "auto";
gameplayMusic.volume = 0;
let titleMusicFadeTimer = null;
let gameplayMusicFadeTimer = null;

function playTitleMusic() {
  window.clearInterval(titleMusicFadeTimer);
  titleMusicFadeTimer = null;
  titleMusic.volume = TITLE_MUSIC_VOLUME * musicVolumeScale;
  if (!titleMusic.paused) return;
  titleMusic.play().then(updatePauseButton).catch(updatePauseButton);
}

function fadeOutTitleMusic(duration) {
  window.clearInterval(titleMusicFadeTimer);
  if (titleMusic.paused) return;

  const startVolumeScale = musicVolumeScale > 0
    ? titleMusic.volume / (TITLE_MUSIC_VOLUME * musicVolumeScale)
    : 0;
  const startTime = performance.now();
  titleMusicFadeTimer = window.setInterval(() => {
    const progress = Math.min((performance.now() - startTime) / duration, 1);
    titleMusic.volume = TITLE_MUSIC_VOLUME * musicVolumeScale * startVolumeScale * (1 - progress);

    if (progress === 1) {
      window.clearInterval(titleMusicFadeTimer);
      titleMusicFadeTimer = null;
    }
  }, 50);
}

function stopTitleMusic() {
  titleMusic.pause();
  titleMusic.currentTime = 0;
  titleMusic.volume = TITLE_MUSIC_VOLUME * musicVolumeScale;
  window.clearInterval(titleMusicFadeTimer);
  titleMusicFadeTimer = null;
}

function updatePauseButton() {
  const button = $("pause");
  const isPaused = state === "paused";
  const label = language === "en"
    ? isPaused ? "Resume" : "Pause"
    : isPaused ? "계속하기" : "일시정지";

  button.textContent = isPaused ? "▶" : "Ⅱ";
  button.setAttribute("aria-label", label);
  button.title = label;
}

function updateLanguageUI() {
  const isEnglish = language === "en";
  document.documentElement.lang = language;
  $("game-title").textContent = isEnglish
    ? "🚀 Spaceship Typing Defense"
    : "🚀 우주선 타자 방어전";
  $("lk").textContent = isEnglish ? "한국어" : "한글";
  $("le").textContent = "English";
  input.placeholder = isEnglish ? "Type a word, then press Enter" : "단어 입력 후 Enter";
  $("bonus-help").textContent = isEnglish
    ? "🟡 Gold = 3x score · 🔵 Ice = slows all asteroids · 🔴 Bomb = chain explosion"
    : "🟡 금빛 = 3배 점수 · 🔵 얼음 = 전체 감속 · 🔴 폭탄 = 주변 연쇄 폭발";
  $("sound-panel").setAttribute("aria-label", isEnglish ? "Sound settings" : "사운드 설정");
  $("sound-panel-title").textContent = isEnglish ? "Sound" : "사운드";
  $("music-volume-label").textContent = isEnglish ? "Music" : "배경음";
  $("effects-volume-label").textContent = isEnglish ? "Sound effects" : "효과음";
  $("sound-toggle").setAttribute("aria-label", isEnglish ? "Sound settings" : "사운드 설정");
  $("sound-toggle").title = isEnglish ? "Sound settings" : "사운드 설정";

  if (state === "menu") {
    $("msg").innerHTML = isEnglish
      ? "Practice typing by destroying incoming asteroids."
      : "날아오는 소행성을 파괴하며 타자 연습을 해보세요.";
    $("go").textContent = isEnglish ? "Start (Enter)" : "시작 (Enter)";
    $("title-return").hidden = true;
    $("pause").style.display = "none";
    $("sound-toggle").style.display = "block";
    $("sound-toggle").style.zIndex = "6";
  } else if (state === "paused") {
    $("ov").querySelector("h1").textContent = isEnglish ? "Ⅱ Paused" : "Ⅱ 일시정지";
    $("msg").textContent = pausedFromState === "countdown"
      ? isEnglish ? "Countdown paused." : "카운트다운이 멈췄습니다."
      : isEnglish ? "Game paused." : "게임이 멈췄습니다.";
    $("go").textContent = isEnglish ? "Resume" : "계속하기";
    $("title-return").textContent = isEnglish ? "Back to Title" : "타이틀로 돌아가기";
    $("title-return").hidden = false;
  } else if (state === "over") {
    $("ov").querySelector("h1").textContent = isEnglish ? "💥 Ship destroyed!" : "💥 우주선 파괴!";
    $("msg").innerHTML = isEnglish
      ? `Score <b>${game.score}</b> · Best combo <b>${game.maxCombo}</b><br>${
        game.isNewBest ? "🎉 New high score!" : `High score ${bestScore}`
      }`
      : `점수 <b>${game.score}</b> · 최고 콤보 <b>${game.maxCombo}</b><br>${
        game.isNewBest ? "🎉 새 최고 기록!" : `최고 기록 ${bestScore}`
      }`;
    $("go").textContent = isEnglish ? "Try Again (Enter)" : "다시 도전 (Enter)";
    $("title-return").textContent = isEnglish ? "Back to Title" : "타이틀로 돌아가기";
    $("title-return").hidden = false;
  }

  updatePauseButton();
}

function playGameplayMusic(duration) {
  window.clearInterval(gameplayMusicFadeTimer);
  gameplayMusic.pause();
  gameplayMusic.currentTime = 0;
  gameplayMusic.volume = 0;
  gameplayMusic.play().catch(() => {});

  fadeGameplayMusicToVolume(duration);
}

function fadeGameplayMusicToVolume(duration) {
  window.clearInterval(gameplayMusicFadeTimer);
  const startVolume = gameplayMusic.volume;
  const startTime = performance.now();
  gameplayMusicFadeTimer = window.setInterval(() => {
    const progress = Math.min((performance.now() - startTime) / duration, 1);
    const startVolumeScale = musicVolumeScale > 0
      ? startVolume / (GAMEPLAY_MUSIC_VOLUME * musicVolumeScale)
      : 0;
    gameplayMusic.volume = GAMEPLAY_MUSIC_VOLUME * musicVolumeScale *
      (startVolumeScale * (1 - progress) + progress);

    if (progress === 1) {
      window.clearInterval(gameplayMusicFadeTimer);
      gameplayMusicFadeTimer = null;
    }
  }, 50);
}

function stopGameplayMusic() {
  window.clearInterval(gameplayMusicFadeTimer);
  gameplayMusicFadeTimer = null;
  gameplayMusic.pause();
  gameplayMusic.currentTime = 0;
  gameplayMusic.volume = 0;
}

const asteroidExplosionSoundPlayers = Array.from({ length: 3 }, () => {
  const audio = new Audio("assets/gearpile-explosion-3-386885.mp3");
  audio.preload = "auto";
  audio.volume = 0.45 * effectsVolumeScale;
  return audio;
});
const shipExplosionSound = new Audio("assets/freesound_community-medium-explosion-40472.mp3");
shipExplosionSound.preload = "auto";
shipExplosionSound.volume = 0.65 * effectsVolumeScale;
const collisionSoundPlayers = Array.from({ length: 5 }, () => {
  const audio = new Audio("assets/dragon-studio-car-crash-sound-376882.mp3");
  audio.preload = "auto";
  audio.volume = 0.6 * effectsVolumeScale;
  return audio;
});
let asteroidExplosionPlayerIndex = 0;
let collisionSoundPlayerIndex = 0;

function playAsteroidExplosionSound() {
  const audio = asteroidExplosionSoundPlayers[asteroidExplosionPlayerIndex];
  asteroidExplosionPlayerIndex = (asteroidExplosionPlayerIndex + 1) % asteroidExplosionSoundPlayers.length;
  audio.currentTime = 0;
  audio.play().catch(() => {});
}

function playShipExplosionSound() {
  shipExplosionSound.currentTime = 0;
  shipExplosionSound.play().catch(() => {});
}

function playCollisionSound() {
  const audio = collisionSoundPlayers[collisionSoundPlayerIndex];
  collisionSoundPlayerIndex = (collisionSoundPlayerIndex + 1) % collisionSoundPlayers.length;
  audio.currentTime = 0;
  audio.play().catch(() => {});
}

function playButtonClickSound() {
  buttonClickSound.currentTime = 0;
  buttonClickSound.play().catch(() => {});
  if (state === "menu") playTitleMusic();
}

const laserSound = new Audio("assets/freesound_community-laser-14792.mp3");
laserSound.preload = "auto";
laserSound.volume = 0.55 * effectsVolumeScale;
let laserSoundStopTimer = null;

function playLaserSound() {
  window.clearTimeout(laserSoundStopTimer);
  laserSound.pause();
  laserSound.currentTime = 0;
  laserSound.addEventListener("playing", () => {
    laserSoundStopTimer = window.setTimeout(() => laserSound.pause(), 500);
  }, { once: true });
  laserSound.play().catch(() => {});
}

const TYPING_SOUND_FILE = "assets/u_zxqwb3ytbg-typing-sound-effect-117679.mp3";
const TYPING_SOUND_CLIPS = [
  [0.74, 0.18],
  [0.98, 0.18],
  [1.22, 0.18],
  [1.46, 0.18],
  [1.86, 0.22],
  [2.18, 0.18],
  [2.42, 0.18],
  [2.64, 0.18],
  [2.9, 0.18],
];
const typingSoundPlayers = Array.from({ length: 3 }, () => {
  const audio = new Audio(TYPING_SOUND_FILE);
  audio.preload = "auto";
  audio.volume = 0.4 * effectsVolumeScale;
  return { audio, stopTimer: null };
});
let typingSoundClipIndex = 0;
let typingSoundPlayerIndex = 0;

function playTypingSound() {
  const [start, duration] = TYPING_SOUND_CLIPS[typingSoundClipIndex];
  const player = typingSoundPlayers[typingSoundPlayerIndex];
  const { audio } = player;

  typingSoundClipIndex = (typingSoundClipIndex + 1) % TYPING_SOUND_CLIPS.length;
  typingSoundPlayerIndex = (typingSoundPlayerIndex + 1) % typingSoundPlayers.length;

  window.clearTimeout(player.stopTimer);
  audio.pause();
  audio.currentTime = start;

  audio.addEventListener("playing", () => {
    player.stopTimer = window.setTimeout(() => audio.pause(), duration * 1000);
  }, { once: true });
  audio.play().catch(() => {});
}

function updateSoundControls() {
  const previousMusicVolumeScale = musicVolumeScale;
  musicVolumeScale = Number($("music-volume").value) / 100;
  effectsVolumeScale = Number($("effects-volume").value) / 100;
  $("music-volume-value").value = `${Math.round(musicVolumeScale * 100)}%`;
  $("effects-volume-value").value = `${Math.round(effectsVolumeScale * 100)}%`;

  buttonClickSound.volume = effectsVolumeScale;
  laserSound.volume = 0.55 * effectsVolumeScale;
  shipExplosionSound.volume = 0.65 * effectsVolumeScale;
  collisionSoundPlayers.forEach((audio) => {
    audio.volume = 0.6 * effectsVolumeScale;
  });
  asteroidExplosionSoundPlayers.forEach((audio) => {
    audio.volume = 0.45 * effectsVolumeScale;
  });
  typingSoundPlayers.forEach(({ audio }) => {
    audio.volume = 0.4 * effectsVolumeScale;
  });

  if (state === "menu") {
    titleMusic.volume = TITLE_MUSIC_VOLUME * musicVolumeScale;
    if (musicVolumeScale === 0) titleMusic.pause();
    else if (previousMusicVolumeScale === 0 && titleMusic.paused) playTitleMusic();
  } else if (state === "paused" && pausedFromState === "countdown") {
    const scale = previousMusicVolumeScale > 0
      ? musicVolumeScale / previousMusicVolumeScale
      : 0;
    if (titleMusicWasPlaying) titleMusic.volume *= scale;
    if (gameplayMusicWasPlaying) gameplayMusic.volume *= scale;
  } else if (state === "paused" && gameplayMusicWasPlaying) {
    gameplayMusic.volume = GAMEPLAY_MUSIC_VOLUME * musicVolumeScale;
  } else if (state === "play" && !gameplayMusicFadeTimer && !gameplayMusic.paused) {
    gameplayMusic.volume = GAMEPLAY_MUSIC_VOLUME * musicVolumeScale;
  }
}

$("music-volume").addEventListener("input", updateSoundControls);
$("effects-volume").addEventListener("input", updateSoundControls);
$("sound-toggle").addEventListener("click", () => {
  const panel = $("sound-panel");
  panel.hidden = !panel.hidden;
  $("sound-toggle").setAttribute("aria-expanded", String(!panel.hidden));
});
updateSoundControls();

["go", "lk", "le", "pause", "sound-toggle", "title-return"].forEach((id) => {
  $(id).addEventListener("click", playButtonClickSound);
});

$("go").addEventListener("click", () => {
  if (state === "paused") resumeGame();
  else if (state === "menu" || state === "over") startGame();
});
$("title-return").addEventListener("click", returnToTitle);
$("pause").addEventListener("click", pauseGame);
$("lk").addEventListener("click", () => {
  language = "ko";
  $("lk").className = "on";
  $("le").className = "";
  updateLanguageUI();
});
$("le").addEventListener("click", () => {
  language = "en";
  $("le").className = "on";
  $("lk").className = "";
  updateLanguageUI();
});

function splitHangul(word) {
  const sequence = [];
  const syllables = [];

  for (const character of word) {
    const code = character.charCodeAt(0) - 44032;
    const vowel = JUNG[(code % 588) / 28 | 0];
    const finalConsonant = JONG[code % 28];
    const jamo = [
      CHO[code / 588 | 0],
      ...(SPLIT_JAMO[vowel] || vowel),
      ...(code % 28 ? SPLIT_JAMO[finalConsonant] || finalConsonant : ""),
    ];

    sequence.push(...jamo);
    syllables.push({ character, length: jamo.length });
  }

  return { sequence, syllables };
}

function mapWord(word) {
  if (language === "ko") return splitHangul(word);

  return {
    sequence: [...word],
    syllables: [...word].map((character) => ({ character, length: 1 })),
  };
}

function spawnAsteroid() {
  const usedInitials = game.asteroids.map((asteroid) => asteroid.sequence[0]);
  const wordList = language === "ko" ? KOREAN_WORDS : ENGLISH_WORDS;
  let word;
  let mappedWord;

  for (let attempt = 0; attempt < 12; attempt++) {
    word = wordList[Math.random() * wordList.length | 0];
    mappedWord = mapWord(word);
    if (!usedInitials.includes(mappedWord.sequence[0])) break;
  }

  const roll = Math.random();
  const type = roll < 0.07 ? "gold" : roll < 0.13 ? "ice" : roll < 0.19 ? "bomb" : "rock";
  const direction = Math.random() * 6.283;
  const distance = Math.hypot(width, height) / 2 + 60;
  const difficultyStep = Math.min(
    game.kills / KILLS_PER_DIFFICULTY_STEP,
    MAX_DIFFICULTY_STEPS,
  );

  game.asteroids.push({
    x: centerX + Math.cos(direction) * distance,
    y: centerY + Math.sin(direction) * distance,
    word,
    sequence: mappedWord.sequence,
    syllables: mappedWord.syllables,
    type,
    radius: 24 + word.length * (language === "ko" ? 9 : 4.5),
    speed: 60 + (1 + difficultyStep) * 12 + Math.random() * 20,
    rotation: 0,
    rotationSpeed: (Math.random() - 0.5) * 1.5,
    points: Array.from({ length: 10 }, (_, index) => [
      (index / 10) * 6.283,
      0.8 + Math.random() * 0.3,
    ]),
  });
}

function createExplosion(x, y, type) {
  const color = type === "hit" ? "#ff6b8a" : COLORS[type] || "#cfd3ff";

  for (let index = 0; index < 18; index++) {
    const angle = Math.random() * 6.283;
    const speed = 40 + Math.random() * 180;
    game.particles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 1,
      color,
    });
  }
}

function destroyAsteroid(asteroid, chained = false) {
  if (!chained) playAsteroidExplosionSound();

  if (game.target === asteroid) {
    game.target = null;
    game.typed = "";
  }

  game.asteroids = game.asteroids.filter((item) => item !== asteroid);
  game.combo++;
  game.maxCombo = Math.max(game.maxCombo, game.combo);
  const points = Math.round(
    asteroid.word.length * (language === "ko" ? 15 : 10) * (1 + game.combo * 0.1) *
      (asteroid.type === "gold" ? 3 : 1),
  );
  game.score += points;
  game.scorePopups.push({
    text: `+${points}`,
    x: asteroid.x,
    y: asteroid.y,
    life: 1,
    color: asteroid.type === "gold" ? "#ffd166" : "#6ef3ff",
  });
  game.kills++;
  createExplosion(asteroid.x, asteroid.y, asteroid.type);

  if (asteroid.type === "ice") game.freeze = 4;
  if (asteroid.type === "bomb" && !chained) {
    game.asteroids
      .filter((item) => Math.hypot(item.x - asteroid.x, item.y - asteroid.y) < 240)
      .forEach((item) => destroyAsteroid(item, true));
  }
}

function asteroidHitsShip(asteroid) {
  playCollisionSound();
  game.asteroids = game.asteroids.filter((item) => item !== asteroid);
  if (game.target === asteroid) {
    game.target = null;
    game.typed = "";
  }

  game.hp--;
  game.combo = 0;
  game.shake = 18;
  createExplosion(asteroid.x, asteroid.y, "hit");
  if (game.hp <= 0) endGame();
}

function registerMiss() {
  game.combo = 0;
  game.shake = 8;
  game.miss = 0.3;
}

window.addEventListener("keydown", (event) => {
  if (event.key !== "Enter") return;
  if (state === "menu" || state === "over") startGame();
  else if (state === "paused") resumeGame();
});

function decomposeInput(text) {
  const result = [];

  for (const character of text) {
    const code = character.charCodeAt(0) - 44032;
    if (code >= 0 && code < 11172) result.push(...splitHangul(character).sequence);
    else if (SPLIT_JAMO[character]) result.push(...SPLIT_JAMO[character]);
    else result.push(character.toLowerCase());
  }

  return result;
}

let previousInputLength = 0;

function syncInput() {
  const value = input.value;
  const typedSequence = decomposeInput(value);

  if (value && value.length > previousInputLength) {
    playTypingSound();
    const size = Math.min(width, height) * 0.8;
    game.ghosts.push({
      character: value[value.length - 1],
      x: Math.random() * width,
      y: Math.random() * height,
      hue: Math.random() * 360,
      size,
      life: 1,
    });
  }
  previousInputLength = value.length;

  if (!typedSequence.length) {
    game.target = null;
    game.typed = "";
    game.bad = false;
    input.classList.remove("bad");
    return;
  }

  const candidates = game.asteroids.filter(
    (asteroid) =>
      typedSequence.length <= asteroid.sequence.length &&
      typedSequence.every((character, index) => character === asteroid.sequence[index]),
  );

  if (candidates.length) {
    if (!candidates.includes(game.target)) {
      game.target = candidates.sort(
        (first, second) =>
          Math.hypot(first.x - centerX, first.y - centerY) -
          Math.hypot(second.x - centerX, second.y - centerY),
      )[0];
    }
    game.typed = typedSequence.join("");
    game.bad = false;
    input.classList.remove("bad");
  } else {
    game.target = null;
    game.typed = "";
    if (!game.bad) registerMiss();
    game.bad = true;
    input.classList.add("bad");
  }
}

function clearInput() {
  input.blur();
  input.value = "";
  previousInputLength = 0;
  input.focus();
  syncInput();
}

input.addEventListener("input", () => {
  if (state === "play") syncInput();
});
input.addEventListener("keydown", (event) => {
  if (event.key !== "Enter" || state !== "play") return;
  event.preventDefault();

  const value = input.value.trim();
  const asteroid = game.asteroids
    .filter((item) => item.word === value)
    .sort(
      (first, second) =>
        Math.hypot(first.x - centerX, first.y - centerY) -
        Math.hypot(second.x - centerX, second.y - centerY),
    )[0];

  if (asteroid) {
    playLaserSound();
    game.laser = { x: asteroid.x, y: asteroid.y, life: 0.15 };
    destroyAsteroid(asteroid);
  } else if (value) {
    registerMiss();
  }

  clearInput();
});
input.addEventListener("blur", () => {
  if (state === "play") setTimeout(() => input.focus(), 0);
});
window.addEventListener("pointerdown", () => {
  if (state === "play") input.focus();
});

function updateGame(deltaTime) {
  if (state === "paused" || state === "countdown") return;

  for (const ghost of game.ghosts) {
    ghost.life -= deltaTime * 1.6;
    ghost.size *= 1 + deltaTime * 0.5;
  }
  game.ghosts = game.ghosts.filter((ghost) => ghost.life > 0);

  for (const particle of game.particles) {
    particle.x += particle.vx * deltaTime;
    particle.y += particle.vy * deltaTime;
    particle.life -= deltaTime * 1.4;
  }
  game.particles = game.particles.filter((particle) => particle.life > 0);

  for (const popup of game.scorePopups) {
    popup.y -= 38 * deltaTime;
    popup.life -= deltaTime * 1.25;
  }
  game.scorePopups = game.scorePopups.filter((popup) => popup.life > 0);

  if (game.laser) {
    game.laser.life -= deltaTime;
    if (game.laser.life <= 0) game.laser = null;
  }

  game.shake *= 0.9;
  game.miss = Math.max(0, game.miss - deltaTime);
  const aim = game.target
    ? Math.atan2(game.target.y - centerY, game.target.x - centerX)
    : Math.atan2(mouseY - centerY, mouseX - centerX);
  let angleDifference = aim - game.angle;
  angleDifference = Math.atan2(Math.sin(angleDifference), Math.cos(angleDifference));
  game.angle += angleDifference * Math.min(1, deltaTime * 10);

  if (state !== "play") return;

  game.freeze = Math.max(0, game.freeze - deltaTime);
  game.spawn -= deltaTime;
  if (game.spawn <= 0) {
    spawnAsteroid();
    const difficultyStep = Math.min(
      game.kills / KILLS_PER_DIFFICULTY_STEP,
      MAX_DIFFICULTY_STEPS,
    );
    game.spawn = Math.max(0.55, 2 - (1 + difficultyStep) * 0.15);
  }

  const speedScale = game.freeze > 0 ? 0.25 : 1;
  for (const asteroid of [...game.asteroids]) {
    const dx = centerX - asteroid.x;
    const dy = centerY - asteroid.y;
    const distance = Math.hypot(dx, dy);
    asteroid.x += (dx / distance) * asteroid.speed * speedScale * deltaTime;
    asteroid.y += (dy / distance) * asteroid.speed * speedScale * deltaTime;
    asteroid.rotation += asteroid.rotationSpeed * deltaTime;
    if (distance < 30 + asteroid.radius * 0.5) asteroidHitsShip(asteroid);
  }
}

function drawAsteroid(asteroid) {
  ctx.save();
  ctx.translate(asteroid.x, asteroid.y);
  ctx.rotate(asteroid.rotation);
  ctx.beginPath();
  asteroid.points.forEach(([angle, scale], index) => {
    const x = Math.cos(angle) * asteroid.radius * scale;
    const y = Math.sin(angle) * asteroid.radius * scale;
    if (index) ctx.lineTo(x, y);
    else ctx.moveTo(x, y);
  });
  ctx.closePath();
  ctx.fillStyle = COLORS[asteroid.type];
  ctx.fill();
  ctx.strokeStyle = "rgb(255 255 255 / 35%)";
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.fillStyle = "rgb(0 0 0 / 20%)";
  ctx.beginPath();
  ctx.arc(-asteroid.radius * 0.3, -asteroid.radius * 0.2, asteroid.radius * 0.18, 0, 6.3);
  ctx.arc(asteroid.radius * 0.35, asteroid.radius * 0.25, asteroid.radius * 0.12, 0, 6.3);
  ctx.fill();
  ctx.restore();

  if (asteroid === game.target) {
    ctx.strokeStyle = "#6ef3ff";
    ctx.setLineDash([6, 6]);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(asteroid.x, asteroid.y, asteroid.radius + 10, 0, 6.3);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  drawAsteroidWord(asteroid);
}

function drawAsteroidWord(asteroid) {
  ctx.font = 'bold 19px "Apple SD Gothic Neo", "Malgun Gothic", ui-monospace, Menlo, Consolas, monospace';
  const typedLength = asteroid === game.target ? game.typed.length : 0;
  const wordWidth = ctx.measureText(asteroid.word).width;
  let completedJamo = 0;
  let completedSyllables = 0;

  for (const syllable of asteroid.syllables) {
    if (completedJamo + syllable.length <= typedLength) {
      completedJamo += syllable.length;
      completedSyllables++;
    } else {
      break;
    }
  }

  const completedText = asteroid.word.slice(0, completedSyllables);
  const remainingText = asteroid.word.slice(completedSyllables);
  let x = asteroid.x - wordWidth / 2;
  ctx.textAlign = "left";
  ctx.shadowColor = "#000";
  ctx.shadowBlur = 4;
  ctx.fillStyle = "#6ef3ff";
  ctx.fillText(completedText, x, asteroid.y);
  x += ctx.measureText(completedText).width;
  ctx.fillStyle = "#fff";
  ctx.fillText(remainingText, x, asteroid.y);
  ctx.shadowBlur = 0;
  ctx.textAlign = "center";
}

function drawShip() {
  ctx.save();
  ctx.translate(centerX, centerY);
  ctx.rotate(game.angle);
  ctx.fillStyle = `rgba(255, ${150 + (Math.random() * 80 | 0)}, 60, 0.9)`;
  ctx.beginPath();
  ctx.moveTo(-16, -5);
  ctx.lineTo(-28 - Math.random() * 8, 0);
  ctx.lineTo(-16, 5);
  ctx.fill();

  ctx.fillStyle = "#dfe6ff";
  ctx.beginPath();
  ctx.moveTo(30, 0);
  ctx.lineTo(-14, -18);
  ctx.lineTo(-8, 0);
  ctx.lineTo(-14, 18);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = "#6ef3ff";
  ctx.beginPath();
  ctx.arc(6, 0, 5, 0, 6.3);
  ctx.fill();
  ctx.restore();

  ctx.strokeStyle = `rgba(110, 243, 255, ${0.15 + game.hp * 0.07})`;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(centerX, centerY, 40, 0, 6.3);
  ctx.stroke();
}

function drawInputBubble(time) {
  const text = input.value;
  if (!text) return;

  ctx.font = 'bold 22px "Apple SD Gothic Neo", "Malgun Gothic", ui-monospace, Menlo, Consolas, monospace';
  const bubbleWidth = ctx.measureText(text).width + 28;
  const bubbleY = centerY - 130;
  ctx.save();
  ctx.translate(centerX, bubbleY + 16);
  if (game.miss) ctx.rotate(Math.sin(time * 60) * 0.1);
  ctx.fillStyle = "#fff";
  ctx.beginPath();
  ctx.roundRect(-bubbleWidth / 2, -16, bubbleWidth, 32, 16);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(-6, 15);
  ctx.lineTo(0, 26);
  ctx.lineTo(6, 15);
  ctx.fill();
  ctx.fillStyle = game.miss ? "#e33" : "#10204a";
  ctx.fillText(text, 0, 1);
  ctx.restore();
}

function drawScorePopups() {
  for (const popup of game.scorePopups) {
    ctx.save();
    ctx.globalAlpha = popup.life;
    ctx.font = "bold 26px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = popup.color;
    ctx.shadowColor = popup.color;
    ctx.shadowBlur = 12;
    ctx.fillText(popup.text, popup.x, popup.y);
    ctx.restore();
  }
}

function drawHud() {
  const comboLevel = Math.min(game.combo, 20);
  ctx.textAlign = "left";
  ctx.fillStyle = "#e8ecff";
  ctx.font = "bold 22px system-ui, sans-serif";
  ctx.fillText(`SCORE ${game.score}`, 18, 34);
  ctx.font = "16px system-ui, sans-serif";
  ctx.globalAlpha = 0.8;
  ctx.fillText(`BEST ${bestScore}`, 18, 58);
  ctx.globalAlpha = 1;

  if (game.combo > 1) {
    ctx.fillStyle = `hsl(${200 + comboLevel * 8}, 90%, 70%)`;
    ctx.font = `bold ${22 + comboLevel}px system-ui, sans-serif`;
    ctx.fillText(`${game.combo} COMBO`, 18, 92);
  }

  ctx.textAlign = "right";
  const healthRight = centerX + 52;
  for (let index = 0; index < 5; index++) {
    ctx.fillStyle = index < game.hp ? "#6ef3ff" : "rgb(255 255 255 / 15%)";
    ctx.fillRect(healthRight - (5 - index) * 20, centerY - 72, 16, 8);
  }
}

function draw() {
  const time = performance.now() / 1000;
  const comboLevel = Math.min(game.combo, 20);
  ctx.globalAlpha = 1;
  ctx.fillStyle = "#070b1f";
  ctx.fillRect(0, 0, width, height);

  if (comboLevel) {
    const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, Math.max(width, height) * 0.7);
    gradient.addColorStop(0, `hsla(${200 + comboLevel * 8}, 90%, 55%, ${comboLevel * 0.012})`);
    gradient.addColorStop(1, `hsla(${200 + comboLevel * 8}, 90%, 55%, 0)`);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
  }

  const offsetX = (mouseX - centerX) * 0.03;
  const offsetY = (mouseY - centerY) * 0.03;
  ctx.fillStyle = "#fff";
  for (const star of stars) {
    const x = ((star.x * width - offsetX * star.z * 3) % width + width) % width;
    const y = ((star.y * height - offsetY * star.z * 3) % height + height) % height;
    ctx.globalAlpha = 0.4 + 0.4 * Math.sin(time * 2 + star.phase);
    ctx.fillRect(x, y, star.z * 2, star.z * 2);
  }

  ctx.save();
  if (game.shake > 0.5) {
    ctx.translate((Math.random() - 0.5) * game.shake, (Math.random() - 0.5) * game.shake);
  }
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  for (const ghost of game.ghosts) {
    ctx.globalAlpha = ghost.life * 0.18;
    ctx.fillStyle = `hsl(${ghost.hue}, 80%, 70%)`;
    ctx.font = `900 ${ghost.size}px sans-serif`;
    ctx.fillText(ghost.character.toUpperCase(), ghost.x, ghost.y);
  }
  ctx.globalAlpha = 1;

  for (const asteroid of game.asteroids) drawAsteroid(asteroid);

  if (game.laser) {
    ctx.globalAlpha = game.laser.life / 0.15;
    ctx.strokeStyle = `hsl(${180 + comboLevel * 8}, 100%, 70%)`;
    ctx.lineWidth = 3 + Math.min(comboLevel, 12) * 0.7;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(centerX + Math.cos(game.angle) * 30, centerY + Math.sin(game.angle) * 30);
    ctx.lineTo(game.laser.x, game.laser.y);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  drawShip();
  for (const particle of game.particles) {
    ctx.globalAlpha = Math.max(0, particle.life);
    ctx.fillStyle = particle.color;
    ctx.fillRect(particle.x - 2, particle.y - 2, 4, 4);
  }
  ctx.globalAlpha = 1;
  drawScorePopups();
  drawInputBubble(time);
  ctx.restore();

  drawHud();
  if (game.freeze > 0) {
    ctx.fillStyle = "rgb(127 208 255 / 12%)";
    ctx.fillRect(0, 0, width, height);
  }
}

function gameLoop(timestamp) {
  const deltaTime = Math.min(0.05, (timestamp - previousFrame) / 1000 || 0);
  previousFrame = timestamp;
  updateGame(deltaTime);
  draw();
  requestAnimationFrame(gameLoop);
}

createGame();
resizeCanvas();
updateLanguageUI();
requestAnimationFrame(gameLoop);
playTitleMusic();