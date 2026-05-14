// Game logic for game.html

const audioContext = new (window.AudioContext || window.webkitAudioContext)();
let gainNode;

const colors = ['green', 'red', 'yellow', 'blue'];
const specialColors = ['green', 'red', 'yellow', 'blue', 'orange', 'purple'];
const colorFrequencies = {
    green: 392,
    red: 329.63,
    yellow: 261.63,
    blue: 220,
    orange: 294.66,
    purple: 369.99
};

const difficultySettings = {
    easy: { showTime: 800, pauseTime: 400, timerBase: 8, colors: 4 },
    normal: { showTime: 500, pauseTime: 250, timerBase: 6, colors: 4 },
    hard: { showTime: 300, pauseTime: 150, timerBase: 4, colors: 4 },
    special: { showTime: 600, pauseTime: 200, timerBase: 5, colors: 6 }
};

// Read settings from localStorage (set by launcher)
const settings = JSON.parse(localStorage.getItem('simonGameSettings') || '{}');

const state = {
    sequence: [],
    playerSequence: [],
    isPlaying: false,
    isPlayerTurn: false,
    score: 0,
    difficulty: settings.difficulty || 'normal',
    currentScheme: settings.scheme || 'classic',
    timerEnabled: settings.timerEnabled || false,
    timerValue: 5,
    timerInterval: null,
    sequenceTimeout: null,
    isMuted: settings.isMuted || false,
    rotation: 0,
    gameStarted: false,
};

function initAudio() {
    if (audioContext.state === 'suspended') audioContext.resume();
    if (!gainNode) {
        gainNode = audioContext.createGain();
        gainNode.connect(audioContext.destination);
    }
    gainNode.gain.value = (settings.volume || 70) / 100;
}

function playTone(frequency, duration) {
    if (state.isMuted) return;
    try {
        if (audioContext.state === 'suspended') audioContext.resume();
        const oscillator = audioContext.createOscillator();
        const gain = audioContext.createGain();
        oscillator.type = 'sine';
        oscillator.frequency.value = frequency;
        oscillator.connect(gain);
        gain.connect(gainNode);
        gain.gain.setValueAtTime(0.8, audioContext.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + (duration || 200) / 1000);
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + (duration || 200) / 1000);
    } catch (e) {}
}

function applyScheme(scheme) {
    state.currentScheme = scheme;
    const simon = document.getElementById('simon');
    simon.classList.remove('classic', 'neon', 'pastel');
    document.body.classList.remove('neon-bg', 'pastel-bg');
    if (scheme !== 'classic') {
        simon.classList.add(scheme);
        document.body.classList.add(scheme + '-bg');
    }
}

function resetGame() {
    state.sequence = [];
    state.playerSequence = [];
    state.score = 0;
    state.rotation = 0;
    state.timerValue = difficultySettings[state.difficulty].timerBase;
    clearInterval(state.timerInterval);
    clearTimeout(state.sequenceTimeout);
    document.getElementById('timer-display').style.display = state.timerEnabled ? 'block' : 'none';
    document.getElementById('special-keys').style.display = state.difficulty === 'special' ? 'inline' : 'none';
    document.getElementById('timer-value').textContent = state.timerValue;
    const simon = document.getElementById('simon');
    simon.classList.remove('six-colors');
    simon.style.transform = 'rotate(0deg)';
    if (state.difficulty === 'special') {
        simon.classList.add('six-colors');
        document.getElementById('sequence-display').style.color = '#bb86fc';
    } else {
        document.getElementById('sequence-display').style.color = '#e94560';
    }
    updateSequenceDisplay();
    updateStatus('Press Start to begin');
    state.gameStarted = false;
    updateSessionStorage();
}

function updateSequenceDisplay() {
    document.getElementById('sequence-number').textContent = state.sequence.length || 1;
}

function updateStatus(text) {
    document.getElementById('game-status').textContent = text;
}

function startTimer() {
    if (!state.timerEnabled) return;
    clearInterval(state.timerInterval);
    const base = difficultySettings[state.difficulty].timerBase;
    state.timerValue = base + Math.floor(state.sequence.length / 2);
    document.getElementById('timer-value').textContent = state.timerValue;
    state.timerInterval = setInterval(() => {
        state.timerValue--;
        document.getElementById('timer-value').textContent = state.timerValue;
        document.getElementById('timer-value').style.color = state.timerValue <= 5 ? '#ff4444' : '#ffcc00';
        if (state.timerValue <= 0) {
            clearInterval(state.timerInterval);
            gameOver();
        }
    }, 1000);
}

function playSequence() {
    state.isPlaying = true;
    state.isPlayerTurn = false;
    const colorSet = state.difficulty === 'special' ? specialColors : colors;
    state.sequence.push(colorSet[Math.floor(Math.random() * colorSet.length)]);
    updateSequenceDisplay();
    updateStatus('Watch the sequence...');
    clearInterval(state.timerInterval);
    clearTimeout(state.sequenceTimeout);
    updateSessionStorage();

    const settings_d = difficultySettings[state.difficulty];
    let delay = 500;

    if (state.difficulty === 'special' && state.sequence.length % 5 === 0) {
        state.rotation = (state.rotation + (Math.random() < 0.5 ? 90 : -90)) % 360;
        document.getElementById('simon').style.transform = 'rotate(' + state.rotation + 'deg)';
        document.getElementById('simon').style.transition = 'transform 0.5s ease-out';
    }

    let totalSegmentTime = 0;
    state.sequence.forEach((color) => {
        let showTime = settings_d.showTime;
        let pauseTime = settings_d.pauseTime;
        if (state.difficulty === 'special') {
            showTime = 150 + Math.random() * 600;
            pauseTime = 100 + Math.random() * 300;
        }
        setTimeout(() => {
            showColor(color, showTime);
        }, delay + totalSegmentTime);
        totalSegmentTime += showTime + pauseTime;
    });

    state.sequenceTimeout = setTimeout(() => {
        if (!state.isPlaying) return;
        state.isPlaying = false;
        state.isPlayerTurn = true;
        state.playerSequence = [];
        updateStatus('Your turn!');
        startTimer();
    }, delay + totalSegmentTime);
}

function showColor(color, customTime) {
    const segment = document.querySelector('.simon-segment.' + color);
    if (!segment) return;
    segment.classList.add('active');
    playTone(colorFrequencies[color], 200);
    const displayTime = customTime || difficultySettings[state.difficulty].showTime;
    setTimeout(() => {
        segment.classList.remove('active');
    }, displayTime);
}

function handleColorClick(color) {
    if (!state.isPlayerTurn || state.isPlaying) return;
    if (state.difficulty !== 'special' && (color === 'orange' || color === 'purple')) return;
    showColor(color);
    state.playerSequence.push(color);
    const currentIndex = state.playerSequence.length - 1;
    if (state.playerSequence[currentIndex] !== state.sequence[currentIndex]) {
        gameOver();
        return;
    }
    if (state.playerSequence.length === state.sequence.length) {
        state.isPlayerTurn = false;
        state.score++;
        clearInterval(state.timerInterval);
        updateStatus('Correct!');
        updateSessionStorage();
        setTimeout(() => {
            playSequence();
        }, 800);
    }
}

function saveScore() {
    const name = settings.playerName || 'Anonymous';
    updateHighScore();
    const lb = JSON.parse(localStorage.getItem('simonLeaderboard') || '{"easy":[],"normal":[],"hard":[],"special":[]}');
    let board = lb[state.difficulty] || [];
    const existing = board.find(e => e.name === name);
    if (existing) {
        if (state.score > existing.score) {
            existing.score = state.score;
            existing.date = new Date().toLocaleDateString();
        }
    } else {
        board.push({ name, score: state.score, date: new Date().toLocaleDateString() });
    }
    board.sort((a, b) => b.score - a.score);
    board = board.slice(0, 10);
    lb[state.difficulty] = board;
    localStorage.setItem('simonLeaderboard', JSON.stringify(lb));
}

function updateHighScore() {
    const cookieScore = getCookie('simonBestScore');
    const currentHigh = cookieScore ? parseInt(cookieScore) : 0;
    if (state.score > currentHigh) {
        setCookie('simonBestScore', String(state.score), 365);
        localStorage.setItem('simonHighScore', String(state.score));
    }
}

function setCookie(name, value, days) {
    const d = new Date();
    d.setTime(d.getTime() + days * 24 * 60 * 60 * 1000);
    document.cookie = name + "=" + encodeURIComponent(value) + ";expires=" + d.toUTCString() + ";path=/";
}

function getCookie(name) {
    const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
    return match ? decodeURIComponent(match[2]) : null;
}

function updateSessionStorage() {
    sessionStorage.setItem('simonGameState', JSON.stringify({
        sequence: state.sequence,
        score: state.score,
        difficulty: state.difficulty,
        rotation: state.rotation
    }));
}

function gameOver() {
    clearInterval(state.timerInterval);
    clearTimeout(state.sequenceTimeout);
    state.isPlayerTurn = false;
    state.isPlaying = false;
    updateStatus('Wrong!');
    saveScore();
    sessionStorage.removeItem('simonGameState');
    document.getElementById('game-area').style.display = 'none';
    setTimeout(() => {
        document.getElementById('death-message').textContent = 'Game Over';
        document.getElementById('final-score').textContent = (settings.playerName || 'Player') + ' reached sequence ' + (state.score + 1) + ' on ' + state.difficulty;
        document.getElementById('game-over').style.display = 'flex';
    }, 500);
}

// --- Event Listeners ---

document.querySelectorAll('.simon-segment').forEach(segment => {
    segment.addEventListener('click', () => {
        if (!state.isPlayerTurn || state.isPlaying) return;
        handleColorClick(segment.dataset.color);
    });
});

// Keyboard support
document.addEventListener('keydown', (e) => {
    if (state.isPlayerTurn && !state.isPlaying) {
        const keyMap = { '1': 'green', '2': 'red', '3': 'yellow', '4': 'blue', '5': 'orange', '6': 'purple' };
        const color = keyMap[e.key];
        if (color) {
            e.preventDefault();
            handleColorClick(color);
        }
    }
});

// Audio context resume
document.addEventListener('click', () => {
    if (audioContext.state === 'suspended') audioContext.resume();
}, { once: true });

// Start button
document.getElementById('game-start-btn').addEventListener('click', () => {
    if (!state.gameStarted) {
        state.gameStarted = true;
        initAudio();
        applyScheme(state.currentScheme);
        resetGame();
        playSequence();
    }
});

// Reset button
document.getElementById('game-reset-btn').addEventListener('click', () => {
    if (confirm('Reset the current game?')) {
        clearTimeout(state.sequenceTimeout);
        clearInterval(state.timerInterval);
        state.gameStarted = false;
        resetGame();
    }
});

// Back to Settings (from game area)
document.getElementById('back-btn').addEventListener('click', () => {
    window.close();
});

// Back to Settings (from game over)
document.getElementById('back-menu-btn').addEventListener('click', () => {
    window.close();
});

// Initialize game display
resetGame();
