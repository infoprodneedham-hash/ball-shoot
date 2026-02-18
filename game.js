// --- Configuration & State ---
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

canvas.width = window.innerWidth > 400 ? 400 : window.innerWidth;
canvas.height = 300;

let score = 0;
let highScore = localStorage.getItem('hoopsHighScore') || 0;
let timeLeft = 60;
let gameActive = true;
let timerInterval = null;

let gameState = 'IDLE'; 
let barValue = 0;
let barDirection = 1.8; 
let distance = 'close';
let timer = 0;
let screenShake = 0;
let netAlpha = 0;

let ball = { x: 100, y: 220, startX: 100, startY: 220 };
let targetZone = { start: 60, end: 85 };

// --- Audio Controller ---
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

function playSound(type) {
    if (audioCtx.state === 'suspended') audioCtx.resume();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);

    if (type === 'tap') {
        osc.frequency.setValueAtTime(600, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);
        osc.start(); osc.stop(audioCtx.currentTime + 0.1);
    } else if (type === 'swish') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(900, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(100, audioCtx.currentTime + 0.4);
        gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.4);
        osc.start(); osc.stop(audioCtx.currentTime + 0.4);
    } else if (type === 'rim') {
        osc.frequency.setValueAtTime(120, audioCtx.currentTime);
        gain.gain.setValueAtTime(0.5, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.2);
        osc.start(); osc.stop(audioCtx.currentTime + 0.2);
    }
}

// --- Timer Logic ---
function startTimer() {
    if (timerInterval) return;
    timerInterval = setInterval(() => {
        if (timeLeft > 0) {
            timeLeft--;
            document.getElementById('timerDisplay').innerText = `Time: ${timeLeft}`;
        } else {
            endGame();
        }
    }, 1000);
}

function endGame() {
    gameActive = false;
    clearInterval(timerInterval);
    alert(`Game Over! Final Score: ${score}`);
    location.reload(); // Simple way to reset everything
}

window.resetHighScore = function() {
    if (confirm("Reset your best score?")) {
        localStorage.setItem('hoopsHighScore', 0);
        highScore = 0;
        updateUI();
    }
};

// --- Visual Helpers ---
function drawPlayer(x, y) {
    ctx.strokeStyle = "#333";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(x - 25, y + 10, 8, 0, Math.PI * 2); // Head
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x - 25, y + 18); ctx.lineTo(x - 25, y + 45); // Body
    ctx.moveTo(x - 25, y + 25); ctx.lineTo(x - 10, y + 10); // Arm
    ctx.moveTo(x - 25, y + 45); ctx.lineTo(x - 35, y + 65); // Leg L
    ctx.moveTo(x - 25, y + 45); ctx.lineTo(x - 15, y + 65); // Leg R
    ctx.stroke();
}

function updateUI() {
    document.getElementById('scoreDisplay').innerHTML = `Score: ${score} | Best: ${highScore}`;
}
updateUI();

// --- Input Handling ---
window.setDistance = function(type) {
    if (gameState !== 'IDLE' || !gameActive) return;
    distance = type;
    ball.startX = (type === 'close') ? 100 : 50;
    ball.x = ball.startX;
    targetZone = (type === 'close') ? { start: 60, end: 85 } : { start: 70, end: 80 };
    playSound('tap');
};

window.handleInput = function() {
    if (!gameActive) return;
    startTimer(); // Timer starts on first interaction
    
    if (gameState === 'IDLE') {
        playSound('tap');
        gameState = 'POWERING';
        barValue = 0;
    } else if (gameState === 'POWERING') {
        playSound('tap');
        gameState = 'ANIMATING';
        timer = 0;
        processShot();
    }
};

// --- Physics Logic ---
function processShot() {
    const isHit = barValue >= targetZone.start && barValue <= targetZone.end;
    
    const animate = () => {
        timer += 0.02; 
        if (isHit) {
            if (timer < 0.85) {
                ball.x = ball.startX + (timer * (345 - ball.startX));
                ball.y = ball.startY - Math.sin(timer * Math.PI) * 200;
            } else if (timer < 1.1) {
                ball.x = 340; 
                ball.y += 8; 
            } else {
                finishShot(true);
                return;
            }
        } else {
            const missX = barValue < targetZone.start ? 280 : 380;
            ball.x = ball.startX + (timer * (missX - ball.startX));
            ball.y = ball.startY - Math.sin(timer * Math.PI) * 260;
            if (timer >= 1) {
                finishShot(false);
                return;
            }
        }
        requestAnimationFrame(animate);
    };
    animate();
}

function finishShot(isHit) {
    if (isHit) {
        playSound('swish');
        netAlpha = 1.0; 
        score += (distance === 'close' ? 1 : 3);
        if (score > highScore) {
            highScore = score;
            localStorage.setItem('hoopsHighScore', highScore);
        }
    } else {
        playSound('rim');
        screenShake = 12;
    }
    updateUI();
    setTimeout(resetGame, 600);
}

function resetGame() {
    gameState = 'IDLE';
    ball.x = ball.startX;
    ball.y = ball.startY;
}

// --- Main Draw Loop ---
function draw() {
    ctx.save();
    if (screenShake > 0) {
        ctx.translate(Math.random() * screenShake - screenShake/2, Math.random() * screenShake - screenShake/2);
        screenShake *= 0.85; 
    }
    ctx.clearRect(-50, -50, canvas.width + 100, canvas.height + 100);
    ctx.fillStyle = "#87CEEB"; ctx.fillRect(0, 0, canvas.width, 220); // Sky
    ctx.fillStyle = "#555"; ctx.fillRect(0, 220, canvas.width, 80); // Court

    // 1. Backboard
    ctx.strokeStyle = "#fff"; ctx.lineWidth = 4;
    ctx.strokeRect(345, 40, 5, 70); 

    // 2. Net
    ctx.strokeStyle = `rgba(255, 255, 255, ${0.3 + netAlpha})`; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(310, 90); ctx.lineTo(320, 130); 
    ctx.moveTo(345, 90); ctx.lineTo(335, 130); ctx.stroke();
    netAlpha *= 0.9;

    // 3. Stick Figure
    if (gameState !== 'ANIMATING') drawPlayer(ball.startX, ball.startY - 10);

    // 4. Ball
    ctx.beginPath(); ctx.arc(ball.x, ball.y, 12, 0, Math.PI * 2);
    ctx.fillStyle = "#ff8c00"; ctx.fill();
    ctx.strokeStyle = "#000"; ctx.lineWidth = 2; ctx.stroke();
    
    // 5. Rim
    ctx.fillStyle = "red"; ctx.fillRect(310, 85, 38, 6); 

    // 6. UI Meter
    if (gameState === 'IDLE' || gameState === 'POWERING') {
        const bx = 50, by = 260, bw = 300, bh = 20;
        ctx.fillStyle = "rgba(0,0,0,0.5)"; ctx.fillRect(bx, by, bw, bh);
        ctx.fillStyle = "#00ff00"; ctx.fillRect(bx + (targetZone.start * 3), by, (targetZone.end - targetZone.start) * 3, bh);
        if (gameState === 'POWERING') {
            barValue += barDirection;
            if (barValue > 100 || barValue < 0) barDirection *= -1;
        }
        ctx.fillStyle = "white"; ctx.fillRect(bx + (barValue * 3), by - 5, 4, bh + 10);
    }
    ctx.restore();
    requestAnimationFrame(draw);
}
draw();
