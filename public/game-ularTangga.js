// ============================================================
//  game-UlarTangga.js  —  Logika utama permainan Ular Tangga
// ============================================================

// ---------- KONSTANTA ----------
const SNAKES = {
  16: 6,
  48: 30,
  79: 19,
  93: 68,
  95: 24,
  62: 18,
  87: 36,
};

const LADDERS = {
  3: 22,
  8: 26,
  20: 41,
  28: 55,
  50: 70,
  63: 81,
  71: 92,
};

// ---------- STATE GLOBAL ----------
let players = [];
let currentPlayer = 0;
const cellMap = {}; // { cellNumber: { x, y } }

// ---------- REFERENSI DOM ----------
const boardEl = document.getElementById('board');
const svgEl = document.getElementById('svg');
const infoEl = document.getElementById('info');
const setupEl = document.getElementById('setup');
const rollBtn = document.getElementById('rollBtn');
const PLAYER_COUNT = 2;
const playerTypesEl = document.getElementById('playerTypes');

// ============================================================
//  INISIALISASI PAPAN
// ============================================================

/**
 * Membangun grid 10×10 dengan penomoran zig-zag,
 * mengisi cellMap dengan koordinat tengah setiap sel.
 */
function buildBoard() {
  // Buat urutan nomor sel zig-zag (baris bawah = 1..10, dst.)
  const cells = [];
  for (let r = 0; r < 10; r++) {
    const start = r * 10 + 1;
    const row = [];
    for (let i = 0; i < 10; i++) row.push(start + i);
    if (r % 2 === 1) row.reverse();
    cells.push(...row);
  }
  cells.reverse(); // balik: baris atas = 91..100

  cells.forEach((num, i) => {
    // Buat elemen sel
    const cell = document.createElement('div');
    cell.className = 'cell';
    cell.id = 'cell-' + num;
    cell.dataset.num = num;
    cell.innerText = num;
    boardEl.appendChild(cell);

    // Hitung koordinat pusat sel (untuk menggambar SVG)
    const x = (i % 10) * 50 + 25;
    const y = Math.floor(i / 10) * 50 + 25;
    cellMap[num] = { x, y };
  });
}

// ============================================================
//  GAMBAR ELEMEN SVG
// ============================================================

/** Menggambar ular berbentuk kurva Bezier dari `from` → `to`. */
function drawSnake(from, to) {
  const p1 = cellMap[from];
  const p2 = cellMap[to];

  const cx1 = p1.x + (Math.random() * 80 - 40);
  const cy1 = p1.y + (Math.random() * 80 - 40);
  const cx2 = p2.x + (Math.random() * 80 - 40);
  const cy2 = p2.y + (Math.random() * 80 - 40);

  const d = `M ${p1.x} ${p1.y} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${p2.x} ${p2.y}`;

  const path = createSVG('path');
  path.setAttribute('d', d);
  path.setAttribute('stroke', 'red');
  path.setAttribute('stroke-width', '6');
  path.setAttribute('fill', 'none');
  svgEl.appendChild(path);
}

/** Menggambar kepala ular di posisi `pos`. */
function drawSnakeHead(pos) {
  const { x, y } = cellMap[pos];

  // Badan kepala
  const head = createSVG('circle');
  setAttrs(head, { cx: x, cy: y, r: 10, fill: 'red' });

  // Mata kiri & kanan
  const eye1 = createSVG('circle');
  setAttrs(eye1, { cx: x - 3, cy: y - 3, r: 3, fill: 'white' });

  const eye2 = createSVG('circle');
  setAttrs(eye2, { cx: x + 3, cy: y - 3, r: 3, fill: 'white' });

  // Pupil kiri & kanan
  const pupil1 = createSVG('circle');
  setAttrs(pupil1, { cx: x - 3, cy: y - 3, r: 1.5, fill: 'black' });

  const pupil2 = createSVG('circle');
  setAttrs(pupil2, { cx: x + 3, cy: y - 3, r: 1.5, fill: 'black' });

  [head, eye1, eye2, pupil1, pupil2].forEach((el) => svgEl.appendChild(el));
}

/** Menggambar tangga dari `from` → `to`. */
function drawLadder(from, to) {
  const a = cellMap[from];
  const b = cellMap[to];

  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = Math.sqrt(dx * dx + dy * dy);

  const offsetX = (-dy / len) * 10;
  const offsetY = (dx / len) * 10;

  // Dua tiang utama
  for (const side of [-1, 1]) {
    const line = createSVG('line');
    setAttrs(line, {
      x1: a.x + offsetX * side,
      y1: a.y + offsetY * side,
      x2: b.x + offsetX * side,
      y2: b.y + offsetY * side,
      stroke: 'green',
      'stroke-width': 4,
    });
    svgEl.appendChild(line);
  }

  // Anak tangga
  const steps = 5;
  for (let i = 1; i < steps; i++) {
    const t = i / steps;
    const x = a.x + dx * t;
    const y = a.y + dy * t;

    const rung = createSVG('line');
    setAttrs(rung, {
      x1: x - offsetX,
      y1: y - offsetY,
      x2: x + offsetX,
      y2: y + offsetY,
      stroke: 'green',
      'stroke-width': 3,
    });
    svgEl.appendChild(rung);
  }
}

/** Menggambar semua ular dan tangga ke SVG. */
function drawAllSnakesAndLadders() {
  for (const from in SNAKES) {
    drawSnake(Number(from), SNAKES[from]);
    drawSnakeHead(Number(from));
  }
  for (const from in LADDERS) {
    drawLadder(Number(from), LADDERS[from]);
  }
}

// ============================================================
//  SETUP PEMAIN
// ============================================================

/** Render pilihan tipe (human/bot) untuk setiap pemain. */
function updatePlayerOptions() {
  playerTypesEl.innerHTML = '';

  for (let i = 0; i < PLAYER_COUNT; i++) {
    playerTypesEl.innerHTML += `
      Player ${i + 1}:
      <select id="type${i}">
        <option value="human">Human</option>
        <option value="bot">Bot</option>
      </select><br>`;
  }
}

/** Memulai permainan setelah setup selesai. */
function startGame() {
  players = [];

  for (let i = 0; i < PLAYER_COUNT; i++) {
    players.push({
      pos: 1,
      type: document.getElementById('type' + i).value,
    });
  }

  setupEl.style.display = 'none';
  rollBtn.style.display = 'inline-block';

  render();
  nextTurn();
}

// ============================================================
//  RENDER
// ============================================================

/** Perbarui tampilan papan dan token pemain. */
function render() {
  // Reset semua sel ke nomor saja
  document.querySelectorAll('.cell').forEach((c) => {
    c.innerHTML = c.dataset.num;
  });

  // Tambahkan token setiap pemain
  players.forEach((p, i) => {
    const cell = document.getElementById('cell-' + p.pos);
    if (cell) {
      const token = document.createElement('div');
      token.className = `p${i + 1}`;
      token.textContent = i + 1;
      cell.appendChild(token);
    }
  });

  infoEl.textContent = `Giliran: Player ${currentPlayer + 1} (${players[currentPlayer].type})`;
}

// ============================================================
//  GILIRAN & LOGIKA GAME
// ============================================================

/** Lempar dadu — hanya dipakai oleh pemain human (via tombol). */
function rollDice() {
  const p = players[currentPlayer];
  if (p.type !== 'human') return;
  playTurn();
}

/** Tentukan giliran berikutnya; jika bot, otomatis lempar. */
function nextTurn() {
  const p = players[currentPlayer];
  infoEl.textContent = `Giliran Player ${currentPlayer + 1} (${p.type})`;

  // Aktif/nonaktifkan tombol lempar
  rollBtn.disabled = p.type !== 'human';

  if (p.type === 'bot') {
    setTimeout(playTurn, 800);
  }
}

/** Jalankan satu giliran: lempar dadu, gerakkan, periksa event. */
function playTurn() {
  const p = players[currentPlayer];
  const dice = Math.floor(Math.random() * 6) + 1;

  rollBtn.disabled = true;
  infoEl.textContent = `Player ${currentPlayer + 1} (${p.type}) dapat dadu: ${dice}`;

  if (p.type === 'bot') {
    setTimeout(() => lanjutTurn(p, dice), 3000);
  } else {
    document.getElementById('lanjutBtn').style.display = 'inline-block';
    document.getElementById('lanjutBtn').onclick = () => {
      document.getElementById('lanjutBtn').style.display = 'none';
      lanjutTurn(p, dice);
    };
  }
}
function lanjutTurn(p, dice) {
  p.pos += dice;
  if (p.pos > 100) {
    const lebih = p.pos - 100;
    p.pos = 100 - lebih;
  }

  if (SNAKES[p.pos]) {
    infoEl.textContent = `Player ${currentPlayer + 1} kena ular! Turun ke ${SNAKES[p.pos]}`;
    p.pos = SNAKES[p.pos];
  } else if (LADDERS[p.pos]) {
    infoEl.textContent = `Player ${currentPlayer + 1} naik tangga! Naik ke ${LADDERS[p.pos]}`;
    p.pos = LADDERS[p.pos];
  }

  if (p.pos === 100) {
    render();
    showWinScreen(currentPlayer + 1);
    return;
  }

  currentPlayer = (currentPlayer + 1) % players.length;
  render();
  nextTurn();
}

// ============================================================
//  HELPER UTILITAS SVG
// ============================================================

/** Buat elemen SVG dengan namespace yang benar. */
function createSVG(tag) {
  return document.createElementNS('http://www.w3.org/2000/svg', tag);
}

/** Set beberapa atribut sekaligus ke elemen SVG. */
function setAttrs(el, attrs) {
  for (const [k, v] of Object.entries(attrs)) {
    el.setAttribute(k, v);
  }
}

// ============================================================
//  ENTRY POINT
// ============================================================

// Inisialisasi saat halaman dimuat
buildBoard();
drawAllSnakesAndLadders();
updatePlayerOptions();
// ============================================================
//  FUNGSI SURAT INTRO
// ============================================================

/** Animasi buka amplop → tampilkan surat aturan */
function openEnvelope() {
  const env = document.getElementById('envelope');
  if (env.classList.contains('open')) return;
  env.classList.add('open');

  setTimeout(() => {
    env.style.display = 'none';
    document.getElementById('letterContent').style.display = 'block';
  }, 500);
}

/** Tutup surat & masuk ke game wrapper */
function closeLetter() {
  document.getElementById('letterScreen').style.display = 'none';
  document.getElementById('gameWrapper').style.display = 'block';
}
function showWinScreen(playerNum) {
  document.getElementById('winText').textContent = `Player ${playerNum} Menang!`;
  document.getElementById('winModal').classList.add('show');
}

function restartGame() {
  // Reset state
  players = [];
  currentPlayer = 0;

  // Sembunyikan modal
  document.getElementById('winModal').classList.remove('show');

  // Tampilkan setup lagi
  document.getElementById('setup').style.display = 'inline-block';
  document.getElementById('rollBtn').style.display = 'none';
  document.getElementById('info').textContent = 'Pilih tipe pemain dan klik Mulai Game';

  // Reset papan
  boardEl.innerHTML = '';
  svgEl.innerHTML = '';
  buildBoard();
  drawAllSnakesAndLadders();
  updatePlayerOptions();
  render();
}