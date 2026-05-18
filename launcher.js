// Launcher settings and data management
// JavaScript for the launcher page (index.html)

// Object to track game settings and high-level state
const game = {
    difficulty: 'normal',
    currentScheme: 'classic',
    highScore: 0,
    leaderboard: { easy: [], normal: [], hard: [], special: [] },
    timerEnabled: false,
    isMuted: false,
};

// Change 1: Cookie storage for persistent player data
// Previously only localStorage was used. Cookies now store player name
// and best score across browser sessions with expiration.
/* Old approach used:
   localStorage.setItem('simonPlayerName', name);
   localStorage.getItem('simonHighScore');
*/
// Replaced with cookie-based storage plus localStorage fallback
function setCookie(name, value, days) {
    const d = new Date();
    d.setTime(d.getTime() + days * 24 * 60 * 60 * 1000);
    document.cookie = name + "=" + encodeURIComponent(value) + ";expires=" + d.toUTCString() + ";path=/";
}

function getCookie(name) {
    const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
    return match ? decodeURIComponent(match[2]) : null;
}
// End Change 1

// Load saved leaderboard data from localStorage and player name from cookies
function loadData() {
    const lb = localStorage.getItem('simonLeaderboard');
    if (lb) {
        const parsed = JSON.parse(lb);
        game.leaderboard = { easy: [], normal: [], hard: [], special: [] };
        Object.keys(parsed).forEach(key => {
            if (game.leaderboard[key] !== undefined) {
                game.leaderboard[key] = parsed[key];
            }
        });
    }
    // Deduplicate leaderboard entries across all difficulties
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

    // Load player name and best score from cookies
    const cookieName = getCookie('simonPlayerName');
    const cookieScore = getCookie('simonBestScore');
    if (cookieName) document.getElementById('player-name').value = cookieName;
    if (cookieScore) {
        game.highScore = parseInt(cookieScore);
        document.getElementById('high-score-value').textContent = game.highScore;
    } else {
        const hs = localStorage.getItem('simonHighScore');
        if (hs) {
            game.highScore = parseInt(hs);
            document.getElementById('high-score-value').textContent = game.highScore;
        }
    }
}
loadData();

// Save settings to cookies and localStorage
function saveSettings() {
    const name = document.getElementById('player-name').value.trim() || 'Anonymous';
    setCookie('simonPlayerName', name, 365);
    setCookie('simonBestScore', String(game.highScore), 365);
    const diff = document.getElementById('difficulty-select').value;
    const scheme = document.querySelector('input[name="scheme"]:checked').value;
    const timer = document.getElementById('timer-toggle').checked;
    const vol = document.getElementById('volume-slider').value;
    const muted = game.isMuted;
    localStorage.setItem('simonSettings', JSON.stringify({ diff, scheme, timer, vol, muted }));
    alert('Settings saved!');
}

// Load settings from localStorage
function loadSettings() {
    const saved = localStorage.getItem('simonSettings');
    if (!saved) { alert('No saved settings found.'); return; }
    const s = JSON.parse(saved);
    document.getElementById('difficulty-select').value = s.diff || 'normal';
    const radio = document.querySelector('input[name="scheme"][value="' + (s.scheme || 'classic') + '"]');
    if (radio) radio.checked = true;
    document.getElementById('timer-toggle').checked = s.timer || false;
    document.getElementById('toggle-label').textContent = s.timer ? 'Timer: ON' : 'Timer Mode';
    document.getElementById('volume-slider').value = s.vol || 70;
    document.getElementById('volume-label').textContent = (s.vol || 70) + '%';
    game.isMuted = s.muted || false;
    document.getElementById('mute-btn').textContent = game.isMuted ? '🔇' : '🔊';
    alert('Settings loaded!');
}

// Change 2: Dropdown for difficulty, radio buttons for theme, Save/Load/Reset buttons
// Previously used difficulty buttons (<button class="difficulty-btn">) and scheme buttons
// (<button class="scheme-btn">) which could not use form submit events.
// Replaced with: <select> dropdown for difficulty, <input type="radio"> for color scheme,
// and dedicated Save, Load, Reset buttons for settings persistence.
function resetSettings() {
    document.getElementById('player-name').value = '';
    document.getElementById('difficulty-select').value = 'normal';
    document.querySelector('input[name="scheme"][value="classic"]').checked = true;
    document.getElementById('timer-toggle').checked = false;
    document.getElementById('toggle-label').textContent = 'Timer Mode';
    document.getElementById('volume-slider').value = 70;
    document.getElementById('volume-label').textContent = '70%';
    game.isMuted = false;
    document.getElementById('mute-btn').textContent = '🔊';
}
// End Change 2

// Random splash text array — displays a different message under the logo each load
const splashes = [
    "Test your memory...",
    "Try Terraria",
    "Created by Microsoft",
    "Billy Joe was here",
    "Now with 6 colors!",
    "Don't blink...",
    "How high can you go?",
    "Simon says pay attention",
    "Rotating since 2025",
    "Special mode included!",
    "Made with ❤️",
    "Also try Minecraft",
    "Patience is key",
    "Can you beat hard?",
    "4 colors? 6 colors!",
    "Watch closely...",
    "The wheel turns",
    "Trust your memory",
    "One wrong click...",
    "Sequence detected",
    "glhf",
    "Now in 3D! (not really)",
    "Probably not a game",
    "Not affiliated with Hasbro",
];

function setSplash() {
    document.getElementById('subtitle').textContent = splashes[Math.floor(Math.random() * splashes.length)];
}
setSplash();

// Password protection — saved per player name in localStorage
const passwordProtected = JSON.parse(localStorage.getItem('simonPasswords') || '{}');

document.getElementById('lock-btn').addEventListener('click', () => {
    const section = document.getElementById('password-section');
    section.style.display = section.style.display === 'none' ? 'flex' : 'none';
});

document.getElementById('save-password').addEventListener('click', () => {
    const name = document.getElementById('player-name').value.trim();
    const pass = document.getElementById('password-input').value.trim();
    if (!name) { alert('Enter a name first'); return; }
    if (pass.length < 3) { alert('Password must be at least 3 characters'); return; }
    passwordProtected[name] = pass;
    localStorage.setItem('simonPasswords', JSON.stringify(passwordProtected));
    document.getElementById('lock-btn').textContent = '🔒';
    document.getElementById('password-section').style.display = 'none';
    document.getElementById('password-input').value = '';
    alert('Password saved for ' + name);
});

function checkPassword(name) {
    document.getElementById('lock-btn').textContent = passwordProtected[name] ? '🔒' : '🔓';
}
document.getElementById('player-name').addEventListener('input', (e) => checkPassword(e.target.value));
checkPassword(document.getElementById('player-name').value);

// Leaderboard — displays top 10 scores per difficulty with deduplication
document.getElementById('leaderboard-btn').addEventListener('click', showLeaderboard);
document.getElementById('close-leaderboard').addEventListener('click', () => {
    document.getElementById('leaderboard-modal').style.display = 'none';
});

function showLeaderboard(diff) {
    document.getElementById('leaderboard-modal').style.display = 'flex';
    showLeaderboardTab(diff || document.getElementById('difficulty-select').value);
}

function showLeaderboardTab(diff) {
    const entries = document.getElementById('leaderboard-entries');
    let scores = game.leaderboard[diff] || [];
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
        entries.innerHTML += '<div class="leaderboard-entry"><span>' + (i+1) + '. ' + entry.name + '</span><span>' + entry.score + '</span></div>';
    });
}

document.querySelectorAll('.lb-tab').forEach(tab => {
    tab.addEventListener('click', () => showLeaderboardTab(tab.dataset.lbDifficulty));
});

// Timer mode checkbox toggle
document.getElementById('timer-toggle').addEventListener('change', (e) => {
    document.getElementById('toggle-label').textContent = e.target.checked ? 'Timer: ON' : 'Timer Mode';
});

// Volume slider and mute button
document.getElementById('volume-slider').addEventListener('input', (e) => {
    document.getElementById('volume-label').textContent = e.target.value + '%';
});

document.getElementById('mute-btn').addEventListener('click', () => {
    game.isMuted = !game.isMuted;
    document.getElementById('mute-btn').textContent = game.isMuted ? '🔇' : '🔊';
});

// Change 3: Prompt dialog for name if not entered
// Previously the name was silently set to 'Anonymous' with no user interaction.
// Now uses prompt() to ask the player for their name before falling back to Anonymous.
// Also stores settings in localStorage then opens game.html as a separate popup window.
document.getElementById('start-btn').addEventListener('click', () => {
    const name = document.getElementById('player-name').value.trim();
    if (!name) {
        const entered = prompt('Please enter your name to continue:');
        if (!entered || !entered.trim()) {
            document.getElementById('player-name').value = 'Anonymous';
        } else {
            document.getElementById('player-name').value = entered.trim();
        }
    }
    const playerName = document.getElementById('player-name').value.trim();
    // Check password if name is protected
    if (passwordProtected[playerName]) {
        const entered = prompt('This name is private. Enter password for ' + playerName + ':');
        if (entered !== passwordProtected[playerName]) {
            alert('Wrong password!');
            return;
        }
    }

    const diff = document.getElementById('difficulty-select').value;
    const scheme = document.querySelector('input[name="scheme"]:checked').value;
    const timer = document.getElementById('timer-toggle').checked;
    const vol = document.getElementById('volume-slider').value;
    const muted = game.isMuted;

    // Save settings to localStorage for game.html to read
    localStorage.setItem('simonGameSettings', JSON.stringify({
        playerName: playerName,
        difficulty: diff,
        scheme: scheme,
        timerEnabled: timer,
        volume: vol,
        isMuted: muted
    }));

    window.open('game.html', 'SimonGame', 'width=500,height=700');
});
// End Change 3

// Reset, Save, Load buttons with confirm() dialog for reset
document.getElementById('reset-settings-btn').addEventListener('click', () => {
    if (confirm('Reset all settings to default?')) {
        resetSettings();
    }
});

document.getElementById('save-settings-btn').addEventListener('click', saveSettings);
document.getElementById('load-settings-btn').addEventListener('click', loadSettings);

// Feedback system — stores feedback in localStorage for admin to view
// SS3 change 4: Wrapped in <form> with submit event handler
let feedbackData = JSON.parse(localStorage.getItem('simonFeedback') || '[]');

document.getElementById('feedback-btn').addEventListener('click', () => {
    document.getElementById('feedback-name').value = document.getElementById('player-name').value;
    document.getElementById('feedback-text').value = '';
    document.getElementById('feedback-modal').style.display = 'flex';
});

document.getElementById('close-feedback').addEventListener('click', () => {
    document.getElementById('feedback-modal').style.display = 'none';
});

function submitFeedback(event) {
    if (event) event.preventDefault();
    const name = document.getElementById('feedback-name').value.trim() || 'Anonymous';
    const text = document.getElementById('feedback-text').value.trim();
    if (!text) { alert('Please enter feedback text.'); return; }
    feedbackData.push({ name, text, date: new Date().toLocaleDateString() });
    localStorage.setItem('simonFeedback', JSON.stringify(feedbackData));
    document.getElementById('feedback-modal').style.display = 'none';
    alert('Thank you for your feedback!');
}

document.getElementById('submit-feedback').addEventListener('click', submitFeedback);
document.getElementById('feedback-form').addEventListener('submit', submitFeedback);

// Admin login — protected panel for viewing leaderboard entries and feedback
document.getElementById('admin-btn').addEventListener('click', () => {
    document.getElementById('admin-username').value = '';
    document.getElementById('admin-password').value = '';
    document.getElementById('admin-login-modal').style.display = 'flex';
});

document.getElementById('close-admin-login').addEventListener('click', () => {
    document.getElementById('admin-login-modal').style.display = 'none';
});

document.getElementById('admin-login-btn').addEventListener('click', () => {
    const user = document.getElementById('admin-username').value.trim();
    const pass = document.getElementById('admin-password').value.trim();
    if (user === 'admin123' && pass === '12345678') {
        document.getElementById('admin-login-modal').style.display = 'none';
        openAdminPanel();
    } else {
        alert('Invalid credentials');
    }
});

function openAdminPanel() {
    document.getElementById('menu').style.display = 'none';
    document.getElementById('feedback-btn').style.display = 'none';
    document.getElementById('admin-btn').style.display = 'none';
    document.getElementById('admin-panel').style.display = 'flex';
    showAdminLeaderboard('easy');
}

function closeAdminPanel() {
    document.getElementById('admin-panel').style.display = 'none';
    document.getElementById('menu').style.display = 'block';
    document.getElementById('feedback-btn').style.display = 'block';
    document.getElementById('admin-btn').style.display = 'block';
}

document.getElementById('admin-logout-btn').addEventListener('click', closeAdminPanel);

// Admin tab switching between leaderboard view and feedback view
document.querySelectorAll('.admin-tab').forEach(tab => {
    tab.addEventListener('click', () => {
        document.querySelectorAll('.admin-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        const view = tab.dataset.adminTab;
        document.getElementById('admin-leaderboard-view').style.display = view === 'leaderboard' ? 'block' : 'none';
        document.getElementById('admin-feedback-view').style.display = view === 'feedback' ? 'block' : 'none';
        if (view === 'feedback') showAdminFeedback();
        if (view === 'leaderboard') showAdminLeaderboard('easy');
    });
});

// Admin difficulty tab switching within the leaderboard view
document.querySelectorAll('.admin-lb-tab').forEach(tab => {
    tab.addEventListener('click', () => {
        document.querySelectorAll('.admin-lb-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        showAdminLeaderboard(tab.dataset.adminLb);
    });
});

function showAdminLeaderboard(diff) {
    const container = document.getElementById('admin-lb-entries');
    let scores = game.leaderboard[diff] || [];
    document.querySelectorAll('.admin-lb-tab').forEach(t => {
        t.classList.toggle('active', t.dataset.adminLb === diff);
    });
    container.innerHTML = '<div class="leaderboard-entry"><span>Player</span><span>Score</span><span></span></div>';
    if (scores.length === 0) {
        container.innerHTML = '<p style="color:#666;padding:20px;">No scores yet</p>';
        return;
    }
    scores.sort((a, b) => b.score - a.score);
    scores.forEach((entry, i) => {
        const div = document.createElement('div');
        div.className = 'admin-lb-entry';
        div.innerHTML = '<span>' + (i+1) + '. ' + entry.name + '</span><span>' + entry.score + '</span><button class="delete-entry" data-name="' + entry.name + '" data-diff="' + diff + '">Remove</button>';
        container.appendChild(div);
    });
    // Admin can delete inappropriate leaderboard entries
    container.querySelectorAll('.delete-entry').forEach(btn => {
        btn.addEventListener('click', () => {
            const name = btn.dataset.name;
            const diff = btn.dataset.diff;
            if (confirm('Remove "' + name + '" from ' + diff + ' leaderboard?')) {
                game.leaderboard[diff] = game.leaderboard[diff].filter(e => e.name !== name);
                localStorage.setItem('simonLeaderboard', JSON.stringify(game.leaderboard));
                showAdminLeaderboard(diff);
            }
        });
    });
}

function showAdminFeedback() {
    const container = document.getElementById('admin-feedback-view');
    feedbackData = JSON.parse(localStorage.getItem('simonFeedback') || '[]');
    if (feedbackData.length === 0) {
        container.innerHTML = '<p style="color:#666;padding:20px;text-align:center;">No feedback yet</p>';
        return;
    }
    container.innerHTML = '';
    feedbackData.slice().reverse().forEach(entry => {
        const div = document.createElement('div');
        div.className = 'admin-feedback-entry';
        div.innerHTML = '<div class="fb-name">' + entry.name + '</div><div class="fb-text">"' + entry.text + '"</div><div class="fb-date">' + entry.date + '</div>';
        container.appendChild(div);
    });
}
