// --- Configuration & State ---
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
canvas.width = window.innerWidth > 400 ? 400 : window.innerWidth;
canvas.height = 300;

let score = 0;
let highScore = localStorage.getItem('hoopsHighScore') || 0;
let gameState = 'IDLE'; 
let barValue = 0;
let barDirection = 1.8; // SLOWED DOWN (was 2.8)
let distance = 'close';
let timer = 0;
let screenShake = 0;
let netAlpha = 0;

let ball = { x: 80, y: 220, startX: 80, startY: 220 };
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

// --- Visual Helpers ---
function drawPlayer(x, y) {
    ctx.strokeStyle = "#333";
    ctx.lineWidth = 3;
    
    // Head
    ctx.beginPath();
    ctx.arc(x - 20, y + 10, 8, 0, Math.PI * 2);
    ctx.stroke();
    
    // Body
    ctx.beginPath();
    ctx.moveTo(x - 20, y + 18);
    ctx.lineTo(x - 20, y + 45);
    ctx.stroke();
    
    // Arms (holding ball)
    ctx.beginPath();
    ctx.moveTo(x - 20, y + 25);
    ctx.lineTo(x - 5, y + 5); // To ball
    ctx.stroke();
    
    // Legs
    ctx.beginPath();
    ctx.moveTo(x - 20, y + 45);
    ctx.lineTo(x - 30, y + 65);
    ctx.moveTo(x - 20, y + 45);
    ctx.lineTo(x - 10, y + 65);
    ctx.stroke();
}

function updateUI() {
    document.getElementById('scoreDisplay').innerHTML = `Score: ${score} | Best: ${highScore}`;
}
updateUI();

function setDistance(type) {
    if (gameState !== 'IDLE') return;
    distance = type;
    ball.startX = (type === 'close') ? 100 : 50;
    ball.x = ball.startX;
    targetZone = (type === 'close') ? { start: 60, end: 85 } : { start: 70, end: 80 };
    playSound('tap');
}

function handleInput() {
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
}

function processShot() {
    const isHit = barValue >= targetZone.start && barValue <= targetZone.end;
    
    const animate = () => {
        timer += 0.02; 
        
        // Linear X movement (Target is 325 for the rim)
        ball.x = ball.startX + (timer * (325 - ball.startX));
        
        // Parabolic Y movement
        const peakHeight = isHit ? 180 : 260; 
        ball.y = ball.startY - Math.sin(timer * Math.PI) * peakHeight;

        // If it's a "Hit", make it drop vertically at the very end for better contact
        if (isHit && timer > 0.9) {
            ball.x = 325;
            ball.y += 5; // Slight drop through the hoop
        }

        if (timer < 1.05) { // Run slightly past 1.0 for the "drop" effect
            requestAnimationFrame(animate);
        } else {
            finishShot(isHit);
        }
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
    
    // Background (Sky & Ground)
    ctx.fillStyle = "#87CEEB";
    ctx.fillRect(0, 0, canvas.width, 220);
    ctx.fillStyle = "#666";
    ctx.fillRect(0, 220, canvas.width, 80);

    // Draw Hoop
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 4;
    ctx.strokeRect(345, 40, 5, 70); // Backboard
    
    // Net
    ctx.fillStyle = `rgba(255, 255, 255, ${0.3 + netAlpha})`;
    ctx.beginPath();
    ctx.moveTo(310, 90);
    ctx.lineTo(345, 90);
    ctx.lineTo(335, 130);
    ctx.lineTo(320, 130);
    ctx.closePath();
    ctx.fill();
    netAlpha *= 0.9;

    // Draw Player if IDLE or POWERING
    if (gameState !== 'ANIMATING') {
        drawPlayer(ball.startX, ball.startY - 10);
    }

    // Draw Ball
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, 12, 0, Math.PI * 2);
    ctx.fillStyle = "#ff8c00";
    ctx.fill();
    ctx.strokeStyle = "#333";
    ctx.lineWidth = 2;
    ctx.stroke();
    
    // Rim (Drawn AFTER ball to simulate it going into the hoop)
    ctx.fillStyle = "red";
    ctx.fillRect(310, 85, 38, 6); 

    // Draw Power Bar UI
    if (gameState === 'IDLE' || gameState === 'POWERING') {
        const bx = 50, by = 260, bw = 300, bh = 20;
        ctx.fillStyle = "rgba(0,0,0,0.5)";
        ctx.fillRect(bx, by, bw, bh);
        ctx.fillStyle = "#00ff00";
        ctx.fillRect(bx + (targetZone.start * 3), by, (targetZone.end - targetZone.start) * 3, bh);
        if (gameState === 'POWERING') {
            barValue += barDirection;
            if (barValue > 100 || barValue < 0) barDirection *= -1;
        }
        ctx.fillStyle = "white";
        ctx.fillRect(bx + (barValue * 3), by - 5, 4, bh + 10);
    }

    ctx.restore();
    requestAnimationFrame(draw);
}

draw();
