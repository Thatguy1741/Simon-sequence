const audioContext = new (window.AudioContext || window.webkitAudioContext)();
let gainNode;

const game = {
    sequence: [],
    playerSequence: [],
    isPlaying: false,
    isPlayerTurn: false,
    score: 0,
    difficulty: 'normal',
    currentScheme: 'classic',
    highScore: 0,
    leaderboard: { easy: [], normal: [], hard: [] },
    timerEnabled: false,
    timerValue: 5,
    timerInterval: null,
    isMuted: false,
};

const difficultySettings = {
    easy: { showTime: 800, pauseTime: 400, timerBase: 8 },
    normal: { showTime: 500, pauseTime: 250, timerBase: 6 },
    hard: { showTime: 300, pauseTime: 150, timerBase: 4 }
};

const colors = ['green', 'red', 'yellow', 'blue'];
const colorFrequencies = {
    green: 392,
    red: 329.63,
    yellow: 261.63,
    blue: 220
};

function initAudio() {
    if (audioContext.state === 'suspended') {
        audioContext.resume();
    }
    if (!gainNode) {
        gainNode = audioContext.createGain();
        gainNode.connect(audioContext.destination);
    }
    gainNode.gain.value = document.getElementById('volume-slider').value / 100;
}

function playTone(frequency, duration = 200) {
    if (game.isMuted) return;
    try {
        if (audioContext.state === 'suspended') {
            audioContext.resume();
        }
        const oscillator = audioContext.createOscillator();
        const gain = audioContext.createGain();
        oscillator.type = 'sine';
        oscillator.frequency.value = frequency;
        oscillator.connect(gain);
        gain.connect(gainNode);
        gain.gain.setValueAtTime(0.8, audioContext.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration / 1000);
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + duration / 1000);
    } catch (e) {
        console.log('Audio error:', e);
    }
}

// Load saved data
function loadData() {
    const lb = localStorage.getItem('simonLeaderboard');
    if (lb) game.leaderboard = JSON.parse(lb);
    
    // Clean existing duplicates
    Object.keys(game.leaderboard).forEach(diff => {
        const seen = {};
        game.leaderboard[diff] = game.leaderboard[diff].filter(entry => {
            if (seen[entry.name]) {
                if (entry.score > seen[entry.name].score) {
                    seen[entry.name] = entry;
                    return true;
                }
                return false;
            }
            seen[entry.name] = entry;
            return true;
        });
    });
    localStorage.setItem('simonLeaderboard', JSON.stringify(game.leaderboard));
    
    const hs = localStorage.getItem('simonHighScore');
    if (hs) game.highScore = parseInt(hs);
    document.getElementById('high-score-value').textContent = game.highScore;
    const name = localStorage.getItem('simonPlayerName');
    if (name) document.getElementById('player-name').value = name;
}
loadData();

function saveScore() {
    const name = document.getElementById('player-name').value.trim() || 'Anonymous';
    
    localStorage.setItem('simonPlayerName', name);
    if (game.score > game.highScore) {
        game.highScore = game.score;
        localStorage.setItem('simonHighScore', String(game.score));
        document.getElementById('high-score-value').textContent = game.score;
    }
    
    const existing = game.leaderboard[game.difficulty].find(e => e.name === name);
    if (existing) {
        if (game.score > existing.score) {
            existing.score = game.score;
            existing.date = new Date().toLocaleDateString();
        }
    } else {
        game.leaderboard[game.difficulty].push({ name, score: game.score, date: new Date().toLocaleDateString() });
    }
    
    game.leaderboard[game.difficulty].sort((a, b) => b.score - a.score);
    game.leaderboard[game.difficulty] = game.leaderboard[game.difficulty].slice(0, 10);
    localStorage.setItem('simonLeaderboard', JSON.stringify(game.leaderboard));
}

function applyScheme(scheme) {
    game.currentScheme = scheme;
    const simon = document.getElementById('simon');
    simon.classList.remove('classic', 'neon', 'pastel');
    document.body.classList.remove('neon-bg', 'pastel-bg');
    if (scheme !== 'classic') {
        simon.classList.add(scheme);
        document.body.classList.add(scheme + '-bg');
    }
}

// Password protection
game.passwordProtected = JSON.parse(localStorage.getItem('simonPasswords') || '{}');
game.passwordVerified = {};

document.getElementById('lock-btn').addEventListener('click', () => {
    const section = document.getElementById('password-section');
    section.style.display = section.style.display === 'none' ? 'flex' : 'none';
});

document.getElementById('save-password').addEventListener('click', () => {
    const name = document.getElementById('player-name').value.trim();
    const pass = document.getElementById('password-input').value.trim();
    if (!name) { alert('Enter a name first'); return; }
    if (pass.length < 3) { alert('Password must be at least 3 characters'); return; }
    game.passwordProtected[name] = pass;
    localStorage.setItem('simonPasswords', JSON.stringify(game.passwordProtected));
    document.getElementById('lock-btn').textContent = '🔒';
    document.getElementById('password-section').style.display = 'none';
    document.getElementById('password-input').value = '';
    alert('Password saved for ' + name);
});

// Load name and check if it has a password
function checkPassword(name) {
    if (game.passwordProtected[name]) {
        document.getElementById('lock-btn').textContent = '🔒';
    } else {
        document.getElementById('lock-btn').textContent = '🔓';
    }
}
document.getElementById('player-name').addEventListener('input', (e) => {
    checkPassword(e.target.value);
});
checkPassword(document.getElementById('player-name').value);

// Change 1: Name input and leaderboard
document.getElementById('leaderboard-btn').addEventListener('click', showLeaderboard);
document.getElementById('close-leaderboard').addEventListener('click', () => {
    document.getElementById('leaderboard-modal').style.display = 'none';
});

function showLeaderboard(diff) {
    const modal = document.getElementById('leaderboard-modal');
    modal.style.display = 'flex';
    showLeaderboardTab(diff || game.difficulty);
}

function showLeaderboardTab(diff) {
    const entries = document.getElementById('leaderboard-entries');
    let scores = game.leaderboard[diff] || [];
    
    // Deduplicate: keep only highest score per name
    const seen = {};
    scores = scores.filter(entry => {
        if (seen[entry.name]) {
            if (entry.score > seen[entry.name]) {
                seen[entry.name] = entry.score;
                return true;
            }
            return false;
        }
        seen[entry.name] = entry.score;
        return true;
    });
    scores.sort((a, b) => b.score - a.score);
    scores = scores.slice(0, 10);
    
    entries.innerHTML = '<div class="leaderboard-entry"><span>Player</span><span>Score</span></div>';
    if (scores.length === 0) {
        entries.innerHTML = '<p style="color:#666;padding:20px;">No scores yet</p>';
        return;
    }
    scores.forEach((entry, i) => {
        entries.innerHTML += `<div class="leaderboard-entry"><span>${i+1}. ${entry.name}</span><span>${entry.score}</span></div>`;
    });
}
// End Change 1

document.querySelectorAll('.lb-tab').forEach(tab => {
    tab.addEventListener('click', () => showLeaderboardTab(tab.dataset.lbDifficulty));
});

// Change 2: Volume and mute
document.getElementById('volume-slider').addEventListener('input', (e) => {
    const vol = e.target.value;
    document.getElementById('volume-label').textContent = vol + '%';
    if (gainNode) gainNode.gain.value = vol / 100;
});

document.getElementById('mute-btn').addEventListener('click', () => {
    game.isMuted = !game.isMuted;
    document.getElementById('mute-btn').textContent = game.isMuted ? '🔇' : '🔊';
    if (gainNode) gainNode.gain.value = game.isMuted ? 0 : document.getElementById('volume-slider').value / 100;
});
// End Change 2

// Change 3: Color schemes
document.querySelectorAll('.scheme-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        applyScheme(btn.dataset.scheme);
        document.querySelectorAll('.scheme-btn').forEach(b => b.style.borderColor = '#0f3460');
        btn.style.borderColor = '#e94560';
    });
});
// End Change 3

// Change 4: Timer mode
document.getElementById('timer-toggle').addEventListener('change', (e) => {
    game.timerEnabled = e.target.checked;
    document.getElementById('toggle-label').textContent = game.timerEnabled ? 'Timer: ON' : 'Timer Mode';
});

// Change 5: Timer mode (checkbox toggle above)
// Change 6: Keyboard support
document.addEventListener('keydown', (e) => {
    if (game.isPlayerTurn && !game.isPlaying) {
        const keyMap = { '1': 'green', '2': 'red', '3': 'yellow', '4': 'blue' };
        const color = keyMap[e.key];
        if (color) {
            e.preventDefault();
            handleColorClick(color);
        }
    }
    if (e.key === 'Enter' || e.key === ' ') {
        if (document.getElementById('menu').style.display !== 'none') {
            e.preventDefault();
            startGame();
        }
    }
});
// End Change 6

document.querySelectorAll('.difficulty-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        game.difficulty = btn.dataset.difficulty;
        startGame();
    });
});

document.getElementById('start-btn').addEventListener('click', startGame);

document.getElementById('restart-btn').addEventListener('click', () => {
    document.getElementById('game-over').style.display = 'none';
    document.getElementById('game-area').style.display = 'flex';
    resetGame();
    playSequence();
});

document.getElementById('menu-btn').addEventListener('click', showMenu);

document.addEventListener('click', () => {
    if (audioContext.state === 'suspended') {
        audioContext.resume();
    }
}, { once: true });

function startGame() {
    const name = document.getElementById('player-name').value.trim();
    if (!name) {
        document.getElementById('player-name').value = 'Anonymous';
    }
    
    // Check if name requires password
    const playerName = document.getElementById('player-name').value.trim();
    if (game.passwordProtected[playerName]) {
        const entered = prompt('This name is private. Enter password for ' + playerName + ':');
        if (entered !== game.passwordProtected[playerName]) {
            alert('Wrong password!');
            return;
        }
        game.passwordVerified[playerName] = true;
    }
    
    initAudio();
    document.getElementById('menu').style.display = 'none';
    document.getElementById('game-area').style.display = 'flex';
    resetGame();
    playSequence();
}

function resetGame() {
    game.sequence = [];
    game.playerSequence = [];
    game.score = 0;
    game.timerValue = difficultySettings[game.difficulty].timerBase;
    clearInterval(game.timerInterval);
    document.getElementById('timer-display').style.display = game.timerEnabled ? 'block' : 'none';
    document.getElementById('timer-value').textContent = game.timerValue;
    updateSequenceDisplay();
    updateStatus('Watch the sequence...');
}

function updateSequenceDisplay() {
    document.getElementById('sequence-number').textContent = game.sequence.length || 1;
}

function updateStatus(text) {
    document.getElementById('game-status').textContent = text;
}

function startTimer() {
    if (!game.timerEnabled) return;
    clearInterval(game.timerInterval);
    const base = difficultySettings[game.difficulty].timerBase;
    game.timerValue = base + Math.floor(game.sequence.length / 2);
    document.getElementById('timer-value').textContent = game.timerValue;
    game.timerInterval = setInterval(() => {
        game.timerValue--;
        document.getElementById('timer-value').textContent = game.timerValue;
        if (game.timerValue <= 5) {
            document.getElementById('timer-value').style.color = '#ff4444';
        } else {
            document.getElementById('timer-value').style.color = '#ffcc00';
        }
        if (game.timerValue <= 0) {
            clearInterval(game.timerInterval);
            gameOver();
        }
    }, 1000);
}

function playSequence() {
    game.isPlaying = true;
    game.isPlayerTurn = false;
    game.sequence.push(colors[Math.floor(Math.random() * colors.length)]);
    updateSequenceDisplay();
    updateStatus('Watch the sequence...');
    clearInterval(game.timerInterval);

    const settings = difficultySettings[game.difficulty];
    let delay = 500;

    game.sequence.forEach((color, index) => {
        setTimeout(() => {
            showColor(color);
        }, delay + index * (settings.showTime + settings.pauseTime));
    });

    setTimeout(() => {
        game.isPlaying = false;
        game.isPlayerTurn = true;
        game.playerSequence = [];
        updateStatus('Your turn!');
        startTimer();
    }, delay + game.sequence.length * (settings.showTime + settings.pauseTime));
}

function showColor(color) {
    const segment = document.querySelector(`.simon-segment.${color}`);
    segment.classList.add('active');
    playTone(colorFrequencies[color], 200);
    setTimeout(() => {
        segment.classList.remove('active');
    }, difficultySettings[game.difficulty].showTime);
}

document.querySelectorAll('.simon-segment').forEach(segment => {
    segment.addEventListener('click', () => {
        if (!game.isPlayerTurn || game.isPlaying) return;
        handleColorClick(segment.dataset.color);
    });
});

function handleColorClick(color) {
    if (!game.isPlayerTurn || game.isPlaying) return;
    showColor(color);
    game.playerSequence.push(color);

    const currentIndex = game.playerSequence.length - 1;

    if (game.playerSequence[currentIndex] !== game.sequence[currentIndex]) {
        gameOver();
        return;
    }

    if (game.playerSequence.length === game.sequence.length) {
        game.isPlayerTurn = false;
        game.score++;
        clearInterval(game.timerInterval);
        updateStatus('Correct!');
        setTimeout(() => {
            playSequence();
        }, 800);
    }
}

function gameOver() {
    clearInterval(game.timerInterval);
    game.isPlayerTurn = false;
    game.isPlaying = false;
    updateStatus('Wrong!');
    saveScore();
    document.getElementById('game-area').style.display = 'none';
    setTimeout(() => {
        document.getElementById('death-message').textContent = 'Game Over';
        document.getElementById('final-score').textContent = `${document.getElementById('player-name').value.trim()} reached sequence ${game.score + 1} on ${game.difficulty}`;
        document.getElementById('game-over').style.display = 'block';
    }, 500);
}

function showMenu() {
    document.getElementById('game-area').style.display = 'none';
    document.getElementById('game-over').style.display = 'none';
    document.getElementById('menu').style.display = 'block';
    clearInterval(game.timerInterval);
    applyScheme('classic');
    document.querySelectorAll('.scheme-btn')[0].style.borderColor = '#e94560';
    document.querySelectorAll('.scheme-btn').forEach((b, i) => { if (i > 0) b.style.borderColor = '#0f3460'; });
}
