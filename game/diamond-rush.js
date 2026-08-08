/* ============================================================
   DIAMOND RUSH ESTRATÉGICO — con rocas, poderes y lecturas
   ============================================================ */
(function () {
  'use strict';

  const CELL = 36;
  const COLS = 20;
  const ROWS = 13;
  const MOVE_MS_NORMAL = 130;
  let MOVE_MS = MOVE_MS_NORMAL;

  const PORTAL_COLORS = [
    { a: '#4dcfff', b: '#0a6ba0' },
    { a: '#ffa64d', b: '#a05f0a' },
    { a: '#c78dff', b: '#6a3aa0' },
    { a: '#4dff88', b: '#0a8040' }
  ];

  // Temas visuales por escena (inspirados en los castillos del viaje)
  const THEMES = {
    cuarto:                { bg1: '#4b3828', bg2: '#24170f', wall1: '#9b7b55', wall2: '#5f432d', floor1: '#6f573d', floor2: '#4a3828', path1: '#8b6b45', path2: '#5c422c', stone: '#9c8a68', moss: '#5f713f', label: 'Tu cuarto' },
    sendero:               { bg1: '#294321', bg2: '#101b0d', wall1: '#756849', wall2: '#403b2b', floor1: '#356026', floor2: '#1f4219', path1: '#8b7046', path2: '#5d482f', stone: '#81785b', moss: '#78944c', label: 'Sendero del bosque' },
    castillo_silencio:     { bg1: '#343c42', bg2: '#171a1d', wall1: '#9b9787', wall2: '#5d5b53', floor1: '#4d514c', floor2: '#343833', path1: '#8b8065', path2: '#5d5544', stone: '#b0a68d', moss: '#65724f', label: 'Castillo del Silencio' },
    bosque:                { bg1: '#294b22', bg2: '#0d1d0b', wall1: '#756a4b', wall2: '#3e3b2b', floor1: '#2f5b23', floor2: '#1b3c18', path1: '#92754a', path2: '#60492f', stone: '#8f8567', moss: '#70974b', label: 'Bosque de las Voces' },
    castillo_conocimiento: { bg1: '#59462d', bg2: '#21170d', wall1: '#b09a72', wall2: '#68543a', floor1: '#66533b', floor2: '#443628', path1: '#a08357', path2: '#6d5235', stone: '#c0aa7d', moss: '#68734d', label: 'Castillo del Conocimiento' },
    puente:                { bg1: '#493c36', bg2: '#211815', wall1: '#a38f76', wall2: '#625142', floor1: '#665247', floor2: '#43372f', path1: '#a17b50', path2: '#6b4d32', stone: '#b3a087', moss: '#647052', label: 'Puente de la Misión' },
    cima:                  { bg1: '#5b402a', bg2: '#24150b', wall1: '#b49a76', wall2: '#70543a', floor1: '#71553a', floor2: '#4c3627', path1: '#aa8250', path2: '#70502f', stone: '#c1a77a', moss: '#68744d', label: 'Cima de la Verdad' },
    castillo_voluntad:     { bg1: '#4b3028', bg2: '#1c0d0a', wall1: '#a87962', wall2: '#624034', floor1: '#593a30', floor2: '#38251f', path1: '#9a6948', path2: '#62402d', stone: '#b28d70', moss: '#566044', label: 'Castillo de la Voluntad' },
    amanecer:              { bg1: '#76522f', bg2: '#2d1a0e', wall1: '#c1a06a', wall2: '#745532', floor1: '#795b3d', floor2: '#503a28', path1: '#b18a57', path2: '#765535', stone: '#cbb17d', moss: '#6d7b4c', label: 'Amanecer sin armadura' }
  };
  let currentTheme = THEMES.cuarto;

  let ctx, canvas;
  let level, onEnd;
  let player, tokens, enemies, walls, door, portals, rocks, books, hazards, checkpoints, questionGates, chests, boss, puzzleSwitches;
  let routeCells;
  let score, combo, maxCombo;
  let totalCorrect, collectedCorrect;
  let mistakes, lives, timeLeft;
  let running, paused, quizActive;
  let rafHandle, timerHandle;
  let lastFrame, keys;
  let particles, messages;
  let startTime, currentTokenHover;
  let portalCooldown;
  let levelCompleted;
  let checkpointRespawn = { gx: 1, gy: 1 };
  let bossDefeated = false;
  let invulnerableMs;
  let powers; // Array de string: nombres de poderes en inventario
  let turboMs; // ms restantes de turbo
  let shieldMs; // ms restantes de escudo
  let cfgPowers;
  let cfgGame = {};

  window.DiamondRush = {
    start(lvl, cb, gameConfig) {
      level = lvl;
      onEnd = cb;
      cfgPowers = (gameConfig && gameConfig.poderes) || {};
      cfgGame = (gameConfig && gameConfig.juego) || {};
      canvas = document.getElementById('lab-canvas');
      canvas.width = COLS * CELL;
      canvas.height = ROWS * CELL;
      ctx = canvas.getContext('2d');

      score = 0; combo = 0; maxCombo = 0;
      collectedCorrect = 0; mistakes = 0;
      lives = 3;
      timeLeft = (level.tiempo_seg) || 90;
      running = true; paused = false; quizActive = false;
      levelCompleted = false;
      bossDefeated = false;
      checkpointRespawn = { gx: 1, gy: 1 };
      puzzleSwitches = [];
      keys = {}; particles = []; messages = [];
      currentTokenHover = null; portalCooldown = 0;
      invulnerableMs = 0;
      turboMs = 0; shieldMs = 0;
      powers = [];
      MOVE_MS = MOVE_MS_NORMAL;
      startTime = Date.now();

      // Aplicar tema visual según la escena del nivel
      currentTheme = THEMES[level.tema] || THEMES.cuarto;

      generateMap();
      player = {
        gx: 1, gy: 1,
        px: CELL, py: CELL,
        dir: 'right', moving: false, moveT: 0, walkFrame: 0,
        fromX: CELL, fromY: CELL,
        toX: CELL, toY: CELL
      };
      updateHUD();
      renderPowerBar();
      bindControls();
      startTimer();
      lastFrame = performance.now();
      loop();
      setInstr(level.instruccion_juego || 'Resuelve los mecanismos del castillo. Cuando todos estén activos, la puerta se abrirá.');
    },
    stop() {
      running = false;
      if (rafHandle) cancelAnimationFrame(rafHandle);
      if (timerHandle) clearInterval(timerHandle);
      closeModal();
    }
  };

  // ============================================================
  // GENERACIÓN DE MAPA
  // ============================================================
  function generateMap() {
    walls = new Set();
    tokens = []; enemies = []; portals = []; rocks = []; books = [];
    hazards = []; checkpoints = []; questionGates = []; chests = []; boss = null; puzzleSwitches = [];
    routeCells = new Set();
    door = { gx: COLS - 2, gy: ROWS - 2, open: false, puzzleRequired: 0 };
    const puzzleCount = Math.min(3, Math.max(1, 1 + Math.floor((level.num || 1) / 3)));

    const dif = level.dificultad || { enemigos: 1, portales: 0, bloqueados: 0, rocas: 0, lecturas: 0, muros_densidad: 0.10 };

    // Marco exterior: parece una ruina/castillo, no un laberinto de Pac-Man.
    for (let x = 0; x < COLS; x++) {
      walls.add(x + ',0');
      walls.add(x + ',' + (ROWS - 1));
    }
    for (let y = 1; y < ROWS - 1; y++) {
      walls.add('0,' + y);
      walls.add((COLS - 1) + ',' + y);
    }

    // Sendero principal: una ruta ancha y serpenteante entre la entrada y la salida.
    // Se dibuja como camino de aventura y además se protege de los muros.
    let cx = 1, cy = 1;
    const addRoute = (x, y) => {
      for (let oy = -1; oy <= 1; oy++) {
        for (let ox = -1; ox <= 1; ox++) {
          const rx = x + ox, ry = y + oy;
          if (rx > 0 && rx < COLS - 1 && ry > 0 && ry < ROWS - 1) routeCells.add(rx + ',' + ry);
        }
      }
    };
    addRoute(cx, cy);
    while (cx !== door.gx || cy !== door.gy) {
      const canX = cx !== door.gx;
      const canY = cy !== door.gy;
      // Alterna dirección para crear curvas, con pequeños desvíos naturales.
      let goX = canX && (!canY || Math.random() < 0.58);
      if (canX && canY && Math.random() < 0.18) goX = !goX;
      if (goX) cx += Math.sign(door.gx - cx);
      else cy += Math.sign(door.gy - cy);
      addRoute(cx, cy);
    }

    // Ramales cortos para que el mapa tenga "caminos" y pequeñas zonas de exploración.
    const branches = 2 + Math.floor(level.num / 3);
    for (let b = 0; b < branches; b++) {
      let bx = 3 + Math.floor(Math.random() * (COLS - 6));
      let by = 2 + Math.floor(Math.random() * (ROWS - 5));
      for (let n = 0; n < 5 + Math.floor(Math.random() * 5); n++) {
        addRoute(bx, by);
        const dirs = [[1,0],[-1,0],[0,1],[0,-1]];
        const d = dirs[Math.floor(Math.random() * dirs.length)];
        bx = Math.max(1, Math.min(COLS - 2, bx + d[0]));
        by = Math.max(1, Math.min(ROWS - 2, by + d[1]));
      }
    }

    // Muros en grupos irregulares: ruinas, columnas y restos de muralla.
    // Nunca se colocan sobre el camino principal.
    const density = Math.min(0.22, Math.max(0.06, Number(dif.muros_densidad || 0.10) * 1.35));
    const target = Math.floor((COLS - 2) * (ROWS - 2) * density);
    let placed = 0, attempts = 0;
    while (placed < target && attempts < 800) {
      attempts++;
      let wx = 2 + Math.floor(Math.random() * (COLS - 4));
      let wy = 2 + Math.floor(Math.random() * (ROWS - 4));
      if (routeCells.has(wx + ',' + wy)) continue;
      if (Math.abs(wx - 1) + Math.abs(wy - 1) < 4) continue;
      if (Math.abs(wx - door.gx) + Math.abs(wy - door.gy) < 4) continue;

      const cluster = Math.random() < 0.72 ? 1 + Math.floor(Math.random() * 3) : 1;
      for (let i = 0; i < cluster && placed < target; i++) {
        const dx = Math.random() < 0.65 ? (Math.random() < 0.5 ? 1 : -1) : 0;
        const dy = dx === 0 ? (Math.random() < 0.5 ? 1 : -1) : 0;
        const x = Math.max(1, Math.min(COLS - 2, wx + dx * i));
        const y = Math.max(1, Math.min(ROWS - 2, wy + dy * i));
        const key = x + ',' + y;
        if (routeCells.has(key) || walls.has(key)) continue;
        walls.add(key);
        placed++;
      }
    }

    // Portales
    for (let p = 0; p < (dif.portales || 0); p++) {
      const a = randomEmptyCell();
      const b = randomEmptyCell();
      if (a && b) portals.push({ id: p, a, b, color: PORTAL_COLORS[p % PORTAL_COLORS.length] });
    }

    // Rocas
    for (let r = 0; r < (dif.rocas || 0); r++) {
      const cell = randomEmptyCell();
      if (cell) rocks.push({ gx: cell.x, gy: cell.y, moving: false, moveT: 0, fromX: 0, fromY: 0, toX: 0, toY: 0, px: cell.x * CELL, py: cell.y * CELL });
    }

    // Tokens
    const corrList = shuffle([...(level.tokens_correctos || [])]).slice(0, 5 + Math.min(level.num, 3));
    const wrongList = shuffle([...(level.tokens_incorrectos || [])]).slice(0, 3 + Math.floor(level.num / 3));
    totalCorrect = corrList.length;
    const quizzes = level.quiz_bloqueo || [];
    const numBloqueados = Math.min(dif.bloqueados || 0, corrList.length, quizzes.length * 3);

    corrList.forEach((text, i) => {
      const cell = randomEmptyCell();
      if (!cell) return;
      const bloqueado = i < numBloqueados;
      const quiz = bloqueado && quizzes.length > 0 ? quizzes[i % quizzes.length] : null;
      tokens.push({ gx: cell.x, gy: cell.y, text, correct: true, collected: false, glow: 0, bloqueado, quiz, unlockedByGroup: false });
    });
    wrongList.forEach(text => {
      const cell = randomEmptyCell();
      if (!cell) return;
      tokens.push({ gx: cell.x, gy: cell.y, text, correct: false, collected: false, glow: 0, bloqueado: false });
    });

    const lecturas = level.lecturas || [];
    const numBooks = Math.min(dif.lecturas || 0, lecturas.length);
    for (let i = 0; i < numBooks; i++) {
      const cell = randomEmptyCell();
      if (cell) books.push({ gx: cell.x, gy: cell.y, lectura: lecturas[i], used: false });
    }

    // Mecánicas de aventura inspiradas en los juegos de exploración/puzzle:
    // trampas, cofres, puntos de control y puertas que exigen responder preguntas.
    const qlist = level.quiz_bloqueo || [];
    const gateCount = Math.min(Math.max(0, (dif.bloqueados || 0) - 1), qlist.length, 3);
    for (let i = 0; i < gateCount; i++) {
      const cell = randomEmptyCell();
      if (cell) {
        questionGates.push({ gx: cell.x, gy: cell.y, quiz: qlist[i % qlist.length], open: false });
        walls.add(cell.x + ',' + cell.y);
      }
    }

    // Rompecabezas central del nivel: activa los sellos del castillo para abrir la salida.
    // Cada sello contiene una pregunta del tema; no se abre la puerta final hasta completar todos.
    const puzzleQuizzes = qlist.length ? qlist : [{ q: '¿Cuál es la mejor decisión estratégica?', opciones: ['Copiar a todos', 'Crear una ventaja sostenible', 'Esperar sin investigar'], correcta: 1 }];
    for (let i = 0; i < puzzleCount; i++) {
      const cell = randomEmptyCell();
      if (cell) {
        puzzleSwitches.push({ gx: cell.x, gy: cell.y, quiz: puzzleQuizzes[i % puzzleQuizzes.length], active: false, index: i + 1 });
      }
    }
    door.puzzleRequired = puzzleSwitches.length;

    const hazardCount = Math.min(2 + Math.floor((level.num || 1) / 2), 7);
    for (let i = 0; i < hazardCount; i++) {
      const cell = randomEmptyCell();
      if (cell) hazards.push({ gx: cell.x, gy: cell.y, type: i % 2 === 0 ? 'fire' : 'spikes', active: true, phase: Math.random() * Math.PI * 2, cageId: i });
    }

    const chestCount = Math.min(1 + Math.floor((level.num || 1) / 3), 4);
    for (let i = 0; i < chestCount; i++) {
      const cell = randomEmptyCell();
      if (cell) chests.push({ gx: cell.x, gy: cell.y, opened: false, quiz: qlist.length ? qlist[(i + 1) % qlist.length] : null, reward: i === chestCount - 1 ? 'power' : 'gem' });
    }

    // Un checkpoint por nivel medio/alto. Sirve como refugio y punto de reaparición.
    if ((level.num || 1) >= 3) {
      const cell = randomEmptyCell();
      if (cell) checkpoints.push({ gx: cell.x, gy: cell.y, active: false });
    }

    for (let i = 0; i < (dif.enemigos || 0); i++) placeEnemy(i);
    // Vincula cada perseguidor verde a una trampa/jaula concreta.
    enemies.filter(e => e.chase).forEach((e, i) => { e.caged = true; e.active = false; e.cageId = i % Math.max(1, hazards.length); });
    if ((level.num || 1) === 9) placeBoss();
  }

  function randomEmptyCell() {
    for (let att = 0; att < 100; att++) {
      const x = 2 + Math.floor(Math.random() * (COLS - 4));
      const y = 2 + Math.floor(Math.random() * (ROWS - 4));
      if (isOccupied(x, y)) continue;
      if (isStartSafeZone(x, y)) continue;
      return { x, y };
    }
    return null;
  }

  function isStartSafeZone(x, y) {
    // Zona segura inicial: el jugador puede leer, observar el mapa y pensar sin persecuciones inmediatas.
    return x <= 3 && y <= 3;
  }

  function isOccupied(x, y) {
    const key = x + ',' + y;
    if (walls.has(key)) return true;
    if (tokens.some(t => !t.collected && t.gx === x && t.gy === y)) return true;
    if (portals.some(p => (p.a.x === x && p.a.y === y) || (p.b.x === x && p.b.y === y))) return true;
    if (rocks.some(r => r.gx === x && r.gy === y)) return true;
    if (books.some(b => !b.used && b.gx === x && b.gy === y)) return true;
    if (hazards && hazards.some(h => h.gx === x && h.gy === y)) return true;
    if (checkpoints && checkpoints.some(c => c.gx === x && c.gy === y)) return true;
    if (chests && chests.some(c => !c.opened && c.gx === x && c.gy === y)) return true;
    if (puzzleSwitches && puzzleSwitches.some(s => !s.active && s.gx === x && s.gy === y)) return true;
    if (enemies && enemies.some(e => e.gx === x && e.gy === y)) return true;
    if (isStartSafeZone(x, y)) return true;
    if (x === door.gx && y === door.gy) return true;
    return false;
  }

  function placeEnemy(idx) {
    const cell = randomEmptyCell();
    if (!cell) return;
    const type = ['patrol_h', 'patrol_v', 'random', 'snake'][idx % 4];
    enemies.push({
      gx: cell.x, gy: cell.y,
      px: cell.x * CELL, py: cell.y * CELL,
      fromX: cell.x * CELL, fromY: cell.y * CELL,
      toX: cell.x * CELL, toY: cell.y * CELL,
      dir: type === 'patrol_h' ? 'right' : 'down',
      type, moving: false, moveT: 0,
      speed: type === 'snake' ? 135 : 180 + Math.random() * 100,
      chase: type === 'snake'
    });
  }

  function placeBoss() {
    const cell = randomEmptyCell();
    if (!cell) return;
    boss = { gx: cell.x, gy: cell.y, hp: 3, maxHp: 3, px: cell.x * CELL, py: cell.y * CELL, fromX: cell.x * CELL, fromY: cell.y * CELL, toX: cell.x * CELL, toY: cell.y * CELL, moving: false, moveT: 0, speed: 150 };
  }

  // ============================================================
  // LOOP
  // ============================================================
  function loop() {
    if (!running) return;
    const now = performance.now();
    const dt = Math.min(now - lastFrame, 60);
    lastFrame = now;
    if (!paused && !quizActive) update(dt);
    render();
    rafHandle = requestAnimationFrame(loop);
  }

  function update(dt) {
    if (portalCooldown > 0) portalCooldown -= dt;
    if (invulnerableMs > 0) invulnerableMs -= dt;
    if (turboMs > 0) {
      turboMs -= dt;
      if (turboMs <= 0) MOVE_MS = MOVE_MS_NORMAL;
    }
    if (shieldMs > 0) shieldMs -= dt;

    // Movimiento del jugador
    if (player.moving) {
      player.moveT += dt;
      player.walkFrame = (player.walkFrame + dt * 0.02) % 4;
      const p = Math.min(player.moveT / MOVE_MS, 1);
      player.px = player.fromX + (player.toX - player.fromX) * p;
      player.py = player.fromY + (player.toY - player.fromY) * p;
      if (p >= 1) {
        player.moving = false;
        player.px = player.toX; player.py = player.toY;
        onArriveCell();
      }
    } else {
      let ndir = null;
      if (keys['ArrowUp'] || keys['w'] || keys['W']) ndir = 'up';
      else if (keys['ArrowDown'] || keys['s'] || keys['S']) ndir = 'down';
      else if (keys['ArrowLeft'] || keys['a'] || keys['A']) ndir = 'left';
      else if (keys['ArrowRight'] || keys['d'] || keys['D']) ndir = 'right';
      if (ndir) tryMove(ndir);
    }

    // Movimiento de rocas
    rocks.forEach(r => {
      if (r.moving) {
        r.moveT += dt;
        const p = Math.min(r.moveT / MOVE_MS_NORMAL, 1);
        r.px = r.fromX + (r.toX - r.fromX) * p;
        r.py = r.fromY + (r.toY - r.fromY) * p;
        if (p >= 1) { r.moving = false; r.px = r.toX; r.py = r.toY; }
      }
    });

    enemies.forEach(e => updateEnemy(e, dt));
    if (boss && !bossDefeated) updateBoss(dt);

    currentTokenHover = null;
    for (const t of tokens) {
      if (t.collected) continue;
      const dist = Math.abs(t.gx - player.gx) + Math.abs(t.gy - player.gy);
      if (dist <= 1) { currentTokenHover = t; break; }
      t.glow = 0;
    }
    if (currentTokenHover) currentTokenHover.glow = 1;

    particles = particles.filter(p => {
      p.life -= dt;
      p.px += p.vx * dt / 1000;
      p.py += p.vy * dt / 1000;
      p.vy += 300 * dt / 1000;
      return p.life > 0;
    });
    messages = messages.filter(m => {
      m.life -= dt;
      m.py -= 30 * dt / 1000;
      return m.life > 0;
    });
  }

  function tryMove(dir) {
    const deltas = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
    const [dx, dy] = deltas[dir];
    const nx = player.gx + dx;
    const ny = player.gy + dy;
    const key = nx + ',' + ny;
    player.dir = dir; // Actualiza dirección aunque no se mueva

    // Puerta de conocimiento: se responde desde la casilla adyacente, como un obstáculo de puzzle.
    const qgateTarget = questionGates.find(g => !g.open && g.gx === nx && g.gy === ny);
    if (qgateTarget) { openGateQuiz(qgateTarget); return; }

    // Mecanismo del rompecabezas: cada sello se resuelve al pisarlo.
    const puzzle = puzzleSwitches.find(s => !s.active && s.gx === nx && s.gy === ny);
    if (puzzle) { openPuzzleQuiz(puzzle); return; }

    // Puerta final: solo se abre cuando el rompecabezas central está resuelto.
    if (nx === door.gx && ny === door.gy) {
      if (door.open && (!boss || bossDefeated)) return completeLevel();
      const left = puzzleSwitches.filter(s => !s.active).length;
      addMessage(left ? '🔒 Resuelve los ' + left + ' mecanismos restantes' : '¡Derrota al guardián y reúne los conceptos!', door.gx, door.gy, '#ff5c5c');
      return;
    }
    if (walls.has(key)) return;
    if (nx < 0 || nx >= COLS || ny < 0 || ny >= ROWS) return;

    // ¿Roca en el camino? Intentar empujar
    const rock = rocks.find(r => r.gx === nx && r.gy === ny && !r.moving);
    if (rock) {
      const rnx = nx + dx;
      const rny = ny + dy;
      // Verificar que la celda detrás de la roca esté libre
      const rockKey = rnx + ',' + rny;
      if (walls.has(rockKey)) return;
      if (rnx < 0 || rnx >= COLS || rny < 0 || rny >= ROWS) return;
      if (rocks.some(r2 => r2.gx === rnx && r2.gy === rny)) return;
      if (tokens.some(t => !t.collected && t.gx === rnx && t.gy === rny)) return;
      if (portals.some(p => (p.a.x === rnx && p.a.y === rny) || (p.b.x === rnx && p.b.y === rny))) return;
      if (books.some(b => !b.used && b.gx === rnx && b.gy === rny)) return;
      if (enemies.some(e => e.gx === rnx && e.gy === rny)) return;
      if (rnx === door.gx && rny === door.gy) return;
      // OK empujar
      rock.gx = rnx; rock.gy = rny;
      rock.moving = true; rock.moveT = 0;
      rock.fromX = rock.px; rock.fromY = rock.py;
      rock.toX = rnx * CELL; rock.toY = rny * CELL;
      spawnParticles(rock.px + CELL / 2, rock.py + CELL / 2, '#8a6a4a', 4);
    }

    player.gx = nx; player.gy = ny;
    player.moving = true; player.moveT = 0;
    player.fromX = player.px; player.fromY = player.py;
    player.toX = nx * CELL; player.toY = ny * CELL;
  }

  function onArriveCell() {
    if (portalCooldown <= 0) {
      for (const p of portals) {
        if (p.a.x === player.gx && p.a.y === player.gy) { teleport(p.b); return; }
        if (p.b.x === player.gx && p.b.y === player.gy) { teleport(p.a); return; }
      }
    }
    // Trampas: obligan a leer el riesgo y responder si se pisa una.
    const hazard = hazards.find(h => h.gx === player.gx && h.gy === player.gy && h.active);
    if (hazard) { triggerHazard(hazard); return; }

    // Checkpoint: guarda el nuevo punto de reaparición.
    const cp = checkpoints.find(c => c.gx === player.gx && c.gy === player.gy);
    if (cp && !cp.active) {
      cp.active = true;
      checkpointRespawn = { gx: cp.gx, gy: cp.gy };
      addMessage('⚑ PUNTO DE CONTROL', cp.gx, cp.gy, '#7dd6ff');
      score += 40;
      updateHUD();
    }

    // Rompecabezas central: pregunta académica para activar el mecanismo.
    const puzzle = puzzleSwitches.find(s => !s.active && s.gx === player.gx && s.gy === player.gy);
    if (puzzle) { openPuzzleQuiz(puzzle); return; }

    // Cofre: pregunta académica + recompensa.
    const chest = chests.find(c => !c.opened && c.gx === player.gx && c.gy === player.gy);
    if (chest) { openChestQuiz(chest); return; }

    // Libro?
    for (const b of books) {
      if (!b.used && b.gx === player.gx && b.gy === player.gy) {
        openReading(b);
        return;
      }
    }
    // Token?
    for (const t of tokens) {
      if (t.collected) continue;
      if (t.gx === player.gx && t.gy === player.gy) { interactToken(t); return; }
    }
  }

  function teleport(target) {
    spawnParticles(player.px + CELL / 2, player.py + CELL / 2, '#7dd6ff', 15);
    player.gx = target.x; player.gy = target.y;
    player.px = target.x * CELL; player.py = target.y * CELL;
    player.fromX = player.px; player.fromY = player.py;
    player.toX = player.px; player.toY = player.py;
    portalCooldown = 800;
    addMessage('¡Portal!', target.x, target.y, '#7dd6ff');
    spawnParticles(player.px + CELL / 2, player.py + CELL / 2, '#7dd6ff', 15);
  }

  function interactToken(t) {
    if (t.bloqueado && !t.unlockedByGroup) { openTokenQuiz(t); return; }
    collectToken(t);
  }

  function collectToken(t) {
    t.collected = true;
    if (t.correct) {
      combo++; maxCombo = Math.max(maxCombo, combo);
      const pts = 50 + combo * 5 + (t.bloqueado ? 50 : 0);
      score += pts; collectedCorrect++;
      addMessage('+' + pts + (combo > 1 ? ' x' + combo : ''), t.gx, t.gy, '#4dff88');
      spawnParticles(t.gx * CELL + CELL / 2, t.gy * CELL + CELL / 2, '#4dff88', 12);
      // Los conceptos son recompensa/retroalimentación; la puerta depende del rompecabezas central.
    } else {
      combo = 0;
      score = Math.max(0, score - 30); mistakes++;
      addMessage('-30 · concepto incorrecto', t.gx, t.gy, '#ff5c5c');
      spawnParticles(t.gx * CELL + CELL / 2, t.gy * CELL + CELL / 2, '#ff5c5c', 8);
      lives--;
      if (lives <= 0) return finish('Demasiadas respuestas incorrectas');
    }
    updateHUD();
  }

  // ============================================================
  // MODAL: QUIZ DE TOKEN, LECTURA, ESCAPE
  // ============================================================
  function openPuzzleQuiz(puzzle) {
    if (quizActive || puzzle.active) return;
    quizActive = true;
    const overlay = document.getElementById('quiz-overlay');
    const q = puzzle.quiz;
    if (!overlay || !q) { activatePuzzleSwitch(puzzle); return; }
    overlay.innerHTML = `<div class="quiz-modal"><div class="quiz-header">🧩 Mecanismo ${puzzle.index} · Rompecabezas del castillo</div><div class="quiz-question">${escapeHtml(q.q)}</div><div class="quiz-options">${q.opciones.map((o,i)=>`<button class="quiz-opt" data-i="${i}">${escapeHtml(o)}</button>`).join('')}</div><p class="quiz-hint">Resuelve este mecanismo para acercarte a la puerta. Los conceptos del nivel son tus pistas.</p></div>`;
    overlay.style.display = 'flex';
    overlay.querySelectorAll('.quiz-opt').forEach(btn => btn.onclick = () => {
      const i = Number(btn.dataset.i);
      closeModal();
      if (i === q.correcta) activatePuzzleSwitch(puzzle);
      else {
        lives--; mistakes++; combo = 0; score = Math.max(0, score - 15);
        addMessage('❌ El mecanismo permanece cerrado', player.gx, player.gy, '#ff5c5c');
        updateHUD();
        if (lives <= 0) finish('Sin vidas por resolver el rompecabezas');
      }
    });
  }

  function activatePuzzleSwitch(puzzle) {
    puzzle.active = true;
    score += 80; combo++; maxCombo = Math.max(maxCombo, combo);
    spawnParticles(puzzle.gx * CELL + CELL / 2, puzzle.gy * CELL + CELL / 2, '#ffd94d', 24);
    addMessage('🧩 ¡Mecanismo activado!', puzzle.gx, puzzle.gy, '#ffd94d');
    const remaining = puzzleSwitches.filter(s => !s.active).length;
    if (remaining === 0) {
      door.open = true;
      addMessage('🚪 ¡ROMPECABEZAS RESUELTO! PUERTA ABIERTA', door.gx, door.gy, '#4dff88');
      spawnParticles(door.gx * CELL + CELL / 2, door.gy * CELL + CELL / 2, '#4dff88', 30);
    }
    updateHUD();
  }

  function openGateQuiz(gate) {
    quizActive = true;
    const overlay = document.getElementById('quiz-overlay');
    if (!overlay || !gate.quiz) { gate.open = true; walls.delete(gate.gx + ',' + gate.gy); closeModal(); return; }
    const q = gate.quiz;
    overlay.innerHTML = `<div class="quiz-modal"><div class="quiz-header">🏰 Puerta del conocimiento</div><div class="quiz-question">${escapeHtml(q.q)}</div><div class="quiz-options">${q.opciones.map((o,i)=>`<button class="quiz-opt" data-i="${i}">${escapeHtml(o)}</button>`).join('')}</div><p class="quiz-hint">Correcto: la puerta se abre y obtienes +60. Incorrecto: -1 vida.</p></div>`;
    overlay.style.display='flex';
    overlay.querySelectorAll('.quiz-opt').forEach(btn=>btn.onclick=()=>{
      const i=Number(btn.dataset.i); closeModal();
      if(i===q.correcta){ gate.open=true; walls.delete(gate.gx+','+gate.gy); score+=60; addMessage('🔓 ¡Puerta abierta!',gate.gx,gate.gy,'#4dff88'); spawnParticles(gate.gx*CELL+CELL/2,gate.gy*CELL+CELL/2,'#4dff88',18); updateHUD(); }
      else { lives--; score=Math.max(0,score-20); addMessage('❌ La puerta sigue cerrada',player.gx,player.gy,'#ff5c5c'); updateHUD(); if(lives<=0) finish('Sin vidas por preguntas'); }
    });
  }

  function openChestQuiz(chest) {
    quizActive=true;
    const overlay=document.getElementById('quiz-overlay');
    if(!overlay || !chest.quiz){ chest.opened=true; closeModal(); return; }
    const q=chest.quiz;
    overlay.innerHTML=`<div class="quiz-modal"><div class="quiz-header">🧰 Cofre del explorador</div><div class="quiz-question">${escapeHtml(q.q)}</div><div class="quiz-options">${q.opciones.map((o,i)=>`<button class="quiz-opt" data-i="${i}">${escapeHtml(o)}</button>`).join('')}</div><p class="quiz-hint">Una buena respuesta convierte el conocimiento en una recompensa.</p></div>`;
    overlay.style.display='flex';
    overlay.querySelectorAll('.quiz-opt').forEach(btn=>btn.onclick=()=>{
      const i=Number(btn.dataset.i); closeModal();
      if(i===q.correcta){ chest.opened=true; score+=100; combo++; addMessage('💎 ¡Cofre abierto! +100',chest.gx,chest.gy,'#ffd94d'); spawnParticles(chest.gx*CELL+CELL/2,chest.gy*CELL+CELL/2,'#ffd94d',24); if(chest.reward==='power') powers.push(['dinamita','turbo','escudo'][level.num%3]); renderPowerBar(); updateHUD(); }
      else { score=Math.max(0,score-25); mistakes++; addMessage('-25 · vuelve a intentarlo más adelante',chest.gx,chest.gy,'#ff5c5c'); updateHUD(); }
    });
  }

  function triggerHazard(hazard) {
    if (invulnerableMs>0) return;
    releaseCage(hazard.cageId);
    quizActive=true;
    const overlay=document.getElementById('quiz-overlay');
    const qlist=level.quiz_bloqueo||[];
    const q=qlist.length ? qlist[Math.floor(Math.random()*qlist.length)] : null;
    if(!overlay || !q){ applyHazardDamage(hazard); return; }
    overlay.innerHTML=`<div class="quiz-modal escape"><div class="quiz-header escape">⚠️ ${hazard.type==='fire'?'Trampa de fuego':'Trampa de lanzas'}</div><div class="quiz-question">${escapeHtml(q.q)}</div><div class="quiz-options">${q.opciones.map((o,i)=>`<button class="quiz-opt" data-i="${i}">${escapeHtml(o)}</button>`).join('')}</div><p class="quiz-hint">Correcto: desactivas la trampa. Incorrecto: pierdes 1 vida.</p></div>`;
    overlay.style.display='flex';
    overlay.querySelectorAll('.quiz-opt').forEach(btn=>btn.onclick=()=>{ const i=Number(btn.dataset.i); closeModal(); if(i===q.correcta){ hazard.active=false; score+=35; addMessage('🧠 ¡Trampa desactivada!',hazard.gx,hazard.gy,'#4dff88'); updateHUD(); } else applyHazardDamage(hazard); });
  }

  function releaseCage(cageId) {
    enemies.forEach(e => {
      if (e.chase && e.caged && e.cageId === cageId) {
        e.caged = false; e.active = true;
        addMessage('🐍 ¡JAULA ABIERTA!', e.gx, e.gy, '#8dff6a');
        spawnParticles(e.px + CELL / 2, e.py + CELL / 2, '#8dff6a', 18);
      }
    });
  }

  function applyHazardDamage(hazard) {
    lives--; combo=0; score=Math.max(0,score-35); hazard.active=false; updateHUD();
    addMessage('💥 ¡Has recibido daño!',player.gx,player.gy,'#ff5c5c');
    if(lives<=0) return finish('Las trampas te dejaron sin vidas');
    respawnAtCheckpoint();
  }

  function respawnAtCheckpoint() {
    player.gx=checkpointRespawn.gx; player.gy=checkpointRespawn.gy;
    player.px=player.gx*CELL; player.py=player.gy*CELL; player.moving=false; invulnerableMs=1600;
  }

  function openTokenQuiz(token) {
    quizActive = true;
    const overlay = document.getElementById('quiz-overlay');
    if (!overlay) { collectToken(token); return; }
    const q = token.quiz;
    overlay.innerHTML = `
      <div class="quiz-modal">
        <div class="quiz-header">🔒 Diamante bloqueado</div>
        <div class="quiz-question">${escapeHtml(q.q)}</div>
        <div class="quiz-options">
          ${q.opciones.map((o, i) => `<button class="quiz-opt" data-i="${i}">${escapeHtml(o)}</button>`).join('')}
        </div>
        <p class="quiz-hint">💡 Correcto: +50 bonus. Incorrecto: -20 y sigue bloqueado.</p>
      </div>`;
    overlay.style.display = 'flex';
    overlay.querySelectorAll('.quiz-opt').forEach(btn => {
      btn.onclick = () => {
        const i = parseInt(btn.dataset.i, 10);
        closeModal();
        if (i === q.correcta) {
          tokens.forEach(t => { if (t.bloqueado && t.quiz === q) t.unlockedByGroup = true; });
          addMessage('¡Correcto! +50', player.gx, player.gy, '#4dff88');
          collectToken(token);
        } else {
          score = Math.max(0, score - 20);
          addMessage('-20 respuesta incorrecta', player.gx, player.gy, '#ff5c5c');
          spawnParticles(player.px + CELL / 2, player.py + CELL / 2, '#ff5c5c', 12);
          updateHUD();
        }
      };
    });
  }

  function openReading(book) {
    quizActive = true;
    const overlay = document.getElementById('quiz-overlay');
    if (!overlay) return;
    const l = book.lectura;
    const poder = cfgPowers[l.poder] || { icono: '⭐', nombre: l.poder };
    overlay.innerHTML = `
      <div class="quiz-modal reading">
        <div class="quiz-header">📖 Lectura del maestro estratega</div>
        <div class="reading-text">${escapeHtml(l.texto)}</div>
        <div class="quiz-question">${escapeHtml(l.quiz.q)}</div>
        <div class="quiz-options">
          ${l.quiz.opciones.map((o, i) => `<button class="quiz-opt" data-i="${i}">${escapeHtml(o)}</button>`).join('')}
        </div>
        <p class="quiz-hint">💡 Correcto: ganas el poder ${poder.icono} <b>${poder.nombre}</b>. Incorrecto: -10 puntos.</p>
      </div>`;
    overlay.style.display = 'flex';
    overlay.querySelectorAll('.quiz-opt').forEach(btn => {
      btn.onclick = () => {
        const i = parseInt(btn.dataset.i, 10);
        closeModal();
        book.used = true;
        if (i === l.quiz.correcta) {
          powers.push(l.poder);
          score += 30;
          addMessage('¡Ganaste ' + poder.icono + ' ' + poder.nombre + '!', player.gx, player.gy, '#ffd94d');
          spawnParticles(player.px + CELL / 2, player.py + CELL / 2, '#ffd94d', 15);
          renderPowerBar();
        } else {
          score = Math.max(0, score - 10);
          addMessage('-10 respuesta incorrecta', player.gx, player.gy, '#ff5c5c');
        }
        updateHUD();
      };
    });
  }

  function openEscapeQuiz() {
    quizActive = true;
    const overlay = document.getElementById('quiz-overlay');
    if (!overlay) { applyEnemyDamage(); return; }
    const quizzes = level.quiz_bloqueo || [{ q: '¿Cuál es el propósito de la dirección estratégica?', opciones: ['Ganar dinero rápido', 'Crear ventaja competitiva sostenible', 'Copiar competidores'], correcta: 1 }];
    const q = quizzes[Math.floor(Math.random() * quizzes.length)];
    overlay.innerHTML = `
      <div class="quiz-modal escape">
        <div class="quiz-header escape">⚠️ ¡Te atrapó un enemigo! Escapa respondiendo</div>
        <div class="quiz-question">${escapeHtml(q.q)}</div>
        <div class="quiz-options">
          ${q.opciones.map((o, i) => `<button class="quiz-opt" data-i="${i}">${escapeHtml(o)}</button>`).join('')}
        </div>
        <p class="quiz-hint">Correcto: escapa +25 pts + escudo 2s. Incorrecto: -1 vida.</p>
      </div>`;
    overlay.style.display = 'flex';
    overlay.querySelectorAll('.quiz-opt').forEach(btn => {
      btn.onclick = () => {
        const i = parseInt(btn.dataset.i, 10);
        closeModal();
        if (i === q.correcta) {
          addMessage('¡Escapaste! +25 (escudo 2s)', player.gx, player.gy, '#4dff88');
          score += 25;
          invulnerableMs = 2000;
          spawnParticles(player.px + CELL / 2, player.py + CELL / 2, '#4dff88', 15);
          updateHUD();
        } else {
          applyEnemyDamage();
        }
      };
    });
  }

  function applyEnemyDamage() {
    lives--;
    score = Math.max(0, score - 20);
    combo = 0;
    updateHUD();
    if (lives <= 0) return finish('Te atraparon los enemigos');
    player.gx = 1; player.gy = 1;
    player.px = CELL; player.py = CELL;
    player.moving = false;
    invulnerableMs = 1500; // Breve gracia
  }

  function closeModal() {
    const overlay = document.getElementById('quiz-overlay');
    if (overlay) overlay.style.display = 'none';
    quizActive = false;
  }

  // ============================================================
  // PODERES
  // ============================================================
  function usePower(idx) {
    if (idx >= powers.length) return;
    const p = powers[idx];
    const cfg = cfgPowers[p];
    if (!cfg) return;
    if (p === 'dinamita') {
      // Destruye roca o muro al frente
      const deltas = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
      const [dx, dy] = deltas[player.dir];
      const tx = player.gx + dx, ty = player.gy + dy;
      const tkey = tx + ',' + ty;
      const rockIdx = rocks.findIndex(r => r.gx === tx && r.gy === ty);
      if (rockIdx !== -1) {
        rocks.splice(rockIdx, 1);
        addMessage('💥 ¡Roca destruida!', tx, ty, '#ffd94d');
        spawnParticles(tx * CELL + CELL / 2, ty * CELL + CELL / 2, '#ffd94d', 25);
        powers.splice(idx, 1); renderPowerBar();
      } else if (walls.has(tkey) && !isBorderWall(tx, ty)) {
        walls.delete(tkey);
        addMessage('💥 ¡Muro destruido!', tx, ty, '#ffd94d');
        spawnParticles(tx * CELL + CELL / 2, ty * CELL + CELL / 2, '#ffd94d', 25);
        powers.splice(idx, 1); renderPowerBar();
      } else {
        addMessage('Necesitas apuntar a una roca o muro', player.gx, player.gy, '#ff5c5c');
      }
    } else if (p === 'turbo') {
      turboMs = 5000;
      MOVE_MS = 65;
      addMessage('⚡ ¡Turbo activado 5s!', player.gx, player.gy, '#ffd94d');
      powers.splice(idx, 1); renderPowerBar();
    } else if (p === 'escudo') {
      shieldMs = 5000;
      invulnerableMs = 5000;
      addMessage('🛡️ ¡Escudo activado 5s!', player.gx, player.gy, '#7dd6ff');
      powers.splice(idx, 1); renderPowerBar();
    }
  }

  function isBorderWall(x, y) {
    return x === 0 || x === COLS - 1 || y === 0 || y === ROWS - 1;
  }

  function renderPowerBar() {
    const bar = document.getElementById('lab-power-bar');
    if (!bar) return;
    if (powers.length === 0) { bar.innerHTML = '<span class="power-empty">Sin poderes (recoge libros 📖)</span>'; return; }
    bar.innerHTML = powers.map((p, i) => {
      const cfg = cfgPowers[p] || { icono: '⭐', nombre: p };
      return `<button class="power-slot" data-idx="${i}" title="${escapeHtml(cfg.nombre)} — Presiona ${i + 1}">${cfg.icono} <span class="power-key">${i + 1}</span></button>`;
    }).join('');
    bar.querySelectorAll('.power-slot').forEach(b => {
      b.onclick = () => usePower(parseInt(b.dataset.idx, 10));
    });
  }

  // ============================================================
  // ENEMIGOS
  // ============================================================
  function updateEnemy(e, dt) {
    if (e.chase && (!e.active || e.caged)) return;
    if (e.moving) {
      e.moveT += dt;
      const p = Math.min(e.moveT / e.speed, 1);
      e.px = e.fromX + (e.toX - e.fromX) * p;
      e.py = e.fromY + (e.toY - e.fromY) * p;
      if (p >= 1) { e.moving = false; e.px=e.toX; e.py=e.toY; }
      if (e.gx===player.gx && e.gy===player.gy) hitByEnemy();
      return;
    }
    let dir=e.dir;
    const deltas={up:[0,-1],down:[0,1],left:[-1,0],right:[1,0]};
    if(e.chase && Math.random()<0.72){
      const dx=player.gx-e.gx, dy=player.gy-e.gy;
      if(Math.abs(dx)>=Math.abs(dy) && dx!==0) dir=dx>0?'right':'left';
      else if(dy!==0) dir=dy>0?'down':'up';
    } else if(e.type==='random'){
      const dirs=['up','down','left','right']; dir=dirs[Math.floor(Math.random()*4)];
    }
    const [dx,dy]=deltas[dir]; const nx=e.gx+dx, ny=e.gy+dy; const key=nx+','+ny;
    if(walls.has(key) || rocks.some(r=>r.gx===nx&&r.gy===ny) || nx<1||nx>=COLS-1||ny<1||ny>=ROWS-1 || questionGates.some(g=>!g.open&&g.gx===nx&&g.gy===ny)){
      const dirs=['up','down','left','right'].filter(d=>{const [ddx,ddy]=deltas[d], xx=e.gx+ddx, yy=e.gy+ddy; return xx>=1&&xx<COLS-1&&yy>=1&&yy<ROWS-1&&!walls.has(xx+','+yy)&&!rocks.some(r=>r.gx===xx&&r.gy===yy);});
      if(dirs.length) dir=dirs[Math.floor(Math.random()*dirs.length)]; else return;
    }
    const [fx,fy]=deltas[dir]; const nx2=e.gx+fx, ny2=e.gy+fy;
    e.dir=dir; e.gx=nx2; e.gy=ny2; e.moving=true; e.moveT=0; e.fromX=e.px; e.fromY=e.py; e.toX=nx2*CELL; e.toY=ny2*CELL;
    if(e.gx===player.gx&&e.gy===player.gy) hitByEnemy();
  }

  function updateBoss(dt) {
    if (boss.moving) {
      boss.moveT += dt; const p=Math.min(boss.moveT/boss.speed,1);
      boss.px=boss.fromX+(boss.toX-boss.fromX)*p; boss.py=boss.fromY+(boss.toY-boss.fromY)*p;
      if(p>=1){boss.moving=false; boss.px=boss.toX; boss.py=boss.toY;}
      if(boss.gx===player.gx&&boss.gy===player.gy) openBossQuiz();
      return;
    }
    const dx=player.gx-boss.gx, dy=player.gy-boss.gy;
    let dir=Math.abs(dx)>=Math.abs(dy)?(dx>0?'right':'left'):(dy>0?'down':'up');
    const ds={up:[0,-1],down:[0,1],left:[-1,0],right:[1,0]}; const [sx,sy]=ds[dir]; const nx=boss.gx+sx, ny=boss.gy+sy;
    if(nx<1||nx>=COLS-1||ny<1||ny>=ROWS-1||walls.has(nx+','+ny)||rocks.some(r=>r.gx===nx&&r.gy===ny)) return;
    boss.gx=nx; boss.gy=ny; boss.moving=true; boss.moveT=0; boss.fromX=boss.px; boss.fromY=boss.py; boss.toX=nx*CELL; boss.toY=ny*CELL;
  }

  function openBossQuiz() {
    if(quizActive||invulnerableMs>0) return;
    quizActive=true; const overlay=document.getElementById('quiz-overlay'); const qlist=level.quiz_bloqueo||[]; const q=qlist[Math.floor(Math.random()*qlist.length)];
    if(!overlay||!q){ applyEnemyDamage(); return; }
    overlay.innerHTML=`<div class="quiz-modal escape"><div class="quiz-header escape">👑 Guardián final · ${boss.hp}/${boss.maxHp}</div><div class="quiz-question">${escapeHtml(q.q)}</div><div class="quiz-options">${q.opciones.map((o,i)=>`<button class="quiz-opt" data-i="${i}">${escapeHtml(o)}</button>`).join('')}</div><p class="quiz-hint">Cada respuesta correcta debilita al guardián. Necesitas 3 aciertos.</p></div>`;
    overlay.style.display='flex';
    overlay.querySelectorAll('.quiz-opt').forEach(btn=>btn.onclick=()=>{const i=Number(btn.dataset.i); closeModal(); if(i===q.correcta){boss.hp--; score+=90; invulnerableMs=1200; addMessage('⚔️ ¡Golpe estratégico!',boss.gx,boss.gy,'#ffd94d'); spawnParticles(boss.gx*CELL+CELL/2,boss.gy*CELL+CELL/2,'#ffd94d',25); if(boss.hp<=0){bossDefeated=true; score+=250; addMessage('👑 ¡GUARDIÁN DERROTADO!',boss.gx,boss.gy,'#4dff88');} updateHUD();} else applyEnemyDamage();});
  }

  function hitByEnemy() {
    if (quizActive) return;
    if (invulnerableMs > 0) return;
    combo = 0;
    openEscapeQuiz();
  }

  function completeLevel() {
    if (levelCompleted) return;
    levelCompleted = true;
    const timeBonus = timeLeft * 5;
    const comboBonus = maxCombo * 10;
    const total = 300 + timeBonus + comboBonus;
    score += total;
    addMessage('¡NIVEL COMPLETADO! +' + total, 10, 6, '#ffd94d');
    setTimeout(() => finish('completed'), 900);
  }

  function finish(reason) {
    running = false;
    if (timerHandle) clearInterval(timerHandle);
    if (rafHandle) cancelAnimationFrame(rafHandle);
    const dur = Math.floor((Date.now() - startTime) / 1000);
    const finalScore = Math.max(0, score);
    setTimeout(() => onEnd(finalScore, dur, levelCompleted), 400);
  }

  function startTimer() {
    if (timerHandle) clearInterval(timerHandle);
    timerHandle = setInterval(() => {
      if (!running || paused || quizActive) return;
      timeLeft--;
      updateHUD();
      if (timeLeft <= 0) {
        lives--;
        combo = 0;
        score = Math.max(0, score - 25);
        timeLeft = Number(cfgGame.tiempo_reinicio_por_vida_seg || 20);
        addMessage('⏰ ¡Se acabó el tiempo! -1 vida · +' + timeLeft + 's', player.gx, player.gy, '#ffcc66');
        updateHUD();
        if (lives <= 0) finish('Sin vidas por tiempo');
      }
    }, 1000);
  }

  // ============================================================
  // RENDER
  // ============================================================
  function render() {
    // Fondo y suelo con textura: nada de cuadrícula tipo Pac-Man.
    const grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
    grad.addColorStop(0, currentTheme.bg1);
    grad.addColorStop(1, currentTheme.bg2);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    for (let y = 0; y < ROWS; y++) {
      for (let x = 0; x < COLS; x++) {
        drawTerrainTile(x, y);
      }
    }

    // Muros como bloques de piedra de una fortaleza/ruina.
    walls.forEach(key => {
      const [x, y] = key.split(',').map(Number);
      drawStoneWall(x, y);
    });

    // Pequeños restos de vegetación/raíces para romper la geometría perfecta.
    drawMapDetails();
    drawSafeStartZone();

    // Etiqueta discreta de la escena.
    ctx.fillStyle = 'rgba(255,245,215,0.58)';
    ctx.font = 'bold 11px Georgia, serif';
    ctx.textAlign = 'left';
    ctx.fillText('✦ ' + currentTheme.label, 10, 14);

    // Portales
    portals.forEach(p => {
      drawPortal(p.a.x * CELL, p.a.y * CELL, p.color.a);
      drawPortal(p.b.x * CELL, p.b.y * CELL, p.color.b);
    });

    // Rocas
    rocks.forEach(r => drawRock(r));

    // Trampas, checkpoints y cofres
    hazards.forEach(h => { if (h.active) drawHazard(h); });
    checkpoints.forEach(c => drawCheckpoint(c));
    chests.forEach(c => { if (!c.opened) drawChest(c); });
    questionGates.forEach(g => { if (!g.open) drawQuestionGate(g); });
    puzzleSwitches.forEach(s => drawPuzzleSwitch(s));

    // Libros
    books.forEach(b => { if (!b.used) drawBook(b); });

    // Puerta de salida: arco de piedra y madera, estilo ruina medieval.
    drawGate(door.gx, door.gy, door.open);

    tokens.forEach(t => { if (!t.collected) drawToken(t); });
    enemies.forEach(e => drawEnemy(e));
    if (boss && !bossDefeated) drawBoss();
    drawPlayer();

    particles.forEach(p => {
      ctx.fillStyle = p.color;
      ctx.globalAlpha = Math.max(0, p.life / 500);
      ctx.beginPath();
      ctx.arc(p.px, p.py, p.r, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.globalAlpha = 1;

    messages.forEach(m => {
      ctx.font = 'bold 14px system-ui';
      ctx.textAlign = 'center';
      ctx.globalAlpha = Math.min(1, m.life / 800);
      ctx.fillStyle = m.color;
      ctx.strokeStyle = 'rgba(0,0,0,0.7)';
      ctx.lineWidth = 3;
      ctx.strokeText(m.text, m.px, m.py);
      ctx.fillText(m.text, m.px, m.py);
    });
    ctx.globalAlpha = 1;

    if (currentTokenHover) {
      const t = currentTokenHover;
      const tx = t.gx * CELL + CELL / 2;
      const ty = t.gy * CELL - 8;
      const text = (t.bloqueado && !t.unlockedByGroup ? '🔒 ' : '') + t.text;
      ctx.font = 'bold 12px system-ui';
      ctx.textAlign = 'center';
      const w = ctx.measureText(text).width + 12;
      ctx.fillStyle = 'rgba(0,0,0,0.85)';
      ctx.fillRect(tx - w / 2, ty - 14, w, 18);
      ctx.strokeStyle = t.correct ? '#4dff88' : '#ff5c5c';
      ctx.lineWidth = 1;
      ctx.strokeRect(tx - w / 2, ty - 14, w, 18);
      ctx.fillStyle = 'white';
      ctx.fillText(text, tx, ty);
    }

    if (combo >= 2) {
      ctx.font = 'bold 24px system-ui';
      ctx.textAlign = 'center';
      ctx.fillStyle = '#ffd94d';
      ctx.strokeStyle = 'rgba(0,0,0,0.7)';
      ctx.lineWidth = 3;
      ctx.strokeText('x' + combo + ' COMBO', canvas.width / 2, 30);
      ctx.fillText('x' + combo + ' COMBO', canvas.width / 2, 30);
    }

    if (turboMs > 0) {
      ctx.fillStyle = 'rgba(255,217,77,0.8)';
      ctx.font = 'bold 16px system-ui';
      ctx.textAlign = 'right';
      ctx.fillText('⚡ TURBO ' + Math.ceil(turboMs / 1000) + 's', canvas.width - 10, 20);
    }
    if (shieldMs > 0) {
      ctx.fillStyle = 'rgba(125,214,255,0.8)';
      ctx.font = 'bold 16px system-ui';
      ctx.textAlign = 'right';
      ctx.fillText('🛡️ ESCUDO ' + Math.ceil(shieldMs / 1000) + 's', canvas.width - 10, 40);
    }

    if (paused) {
      ctx.fillStyle = 'rgba(0,0,0,0.7)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = 'white';
      ctx.font = 'bold 48px system-ui'; ctx.textAlign = 'center';
      ctx.fillText('PAUSA', canvas.width / 2, canvas.height / 2 - 10);
      ctx.font = '16px system-ui';
      ctx.fillText('ESPACIO para continuar', canvas.width / 2, canvas.height / 2 + 20);
    }
  }

  function seededNoise(x, y) {
    const n = Math.sin(x * 12.9898 + y * 78.233 + level.num * 37.719) * 43758.5453;
    return n - Math.floor(n);
  }

  function drawTerrainTile(x, y) {
    const px = x * CELL, py = y * CELL;
    const onPath = routeCells && routeCells.has(x + ',' + y);
    const base1 = onPath ? currentTheme.path1 : currentTheme.floor1;
    const base2 = onPath ? currentTheme.path2 : currentTheme.floor2;
    const g = ctx.createLinearGradient(px, py, px, py + CELL);
    g.addColorStop(0, base1);
    g.addColorStop(1, base2);
    ctx.fillStyle = g;
    ctx.fillRect(px, py, CELL, CELL);

    // Motas, grietas y pequeñas piedras; textura pixel-art sutil.
    const n = seededNoise(x, y);
    ctx.globalAlpha = onPath ? 0.20 : 0.28;
    ctx.fillStyle = currentTheme.stone;
    ctx.fillRect(px + 4 + n * 14, py + 6 + seededNoise(x + 4, y) * 17, 2 + n * 3, 2);
    ctx.fillRect(px + 19 + seededNoise(x, y + 7) * 8, py + 24 + n * 6, 2, 2);
    if (onPath) {
      ctx.strokeStyle = 'rgba(45,30,20,0.24)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(px + 7, py + 28);
      ctx.lineTo(px + 15, py + 25);
      ctx.lineTo(px + 22, py + 29);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  function drawStoneWall(x, y) {
    const px = x * CELL, py = y * CELL;
    const wgrad = ctx.createLinearGradient(px, py, px, py + CELL);
    wgrad.addColorStop(0, currentTheme.wall1);
    wgrad.addColorStop(1, currentTheme.wall2);
    ctx.fillStyle = wgrad;
    ctx.fillRect(px, py, CELL, CELL);

    // Juntas de bloques irregulares.
    ctx.strokeStyle = 'rgba(39,30,22,0.48)';
    ctx.lineWidth = 1.5;
    const split = 16 + Math.floor(seededNoise(x + 2, y + 1) * 9);
    ctx.beginPath();
    ctx.moveTo(px + 1, py + split);
    ctx.lineTo(px + CELL - 1, py + split + (seededNoise(x, y) > 0.5 ? 1 : -1));
    ctx.moveTo(px + 13 + seededNoise(x + 5, y) * 5, py + 1);
    ctx.lineTo(px + 12 + seededNoise(x + 5, y) * 5, py + split);
    ctx.moveTo(px + 24 + seededNoise(x + 9, y) * 4, py + split);
    ctx.lineTo(px + 23 + seededNoise(x + 9, y) * 4, py + CELL - 1);
    ctx.stroke();

    // Luz superior y borde oscuro, como piedra tallada.
    ctx.fillStyle = 'rgba(255,245,210,0.17)';
    ctx.fillRect(px + 2, py + 2, CELL - 4, 3);
    ctx.strokeStyle = 'rgba(25,20,15,0.60)';
    ctx.lineWidth = 2;
    ctx.strokeRect(px + 1, py + 1, CELL - 2, CELL - 2);

    // Musgo en algunas piedras.
    if (seededNoise(x + 20, y + 3) > 0.68) {
      ctx.fillStyle = currentTheme.moss;
      ctx.globalAlpha = 0.65;
      ctx.fillRect(px + 4, py + CELL - 6, 9, 3);
      ctx.fillRect(px + 8, py + CELL - 9, 4, 4);
      ctx.globalAlpha = 1;
    }
  }

  function drawSafeStartZone() {
    ctx.fillStyle='rgba(236,208,148,0.08)';
    ctx.fillRect(CELL, CELL, CELL*3, CELL*3);
    ctx.strokeStyle='rgba(255,224,160,0.28)'; ctx.lineWidth=1; ctx.strokeRect(CELL+2,CELL+2,CELL*3-4,CELL*3-4);
    ctx.fillStyle='rgba(255,245,215,0.72)'; ctx.font='bold 9px system-ui'; ctx.textAlign='left'; ctx.fillText('ZONA SEGURA · PIENSA',CELL+5,CELL+12);
  }

  function drawMapDetails() {
    // Vegetación/raíces decorativas en las zonas fuera del sendero.
    for (let y = 1; y < ROWS - 1; y++) {
      for (let x = 1; x < COLS - 1; x++) {
        const key = x + ',' + y;
        if (walls.has(key) || (routeCells && routeCells.has(key))) continue;
        const n = seededNoise(x + 30, y + 11);
        if (n > 0.88) {
          const px = x * CELL, py = y * CELL;
          ctx.strokeStyle = currentTheme.moss;
          ctx.globalAlpha = 0.48;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(px + 8, py + 30);
          ctx.quadraticCurveTo(px + 14, py + 18, px + 25, py + 27);
          ctx.stroke();
          ctx.globalAlpha = 1;
        }
      }
    }
  }

  function drawGate(gx, gy, open) {
    const px = gx * CELL, py = gy * CELL;
    const cx = px + CELL / 2;
    ctx.fillStyle = 'rgba(0,0,0,0.42)';
    ctx.fillRect(px + 5, py + 5, CELL - 10, CELL - 4);

    ctx.fillStyle = currentTheme.stone;
    ctx.fillRect(px + 3, py + 3, 7, CELL - 6);
    ctx.fillRect(px + CELL - 10, py + 3, 7, CELL - 6);
    ctx.fillRect(px + 3, py + 3, CELL - 6, 6);

    ctx.fillStyle = open ? '#3d6b3a' : '#4b3324';
    ctx.fillRect(px + 10, py + 10, CELL - 20, CELL - 10);
    ctx.strokeStyle = open ? '#b9df83' : '#2b1b14';
    ctx.lineWidth = 2;
    ctx.strokeRect(px + 10, py + 10, CELL - 20, CELL - 10);

    ctx.strokeStyle = open ? '#b9df83' : '#8b633e';
    ctx.lineWidth = 2;
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.moveTo(px + 13 + i * 6, py + 11);
      ctx.lineTo(px + 13 + i * 6, py + CELL - 3);
      ctx.stroke();
    }
    ctx.fillStyle = open ? '#d8f0a8' : '#d1a65d';
    ctx.font = 'bold 14px Georgia, serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(open ? '✦' : '♜', cx, py + CELL / 2);
  }

  function drawPortal(px, py, color) {
    const cx = px + CELL / 2, cy = py + CELL / 2;
    const t = Date.now() / 150;
    for (let i = 3; i >= 0; i--) {
      const r = 4 + i * 4 + Math.sin(t + i) * 2;
      ctx.strokeStyle = color;
      ctx.globalAlpha = 0.3 + (3 - i) * 0.2;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(cx, cy, 3, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawRock(r) {
    const px = r.px, py = r.py;
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.beginPath();
    ctx.ellipse(px + CELL / 2, py + CELL - 4, CELL / 3, 3, 0, 0, Math.PI * 2);
    ctx.fill();
    // Roca base
    const rgrad = ctx.createRadialGradient(px + CELL / 2 - 5, py + CELL / 2 - 5, 3, px + CELL / 2, py + CELL / 2, CELL / 2);
    rgrad.addColorStop(0, '#a08870');
    rgrad.addColorStop(1, '#5a4a3a');
    ctx.fillStyle = rgrad;
    ctx.beginPath();
    ctx.arc(px + CELL / 2, py + CELL / 2, CELL / 2 - 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#3a2a1a';
    ctx.lineWidth = 2;
    ctx.stroke();
    // Detalles textura
    ctx.strokeStyle = 'rgba(0,0,0,0.3)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(px + CELL * 0.3, py + CELL * 0.4);
    ctx.lineTo(px + CELL * 0.5, py + CELL * 0.6);
    ctx.moveTo(px + CELL * 0.6, py + CELL * 0.35);
    ctx.lineTo(px + CELL * 0.7, py + CELL * 0.55);
    ctx.stroke();
  }

  function drawBook(b) {
    const px = b.gx * CELL, py = b.gy * CELL;
    const cx = px + CELL / 2;
    const cy = py + CELL / 2 + Math.sin(Date.now() / 400 + b.gx) * 2;
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.beginPath();
    ctx.ellipse(cx, py + CELL - 4, CELL / 3, 3, 0, 0, Math.PI * 2);
    ctx.fill();
    // Libro
    ctx.fillStyle = '#c89b32';
    ctx.fillRect(cx - CELL / 3, cy - CELL / 4, CELL * 2 / 3, CELL / 2);
    ctx.fillStyle = '#e8b845';
    ctx.fillRect(cx - CELL / 3, cy - CELL / 4, CELL * 2 / 3, 3);
    ctx.strokeStyle = '#5a4a1a';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(cx - CELL / 3, cy - CELL / 4, CELL * 2 / 3, CELL / 2);
    // Icono libro
    ctx.fillStyle = 'white';
    ctx.font = 'bold 16px system-ui';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('📖', cx, cy);
    // Aura pulsante
    const pulse = 0.5 + Math.sin(Date.now() / 250) * 0.3;
    ctx.strokeStyle = 'rgba(255,217,77,' + pulse + ')';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cx, cy, CELL / 2 + 2, 0, Math.PI * 2);
    ctx.stroke();
  }

  function drawToken(t) {
    const px = t.gx * CELL, py = t.gy * CELL;
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.beginPath();
    ctx.ellipse(px + CELL / 2, py + CELL - 4, CELL / 3, 3, 0, 0, Math.PI * 2);
    ctx.fill();
    const cx = px + CELL / 2;
    const cy = py + CELL / 2 + Math.sin(Date.now() / 300 + t.gx) * 2;
    const size = CELL / 3;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(Math.PI / 4);
    const tgrad = ctx.createLinearGradient(-size, -size, size, size);
    if (t.correct) { tgrad.addColorStop(0, '#a0ffb0'); tgrad.addColorStop(1, '#2e8b57'); }
    else { tgrad.addColorStop(0, '#ff9090'); tgrad.addColorStop(1, '#c0392b'); }
    ctx.fillStyle = tgrad;
    ctx.fillRect(-size, -size, size * 2, size * 2);
    ctx.strokeStyle = t.correct ? '#4dff88' : '#ff5c5c';
    ctx.lineWidth = 2;
    ctx.strokeRect(-size, -size, size * 2, size * 2);
    ctx.restore();
    if (t.bloqueado && !t.unlockedByGroup) {
      ctx.fillStyle = 'rgba(0,0,0,0.7)';
      ctx.beginPath();
      ctx.arc(cx, cy, CELL / 2.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffd94d';
      ctx.font = 'bold 18px system-ui';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('🔒', cx, cy);
    }
    if (t.glow > 0) {
      ctx.strokeStyle = t.correct ? 'rgba(77,255,136,0.6)' : 'rgba(255,92,92,0.6)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(cx, cy, CELL / 2 + 2, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  function drawHazard(h) {
    const px=h.gx*CELL, py=h.gy*CELL, cx=px+CELL/2, cy=py+CELL/2;
    const pulse=0.65+Math.sin(Date.now()/140+h.phase)*0.25;
    ctx.globalAlpha=pulse; ctx.fillStyle=h.type==='fire'?'#e86b22':'#b8b8a0';
    if(h.type==='fire'){
      ctx.beginPath(); ctx.moveTo(cx,py+5); ctx.lineTo(px+8,py+CELL-5); ctx.lineTo(cx,py+CELL-10); ctx.lineTo(px+CELL-7,py+CELL-5); ctx.closePath(); ctx.fill();
    } else {
      for(let i=0;i<3;i++){ctx.beginPath();ctx.moveTo(px+6+i*9,py+CELL-5);ctx.lineTo(px+10+i*9,py+9);ctx.lineTo(px+13+i*9,py+CELL-5);ctx.closePath();ctx.fill();}
    }
    ctx.globalAlpha=1;
  }
  function drawCheckpoint(c) {
    const cx=c.gx*CELL+CELL/2, cy=c.gy*CELL+CELL/2;
    ctx.strokeStyle=c.active?'#7dd6ff':'rgba(125,214,255,0.55)'; ctx.lineWidth=2;
    ctx.beginPath();ctx.arc(cx,cy,CELL/2-5,0,Math.PI*2);ctx.stroke();
    ctx.fillStyle=c.active?'#7dd6ff':'rgba(125,214,255,0.45)';ctx.font='bold 15px Georgia';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('⚑',cx,cy);
  }
  function drawChest(c) {
    const px=c.gx*CELL, py=c.gy*CELL; ctx.fillStyle='rgba(0,0,0,.35)';ctx.fillRect(px+5,py+CELL-7,CELL-10,5);
    ctx.fillStyle='#6f3d20';ctx.fillRect(px+6,py+11,CELL-12,18);ctx.fillStyle='#a87532';ctx.fillRect(px+7,py+9,CELL-14,7);ctx.strokeStyle='#d7b45c';ctx.strokeRect(px+6,py+11,CELL-12,18);ctx.fillStyle='#ffd94d';ctx.fillRect(px+CELL/2-2,py+19,4,6);
  }
  function drawPuzzleSwitch(s) {
    const px=s.gx*CELL, py=s.gy*CELL, cx=px+CELL/2, cy=py+CELL/2;
    ctx.fillStyle='rgba(0,0,0,.35)'; ctx.beginPath(); ctx.ellipse(cx,py+CELL-5,12,3,0,0,Math.PI*2); ctx.fill();
    ctx.fillStyle=s.active?'#5b8d45':'#6b5135'; ctx.fillRect(px+7,py+7,CELL-14,CELL-12);
    ctx.strokeStyle=s.active?'#b9f17c':'#d1a65d'; ctx.lineWidth=2; ctx.strokeRect(px+7,py+7,CELL-14,CELL-12);
    ctx.fillStyle=s.active?'#eaffbf':'#ffd94d'; ctx.font='bold 17px Georgia'; ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.fillText(s.active?'✓':'✦',cx,cy);
    ctx.fillStyle='rgba(255,245,215,.8)'; ctx.font='bold 9px system-ui'; ctx.fillText(String(s.index),cx,py+CELL-4);
  }

  function drawQuestionGate(g) {
    const px=g.gx*CELL, py=g.gy*CELL; ctx.fillStyle='rgba(49,37,26,.9)';ctx.fillRect(px+3,py+2,CELL-6,CELL-4);ctx.strokeStyle='#d1a65d';ctx.lineWidth=2;ctx.strokeRect(px+4,py+3,CELL-8,CELL-6);ctx.fillStyle='#ffd94d';ctx.font='bold 16px Georgia';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('?',px+CELL/2,py+CELL/2);
  }
  function drawBoss() {
    const cx=boss.px+CELL/2, cy=boss.py+CELL/2; ctx.fillStyle='rgba(0,0,0,.45)';ctx.beginPath();ctx.ellipse(cx,cy+12,14,4,0,0,Math.PI*2);ctx.fill();
    ctx.fillStyle='#5d2430';ctx.beginPath();ctx.moveTo(cx,cy-15);ctx.lineTo(cx+15,cy-4);ctx.lineTo(cx+11,cy+14);ctx.lineTo(cx,cy+19);ctx.lineTo(cx-11,cy+14);ctx.lineTo(cx-15,cy-4);ctx.closePath();ctx.fill();ctx.strokeStyle='#d7a94a';ctx.lineWidth=2;ctx.stroke();
    ctx.fillStyle='#ffdb5c';ctx.font='bold 14px system-ui';ctx.textAlign='center';ctx.fillText('👑',cx,cy+2);
    ctx.fillStyle='#260f13';ctx.fillRect(cx-15,cy-24,30,5);ctx.fillStyle='#4dff88';ctx.fillRect(cx-15,cy-24,30*(boss.hp/boss.maxHp),5);
  }

  function drawEnemy(e) {
    const cx = e.px + CELL / 2, cy = e.py + CELL / 2;
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.beginPath();
    ctx.ellipse(cx, cy + CELL / 3, CELL / 3, 3, 0, 0, Math.PI * 2);
    ctx.fill();
    const egrad = ctx.createRadialGradient(cx - 4, cy - 4, 2, cx, cy, CELL / 2);
    egrad.addColorStop(0, e.type === 'snake' ? '#b8f26c' : '#e884ff'); egrad.addColorStop(1, e.type === 'snake' ? '#3f6b2c' : '#6e3c8c');
    ctx.fillStyle = egrad;
    ctx.beginPath();
    ctx.arc(cx, cy, CELL / 2 - 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'white';
    ctx.beginPath();
    ctx.arc(cx - 5, cy - 3, 3, 0, Math.PI * 2);
    ctx.arc(cx + 5, cy - 3, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'black';
    ctx.beginPath();
    ctx.arc(cx - 5, cy - 3, 1.5, 0, Math.PI * 2);
    ctx.arc(cx + 5, cy - 3, 1.5, 0, Math.PI * 2);
    ctx.fill();
    if (e.chase && e.caged) {
      ctx.strokeStyle = '#c7c0a8'; ctx.lineWidth = 2;
      for (let i = -1; i <= 1; i++) { ctx.beginPath(); ctx.moveTo(cx + i*7, cy-15); ctx.lineTo(cx + i*7, cy+15); ctx.stroke(); }
      ctx.strokeStyle = '#514536'; ctx.lineWidth = 3; ctx.strokeRect(cx-15,cy-15,30,30);
      ctx.fillStyle='#ffd94d'; ctx.font='bold 10px system-ui'; ctx.textAlign='center'; ctx.fillText('⚠',cx,cy-19);
    }
  }

  function drawPlayer() {
    const ppx = player.px + CELL / 2;
    const ppy = player.py + CELL / 2;
    if (invulnerableMs > 0) {
      const blink = Math.floor(Date.now() / 100) % 2;
      if (blink === 0) return;
      ctx.strokeStyle = 'rgba(77,207,255,0.7)'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(ppx, ppy, CELL / 2 + 4, 0, Math.PI * 2); ctx.stroke();
    }
    const walking = player.moving;
    const step = walking ? (Math.floor(player.walkFrame) % 2 === 0 ? -2 : 2) : 0;
    // Aventurero pixel-art genérico: gorra, rostro, chaleco, brazos y botas.
    ctx.fillStyle='rgba(0,0,0,0.4)'; ctx.beginPath(); ctx.ellipse(ppx,ppy+13,10,3,0,0,Math.PI*2); ctx.fill();
    // piernas
    ctx.strokeStyle='#2f3d57'; ctx.lineWidth=4; ctx.lineCap='square';
    ctx.beginPath(); ctx.moveTo(ppx-4,ppy+8); ctx.lineTo(ppx-5+step,ppy+15); ctx.moveTo(ppx+4,ppy+8); ctx.lineTo(ppx+5-step,ppy+15); ctx.stroke();
    // botas
    ctx.strokeStyle='#5b3827'; ctx.lineWidth=4; ctx.beginPath(); ctx.moveTo(ppx-6+step,ppy+15); ctx.lineTo(ppx-1+step,ppy+15); ctx.moveTo(ppx+4-step,ppy+15); ctx.lineTo(ppx+9-step,ppy+15); ctx.stroke();
    // cuerpo/overol
    ctx.fillStyle='#3d668f'; ctx.fillRect(ppx-7,ppy-1,14,12);
    ctx.fillStyle='#c34a32'; ctx.fillRect(ppx-8,ppy-7,16,8);
    // brazos
    ctx.strokeStyle='#e3b37b'; ctx.lineWidth=4; ctx.beginPath(); ctx.moveTo(ppx-8,ppy); ctx.lineTo(ppx-12,ppy+6-step); ctx.moveTo(ppx+8,ppy); ctx.lineTo(ppx+12,ppy+6+step); ctx.stroke();
    // cuello y cara
    ctx.fillStyle='#e3b37b'; ctx.fillRect(ppx-6,ppy-12,12,12);
    // cabello
    ctx.fillStyle='#4a2d20'; ctx.fillRect(ppx-6,ppy-13,12,4);
    // gorra
    ctx.fillStyle='#b7382f'; ctx.fillRect(ppx-8,ppy-17,16,5); ctx.fillRect(ppx-11,ppy-14,11,3);
    // ojo orientado hacia la dirección
    const eyeX = player.dir==='left' ? ppx-4 : player.dir==='right' ? ppx+4 : ppx+2;
    ctx.fillStyle='#241b18'; ctx.fillRect(eyeX,ppy-7,2,2);
    ctx.lineCap='butt';
  }

  function addMessage(text, gx, gy, color) {
    messages.push({ text, px: gx * CELL + CELL / 2, py: gy * CELL, color, life: 1000 });
  }

  function spawnParticles(x, y, color, count) {
    for (let i = 0; i < count; i++) {
      particles.push({
        px: x, py: y,
        vx: (Math.random() - 0.5) * 300,
        vy: -Math.random() * 300 - 50,
        r: Math.random() * 3 + 1,
        color, life: 500
      });
    }
  }

  function updateHUD() {
    document.getElementById('lab-hud-score').textContent = score;
    document.getElementById('lab-hud-lives').textContent =
      '🧩 ' + puzzleSwitches.filter(s => s.active).length + '/' + puzzleSwitches.length + '  ' + '❤'.repeat(Math.max(0, lives));
    const comboEl = document.getElementById('lab-hud-combo');
    if (comboEl) comboEl.textContent = 'x' + combo;
    const t = document.getElementById('lab-hud-time');
    t.textContent = timeLeft + 's';
    t.classList.remove('timer-warning', 'timer-danger');
    if (timeLeft <= 10) t.classList.add('timer-danger');
    else if (timeLeft <= 25) t.classList.add('timer-warning');
  }

  let bound = false;
  function bindControls() {
    if (bound) return;
    bound = true;
    document.addEventListener('keydown', e => {
      if (!running) return;
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'w', 'W', 'a', 'A', 's', 'S', 'd', 'D', ' ', '1', '2', '3'].includes(e.key)) {
        e.preventDefault();
        if (e.key === ' ') { paused = !paused; return; }
        if (e.key === '1') { usePower(0); return; }
        if (e.key === '2') { usePower(1); return; }
        if (e.key === '3') { usePower(2); return; }
        keys[e.key] = true;
      }
    });
    document.addEventListener('keyup', e => { keys[e.key] = false; });
  }

  function setInstr(text) {
    const el = document.getElementById('lab-game-instr');
    if (el) el.textContent = text;
  }

  function shuffle(a) {
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function escapeHtml(str) {
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }
})();
