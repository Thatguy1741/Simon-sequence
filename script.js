const audioContext = new (window.AudioContext || window.webkitAudioContext)();
let gainNode;

const game = {
    sequence: [],
    playerSequence: [],
    isPlaying: false,
    isPlayerTurn: false,
    score: 0,
    difficulty: 'normal',
    highScore: parseInt(localStorage.getItem('simonHighScore') || '0')
};

const difficultySettings = {
    easy: { showTime: 800, pauseTime: 400 },
    normal: { showTime: 500, pauseTime: 250 },
    hard: { showTime: 300, pauseTime: 150 }
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
    
    gainNode = audioContext.createGain();
    gainNode.connect(audioContext.destination);
    gainNode.gain.value = 0.5;
}

function playTone(frequency, duration = 200) {
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

document.getElementById('high-score-value').textContent = game.highScore;

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
    updateSequenceDisplay();
    updateStatus('Watch the sequence...');
}

function updateSequenceDisplay() {
    document.getElementById('sequence-number').textContent = game.sequence.length || 1;
}

function updateStatus(text) {
    document.getElementById('game-status').textContent = text;
}

function playSequence() {
    game.isPlaying = true;
    game.isPlayerTurn = false;
    game.sequence.push(colors[Math.floor(Math.random() * colors.length)]);
    
    updateSequenceDisplay();
    updateStatus('Watch the sequence...');
    
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
        updateStatus('Your turn! Repeat the sequence');
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
        
        const color = segment.dataset.color;
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
            
            if (game.score > game.highScore) {
                game.highScore = game.score;
                localStorage.setItem('simonHighScore', game.highScore);
                document.getElementById('high-score-value').textContent = game.highScore;
            }
            
            updateStatus('Correct! Next sequence...');
            
            setTimeout(() => {
                playSequence();
            }, 800);
        }
    });
});

function gameOver() {
    updateStatus('Wrong!');
    
    document.getElementById('game-area').style.display = 'none';
    
    setTimeout(() => {
        document.getElementById('death-message').textContent = 'Game Over';
        document.getElementById('final-score').textContent = `You reached sequence ${game.score + 1}`;
        document.getElementById('game-over').style.display = 'block';
    }, 500);
}

function showMenu() {
    document.getElementById('game-area').style.display = 'none';
    document.getElementById('game-over').style.display = 'none';
    document.getElementById('menu').style.display = 'block';
}
