// ===== DATA MANAGEMENT =====
const Storage = {
    get(key, defaultValue = []) {
        try {
            return JSON.parse(localStorage.getItem(key)) || defaultValue;
        } catch {
            return defaultValue;
        }
    },
    set(key, value) {
        localStorage.setItem(key, JSON.stringify(value));
    }
};

// ===== STATE =====
let tasks = Storage.get('studyTasks', []);
let subjects = Storage.get('studySubjects', [
    { id: 1, name: 'Mathematics', color: '#8b5cf6', icon: 'fa-calculator' },
    { id: 2, name: 'Science', color: '#3b82f6', icon: 'fa-flask' },
    { id: 3, name: 'History', color: '#f59e0b', icon: 'fa-landmark' },
    { id: 4, name: 'Literature', color: '#10b981', icon: 'fa-book-open' }
]);
let notes = Storage.get('studyNotes', [
    { id: 1, title: 'Welcome Note', content: 'Welcome to StudyFlow! Use this space to jot down quick notes, ideas, and study reminders.', date: new Date().toISOString() }
]);
let events = Storage.get('studyEvents', []);
let currentNoteId = notes[0]?.id || null;
let currentFilter = 'all';
let currentWeekOffset = 0;

// ===== SVG GRADIENTS INJECTION =====
function injectSVGGradients() {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('class', 'gradient-defs');
    svg.innerHTML = `
        <defs>
            <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" style="stop-color:#8b5cf6"/>
                <stop offset="100%" style="stop-color:#3b82f6"/>
            </linearGradient>
            <linearGradient id="timerGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" style="stop-color:#8b5cf6"/>
                <stop offset="100%" style="stop-color:#06b6d4"/>
            </linearGradient>
        </defs>
    `;
    document.body.appendChild(svg);
}

// ===== INITIALIZATION =====
document.addEventListener('DOMContentLoaded', () => {
    injectSVGGradients();
    initTabs();
    initGreeting();
    initDate();
    initTaskInput();
    initPomodoro();
    initCalendar();
    initNotes();
    renderAll();
});

function renderAll() {
    renderDashboard();
    renderTasks();
    renderSubjects();
    renderCalendar();
    renderNotesList();
    renderSubjectOptions();
    updatePomodoroTaskSelect();
}

// ===== TABS =====
function initTabs() {
    document.querySelectorAll('.nav-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            document.getElementById(tab.dataset.tab).classList.add('active');
            renderAll();
        });
    });
}

// ===== GREETING & DATE =====
function initGreeting() {
    const hour = new Date().getHours();
    let greeting = 'Good Evening';
    if (hour < 12) greeting = 'Good Morning';
    else if (hour < 17) greeting = 'Good Afternoon';
    document.getElementById('greeting').textContent = greeting;
}

function initDate() {
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    document.getElementById('currentDate').textContent = new Date().toLocaleDateString('en-US', options);
}

// ===== DASHBOARD =====
function renderDashboard() {
    const total = tasks.length;
    const completed = tasks.filter(t => t.completed).length;
    const pending = total - completed;
    const focusHours = Math.floor(Storage.get('totalFocusMinutes', 0) / 60);

    document.getElementById('dashTotal').textContent = total;
    document.getElementById('dashCompleted').textContent = completed;
    document.getElementById('dashPending').textContent = pending;
    document.getElementById('dashFocus').textContent = focusHours + 'h';

    // Circular progress
    const percent = total === 0 ? 0 : Math.round((completed / total) * 100);
    const circle = document.getElementById('weeklyCircle');
    if (circle) {
        const circumference = 2 * Math.PI * 50;
        const offset = circumference - (percent / 100) * circumference;
        circle.style.strokeDashoffset = offset;
    }
    document.getElementById('weeklyPercent').textContent = percent + '%';

    // Today's tasks
    const todayStr = new Date().toISOString().split('T')[0];
    const todayTasks = tasks.filter(t => t.dueDate === todayStr || (!t.dueDate && !t.completed));
    const todayContainer = document.getElementById('todayTasks');

    if (todayTasks.length === 0) {
        todayContainer.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-clipboard-list"></i>
                <p>No tasks for today yet</p>
            </div>`;
    } else {
        todayContainer.innerHTML = todayTasks.map(task => `
            <div class="today-task-item ${task.completed ? 'completed' : ''}">
                <input type="checkbox" ${task.completed ? 'checked' : ''} onchange="toggleTask(${task.id})">
                <span>${escapeHtml(task.text)}</span>
                ${task.subjectId ? `<span class="task-subject-tag" style="background:${getSubjectColor(task.subjectId)}22;color:${getSubjectColor(task.subjectId)}">${getSubjectName(task.subjectId)}</span>` : ''}
            </div>
        `).join('');
    }

    // Subject chart
    renderSubjectChart();
}

function renderSubjectChart() {
    const chartContainer = document.getElementById('subjectChart');
    if (!chartContainer) return;

    const subjectCounts = {};
    tasks.forEach(t => {
        const sid = t.subjectId || 'uncategorized';
        subjectCounts[sid] = (subjectCounts[sid] || 0) + 1;
    });

    const maxCount = Math.max(...Object.values(subjectCounts), 1);

    chartContainer.innerHTML = subjects.map(sub => {
        const count = subjectCounts[sub.id] || 0;
        const height = Math.max((count / maxCount) * 150, 4);
        return `
            <div class="chart-bar-wrapper">
                <div class="chart-bar" style="height:${height}px;background:${sub.color};box-shadow:0 0 20px ${sub.color}44"></div>
                <span>${sub.name}</span>
            </div>
        `;
    }).join('');
}

// ===== TASKS =====
function initTaskInput() {
    document.getElementById('taskInput').addEventListener('keypress', e => {
        if (e.key === 'Enter') addTask();
    });

    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentFilter = btn.dataset.filter;
            renderTasks();
        });
    });
}

function renderSubjectOptions() {
    const selects = [document.getElementById('taskSubject'), document.getElementById('eventSubject')];
    selects.forEach(select => {
        if (!select) return;
        const currentVal = select.value;
        select.innerHTML = '<option value="">Select Subject</option>' +
            subjects.map(s => `<option value="${s.id}">${s.name}</option>`).join('');
        select.value = currentVal;
    });
}

function addTask() {
    const input = document.getElementById('taskInput');
    const subjectSelect = document.getElementById('taskSubject');
    const prioritySelect = document.getElementById('taskPriority');
    const dueDateInput = document.getElementById('taskDueDate');

    const text = input.value.trim();
    if (!text) {
        shakeElement(input);
        return;
    }

    const task = {
        id: Date.now(),
        text,
        completed: false,
        subjectId: subjectSelect.value ? parseInt(subjectSelect.value) : null,
        priority: prioritySelect.value,
        dueDate: dueDateInput.value || null,
        createdAt: new Date().toISOString()
    };

    tasks.unshift(task);
    Storage.set('studyTasks', tasks);
    input.value = '';
    subjectSelect.value = '';
    prioritySelect.value = 'medium';
    dueDateInput.value = '';
    renderAll();
}

function renderTasks() {
    const container = document.getElementById('taskList');
    let filtered = tasks;

    if (currentFilter === 'pending') filtered = tasks.filter(t => !t.completed);
    else if (currentFilter === 'completed') filtered = tasks.filter(t => t.completed);
    else if (currentFilter === 'high') filtered = tasks.filter(t => t.priority === 'high');

    if (filtered.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-clipboard-check"></i>
                <p>No tasks found</p>
            </div>`;
        return;
    }

    container.innerHTML = filtered.map(task => `
        <div class="task-item ${task.completed ? 'completed' : ''}">
            <div class="task-checkbox ${task.completed ? 'checked' : ''}" onclick="toggleTask(${task.id})">
                ${task.completed ? '<i class="fas fa-check"></i>' : ''}
            </div>
            <div class="task-content">
                <div class="task-text">${escapeHtml(task.text)}</div>
                <div class="task-meta">
                    <span class="task-tag priority-${task.priority}">${task.priority}</span>
                    ${task.subjectId ? `<span class="task-tag" style="background:${getSubjectColor(task.subjectId)}22;color:${getSubjectColor(task.subjectId)}">${getSubjectName(task.subjectId)}</span>` : ''}
                    ${task.dueDate ? `<span class="task-date"><i class="far fa-calendar"></i> ${formatDate(task.dueDate)}</span>` : ''}
                </div>
            </div>
            <div class="task-actions">
                <button class="task-action-btn" onclick="deleteTask(${task.id})">
                    <i class="fas fa-trash-alt"></i>
                </button>
            </div>
        </div>
    `).join('');
}

function toggleTask(id) {
    const task = tasks.find(t => t.id === id);
    if (task) {
        task.completed = !task.completed;
        Storage.set('studyTasks', tasks);
        renderAll();
    }
}

function deleteTask(id) {
    tasks = tasks.filter(t => t.id !== id);
    Storage.set('studyTasks', tasks);
    renderAll();
}

// ===== POMODORO =====
let timerInterval = null;
let timerSeconds = 25 * 60;
let timerRunning = false;
let timerMode = 'pomodoro';
let sessionsCompleted = Storage.get('sessionsCompleted', 0);

const timerModes = {
    pomodoro: 25 * 60,
    short: 5 * 60,
    long: 15 * 60
};

function initPomodoro() {
    document.querySelectorAll('.mode-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            timerMode = btn.dataset.mode;
            resetTimer();
        });
    });

    document.getElementById('startTimer').addEventListener('click', startTimer);
    document.getElementById('pauseTimer').addEventListener('click', pauseTimer);
    document.getElementById('resetTimer').addEventListener('click', resetTimer);

    updateTimerDisplay();
    document.getElementById('sessionsCompleted').textContent = sessionsCompleted;
    updateTotalFocusTime();
}

function updatePomodoroTaskSelect() {
    const select = document.getElementById('timerTaskSelect');
    if (!select) return;
    const pending = tasks.filter(t => !t.completed);
    select.innerHTML = '<option value="">Select a task to focus on...</option>' +
        pending.map(t => `<option value="${t.id}">${escapeHtml(t.text)}</option>`).join('');
}

function startTimer() {
    if (timerRunning) return;
    timerRunning = true;
    document.getElementById('startTimer').innerHTML = '<i class="fas fa-play"></i> Running';

    timerInterval = setInterval(() => {
        timerSeconds--;
        updateTimerDisplay();

        if (timerSeconds <= 0) {
            completeTimer();
        }
    }, 1000);
}

function pauseTimer() {
    timerRunning = false;
    clearInterval(timerInterval);
    document.getElementById('startTimer').innerHTML = '<i class="fas fa-play"></i> Resume';
}

function resetTimer() {
    timerRunning = false;
    clearInterval(timerInterval);
    timerSeconds = timerModes[timerMode];
    updateTimerDisplay();
    document.getElementById('startTimer').innerHTML = '<i class="fas fa-play"></i> Start';
}

function completeTimer() {
    pauseTimer();
    timerSeconds = 0;
    updateTimerDisplay();

    if (timerMode === 'pomodoro') {
        sessionsCompleted++;
        Storage.set('sessionsCompleted', sessionsCompleted);
        document.getElementById('sessionsCompleted').textContent = sessionsCompleted;

        const totalMinutes = Storage.get('totalFocusMinutes', 0) + 25;
        Storage.set('totalFocusMinutes', totalMinutes);
        updateTotalFocusTime();
    }

    // Notification
    if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('StudyFlow', {
            body: timerMode === 'pomodoro' ? 'Focus session complete! Take a break.' : 'Break over! Ready to focus?',
            icon: '📚'
        });
    }

    resetTimer();
}

function updateTimerDisplay() {
    const mins = Math.floor(timerSeconds / 60);
    const secs = timerSeconds % 60;
    document.getElementById('timerDisplay').textContent =
        String(mins).padStart(2, '0') + ':' + String(secs).padStart(2, '0');

    const circle = document.getElementById('timerCircle');
    if (circle) {
        const total = timerModes[timerMode];
        const progress = (total - timerSeconds) / total;
        const circumference = 2 * Math.PI * 130;
        const offset = circumference * progress;
        circle.style.strokeDashoffset = offset;
    }
}

function updateTotalFocusTime() {
    const total = Storage.get('totalFocusMinutes', 0);
    const hours = Math.floor(total / 60);
    const mins = total % 60;
    document.getElementById('totalFocusTime').textContent = `${hours}h ${mins}m`;
}

// Request notification permission
if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission();
}

// ===== SCHEDULE / CALENDAR =====
function initCalendar() {
    document.getElementById('prevWeek').addEventListener('click', () => {
        currentWeekOffset--;
        renderCalendar();
    });
    document.getElementById('nextWeek').addEventListener('click', () => {
        currentWeekOffset++;
        renderCalendar();
    });
}

function getWeekStart(offset = 0) {
    const now = new Date();
    const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -6 : 1) + (offset * 7);
    const monday = new Date(now.setDate(diff));
    monday.setHours(0, 0, 0, 0);
    return monday;
}

function renderCalendar() {
    const grid = document.getElementById('calendarGrid');
    if (!grid) return;

    const weekStart = getWeekStart(currentWeekOffset);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);

    const weekRange = weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) +
        ' - ' + weekEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    document.getElementById('weekRange').textContent = weekRange;

    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const today = new Date().toISOString().split('T')[0];

    let html = '<div class="calendar-header-cell"></div>';

    for (let i = 0; i < 7; i++) {
        const date = new Date(weekStart);
        date.setDate(date.getDate() + i);
        const dateStr = date.toISOString().split('T')[0];
        const isToday = dateStr === today;

        html += `
            <div class="calendar-header-cell ${isToday ? 'today' : ''}">
                <div class="day-name">${days[i]}</div>
                <div class="day-number">${date.getDate()}</div>
            </div>
        `;
    }

    const timeSlots = ['06:00', '08:00', '10:00', '12:00', '14:00', '16:00', '18:00', '20:00', '22:00'];

    for (const time of timeSlots) {
        html += `<div class="calendar-time-cell">${time}</div>`;
        for (let i = 0; i < 7; i++) {
            const date = new Date(weekStart);
            date.setDate(date.getDate() + i);
            const dateStr = date.toISOString().split('T')[0];

            const dayEvents = events.filter(e => {
                const eDate = new Date(e.date);
                return eDate.toISOString().split('T')[0] === dateStr;
            });

            html += `<div class="calendar-cell">`;
            for (const evt of dayEvents) {
                const subject = subjects.find(s => s.id === evt.subjectId);
                const color = subject ? subject.color : '#8b5cf6';
                html += `<div class="calendar-event" style="background:${color}33;color:${color};border-left:3px solid ${color}">${escapeHtml(evt.title)}</div>`;
            }
            html += `</div>`;
        }
    }

    grid.innerHTML = html;
}

function addEvent() {
    const title = document.getElementById('eventTitle').value.trim();
    const subjectId = document.getElementById('eventSubject').value;
    const dayIndex = parseInt(document.getElementById('eventDay').value);
    const time = document.getElementById('eventTime').value;
    const duration = parseInt(document.getElementById('eventDuration').value) || 60;

    if (!title) {
        shakeElement(document.getElementById('eventTitle'));
        return;
    }

    const weekStart = getWeekStart(currentWeekOffset);
    const eventDate = new Date(weekStart);
    eventDate.setDate(eventDate.getDate() + dayIndex);
    const [hours, minutes] = time.split(':');
    eventDate.setHours(parseInt(hours), parseInt(minutes));

    events.push({
        id: Date.now(),
        title,
        subjectId: subjectId ? parseInt(subjectId) : null,
        date: eventDate.toISOString(),
        duration
    });

    Storage.set('studyEvents', events);
    document.getElementById('eventTitle').value = '';
    renderCalendar();
}

// ===== SUBJECTS =====
function renderSubjects() {
    const grid = document.getElementById('subjectsGrid');
    if (!grid) return;

    grid.innerHTML = subjects.map(sub => {
        const subTasks = tasks.filter(t => t.subjectId === sub.id);
        const completed = subTasks.filter(t => t.completed).length;
        const total = subTasks.length;
        const percent = total === 0 ? 0 : Math.round((completed / total) * 100);

        return `
            <div class="subject-card" style="--subject-color:${sub.color}">
                <div class="subject-header">
                    <div class="subject-icon" style="background:${sub.color}">
                        <i class="fas ${sub.icon}"></i>
                    </div>
                    <div class="subject-info">
                        <h3>${escapeHtml(sub.name)}</h3>
                        <p>${total} tasks</p>
                    </div>
                </div>
                <div class="subject-stats">
                    <div class="subject-stat">
                        <span style="color:${sub.color}">${completed}</span>
                        <label>Done</label>
                    </div>
                    <div class="subject-stat">
                        <span style="color:${sub.color}">${total - completed}</span>
                        <label>Pending</label>
                    </div>
                </div>
                <div class="subject-progress">
                    <div class="subject-progress-bar">
                        <div class="subject-progress-fill" style="width:${percent}%;background:${sub.color}"></div>
                    </div>
                    <div class="subject-progress-text">
                        <span>${percent}% complete</span>
                        <span>${total} total</span>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

function showAddSubject() {
    document.getElementById('addSubjectModal').classList.add('active');
}

function hideAddSubject() {
    document.getElementById('addSubjectModal').classList.remove('active');
}

function addSubject() {
    const name = document.getElementById('subjectName').value.trim();
    const color = document.getElementById('subjectColor').value;

    if (!name) {
        shakeElement(document.getElementById('subjectName'));
        return;
    }

    const icons = ['fa-book', 'fa-calculator', 'fa-flask', 'fa-landmark', 'fa-globe', 'fa-code', 'fa-palette', 'fa-music'];
    const icon = icons[subjects.length % icons.length];

    subjects.push({
        id: Date.now(),
        name,
        color,
        icon
    });

    Storage.set('studySubjects', subjects);
    document.getElementById('subjectName').value = '';
    hideAddSubject();
    renderAll();
}

// ===== NOTES =====
function initNotes() {
    if (notes.length > 0 && !currentNoteId) {
        currentNoteId = notes[0].id;
    }
    loadCurrentNote();

    document.getElementById('noteTitle').addEventListener('input', autoSaveNote);
    document.getElementById('noteContent').addEventListener('input', autoSaveNote);
}

function renderNotesList() {
    const list = document.getElementById('notesList');
    if (!list) return;

    list.innerHTML = notes.map(note => `
        <div class="note-preview ${note.id === currentNoteId ? 'active' : ''}" onclick="selectNote(${note.id})">
            <h4>${escapeHtml(note.title || 'Untitled')}</h4>
            <p>${escapeHtml(note.content.substring(0, 60))}${note.content.length > 60 ? '...' : ''}</p>
            <small>${formatDateTime(note.date)}</small>
        </div>
    `).join('');
}

function selectNote(id) {
    saveNote();
    currentNoteId = id;
    loadCurrentNote();
    renderNotesList();
}

function loadCurrentNote() {
    const note = notes.find(n => n.id === currentNoteId);
    if (note) {
        document.getElementById('noteTitle').value = note.title || '';
        document.getElementById('noteContent').value = note.content || '';
        document.getElementById('noteDate').textContent = 'Last edited: ' + formatDateTime(note.date);
    }
}

function createNote() {
    saveNote();
    const newNote = {
        id: Date.now(),
        title: '',
        content: '',
        date: new Date().toISOString()
    };
    notes.unshift(newNote);
    currentNoteId = newNote.id;
    Storage.set('studyNotes', notes);
    renderNotesList();
    loadCurrentNote();
}

function saveNote() {
    const note = notes.find(n => n.id === currentNoteId);
    if (note) {
        note.title = document.getElementById('noteTitle').value;
        note.content = document.getElementById('noteContent').value;
        note.date = new Date().toISOString();
        Storage.set('studyNotes', notes);
        document.getElementById('noteDate').textContent = 'Last edited: Just now';
        renderNotesList();
    }
}

function autoSaveNote() {
    clearTimeout(window.autoSaveTimeout);
    window.autoSaveTimeout = setTimeout(() => {
        saveNote();
    }, 1000);
}

// ===== UTILITIES =====
function getSubjectName(id) {
    const sub = subjects.find(s => s.id === parseInt(id));
    return sub ? sub.name : 'General';
}

function getSubjectColor(id) {
    const sub = subjects.find(s => s.id === parseInt(id));
    return sub ? sub.color : '#8b5cf6';
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function formatDate(dateStr) {
    const date = new Date(dateStr);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (dateStr === today.toISOString().split('T')[0]) return 'Today';
    if (dateStr === tomorrow.toISOString().split('T')[0]) return 'Tomorrow';

    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatDateTime(isoString) {
    const date = new Date(isoString);
    const now = new Date();
    const diff = (now - date) / 1000;

    if (diff < 60) return 'Just now';
    if (diff < 3600) return Math.floor(diff / 60) + ' min ago';
    if (diff < 86400) return Math.floor(diff / 3600) + ' hours ago';
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function shakeElement(el) {
    el.style.animation = 'none';
    el.offsetHeight;
    el.style.animation = 'shake 0.4s ease';
    setTimeout(() => { el.style.animation = ''; }, 400);
}

// Add shake animation
const shakeStyle = document.createElement('style');
shakeStyle.textContent = `
    @keyframes shake {
        0%, 100% { transform: translateX(0); }
        25% { transform: translateX(-8px); }
        50% { transform: translateX(8px); }
        75% { transform: translateX(-4px); }
    }
`;
document.head.appendChild(shakeStyle);

// ===== GLOBAL SEARCH =====
document.getElementById('globalSearch').addEventListener('input', (e) => {
    const query = e.target.value.toLowerCase();
    if (!query) {
        currentFilter = 'all';
        renderTasks();
        return;
    }

    const filtered = tasks.filter(t => t.text.toLowerCase().includes(query));
    const container = document.getElementById('taskList');
    container.innerHTML = filtered.map(task => `
        <div class="task-item ${task.completed ? 'completed' : ''}">
            <div class="task-checkbox ${task.completed ? 'checked' : ''}" onclick="toggleTask(${task.id})">
                ${task.completed ? '<i class="fas fa-check"></i>' : ''}
            </div>
            <div class="task-content">
                <div class="task-text">${escapeHtml(task.text)}</div>
                <div class="task-meta">
                    <span class="task-tag priority-${task.priority}">${task.priority}</span>
                    ${task.subjectId ? `<span class="task-tag" style="background:${getSubjectColor(task.subjectId)}22;color:${getSubjectColor(task.subjectId)}">${getSubjectName(task.subjectId)}</span>` : ''}
                </div>
            </div>
            <div class="task-actions">
                <button class="task-action-btn" onclick="deleteTask(${task.id})"><i class="fas fa-trash-alt"></i></button>
            </div>
        </div>
    `).join('');
});

// ===== THEME TOGGLE =====
document.getElementById('themeToggle').addEventListener('click', () => {
    const btn = document.getElementById('themeToggle');
    const icon = btn.querySelector('i');
    if (icon.classList.contains('fa-moon')) {
        icon.classList.remove('fa-moon');
        icon.classList.add('fa-sun');
        document.documentElement.style.setProperty('--bg-primary', '#f8f9fc');
        document.documentElement.style.setProperty('--bg-secondary', '#ffffff');
        document.documentElement.style.setProperty('--bg-card', 'rgba(0,0,0,0.03)');
        document.documentElement.style.setProperty('--text-primary', '#1a1a2e');
        document.documentElement.style.setProperty('--text-secondary', '#6b7280');
        document.documentElement.style.setProperty('--border-color', 'rgba(0,0,0,0.08)');
    } else {
        icon.classList.remove('fa-sun');
        icon.classList.add('fa-moon');
        document.documentElement.style.setProperty('--bg-primary', '#0a0a0f');
        document.documentElement.style.setProperty('--bg-secondary', '#12121a');
        document.documentElement.style.setProperty('--bg-card', 'rgba(255,255,255,0.03)');
        document.documentElement.style.setProperty('--text-primary', '#ffffff');
        document.documentElement.style.setProperty('--text-secondary', '#9ca3af');
        document.documentElement.style.setProperty('--border-color', 'rgba(255,255,255,0.08)');
    }
});