// Configuración del juego
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const player1ScoreElement = document.getElementById('player1Score');
const player2ScoreElement = document.getElementById('player2Score');
const startBtn = document.getElementById('startBtn');
const pauseBtn = document.getElementById('pauseBtn');
const resetBtn = document.getElementById('resetBtn');
const backBtn = document.getElementById('backBtn');
const gameStatus = document.getElementById('gameStatus');
const modeSelection = document.getElementById('modeSelection');
const playerVsPlayerBtn = document.getElementById('playerVsPlayerBtn');
const playerVsCpuBtn = document.getElementById('playerVsCpuBtn');
const controls = document.getElementById('controls');
const gameInfo = document.getElementById('gameInfo');
const player2Title = document.getElementById('player2Title');
const player2Controls = document.getElementById('player2Controls');
const gameTimer = document.getElementById('gameTimer');
const speedIndicator = document.getElementById('speedIndicator');
const playerNamesForm = document.getElementById('playerNamesForm');
const player1NameInput = document.getElementById('player1Name');
const player2NameInput = document.getElementById('player2Name');
const startWithNamesBtn = document.getElementById('startWithNamesBtn');
const backToModeBtn = document.getElementById('backToModeBtn');

// Variables del juego
let gameRunning = false;
let gamePaused = false;
let animationId;
let gameMode = ''; // 'pvp' o 'pvc'
let cpuDifficulty = 0.85; // Nivel de dificultad de la CPU (0-1)

// Variables de nombres de jugadores
let player1Name = 'Jugador 1';
let player2Name = 'Jugador 2';

// Variables del timer
let gameStartTime = 0;
let gamePausedTime = 0;
let totalPausedTime = 0;
let timerInterval;

// Configuración del canvas
const CANVAS_WIDTH = canvas.width;
const CANVAS_HEIGHT = canvas.height;

// Configuración de las paletas
const PADDLE_WIDTH = 10;
const PADDLE_HEIGHT = 80;
const PADDLE_SPEED = 6;

// Configuración de la pelota
const BALL_SIZE = 10;
const BALL_BASE_SPEED = 2.5;
let BALL_SPEED = BALL_BASE_SPEED;
const BALL_SPEED_INCREMENT = 0.15;
const SCORE_SPEED_MULTIPLIER = 0.3; // Incremento de velocidad por punto total

// Objetos del juego
const player1 = {
    x: 20,
    y: CANVAS_HEIGHT / 2 - PADDLE_HEIGHT / 2,
    width: PADDLE_WIDTH,
    height: PADDLE_HEIGHT,
    dy: 0,
    score: 0
};

const player2 = {
    x: CANVAS_WIDTH - 30,
    y: CANVAS_HEIGHT / 2 - PADDLE_HEIGHT / 2,
    width: PADDLE_WIDTH,
    height: PADDLE_HEIGHT,
    dy: 0,
    score: 0
};

const ball = {
    x: CANVAS_WIDTH / 2,
    y: CANVAS_HEIGHT / 2,
    size: BALL_SIZE,
    dx: BALL_SPEED * (Math.random() > 0.5 ? 1 : -1),
    dy: BALL_SPEED * (Math.random() > 0.5 ? 1 : -1)
};

// Control de teclas
const keys = {};

// Event listeners para las teclas
document.addEventListener('keydown', (e) => {
    keys[e.key.toLowerCase()] = true;
});

document.addEventListener('keyup', (e) => {
    keys[e.key.toLowerCase()] = false;
});

// Event listeners para los botones
startBtn.addEventListener('click', startGame);
pauseBtn.addEventListener('click', togglePause);
resetBtn.addEventListener('click', resetGame);
backBtn.addEventListener('click', backToModeSelection);
playerVsPlayerBtn.addEventListener('click', showPlayerNamesForm);
playerVsCpuBtn.addEventListener('click', () => selectGameMode('pvc'));
startWithNamesBtn.addEventListener('click', startPvPWithNames);
backToModeBtn.addEventListener('click', backToModeSelectionFromForm);

// Función para dibujar rectángulos con bordes redondeados
function drawRoundRect(x, y, width, height, radius) {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
    ctx.fill();
}

// Función para dibujar las paletas
function drawPaddle(paddle) {
    ctx.fillStyle = '#00ff88';
    ctx.shadowColor = '#00ff88';
    ctx.shadowBlur = 10;
    drawRoundRect(paddle.x, paddle.y, paddle.width, paddle.height, 5);
    ctx.shadowBlur = 0;
}

// Función para dibujar la pelota
function drawBall() {
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = '#ffffff';
    ctx.shadowBlur = 15;
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, ball.size, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
}

// Función para dibujar la línea central
function drawCenterLine() {
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 2;
    ctx.setLineDash([10, 10]);
    ctx.beginPath();
    ctx.moveTo(CANVAS_WIDTH / 2, 0);
    ctx.lineTo(CANVAS_WIDTH / 2, CANVAS_HEIGHT);
    ctx.stroke();
    ctx.setLineDash([]);
}

// Función para actualizar las posiciones de las paletas
function updatePaddles() {
    // Jugador 1 (W/S)
    if (keys['w'] && player1.y > 0) {
        player1.y -= PADDLE_SPEED;
    }
    if (keys['s'] && player1.y < CANVAS_HEIGHT - PADDLE_HEIGHT) {
        player1.y += PADDLE_SPEED;
    }

    // Jugador 2 o CPU
    if (gameMode === 'pvp') {
        // Jugador 2 (Flechas)
        if (keys['arrowup'] && player2.y > 0) {
            player2.y -= PADDLE_SPEED;
        }
        if (keys['arrowdown'] && player2.y < CANVAS_HEIGHT - PADDLE_HEIGHT) {
            player2.y += PADDLE_SPEED;
        }
    } else if (gameMode === 'pvc') {
        // CPU (Inteligencia Artificial)
        updateCPU();
    }
}

// Función para la inteligencia artificial de la CPU
function updateCPU() {
    const paddleCenter = player2.y + player2.height / 2;
    const ballCenter = ball.y;
    const distance = ballCenter - paddleCenter;
    
    // La CPU solo se mueve si la pelota se está acercando
    if (ball.dx > 0) {
        // Añadir algo de imperfección a la CPU
        const cpuSpeed = PADDLE_SPEED * cpuDifficulty;
        const deadZone = 10; // Zona donde la CPU no se mueve (para no ser perfecta)
        
        if (Math.abs(distance) > deadZone) {
            if (distance > 0 && player2.y < CANVAS_HEIGHT - PADDLE_HEIGHT) {
                player2.y += cpuSpeed;
            } else if (distance < 0 && player2.y > 0) {
                player2.y -= cpuSpeed;
            }
        }
        
        // Añadir un poco de aleatoriedade para hacer la CPU más humana
        if (Math.random() < 0.02) { // 2% de probabilidad cada frame
            const randomMovement = (Math.random() - 0.5) * 3;
            player2.y += randomMovement;
        }
    }
    
    // Mantener la paleta dentro de los límites
    if (player2.y < 0) player2.y = 0;
    if (player2.y > CANVAS_HEIGHT - PADDLE_HEIGHT) {
        player2.y = CANVAS_HEIGHT - PADDLE_HEIGHT;
    }
}

// Función para actualizar la posición de la pelota
function updateBall() {
    ball.x += ball.dx;
    ball.y += ball.dy;

    // Rebote en paredes superior e inferior
    if (ball.y <= ball.size || ball.y >= CANVAS_HEIGHT - ball.size) {
        ball.dy = -ball.dy;
        playSound('bounce');
    }

    // Colisión con paleta del jugador 1
    if (ball.x <= player1.x + player1.width &&
        ball.y >= player1.y &&
        ball.y <= player1.y + player1.height &&
        ball.dx < 0) {
        
        ball.dx = -ball.dx;
        // Añadir efecto de ángulo basado en dónde golpea la pelota
        const hitPos = (ball.y - player1.y) / player1.height;
        ball.dy = BALL_SPEED * (hitPos - 0.5) * 2;
        increaseBallSpeed();
        playSound('paddle');
    }

    // Colisión con paleta del jugador 2
    if (ball.x >= player2.x - ball.size &&
        ball.y >= player2.y &&
        ball.y <= player2.y + player2.height &&
        ball.dx > 0) {
        
        ball.dx = -ball.dx;
        // Añadir efecto de ángulo basado en dónde golpea la pelota
        const hitPos = (ball.y - player2.y) / player2.height;
        ball.dy = BALL_SPEED * (hitPos - 0.5) * 2;
        increaseBallSpeed();
        playSound('paddle');
    }

    // Puntuación
    if (ball.x < 0) {
        player2.score++;
        updateScore();
        resetBall();
        playSound('score');
        checkWinner();
    } else if (ball.x > CANVAS_WIDTH) {
        player1.score++;
        updateScore();
        resetBall();
        playSound('score');
        checkWinner();
    }
}

// Función para calcular la velocidad basada en los puntos
function calculateBallSpeed() {
    const totalScore = player1.score + player2.score;
    return BALL_BASE_SPEED + (totalScore * SCORE_SPEED_MULTIPLIER);
}

// Función para aumentar la velocidad de la pelota
function increaseBallSpeed() {
    BALL_SPEED += BALL_SPEED_INCREMENT;
    if (ball.dx > 0) {
        ball.dx = BALL_SPEED;
    } else {
        ball.dx = -BALL_SPEED;
    }
}

// Función para reiniciar la pelota
function resetBall() {
    ball.x = CANVAS_WIDTH / 2;
    ball.y = CANVAS_HEIGHT / 2;
    
    // Calcular velocidad basada en puntos totales
    BALL_SPEED = calculateBallSpeed();
    
    ball.dx = BALL_SPEED * (Math.random() > 0.5 ? 1 : -1);
    ball.dy = BALL_SPEED * (Math.random() > 0.5 ? 1 : -1);
}

// Función para actualizar el indicador de velocidad
function updateSpeedIndicator() {
    const currentSpeed = calculateBallSpeed();
    const speedMultiplier = (currentSpeed / BALL_BASE_SPEED).toFixed(1);
    speedIndicator.textContent = `Velocidad: ${speedMultiplier}x`;
    
    // Añadir efecto visual cuando la velocidad aumenta
    if (speedMultiplier > 1.0) {
        speedIndicator.classList.add('speed-boost');
        setTimeout(() => {
            speedIndicator.classList.remove('speed-boost');
        }, 500);
    }
}

// Función para actualizar el marcador
function updateScore() {
    player1ScoreElement.textContent = player1.score;
    player2ScoreElement.textContent = player2.score;
    updateSpeedIndicator();
}

// Función para verificar ganador
function checkWinner() {
    if (player1.score >= 10) {
        endGame(`¡${player1Name} Gana!`);
    } else if (player2.score >= 10) {
        endGame(`¡${player2Name} Gana!`);
    }
}

// Función para terminar el juego
function endGame(message) {
    gameRunning = false;
    stopTimer();
    
    // Obtener tiempo final
    const finalTime = gameTimer.textContent;
    gameStatus.textContent = message + ` en ${finalTime} - Presiona "Reiniciar" para jugar de nuevo`;
    startBtn.textContent = 'Iniciar Juego';
    pauseBtn.disabled = true;
}

// Funciones del timer
function startTimer() {
    gameStartTime = Date.now();
    totalPausedTime = 0;
    timerInterval = setInterval(updateTimer, 100); // Actualizar cada 100ms para mayor precisión
}

function stopTimer() {
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
}

function pauseTimer() {
    gamePausedTime = Date.now();
}

function resumeTimer() {
    if (gamePausedTime > 0) {
        totalPausedTime += Date.now() - gamePausedTime;
        gamePausedTime = 0;
    }
}

function updateTimer() {
    if (!gameRunning || gamePaused) return;
    
    const currentTime = Date.now();
    const elapsedTime = currentTime - gameStartTime - totalPausedTime;
    const seconds = Math.floor(elapsedTime / 1000);
    const minutes = Math.floor(seconds / 60);
    const displaySeconds = seconds % 60;
    
    gameTimer.textContent = `${minutes.toString().padStart(2, '0')}:${displaySeconds.toString().padStart(2, '0')}`;
}

function resetTimer() {
    stopTimer();
    gameTimer.textContent = '00:00';
    gameStartTime = 0;
    gamePausedTime = 0;
    totalPausedTime = 0;
}

// Función para efectos de sonido (simulados visualmente)
function playSound(type) {
    // En lugar de sonido real, añadimos efectos visuales
    switch(type) {
        case 'paddle':
            canvas.style.boxShadow = '0 0 30px rgba(0, 255, 136, 0.8)';
            setTimeout(() => {
                canvas.style.boxShadow = '0 0 20px rgba(0, 255, 136, 0.3)';
            }, 100);
            break;
        case 'bounce':
            canvas.style.filter = 'brightness(1.2)';
            setTimeout(() => {
                canvas.style.filter = 'brightness(1)';
            }, 100);
            break;
        case 'score':
            document.body.style.background = 'linear-gradient(135deg, #ff1e72, #ff5298)';
            setTimeout(() => {
                document.body.style.background = 'linear-gradient(135deg, #1e3c72, #2a5298)';
            }, 200);
            break;
    }
}

// Función principal de renderizado
function render() {
    // Limpiar canvas
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Dibujar elementos
    drawCenterLine();
    drawPaddle(player1);
    drawPaddle(player2);
    drawBall();
}

// Función principal del loop del juego
function gameLoop() {
    if (!gameRunning || gamePaused) return;

    updatePaddles();
    updateBall();
    render();

    animationId = requestAnimationFrame(gameLoop);
}

// Función para iniciar el juego
function startGame() {
    if (!gameRunning) {
        gameRunning = true;
        gamePaused = false;
        startBtn.textContent = 'Juego en Curso';
        startBtn.disabled = true;
        pauseBtn.disabled = false;
        gameStatus.textContent = 'Juego en curso - ¡Primer jugador en llegar a 10 puntos gana!';
        gameLoop();
    }
}

// Función para pausar/reanudar el juego
function togglePause() {
    if (!gameRunning) return;

    gamePaused = !gamePaused;
    if (gamePaused) {
        pauseBtn.textContent = 'Reanudar';
        gameStatus.textContent = 'Juego pausado - Presiona "Reanudar" para continuar';
    } else {
        pauseBtn.textContent = 'Pausar';
        gameStatus.textContent = 'Juego en curso - ¡Primer jugador en llegar a 10 puntos gana!';
        gameLoop();
    }
}

// Función para reiniciar el juego
function resetGame() {
    gameRunning = false;
    gamePaused = false;
    
    // Reiniciar puntuaciones
    player1.score = 0;
    player2.score = 0;
    updateScore();
    
    // Reiniciar posiciones
    player1.y = CANVAS_HEIGHT / 2 - PADDLE_HEIGHT / 2;
    player2.y = CANVAS_HEIGHT / 2 - PADDLE_HEIGHT / 2;
    resetBall();
    
    // Reiniciar UI
    startBtn.textContent = 'Iniciar Juego';
    startBtn.disabled = false;
    pauseBtn.textContent = 'Pausar';
    pauseBtn.disabled = true;
    gameStatus.textContent = 'Presiona "Iniciar Juego" para comenzar';
    
    // Cancelar animación si existe
    if (animationId) {
        cancelAnimationFrame(animationId);
    }
    
    // Renderizar estado inicial
    render();
}

// Función para mostrar el formulario de nombres
function showPlayerNamesForm() {
    modeSelection.style.display = 'none';
    playerNamesForm.style.display = 'block';
    
    // Limpiar inputs y enfocar el primero
    player1NameInput.value = '';
    player2NameInput.value = '';
    setTimeout(() => player1NameInput.focus(), 100);
}

// Función para volver al modo de selección desde el formulario
function backToModeSelectionFromForm() {
    playerNamesForm.style.display = 'none';
    modeSelection.style.display = 'block';
}

// Función para iniciar PvP con nombres
function startPvPWithNames() {
    // Obtener nombres o usar valores por defecto
    player1Name = player1NameInput.value.trim() || 'Jugador 1';
    player2Name = player2NameInput.value.trim() || 'Jugador 2';
    
    // Limitar longitud de nombres
    player1Name = player1Name.substring(0, 15);
    player2Name = player2Name.substring(0, 15);
    
    // Seleccionar modo PvP
    selectGameMode('pvp');
}

// Función para seleccionar el modo de juego
function selectGameMode(mode) {
    gameMode = mode;
    
    // Ocultar formulario y selección de modo, mostrar juego
    modeSelection.style.display = 'none';
    playerNamesForm.style.display = 'none';
    canvas.style.display = 'block';
    controls.style.display = 'flex';
    gameInfo.style.display = 'block';
    
    // Configurar interfaz según el modo
    if (mode === 'pvp') {
        player2Title.textContent = player2Name;
        player2Controls.innerHTML = '↑ - Arriba<br>↓ - Abajo';
        gameStatus.textContent = `Modo: ${player1Name} vs ${player2Name} - Presiona "Iniciar Juego"`;
        cpuDifficulty = 0; // No hay CPU
        
        // Actualizar títulos en los controles
        document.querySelector('.control-section h3').textContent = player1Name;
    } else {
        player1Name = 'Jugador 1'; // Reset para modo CPU
        player2Name = 'CPU';
        player2Title.textContent = 'CPU';
        player2Controls.innerHTML = 'Controlado por<br>la computadora';
        gameStatus.textContent = 'Modo: Jugador vs CPU - Presiona "Iniciar Juego"';
        cpuDifficulty = 0.85; // Dificultad media
        
        // Reset títulos en los controles
        document.querySelector('.control-section h3').textContent = 'Jugador 1';
    }
    
    // Renderizar estado inicial del juego
    render();
    
    // Inicializar indicador de velocidad
    updateSpeedIndicator();
}

// Función para volver a la selección de modo
function backToModeSelection() {
    // Detener juego si está corriendo
    gameRunning = false;
    gamePaused = false;
    if (animationId) {
        cancelAnimationFrame(animationId);
    }
    
    // Reiniciar juego
    resetGameState();
    
    // Mostrar selección de modo y ocultar todo lo demás
    modeSelection.style.display = 'block';
    playerNamesForm.style.display = 'none';
    canvas.style.display = 'none';
    controls.style.display = 'none';
    gameInfo.style.display = 'none';
    
    // Limpiar modo seleccionado y nombres
    gameMode = '';
    player1Name = 'Jugador 1';
    player2Name = 'Jugador 2';
}

// Función para reiniciar el estado del juego
function resetGameState() {
    // Reiniciar puntuaciones
    player1.score = 0;
    player2.score = 0;
    updateScore();
    
    // Reiniciar velocidad de la pelota
    BALL_SPEED = BALL_BASE_SPEED;
    
    // Reiniciar posiciones
    player1.y = CANVAS_HEIGHT / 2 - PADDLE_HEIGHT / 2;
    player2.y = CANVAS_HEIGHT / 2 - PADDLE_HEIGHT / 2;
    resetBall();
    
    // Reiniciar timer
    resetTimer();
    
    // Reiniciar indicador de velocidad
    updateSpeedIndicator();
    
    // Reiniciar UI
    startBtn.textContent = 'Iniciar Juego';
    startBtn.disabled = false;
    pauseBtn.textContent = 'Pausar';
    pauseBtn.disabled = true;
}

// Función para reiniciar el juego (actualizada)
function resetGame() {
    gameRunning = false;
    gamePaused = false;
    
    resetGameState();
    
    // Configurar mensaje según el modo
    const modeText = gameMode === 'pvc' ? 'Jugador vs CPU' : 'Jugador vs Jugador';
    gameStatus.textContent = `Modo: ${modeText} - Presiona "Iniciar Juego"`;
    
    // Cancelar animación si existe
    if (animationId) {
        cancelAnimationFrame(animationId);
    }
    
    // Renderizar estado inicial
    render();
}

// Función para iniciar el juego (actualizada)
function startGame() {
    if (!gameRunning && gameMode) {
        gameRunning = true;
        gamePaused = false;
        startBtn.textContent = 'Juego en Curso';
        startBtn.disabled = true;
        pauseBtn.disabled = false;
        
        // Iniciar timer
        startTimer();
        
        gameStatus.textContent = `${player1Name} vs ${player2Name} - ¡Primer jugador en llegar a 10 puntos gana!`;
        gameLoop();
    }
}

// Función para pausar/reanudar el juego (actualizada)
function togglePause() {
    if (!gameRunning) return;

    gamePaused = !gamePaused;
    if (gamePaused) {
        pauseTimer();
        pauseBtn.textContent = 'Reanudar';
        gameStatus.textContent = 'Juego pausado - Presiona "Reanudar" para continuar';
    } else {
        resumeTimer();
        pauseBtn.textContent = 'Pausar';
        gameStatus.textContent = `${player1Name} vs ${player2Name} - ¡Primer jugador en llegar a 10 puntos gana!`;
        gameLoop();
    }
}

// Inicialización
document.addEventListener('DOMContentLoaded', () => {
    // Mostrar solo la selección de modo al inicio
    modeSelection.style.display = 'block';
    canvas.style.display = 'none';
    controls.style.display = 'none';
    gameInfo.style.display = 'none';
});

// Event listeners para los inputs de nombres
player1NameInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        player2NameInput.focus();
    }
});

player2NameInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        startPvPWithNames();
    }
});

// Prevenir scroll con las teclas de flecha
document.addEventListener('keydown', (e) => {
    if(['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        e.preventDefault();
    }
});