const audioPlayer = document.getElementById("audioPlayer");
const trackTitle = document.getElementById("trackTitle");
const trackArtist = document.getElementById("trackArtist");
const trackIndex = document.getElementById("trackIndex");
const playlistElement = document.getElementById("playlist");
const playButton = document.getElementById("playButton");
const playIcon = document.getElementById("playIcon");
const prevButton = document.getElementById("prevButton");
const nextButton = document.getElementById("nextButton");
const progressBar = document.getElementById("progressBar");
const progressFill = document.getElementById("progressFill");
const progressGlow = document.getElementById("progressGlow");
const currentTimeLabel = document.getElementById("currentTime");
const durationLabel = document.getElementById("duration");
const statusText = document.getElementById("statusText");
const visualizerBars = document.getElementById("visualizerBars");
const visualizerSegments = Array.from(visualizerBars.querySelectorAll("span"));
const volumeSlider = document.getElementById("volumeSlider");
const volumeValue = document.getElementById("volumeValue");
const loveLetterButton = document.getElementById("loveLetterButton");
const loveLetterModal = document.getElementById("loveLetterModal");
const loveLetterBackdrop = document.getElementById("loveLetterBackdrop");
const loveLetterClose = document.getElementById("loveLetterClose");
const lyricBurstLeft = document.getElementById("lyricBurstLeft");
const lyricBurstRight = document.getElementById("lyricBurstRight");
const playerWindow = document.querySelector(".player-window");
const letterBurstLayer = document.getElementById("letterBurstLayer");

const playlist = [
  { title: "Manchild", artist: "Sabrina Carpenter", src: "Sabrina Carpenter - Manchild (Official Lyric Video) [GTLdJ-CM7TQ].webm", duration: "0:00" },
  { title: "Tears", artist: "Sabrina Carpenter", src: "Sabrina Carpenter - Tears (Official Video) [V9vuCByb6js].mp4", duration: "0:00" },
  { title: "My Man on Willpower", artist: "Sabrina Carpenter", src: "Sabrina Carpenter - My Man on Willpower (Official Lyric Video) [KbzNB2sRnVQ].webm", duration: "0:00" },
  { title: "Sugar Talking", artist: "Sabrina Carpenter", src: "Sabrina Carpenter - Sugar Talking (Official Lyric Video) [FTfZOoIkY6Y].webm", duration: "0:00" },
  { title: "We Almost Broke Up Again Last Night", artist: "Sabrina Carpenter", src: "Sabrina Carpenter - We Almost Broke Up Again Last Night (Official Lyric Video) [v-iMcsxhp-g].webm", duration: "0:00" },
  { title: "Nobody's Son", artist: "Sabrina Carpenter", src: "Sabrina Carpenter - Nobody’s Son (Official Lyric Video) [hE2DLtuxcUU].webm", duration: "0:00" },
  { title: "Never Getting Laid", artist: "Sabrina Carpenter", src: "Sabrina Carpenter - Never Getting Laid (Official Lyric Video) [mljWcXuCoH4].webm", duration: "0:00" },
  { title: "When Did You Get Hot?", artist: "Sabrina Carpenter", src: "Sabrina Carpenter - When Did You Get Hot？ (Official Lyric Video) [bnhV-OBnGCE].webm", duration: "0:00" },
  { title: "Go Go Juice", artist: "Sabrina Carpenter", src: "Sabrina Carpenter - Go Go Juice (Official Lyric Video) [uCNr2iCgSPs].webm", duration: "0:00" },
  { title: "Don't Worry I'll Make You Worry", artist: "Sabrina Carpenter", src: "Sabrina Carpenter - Don't Worry I'll Make You Worry (Official Lyric Video) [soKG9DDv3_A].webm", duration: "0:00" },
  { title: "House Tour", artist: "Sabrina Carpenter", src: "Sabrina Carpenter - House Tour (Official Lyric Video) [lwxAovpSLh8].webm", duration: "0:00" },
  { title: "Goodbye", artist: "Sabrina Carpenter", src: "Sabrina Carpenter - Goodbye (Official Lyric Video) [uV-w3fyWTuM].webm", duration: "0:00" },
];

const timedLyrics = {
  Manchild: [
    { time: 41, text: "INMADUROOO" },
    { time: 65, text: "INMADUROOO" },
    { time: 96, text: "INMADUROOO" },
    { time: 120, text: "INMADUROOO" },
    { time: 141, text: "EY HOMBRE" },
    { time: 156, text: "EY HOMBRE" },
    { time: 159, text: "INMADUROOO" },
    { time: 188, text: "EY HOMBRE" },
  ],
  Goodbye: [
    { time: 39, text: "HACETE KULIAAA" },
    { time: 55, text: "HACETE KULIAAA" },
    { time: 115, text: "HACETE KULIAAA" },
    { time: 131, text: "HACETE KULIAAA" },
    { time: 178, text: "HACETE KULIAAA" },
    { time: 194, text: "HACETE KULIAAA" },
  ],
};

let currentTrackIndex = 0;
let isSeeking = false;
let visualizerTick = 0;
let visualizerRequestId = null;
let audioContext = null;
let analyserNode = null;
let sourceNode = null;
let frequencyData = null;
let capturedStream = null;
let silentFrameCount = 0;
let lyricHideTimeout = null;
let shownLyricTimes = new Set();
let previousPlaybackTime = 0;
let glowTimeout = null;

function setVolume(value) {
  const normalizedValue = Math.min(Math.max(Number(value), 0), 1);
  audioPlayer.volume = normalizedValue;
  volumeSlider.value = String(normalizedValue);
  volumeValue.textContent = String(Math.round(normalizedValue * 100));
}

function formatTime(timeInSeconds) {
  if (!Number.isFinite(timeInSeconds) || timeInSeconds < 0) {
    return "0:00";
  }

  const minutes = Math.floor(timeInSeconds / 60);
  const seconds = Math.floor(timeInSeconds % 60);
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

function setStatus(message) {
  statusText.textContent = message;
}

function hideTimedLyric() {
  lyricBurstLeft.classList.remove("is-visible");
  lyricBurstRight.classList.remove("is-visible");
}

function showTimedLyric(text) {
  lyricBurstLeft.textContent = text;
  lyricBurstRight.textContent = text;
  lyricBurstLeft.classList.add("is-visible");
  lyricBurstRight.classList.add("is-visible");
  triggerWordGlow();

  if (lyricHideTimeout) {
    window.clearTimeout(lyricHideTimeout);
  }

  lyricHideTimeout = window.setTimeout(() => {
    hideTimedLyric();
  }, 2000);
}

function triggerWordGlow() {
  if (!playerWindow) {
    return;
  }

  playerWindow.classList.add("word-glow");

  if (glowTimeout) {
    window.clearTimeout(glowTimeout);
  }

  glowTimeout = window.setTimeout(() => {
    playerWindow.classList.remove("word-glow");
  }, 1100);
}

function resetTimedLyrics() {
  shownLyricTimes = new Set();
  previousPlaybackTime = 0;
  if (lyricHideTimeout) {
    window.clearTimeout(lyricHideTimeout);
    lyricHideTimeout = null;
  }
  hideTimedLyric();
}

function updateTimedLyrics() {
  const track = playlist[currentTrackIndex];
  const cues = timedLyrics[track.title];

  if (!cues || audioPlayer.paused) {
    return;
  }

  const currentTime = audioPlayer.currentTime || 0;

  if (currentTime + 0.35 < previousPlaybackTime) {
    shownLyricTimes = new Set(
      [...shownLyricTimes].filter((cueKey) => {
        const cueTime = Number(cueKey.split("-").pop());
        return cueTime < currentTime;
      })
    );
  }

  cues.forEach((cue) => {
    const cueKey = `${track.title}-${cue.time}`;
    if (!shownLyricTimes.has(cueKey) && currentTime >= cue.time && currentTime < cue.time + 0.35) {
      shownLyricTimes.add(cueKey);
      showTimedLyric(cue.text);
    }
  });

  previousPlaybackTime = currentTime;
}

function openLoveLetter() {
  loveLetterModal.hidden = false;
  launchLetterBurst();
}

function closeLoveLetter() {
  loveLetterModal.hidden = true;
}

function launchLetterBurst() {
  if (!letterBurstLayer) {
    return;
  }

  letterBurstLayer.innerHTML = "";
  const glyphs = [
    { text: "♡", className: "heart" },
    { text: "✦", className: "star" },
    { text: "✧", className: "sparkle" },
    { text: "♡", className: "heart" },
    { text: "✦", className: "star" },
    { text: "✧", className: "sparkle" },
    { text: "♡", className: "heart" },
    { text: "✦", className: "star" },
    { text: "✧", className: "sparkle" },
    { text: "♡", className: "heart" },
    { text: "✦", className: "star" },
    { text: "✧", className: "sparkle" },
  ];

  glyphs.forEach((glyph, index) => {
    const piece = document.createElement("span");
    const angle = (Math.PI * 2 * index) / glyphs.length;
    const distance = 88 + (index % 4) * 24;

    piece.className = `letter-burst ${glyph.className}`;
    piece.textContent = glyph.text;
    piece.style.setProperty("--burst-x", "50%");
    piece.style.setProperty("--burst-y", "50%");
    piece.style.setProperty("--drift-x", `${Math.cos(angle) * distance}px`);
    piece.style.setProperty("--drift-y", `${Math.sin(angle) * distance}px`);
    piece.style.setProperty("--burst-delay", `${index * 26}ms`);
    letterBurstLayer.appendChild(piece);
  });

  window.setTimeout(() => {
    letterBurstLayer.innerHTML = "";
  }, 1300);
}

function setAlbumMedia() {
  audioPlayer.removeAttribute("poster");
}

function paintVisualizer(level = 0.08, phase = 0) {
  visualizerSegments.forEach((segment, index) => {
    const waveA = Math.sin(phase * 2.8 + index * 0.78);
    const waveB = Math.cos(phase * 1.6 + index * 0.43);
    const pulse = (waveA + waveB + 2) / 4;
    const minHeight = 14;
    const maxHeight = 72;
    const height = minHeight + pulse * (16 + level * (maxHeight - 16));
    segment.style.height = `${height}px`;
  });
}

function setupAudioAnalysis() {
  if (analyserNode) {
    return true;
  }

  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) {
    return false;
  }

  audioContext = new AudioContextClass();
  analyserNode = audioContext.createAnalyser();
  analyserNode.fftSize = 64;
  analyserNode.smoothingTimeConstant = 0.82;
  frequencyData = new Uint8Array(analyserNode.frequencyBinCount);

  const captureStream = audioPlayer.captureStream?.() || audioPlayer.mozCaptureStream?.();
  if (!captureStream) {
    return false;
  }

  capturedStream = captureStream;
  sourceNode = audioContext.createMediaStreamSource(capturedStream);
  sourceNode.connect(analyserNode);
  return true;
}

async function ensureAudioAnalysisReady() {
  const isReady = setupAudioAnalysis();
  if (!isReady || !audioContext) {
    return false;
  }

  if (audioContext.state === "suspended") {
    await audioContext.resume();
  }

  return true;
}

function stopVisualizer() {
  if (visualizerRequestId !== null) {
    window.cancelAnimationFrame(visualizerRequestId);
    visualizerRequestId = null;
  }
}

function animateVisualizer() {
  if (audioPlayer.paused || audioPlayer.ended) {
    stopVisualizer();
    paintVisualizer(0.08, 0);
    return;
  }

  let hasRealSignal = false;

  if (analyserNode && frequencyData) {
    analyserNode.getByteFrequencyData(frequencyData);
    let totalEnergy = 0;

    visualizerSegments.forEach((segment, index) => {
      const bucketSize = Math.max(1, Math.floor(frequencyData.length / visualizerSegments.length));
      const start = index * bucketSize;
      const end = Math.min(frequencyData.length, start + bucketSize);
      let total = 0;

      for (let cursor = start; cursor < end; cursor += 1) {
        total += frequencyData[cursor];
      }

      const average = end > start ? total / (end - start) : 0;
      totalEnergy += average;
      const normalized = average / 255;
      const minHeight = 14;
      const maxHeight = 96;
      const boosted = Math.pow(normalized, 0.85);
      const height = minHeight + boosted * (maxHeight - minHeight);
      segment.style.height = `${height}px`;
    });

    hasRealSignal = totalEnergy / visualizerSegments.length > 4;
  } else {
    silentFrameCount += 1;
  }

  if (hasRealSignal) {
    silentFrameCount = 0;
  } else {
    silentFrameCount += 1;
  }

  if (!hasRealSignal && silentFrameCount > 6) {
    const duration = audioPlayer.duration || 1;
    const progress = audioPlayer.currentTime / duration;
    const level = 0.18 + Math.abs(Math.sin(audioPlayer.currentTime * 2.2)) * 0.28;
    paintVisualizer(level, progress * Math.PI * 14 + visualizerTick * 0.04);
  }

  visualizerTick += 1;
  visualizerRequestId = window.requestAnimationFrame(animateVisualizer);
}

function updateProgress() {
  const duration = audioPlayer.duration || 0;
  const currentTime = audioPlayer.currentTime || 0;
  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  progressFill.style.width = `${progress}%`;
  progressGlow.style.width = `${Math.min(progress + 12, 100)}%`;
  progressBar.setAttribute("aria-valuenow", String(Math.round(progress)));
  currentTimeLabel.textContent = formatTime(currentTime);
  durationLabel.textContent = duration > 0 ? formatTime(duration) : playlist[currentTrackIndex].duration;
  updateTimedLyrics();
}

function updatePlayButton() {
  const isPlaying = !audioPlayer.paused && !audioPlayer.ended;
  playIcon.innerHTML = isPlaying ? "&#10074;&#10074;" : "&#9654;";
  visualizerBars.classList.toggle("is-playing", isPlaying);
}

function renderPlaylist() {
  playlistElement.innerHTML = "";

  playlist.forEach((track, index) => {
    const item = document.createElement("li");
    const button = document.createElement("button");
    const title = document.createElement("span");

    button.type = "button";
    button.className = "playlist-item";
    if (index === currentTrackIndex) {
      button.classList.add("active");
    }

    title.className = "playlist-title";
    title.textContent = `${String(index + 1).padStart(2, "0")}. ${track.title}`;
    button.append(title);
    button.addEventListener("click", () => loadTrack(index, true));

    item.appendChild(button);
    playlistElement.appendChild(item);
  });
}

function updateTrackMeta() {
  const track = playlist[currentTrackIndex];
  trackTitle.textContent = track.title;
  trackArtist.textContent = track.artist;
  setAlbumMedia();
  trackIndex.textContent = `${String(currentTrackIndex + 1).padStart(2, "0")} / ${String(playlist.length).padStart(2, "0")}`;
  durationLabel.textContent = track.duration;
  renderPlaylist();
}

async function loadTrack(index, autoplay = false) {
  currentTrackIndex = (index + playlist.length) % playlist.length;
  const track = playlist[currentTrackIndex];

  stopVisualizer();
  resetTimedLyrics();
  audioPlayer.src = track.src;
  audioPlayer.load();
  currentTimeLabel.textContent = "0:00";
  progressFill.style.width = "0%";
  progressGlow.style.width = "0%";
  progressBar.setAttribute("aria-valuenow", "0");
  paintVisualizer(0.08, 0);
  updateTrackMeta();

  if (autoplay) {
    try {
      await ensureAudioAnalysisReady();
    } catch {
      // Keep playback working even if the analyser cannot start.
    }

    audioPlayer.play()
      .then(() => setStatus(`Reproduciendo ${track.title} de ${track.artist}.`))
      .catch(() => {
        setStatus("No se pudo reproducir el video. Verificá que el archivo exista en la carpeta principal.");
        updatePlayButton();
      });
  } else {
    setStatus("Player listo. Elegí una canción y se reproduce su video en el cuadro principal.");
  }

  updatePlayButton();
}

async function togglePlayback() {
  if (!audioPlayer.src) {
    loadTrack(currentTrackIndex, true);
    return;
  }

  if (audioPlayer.paused) {
    try {
      await ensureAudioAnalysisReady();
    } catch {
      // Keep playback working even if the analyser cannot start.
    }

    audioPlayer.play()
      .then(() => {
        const track = playlist[currentTrackIndex];
        setStatus(`Reproduciendo ${track.title} de ${track.artist}.`);
      })
      .catch(() => {
        setStatus("No se pudo iniciar la reproducción del video. Revisá que el archivo esté disponible.");
      })
      .finally(updatePlayButton);
  } else {
    audioPlayer.pause();
    setStatus("Pausado. El brillo sigue, la pista descansa.");
    updatePlayButton();
  }
}

function playNextTrack() {
  loadTrack(currentTrackIndex + 1, true);
}

function playPreviousTrack() {
  loadTrack(currentTrackIndex - 1, true);
}

function seekTo(clientX) {
  const rect = progressBar.getBoundingClientRect();
  const ratio = Math.min(Math.max((clientX - rect.left) / rect.width, 0), 1);
  if (audioPlayer.duration) {
    audioPlayer.currentTime = audioPlayer.duration * ratio;
  }
}

progressBar.addEventListener("click", (event) => seekTo(event.clientX));

progressBar.addEventListener("keydown", (event) => {
  const step = audioPlayer.duration ? Math.max(audioPlayer.duration / 20, 5) : 5;

  if (event.key === "ArrowRight") {
    event.preventDefault();
    audioPlayer.currentTime = Math.min((audioPlayer.currentTime || 0) + step, audioPlayer.duration || step);
  }

  if (event.key === "ArrowLeft") {
    event.preventDefault();
    audioPlayer.currentTime = Math.max((audioPlayer.currentTime || 0) - step, 0);
  }
});

progressBar.addEventListener("pointerdown", (event) => {
  isSeeking = true;
  seekTo(event.clientX);
});

window.addEventListener("pointermove", (event) => {
  if (isSeeking) {
    seekTo(event.clientX);
  }
});

window.addEventListener("pointerup", () => {
  isSeeking = false;
});

playButton.addEventListener("click", togglePlayback);
prevButton.addEventListener("click", playPreviousTrack);
nextButton.addEventListener("click", playNextTrack);
volumeSlider.addEventListener("input", (event) => {
  setVolume(event.target.value);
});
loveLetterButton.addEventListener("click", openLoveLetter);
loveLetterBackdrop.addEventListener("click", closeLoveLetter);
loveLetterClose.addEventListener("click", closeLoveLetter);
window.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !loveLetterModal.hidden) {
    closeLoveLetter();
  }
});

audioPlayer.addEventListener("timeupdate", updateProgress);
audioPlayer.addEventListener("loadedmetadata", updateProgress);
audioPlayer.addEventListener("ended", playNextTrack);
audioPlayer.addEventListener("play", async () => {
  try {
    await ensureAudioAnalysisReady();
  } catch {
    // If captureStream analysis is unavailable, fallback animation still runs.
  }

  updatePlayButton();
  stopVisualizer();
  animateVisualizer();
});
audioPlayer.addEventListener("pause", () => {
  updatePlayButton();
  stopVisualizer();
  silentFrameCount = 0;
  paintVisualizer(0.08, 0);
  hideTimedLyric();
});
audioPlayer.addEventListener("error", () => {
  setStatus("No encontré el archivo de video en esa ruta. Si querés, después los movemos a una carpeta `videos/`.");
  updatePlayButton();
  stopVisualizer();
  silentFrameCount = 0;
  paintVisualizer(0.08, 0);
  resetTimedLyrics();
});

setVolume(volumeSlider.value);
paintVisualizer(0.08, 0);
loadTrack(currentTrackIndex);
