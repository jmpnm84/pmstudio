/* =============================================================
   0. REGISTO DO SERVICE WORKER E GESTÃO DE INSTALAÇÃO PWA
   ============================================================= */
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js')
            .then((reg) => console.log('[PWA] Service Worker registado com sucesso:', reg.scope))
            .catch((err) => console.error('[PWA] Falha ao registar o Service Worker:', err));
    });
}

let deferredPrompt;
const installContainerDesktop = document.getElementById('install-container-desktop');
const btnInstallDesktop = document.getElementById('btn-install-desktop');
const installContainerMobile = document.getElementById('install-container-mobile');
const btnInstallMobile = document.getElementById('btn-install-mobile');

window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    // Mostrar botões de instalação
    if (installContainerDesktop) installContainerDesktop.classList.remove('hidden');
    if (installContainerMobile) installContainerMobile.classList.remove('hidden');
});

async function triggerInstall() {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`[PWA] Resposta do utilizador: ${outcome}`);
    if (outcome === 'accepted') {
        if (installContainerDesktop) installContainerDesktop.classList.add('hidden');
        if (installContainerMobile) installContainerMobile.classList.add('hidden');
    }
    deferredPrompt = null;
}

if (btnInstallDesktop) btnInstallDesktop.addEventListener('click', triggerInstall);
if (btnInstallMobile) btnInstallMobile.addEventListener('click', triggerInstall);

window.addEventListener('appinstalled', () => {
    console.log('[PWA] Aplicação instalada com sucesso!');
    if (installContainerDesktop) installContainerDesktop.classList.add('hidden');
    if (installContainerMobile) installContainerMobile.classList.add('hidden');
});


/* =============================================================
   1. WRAPPER PROMISSIFICADO DE INDEXEDDB
   ============================================================= */
const DB_NAME = 'FitPulseDB';
const DB_VERSION = 1;

class FitPulseDB {
    constructor() {
        this.db = null;
    }

    async init() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(DB_NAME, DB_VERSION);

            request.onupgradeneeded = (e) => {
                const db = e.target.result;

                if (!db.objectStoreNames.contains('peso')) {
                    const pesoStore = db.createObjectStore('peso', { keyPath: 'id', autoIncrement: true });
                    pesoStore.createIndex('date', 'date', { unique: false });
                }

                if (!db.objectStoreNames.contains('forca')) {
                    const forcaStore = db.createObjectStore('forca', { keyPath: 'id', autoIncrement: true });
                    forcaStore.createIndex('exercise', 'exercise', { unique: false });
                    forcaStore.createIndex('date', 'date', { unique: false });
                }

                if (!db.objectStoreNames.contains('treinos')) {
                    db.createObjectStore('treinos', { keyPath: 'routineCode' });
                }

                if (!db.objectStoreNames.contains('aulas')) {
                    db.createObjectStore('aulas', { keyPath: 'id' });
                }

                if (!db.objectStoreNames.contains('nutricao')) {
                    db.createObjectStore('nutricao', { keyPath: 'date' });
                }

                if (!db.objectStoreNames.contains('perfil')) {
                    db.createObjectStore('perfil', { keyPath: 'id' });
                }
            };

            request.onsuccess = (e) => {
                this.db = e.target.result;
                resolve(this.db);
            };

            request.onerror = (e) => {
                reject('Erro ao abrir o IndexedDB: ' + e.target.error);
            };
        });
    }

    async getAll(storeName) {
        return new Promise((resolve, reject) => {
            const tx = this.db.transaction(storeName, 'readonly');
            const store = tx.objectStore(storeName);
            const req = store.getAll();
            req.onsuccess = () => resolve(req.result);
            req.onerror = () => reject(req.error);
        });
    }

    async get(storeName, key) {
        return new Promise((resolve, reject) => {
            const tx = this.db.transaction(storeName, 'readonly');
            const store = tx.objectStore(storeName);
            const req = store.get(key);
            req.onsuccess = () => resolve(req.result);
            req.onerror = () => reject(req.error);
        });
    }

    async put(storeName, item) {
        return new Promise((resolve, reject) => {
            const tx = this.db.transaction(storeName, 'readwrite');
            const store = tx.objectStore(storeName);
            const req = store.put(item);
            req.onsuccess = () => resolve(req.result);
            req.onerror = () => reject(req.error);
        });
    }

    async add(storeName, item) {
        return new Promise((resolve, reject) => {
            const tx = this.db.transaction(storeName, 'readwrite');
            const store = tx.objectStore(storeName);
            const req = store.add(item);
            req.onsuccess = () => resolve(req.result);
            req.onerror = () => reject(req.error);
        });
    }

    async clearStore(storeName) {
        return new Promise((resolve, reject) => {
            const tx = this.db.transaction(storeName, 'readwrite');
            const store = tx.objectStore(storeName);
            const req = store.clear();
            req.onsuccess = () => resolve();
            req.onerror = () => reject(req.error);
        });
    }
}

const db = new FitPulseDB();

/* =============================================================
   2. INICIALIZAÇÃO DA ESTRUTURA BASE DA APLICAÇÃO
   ============================================================= */
async function setupBaseStructuresIfEmpty() {
    const treinos = await db.getAll('treinos');
    if (treinos.length === 0) {
        await db.put('treinos', {
            routineCode: 'A',
            title: "Treino A - Peito & Tríceps",
            exercises: [
                { id: "ex1", name: "Supino Reto com Barra", desc: "Mantenha as escápulas retraídas, pés firmes no chão e desça a barra até ao esterno com controlo.", sets: [ {kg: 0, reps: 10, done: false}, {kg: 0, reps: 8, done: false}, {kg: 0, reps: 8, done: false} ] },
                { id: "ex2", name: "Supino Inclinado c/ Halteres", desc: "Ajuste o banco em ~30 graus. Mantenha os cotovelos a 45° do tronco.", sets: [ {kg: 0, reps: 12, done: false}, {kg: 0, reps: 10, done: false} ] },
                { id: "ex3", name: "Tríceps na Polia Alta", desc: "Mantenha os cotovelos fixos ao lado do corpo. Estenda totalmente os braços focando na contração.", sets: [ {kg: 0, reps: 12, done: false}, {kg: 0, reps: 12, done: false} ] }
            ]
        });

        await db.put('treinos', {
            routineCode: 'B',
            title: "Treino B - Costas & Bíceps",
            exercises: [
                { id: "ex4", name: "Puxada à Frente na Polia", desc: "Puxe a barra em direção ao peito puxando os cotovelos para baixo e para trás.", sets: [ {kg: 0, reps: 10, done: false}, {kg: 0, reps: 10, done: false} ] },
                { id: "ex5", name: "Remada Curvada com Barra", desc: "Coluna neutra, inclinação a 45 graus. Puxe a barra em direção ao umbigo.", sets: [ {kg: 0, reps: 10, done: false}, {kg: 0, reps: 10, done: false} ] },
                { id: "ex6", name: "Bíceps Direto c/ Barra EZ", desc: "Mantenha a postura ereta sem balançar o tronco durante a execução.", sets: [ {kg: 0, reps: 12, done: false}, {kg: 0, reps: 10, done: false} ] }
            ]
        });

        await db.put('treinos', {
            routineCode: 'C',
            title: "Treino C - Pernas & Ombros",
            exercises: [
                { id: "ex7", name: "Agachamento Livre", desc: "Pés à largura dos ombros, joelhos a acompanhar a ponta dos pés, descer com profundidade.", sets: [ {kg: 0, reps: 8, done: false}, {kg: 0, reps: 8, done: false} ] },
                { id: "ex8", name: "Prensa de Pernas (Leg Press)", desc: "Empurre a plataforma com os calcanhares sem bloquear totalmente os joelhos.", sets: [ {kg: 0, reps: 12, done: false}, {kg: 0, reps: 10, done: false} ] },
                { id: "ex9", name: "Press Militar de Ombros", desc: "Com halteres ou barra, eleve o peso acima da cabeça com o core ativado.", sets: [ {kg: 0, reps: 10, done: false}, {kg: 0, reps: 10, done: false} ] }
            ]
        });
    }

    const aulas = await db.getAll('aulas');
    if (aulas.length === 0) {
        const initialClasses = [
            { id: 1, name: "Spinning High Energy", instructor: "Prof. Ricardo", time: "Hoje • 18:30", category: "Spinning", spots: 3, totalSpots: 15, booked: false },
            { id: 2, name: "Yoga Alignment & Flow", instructor: "Prof.ª Maria", time: "Amanhã • 09:00", category: "Yoga", spots: 5, totalSpots: 10, booked: false },
            { id: 3, name: "Pilates Core Focus", instructor: "Prof.ª Sofia", time: "Amanhã • 17:00", category: "Pilates", spots: 2, totalSpots: 12, booked: false },
            { id: 4, name: "CrossFit WOD Express", instructor: "Prof. André", time: "Sexta • 19:00", category: "CrossFit", spots: 1, totalSpots: 8, booked: false }
        ];
        for (const c of initialClasses) await db.put('aulas', c);
    }
}

async function checkFirstTimeUser() {
    const perfil = await db.get('perfil', 'user_profile');
    if (!perfil) {
        openModal('onboarding-modal');
    }
}

async function handleOnboardingSubmit(e) {
    e.preventDefault();
    const name = document.getElementById('onboard-name').value.trim();
    const weight = parseFloat(document.getElementById('onboard-weight').value);
    const fat = parseFloat(document.getElementById('onboard-fat').value) || null;
    const arm = parseFloat(document.getElementById('onboard-arm').value) || null;
    const waist = parseFloat(document.getElementById('onboard-waist').value) || null;
    const chest = parseFloat(document.getElementById('onboard-chest').value) || null;

    if (!name || isNaN(weight)) return;

    await db.put('perfil', {
        id: 'user_profile',
        name: name,
        streak: 1,
        xp: 100,
        level: 1,
        completedWorkoutsMonth: 0
    });

    const todayKey = new Date().toISOString().split('T')[0];
    await db.add('peso', { date: todayKey, weight, fat, arm, waist, chest });

    closeModal('onboarding-modal');
    showToast("Bem-vindo! O seu perfil foi configurado com sucesso.");

    await refreshUI();
    await renderWorkoutRoutine(currentActiveRoutine);
}

/* =============================================================
   3. LÓGICA E REFRESH DA INTERFACE (UI SYNCHRONIZATION)
   ============================================================= */
let weightChartInstance = null;
let strengthChartInstance = null;
let currentActiveRoutine = 'A';

function getInitials(name) {
    if (!name) return '--';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
        return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return parts[0].substring(0, 2).toUpperCase();
}

async function refreshUI() {
    const profile = await db.get('perfil', 'user_profile');
    const todayKey = new Date().toISOString().split('T')[0];
    let nutricao = await db.get('nutricao', todayKey);

    if (!nutricao) {
        nutricao = { date: todayKey, water: 0.0, cals: 0, prot: 0, carbs: 0, fat: 0 };
        await db.put('nutricao', nutricao);
    }

    if (profile) {
        document.getElementById('sidebar-name').innerText = profile.name;
        document.getElementById('dash-greeting-name').innerText = profile.name.split(' ')[0];
        document.getElementById('sidebar-avatar').innerText = getInitials(profile.name);
        document.getElementById('mobile-avatar').innerText = getInitials(profile.name);

        document.getElementById('sidebar-streak').innerText = profile.streak || 0;
        document.getElementById('mobile-streak').innerText = profile.streak || 0;
        document.getElementById('dash-workouts-count').innerText = profile.completedWorkoutsMonth || 0;
        document.getElementById('user-xp').innerText = profile.xp || 0;
        document.getElementById('user-level').innerText = profile.level || 1;
        
        const nextLevelXP = (profile.level || 1) * 500;
        const xpPct = Math.min(100, ((profile.xp || 0) / nextLevelXP) * 100);
        document.getElementById('user-xp-bar').style.width = `${xpPct}%`;
        document.getElementById('user-xp-bar-text').innerText = profile.xp || 0;
    }

    const weights = await db.getAll('peso');
    if (weights.length > 0) {
        weights.sort((a, b) => new Date(a.date) - new Date(b.date));
        const latest = weights[weights.length - 1];
        document.getElementById('dash-weight').innerText = latest.weight;
    } else {
        document.getElementById('dash-weight').innerText = '--';
    }

    document.getElementById('dash-cals').innerText = nutricao.cals;
    document.getElementById('dash-water').innerText = nutricao.water.toFixed(1);
    
    document.getElementById('cals-ingested').innerText = nutricao.cals;
    const calsBarPct = Math.min(100, Math.round((nutricao.cals / 2400) * 100));
    document.getElementById('cals-bar').style.width = `${calsBarPct}%`;

    document.getElementById('prot-ingested').innerText = nutricao.prot;
    document.getElementById('prot-bar').style.width = `${Math.min(100, (nutricao.prot / 180) * 100)}%`;

    document.getElementById('carbs-ingested').innerText = nutricao.carbs;
    document.getElementById('carbs-bar').style.width = `${Math.min(100, (nutricao.carbs / 270) * 100)}%`;

    document.getElementById('fat-ingested').innerText = nutricao.fat;
    document.getElementById('fat-bar').style.width = `${Math.min(100, (nutricao.fat / 65) * 100)}%`;

    document.getElementById('water-intake-val').innerText = nutricao.water.toFixed(1);
    document.getElementById('water-cups-count').innerText = Math.round(nutricao.water / 0.25);

    const allClasses = await db.getAll('aulas');
    const bookedList = document.getElementById('dash-booked-classes-list');
    bookedList.innerHTML = '';
    const booked = allClasses.filter(c => c.booked);

    if (booked.length === 0) {
        bookedList.innerHTML = `<p class="text-xs text-slate-500 py-2">Sem aulas agendadas de momento.</p>`;
    } else {
        booked.forEach(b => {
            const item = document.createElement('div');
            item.className = "flex items-center justify-between p-3 bg-slate-800/60 rounded-xl border border-slate-700/50";
            item.innerHTML = `
                <div>
                    <p class="text-xs font-bold text-white">${b.name}</p>
                    <p class="text-[10px] text-slate-400">${b.time}</p>
                </div>
                <span class="text-[10px] bg-brand-500/20 text-brand-400 px-2 py-0.5 rounded-full font-semibold">Confirmado</span>
            `;
            bookedList.appendChild(item);
        });
    }

    renderAchievements();
}

/* =============================================================
   4. TEMPORIZADOR DE DESCANSO
   ============================================================= */
let timerInterval = null;
let timerSeconds = 90;
let isTimerRunning = false;

function updateTimerDisplay() {
    const mins = Math.floor(timerSeconds / 60);
    const secs = timerSeconds % 60;
    document.getElementById('timer-display').innerText = 
        `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

function toggleTimer() {
    const btn = document.getElementById('timer-start-btn');
    if (isTimerRunning) {
        clearInterval(timerInterval);
        isTimerRunning = false;
        btn.innerText = "Iniciar";
        btn.classList.remove('bg-amber-500');
        btn.classList.add('bg-brand-500');
    } else {
        isTimerRunning = true;
        btn.innerText = "Pausar";
        btn.classList.remove('bg-brand-500');
        btn.classList.add('bg-amber-500');

        timerInterval = setInterval(() => {
            if (timerSeconds > 0) {
                timerSeconds--;
                updateTimerDisplay();
            } else {
                clearInterval(timerInterval);
                isTimerRunning = false;
                btn.innerText = "Iniciar";
                btn.classList.remove('bg-amber-500');
                btn.classList.add('bg-brand-500');
                showToast("🔔 Tempo de descanso concluído! Próxima série!");
            }
        }, 1000);
    }
}

function setTimerPreset(seconds) {
    if (isTimerRunning) toggleTimer();
    timerSeconds = seconds;
    updateTimerDisplay();
}

function resetTimer() {
    if (isTimerRunning) toggleTimer();
    timerSeconds = 90;
    updateTimerDisplay();
}

/* =============================================================
   5. GESTÃO DE TREINOS (LOGBOOK)
   ============================================================= */
async function selectRoutine(code) {
    currentActiveRoutine = code;
    document.querySelectorAll('.routine-tab-btn').forEach(btn => {
        btn.classList.remove('bg-brand-500', 'text-black');
        btn.classList.add('text-slate-400');
    });
    const activeBtn = document.getElementById(`btn-routine-${code}`);
    activeBtn.classList.add('bg-brand-500', 'text-black');
    activeBtn.classList.remove('text-slate-400');

    await renderWorkoutRoutine(code);
}

async function renderWorkoutRoutine(code) {
    const routine = await db.get('treinos', code);
    const container = document.getElementById('workout-routine-container');
    container.innerHTML = '';

    if (!routine) return;

    routine.exercises.forEach((ex, exIndex) => {
        const card = document.createElement('div');
        card.className = "bg-dark-card p-5 rounded-2xl border border-dark-border space-y-4";
        
        let setsHTML = '';
        ex.sets.forEach((set, sIndex) => {
            setsHTML += `
                <div class="flex items-center justify-between bg-slate-800/50 p-2.5 rounded-xl border border-slate-700/40 text-xs">
                    <span class="font-bold text-slate-400 w-8">#${sIndex + 1}</span>
                    <div class="flex items-center space-x-2">
                        <span class="text-slate-400">Carga:</span>
                        <input type="number" value="${set.kg}" onchange="updateSetData('${code}', ${exIndex}, ${sIndex}, 'kg', this.value)" class="w-16 bg-slate-700 text-white p-1 rounded text-center outline-none focus:border-brand-500 border border-slate-600">
                        <span class="text-slate-400">kg</span>
                    </div>
                    <div class="flex items-center space-x-2">
                        <span class="text-slate-400">Reps:</span>
                        <input type="number" value="${set.reps}" onchange="updateSetData('${code}', ${exIndex}, ${sIndex}, 'reps', this.value)" class="w-16 bg-slate-700 text-white p-1 rounded text-center outline-none focus:border-brand-500 border border-slate-600">
                    </div>
                    <button onclick="toggleSetDone('${code}', ${exIndex}, ${sIndex})" class="w-8 h-8 rounded-lg flex items-center justify-center transition ${set.done ? 'bg-brand-500 text-black' : 'bg-slate-700 text-slate-400 hover:text-white'}">
                        <i class="fa-solid fa-check"></i>
                    </button>
                </div>
            `;
        });

        card.innerHTML = `
            <div class="flex justify-between items-center">
                <h4 class="font-bold text-white text-base">${ex.name}</h4>
                <button onclick="openExerciseModal('${ex.name}', '${ex.desc}')" class="text-xs text-brand-400 hover:underline flex items-center gap-1">
                    <i class="fa-solid fa-circle-info"></i> Técnica / Vídeo
                </button>
            </div>
            <div class="space-y-2">
                ${setsHTML}
            </div>
            <button onclick="addSetToExercise('${code}', ${exIndex})" class="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold border border-dashed border-slate-600 transition">
                + Adicionar Série
            </button>
        `;
        container.appendChild(card);
    });
}

async function updateSetData(code, exIdx, setIdx, field, val) {
    const routine = await db.get('treinos', code);
    routine.exercises[exIdx].sets[setIdx][field] = parseFloat(val) || 0;
    await db.put('treinos', routine);
    
    if (field === 'kg') {
        const exName = routine.exercises[exIdx].name;
        const todayKey = new Date().toISOString().split('T')[0];
        await db.add('forca', {
            exercise: exName,
            date: todayKey,
            load: parseFloat(val)
        });
    }
}

async function toggleSetDone(code, exIdx, setIdx) {
    const routine = await db.get('treinos', code);
    const current = routine.exercises[exIdx].sets[setIdx].done;
    routine.exercises[exIdx].sets[setIdx].done = !current;
    await db.put('treinos', routine);
    await renderWorkoutRoutine(code);
    if (!current) setTimerPreset(90);
}

async function addSetToExercise(code, exIdx) {
    const routine = await db.get('treinos', code);
    const sets = routine.exercises[exIdx].sets;
    const lastSet = sets[sets.length - 1] || { kg: 20, reps: 10 };
    sets.push({ kg: lastSet.kg, reps: lastSet.reps, done: false });
    await db.put('treinos', routine);
    await renderWorkoutRoutine(code);
}

async function finishWorkout() {
    let profile = await db.get('perfil', 'user_profile');
    if (!profile) return;

    profile.xp = (profile.xp || 0) + 50;
    profile.streak = (profile.streak || 0) + 1;
    profile.completedWorkoutsMonth = (profile.completedWorkoutsMonth || 0) + 1;
    
    if (profile.xp >= (profile.level || 1) * 500) {
        profile.level = (profile.level || 1) + 1;
    }

    await db.put('perfil', profile);
    await refreshUI();
    showToast("🎉 Treino guardado no IndexedDB! Ganhou +50 XP!");
}

/* =============================================================
   6. EVOLUÇÃO E GRÁFICOS (CHART.JS + INDEXEDDB)
   ============================================================= */
async function renderCharts() {
    const weights = await db.getAll('peso');
    weights.sort((a, b) => new Date(a.date) - new Date(b.date));

    const ctxWeight = document.getElementById('weightChart').getContext('2d');
    if (weightChartInstance) weightChartInstance.destroy();

    weightChartInstance = new Chart(ctxWeight, {
        type: 'line',
        data: {
            labels: weights.map(m => m.date),
            datasets: [{
                label: 'Peso (kg)',
                data: weights.map(m => m.weight),
                borderColor: '#ccff00',
                backgroundColor: 'rgba(204, 255, 0, 0.1)',
                borderWidth: 3,
                fill: true,
                tension: 0.3,
                pointBackgroundColor: '#ccff00',
                pointRadius: 5
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                x: { grid: { color: '#2a2a2a' }, ticks: { color: '#94a3b8' } },
                y: { grid: { color: '#2a2a2a' }, ticks: { color: '#94a3b8' } }
            }
        }
    });

    const selectedEx = document.getElementById('exercise-chart-select').value;
    const allStrength = await db.getAll('forca');
    const filtered = allStrength.filter(s => s.exercise === selectedEx);
    filtered.sort((a, b) => new Date(a.date) - new Date(b.date));

    const ctxStrength = document.getElementById('strengthChart').getContext('2d');
    if (strengthChartInstance) strengthChartInstance.destroy();

    strengthChartInstance = new Chart(ctxStrength, {
        type: 'bar',
        data: {
            labels: filtered.map(d => d.date),
            datasets: [{
                label: 'Carga Máxima (kg)',
                data: filtered.map(d => d.load),
                backgroundColor: '#00f0ff',
                borderRadius: 8
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                x: { grid: { display: false }, ticks: { color: '#94a3b8' } },
                y: { grid: { color: '#2a2a2a' }, ticks: { color: '#94a3b8' } }
            }
        }
    });

    renderMetricsTable(weights);
}

function renderMetricsTable(weights) {
    const tbody = document.getElementById('metrics-table-body');
    tbody.innerHTML = '';
    const sorted = [...weights].reverse();
    sorted.forEach(m => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td class="p-3 font-medium text-white">${m.date}</td>
            <td class="p-3 text-brand-400 font-bold">${m.weight} kg</td>
            <td class="p-3">${m.fat || '-'}%</td>
            <td class="p-3">${m.arm || '-'} cm</td>
            <td class="p-3">${m.waist || '-'} cm</td>
            <td class="p-3">${m.chest || '-'} cm</td>
        `;
        tbody.appendChild(tr);
    });
}

async function handleMetricSubmit(e) {
    e.preventDefault();
    const date = document.getElementById('input-metric-date').value;
    const weight = parseFloat(document.getElementById('input-metric-weight').value);
    const fat = parseFloat(document.getElementById('input-metric-fat').value) || null;
    const arm = parseFloat(document.getElementById('input-metric-arm').value) || null;
    const waist = parseFloat(document.getElementById('input-metric-waist').value) || null;
    const chest = parseFloat(document.getElementById('input-metric-chest').value) || null;

    await db.add('peso', { date, weight, fat, arm, waist, chest });

    closeModal('add-metric-modal');
    await renderCharts();
    await refreshUI();
    showToast("📊 Medida gravada permanentemente no IndexedDB!");
}

/* =============================================================
   7. AULAS DE GRUPO
   ============================================================= */
async function renderClasses(filter = 'all') {
    const allClasses = await db.getAll('aulas');
    const container = document.getElementById('classes-grid');
    container.innerHTML = '';

    allClasses.forEach(c => {
        if (filter !== 'all' && c.category !== filter) return;

        const card = document.createElement('div');
        card.className = "bg-dark-card p-5 rounded-2xl border border-dark-border flex flex-col justify-between space-y-4";
        card.innerHTML = `
            <div>
                <div class="flex justify-between items-start mb-2">
                    <span class="text-xs bg-brand-500/10 text-brand-400 px-2.5 py-1 rounded-full font-semibold border border-brand-500/20">${c.category}</span>
                    <span class="text-xs text-slate-400"><i class="fa-solid fa-users"></i> ${c.spots}/${c.totalSpots} vagas</span>
                </div>
                <h4 class="font-bold text-white text-lg">${c.name}</h4>
                <p class="text-xs text-slate-400 mt-1"><i class="fa-solid fa-user-tie"></i> ${c.instructor}</p>
                <p class="text-xs text-slate-300 mt-2 font-medium"><i class="fa-solid fa-clock text-brand-500"></i> ${c.time}</p>
            </div>

            <button onclick="toggleClassBooking(${c.id})" class="w-full py-2.5 rounded-xl font-bold text-xs transition ${c.booked ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30 hover:bg-rose-500/30' : 'bg-brand-500 hover:bg-brand-600 text-black neon-glow'}">
                ${c.booked ? 'Cancelar Reserva' : 'Reservar Lugar'}
            </button>
        `;
        container.appendChild(card);
    });
}

function filterClasses(category) {
    renderClasses(category);
}

async function toggleClassBooking(id) {
    const cls = await db.get('aulas', id);
    if (cls) {
        if (cls.booked) {
            cls.booked = false;
            cls.spots++;
            showToast(`Reserva cancelada para ${cls.name}`);
        } else {
            if (cls.spots > 0) {
                cls.booked = true;
                cls.spots--;
                showToast(`Lugar reservado com sucesso em ${cls.name}!`);
            } else {
                showToast("⚠️ Aula sem vagas disponíveis!");
            }
        }
        await db.put('aulas', cls);
        await renderClasses();
        await refreshUI();
    }
}

/* =============================================================
   8. NUTRIÇÃO E ÁGUA
   ============================================================= */
async function addWater(amount) {
    const todayKey = new Date().toISOString().split('T')[0];
    let nutricao = await db.get('nutricao', todayKey);
    if (!nutricao) {
        nutricao = { date: todayKey, water: 0, cals: 0, prot: 0, carbs: 0, fat: 0 };
    }
    nutricao.water = parseFloat((nutricao.water + amount).toFixed(2));
    await db.put('nutricao', nutricao);
    await refreshUI();
    showToast(`+${amount * 1000}ml de água guardados no IndexedDB! 💧`);
}

async function resetWater() {
    const todayKey = new Date().toISOString().split('T')[0];
    let nutricao = await db.get('nutricao', todayKey);
    if (nutricao) {
        nutricao.water = 0;
        await db.put('nutricao', nutricao);
        await refreshUI();
    }
}

async function addMeal() {
    const cals = parseInt(document.getElementById('input-cals').value) || 0;
    const prot = parseInt(document.getElementById('input-prot').value) || 0;
    const carbs = parseInt(document.getElementById('input-carbs').value) || 0;

    if (cals > 0 || prot > 0 || carbs > 0) {
        const todayKey = new Date().toISOString().split('T')[0];
        let nutricao = await db.get('nutricao', todayKey);
        if (!nutricao) {
            nutricao = { date: todayKey, water: 0, cals: 0, prot: 0, carbs: 0, fat: 0 };
        }
        nutricao.cals += cals;
        nutricao.prot += prot;
        nutricao.carbs += carbs;
        
        await db.put('nutricao', nutricao);
        await refreshUI();

        document.getElementById('input-cals').value = '';
        document.getElementById('input-prot').value = '';
        document.getElementById('input-carbs').value = '';
        showToast("Refeição registada com sucesso!");
    }
}

/* =============================================================
   9. GAMIFICAÇÃO
   ============================================================= */
async function renderAchievements() {
    const profile = await db.get('perfil', 'user_profile');
    const streak = profile ? profile.streak : 0;
    const completed = profile ? profile.completedWorkoutsMonth || 0 : 0;

    const achievements = [
        { id: "a1", title: "Consistência de Ferro", desc: "Completou 5 dias seguidos de treino", icon: "fa-fire", unlocked: streak >= 5 },
        { id: "a2", title: "Primeiro Registo", desc: "Criou o seu perfil no PM Studio", icon: "fa-user-check", unlocked: !!profile },
        { id: "a3", title: "Atleta Consistente", desc: "Realizou mais de 10 treinos", icon: "fa-dumbbell", unlocked: completed >= 10 },
        { id: "a4", title: "Mestre da Hidratação", desc: "Bebeu mais de 3.0L de água num dia", icon: "fa-glass-water", unlocked: false },
        { id: "a5", title: "Atleta de Grupo", desc: "Reservou aulas de grupo no ginásio", icon: "fa-users", unlocked: false }
    ];

    const container = document.getElementById('badges-container');
    container.innerHTML = '';

    achievements.forEach(ach => {
        const card = document.createElement('div');
        card.className = `p-5 rounded-2xl border ${ach.unlocked ? 'bg-dark-card border-brand-500/40' : 'bg-slate-900/50 border-dark-border opacity-60'} flex items-center space-x-4`;
        card.innerHTML = `
            <div class="w-12 h-12 rounded-xl ${ach.unlocked ? 'bg-brand-500/20 text-brand-400 border border-brand-500/30' : 'bg-slate-800 text-slate-500'} flex items-center justify-center text-xl font-bold">
                <i class="fa-solid ${ach.icon}"></i>
            </div>
            <div>
                <h4 class="font-bold text-white text-sm">${ach.title}</h4>
                <p class="text-xs text-slate-400 mt-0.5">${ach.desc}</p>
                <span class="text-[10px] font-semibold ${ach.unlocked ? 'text-brand-400' : 'text-slate-500'} uppercase mt-1 block">
                    ${ach.unlocked ? 'Desbloqueado' : 'Bloqueado'}
                </span>
            </div>
        `;
        container.appendChild(card);
    });
}

/* =============================================================
   10. SINCRONIZAÇÃO CUMULATIVA COM GOOGLE DRIVE
   ============================================================= */
async function syncAthleteDataToGoogleDrive() {
    const WEB_APP_URL = "https://script.google.com/macros/s/AKfycbwg0YBjv4_djqq6Nl4GqxYhbG-OKTGLf1S_nQaRGgOSPXFwZcHiRhkSmZUcOuYZ3rA_jA/exec";

    try {
        const profile = await db.get('perfil', 'user_profile');
        if (!profile || !profile.name) {
            showToast("⚠️ Configure primeiro o seu perfil antes de sincronizar!");
            return;
        }

        showToast("☁️ A enviar dados para o Google Drive...");

        const pesoData = await db.getAll('peso');
        const forcaData = await db.getAll('forca');
        const treinosData = await db.getAll('treinos');
        const nutricaoData = await db.getAll('nutricao');
        const aulasData = await db.getAll('aulas');

        const payloadData = {
            athleteName: profile.name,
            payload: {
                profile: profile,
                peso: pesoData,
                forca: forcaData,
                treinos: treinosData,
                nutricao: nutricaoData,
                aulas: aulasData,
                lastSync: new Date().toISOString()
            }
        };

        await fetch(WEB_APP_URL, {
            method: 'POST',
            mode: 'no-cors',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payloadData)
        });

        showToast(`✅ Ficheiro '${profile.name}.json' sincronizado no Drive!`);

    } catch (error) {
        console.error("Erro na sincronização:", error);
        showToast("❌ Falha na conexão ao Google Drive.");
    }
}

/* =============================================================
   11. NAVEGAÇÃO E MODAIS
   ============================================================= */
function switchTab(tabId) {
    document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
    document.querySelectorAll('.nav-btn, .mobile-nav-btn').forEach(btn => {
        if (btn.getAttribute('data-tab') === tabId) {
            btn.classList.add('text-brand-400', 'font-bold');
        } else {
            btn.classList.remove('text-brand-400', 'font-bold');
        }
    });

    const selectedTab = document.getElementById(`tab-${tabId}`);
    if (selectedTab) {
        selectedTab.classList.add('active');
    }

    if (tabId === 'metrics') renderCharts();
    if (tabId === 'classes') renderClasses();
    if (tabId === 'workouts') renderWorkoutRoutine(currentActiveRoutine);
    if (tabId === 'achievements') renderAchievements();
}

function openModal(id) {
    document.getElementById(id).classList.remove('hidden');
}

function closeModal(id) {
    document.getElementById(id).classList.add('hidden');
}

function openExerciseModal(title, desc) {
    document.getElementById('modal-ex-title').innerText = title;
    document.getElementById('modal-ex-desc').innerText = desc;
    openModal('exercise-modal');
}

function showToast(msg) {
    const toast = document.getElementById('toast-notification');
    document.getElementById('toast-message').innerText = msg;
    toast.classList.remove('translate-y-32');
    setTimeout(() => {
        toast.classList.add('translate-y-32');
    }, 3500);
}

/* =============================================================
   12. INICIALIZAÇÃO DA APLICAÇÃO
   ============================================================= */
window.onload = async function() {
    try {
        await db.init();
        await setupBaseStructuresIfEmpty();
        
        document.getElementById('input-metric-date').value = new Date().toISOString().split('T')[0];

        await checkFirstTimeUser();

        await refreshUI();
        await renderWorkoutRoutine('A');
        updateTimerDisplay();
    } catch (err) {
        console.error("Erro na inicialização:", err);
    }
};
