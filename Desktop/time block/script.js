const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const START_HOUR = 8;
const END_HOUR = 24;
const SLOT_MINUTES = 30;
const TOTAL_SLOTS_PER_DAY = ((END_HOUR - START_HOUR) * 60) / SLOT_MINUTES;
const STORAGE_KEY = 'weekly_planner_multiweek_v3';

let state = {
  currentWeekOffset: 0,
  showWeeklyTasksPanel: false,
  showFixedSchedulePanel: false,
  weeklyTemplates: [],
  recurringFixedSchedules: [],
  recurringDeadlines: [],
  weeks: {},
  categories: [
    { id: 'work', name: 'Work / Study', color: '#3b82f6' },
    { id: 'exercise', name: 'Exercise', color: '#22c55e' },
    { id: 'personal', name: 'Personal', color: '#ec4899' },
    { id: 'other', name: 'Other', color: '#6b7280' }
  ],
};

let draggedTaskId = null;
let editingTaskId = null;
let editingMode = 'task';
let editingTemplateTaskId = null;

const USER_ID = 'summer-demo';
const SUPABASE_URL = 'https://glcalchansksohyrowld.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_Uag1uDPb6Ihhggs-Bh44Hg_R3KIB8Z1';

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const newCategoryNameInput = document.getElementById('newCategoryNameInput');
const newCategoryColorInput = document.getElementById('newCategoryColorInput');
const addCategoryBtn = document.getElementById('addCategoryBtn');
const categoryListEl = document.getElementById('categoryList');

const legendListEl = document.getElementById('legendList');
const calendarEl = document.getElementById('calendar');
const taskListEl = document.getElementById('taskList');
const weeklyTemplateListEl = document.getElementById('weeklyTemplateList');
const fixedScheduleListEl = document.getElementById('fixedScheduleList');

const tasksLeftEl = document.getElementById('tasksLeft');
const timeLeftEl = document.getElementById('timeLeft');
const scheduledTimeEl = document.getElementById('scheduledTime');
const currentWeekLabelEl = document.getElementById('currentWeekLabel');
const nextDeadlineCountdownEl = document.getElementById('nextDeadlineCountdown');

const addTaskBtn = document.getElementById('addTaskBtn');
const addTemplateTaskBtn = document.getElementById('addTemplateTaskBtn');
const addFixedScheduleBtn = document.getElementById('addFixedScheduleBtn');
const prevWeekBtn = document.getElementById('prevWeekBtn');
const nextWeekBtn = document.getElementById('nextWeekBtn');

const toggleWeeklyTasksBtn = document.getElementById('toggleWeeklyTasksBtn');
const weeklyTasksContent = document.getElementById('weeklyTasksContent');
const toggleFixedScheduleBtn = document.getElementById('toggleFixedScheduleBtn');
const fixedScheduleContent = document.getElementById('fixedScheduleContent');

const taskModal = document.getElementById('taskModal');
const modalTitle = document.getElementById('modalTitle');
const taskNameInput = document.getElementById('taskNameInput');
const taskTimeInput = document.getElementById('taskTimeInput');
const taskCategoryInput = document.getElementById('taskCategoryInput');
const taskTypeInput = document.getElementById('taskTypeInput');
const fixedDayInput = document.getElementById('fixedDayInput');
const fixedStartInput = document.getElementById('fixedStartInput');
const fixedDayWrapper = document.getElementById('fixedDayWrapper');
const fixedStartWrapper = document.getElementById('fixedStartWrapper');
const saveTaskBtn = document.getElementById('saveTaskBtn');
const deleteTaskBtn = document.getElementById('deleteTaskBtn');
const cancelTaskBtn = document.getElementById('cancelTaskBtn');

const templateModal = document.getElementById('templateModal');
const templateModalTitle = document.getElementById('templateModalTitle');
const templateTaskNameInput = document.getElementById('templateTaskNameInput');
const templateTaskTimeInput = document.getElementById('templateTaskTimeInput');
const templateTaskCategoryInput = document.getElementById('templateTaskCategoryInput');
const saveTemplateTaskBtn = document.getElementById('saveTemplateTaskBtn');
const deleteTemplateTaskBtn = document.getElementById('deleteTemplateTaskBtn');
const cancelTemplateTaskBtn = document.getElementById('cancelTemplateTaskBtn');

const fixedRepeatInput = document.getElementById('fixedRepeatInput');
const fixedStartDateInput = document.getElementById('fixedStartDateInput');
const fixedRepeatWrapper = document.getElementById('fixedRepeatWrapper');
const fixedStartDateWrapper = document.getElementById('fixedStartDateWrapper');
const deadlineWarningInput = document.getElementById('deadlineWarningInput');
const deadlineWarningWrapper = document.getElementById('deadlineWarningWrapper');
const deadlineOneTimeInput = document.getElementById('deadlineOneTimeInput');
const deadlineOneTimeWrapper = document.getElementById('deadlineOneTimeWrapper');

init();

async function init() {
  await loadState();
  ensureCurrentWeekExists();
  buildCalendarStructure();
  fillFixedStartOptions();
  renderCategoryOptions();
  bindEvents();
  renderAll();
  createNowLine();
  setInterval(updateNextDeadlineCountdown, 60000);
}

function generateId() {
  return 'id-' + Math.random().toString(36).slice(2, 11);
}

function getCategoryById(categoryId) {
  return state.categories.find((cat) => cat.id === categoryId) || {
    id: 'other',
    name: categoryId,
    color: '#6b7280'
  };
}

function applyCategoryStyle(el, categoryId, isCompleted = false) {
  const cat = getCategoryById(categoryId);
  if (isCompleted) {
    el.style.backgroundColor = '#e5e7eb';
    el.style.borderLeft = '6px solid #9ca3af';
    return;
  }
  el.style.backgroundColor = `${cat.color}44`;
  el.style.borderLeft = `6px solid ${cat.color}`;
}

function getDefaultCategories() {
  return [
    { id: 'work', name: 'Work / Study', color: '#3b82f6' },
    { id: 'exercise', name: 'Exercise', color: '#22c55e' },
    { id: 'personal', name: 'Personal', color: '#ec4899' },
    { id: 'other', name: 'Other', color: '#6b7280' }
  ];
}

function normalizeState(parsed) {
  const normalizedWeeks = Object.fromEntries(
    Object.entries(parsed.weeks || {}).map(([weekKey, weekData]) => [
      weekKey,
      {
        ...weekData,
        tasks: (weekData.tasks || []).map((task) => ({
          ...task,
          completed: Boolean(task.completed),
        })),
        fixedEvents: weekData.fixedEvents || [],
        appliedTemplateIds: weekData.appliedTemplateIds || [],
      }
    ])
  );

  return {
    currentWeekOffset: parsed.currentWeekOffset ?? 0,
    showWeeklyTasksPanel: parsed.showWeeklyTasksPanel ?? false,
    showFixedSchedulePanel: parsed.showFixedSchedulePanel ?? false,
    weeklyTemplates: parsed.weeklyTemplates || [],
    recurringFixedSchedules: (parsed.recurringFixedSchedules || []).map((event) => ({
      ...event,
      resolvedWeeks: event.resolvedWeeks || [],
    })),
    recurringDeadlines: (parsed.recurringDeadlines || []).map((event) => ({
      ...event,
      resolvedWeeks: event.resolvedWeeks || [],
    })),
    weeks: normalizedWeeks,
    categories: parsed.categories && parsed.categories.length
      ? parsed.categories
      : getDefaultCategories(),
  };
}


function getCurrentWeekKey() {
  return getWeekKey();
}

function getTaskById(taskId) {
  return getCurrentWeekData().tasks.find((task) => task.id === taskId);
}

function isTaskCompleted(task) {
  return Boolean(task?.completed);
}

function isRecurringOccurrenceResolved(event, weekKey = getCurrentWeekKey()) {
  return Boolean(event?.resolvedWeeks?.includes(weekKey));
}

function toggleTaskCompleted(taskId) {
  const task = getTaskById(taskId);
  if (!task) return;
  task.completed = !task.completed;
  renderAll();
}

function toggleRecurringOccurrenceResolved(collectionName, eventId, weekKey = getCurrentWeekKey()) {
  const event = (state[collectionName] || []).find((item) => item.id === eventId);
  if (!event) return;

  if (!event.resolvedWeeks) {
    event.resolvedWeeks = [];
  }

  if (event.resolvedWeeks.includes(weekKey)) {
    event.resolvedWeeks = event.resolvedWeeks.filter((key) => key !== weekKey);
  } else {
    event.resolvedWeeks.push(weekKey);
  }

  renderAll();
}

function toggleFixedResolved(eventId, weekKey = getCurrentWeekKey()) {
  toggleRecurringOccurrenceResolved('recurringFixedSchedules', eventId, weekKey);
}

function toggleDeadlineResolved(eventId, weekKey = getCurrentWeekKey()) {
  toggleRecurringOccurrenceResolved('recurringDeadlines', eventId, weekKey);
}

function getDayOffset(day) {
  return DAYS.indexOf(day);
}

function getEventDateTimeFromWeekKey(weekKey, day, startSlot) {
  const base = new Date(`${weekKey}T00:00:00`);
  base.setDate(base.getDate() + getDayOffset(day));

  if (startSlot >= TOTAL_SLOTS_PER_DAY) {
    base.setHours(23, 59, 0, 0);
    return base;
  }

  const totalMinutes = START_HOUR * 60 + startSlot * SLOT_MINUTES;
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  base.setHours(hours, minutes, 0, 0);
  return base;
}

function formatCountdown(ms) {
  if (ms <= 0) return 'due now';
  const totalMinutes = Math.floor(ms / 60000);
  const days = Math.floor(totalMinutes / (60 * 24));
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
  const minutes = totalMinutes % 60;

  const parts = [];
  if (days) parts.push(`${days}d`);
  if (hours || days) parts.push(`${hours}h`);
  parts.push(`${minutes}m`);
  return parts.join(' ');
}

function formatDeadlineTimestamp(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  const hh = String(date.getHours()).padStart(2, '0');
  const mm = String(date.getMinutes()).padStart(2, '0');
  return `${y}/${m}/${d} ${hh}:${mm}`;
}

function getNextUpcomingDeadline(maxWeeksToCheck = 104) {
  const now = new Date();
  const currentWeekStart = getWeekStartDate(0);
  let nextItem = null;

  for (let weekOffset = 0; weekOffset <= maxWeeksToCheck; weekOffset++) {
    const weekStart = new Date(currentWeekStart);
    weekStart.setDate(currentWeekStart.getDate() + weekOffset * 7);
    const weekKey = formatDateYYYYMMDD(weekStart);

    for (const deadline of state.recurringDeadlines || []) {
      const renderedThisWeek = getRenderedDeadlineForWeek(deadline, weekStart, weekKey);
      if (!renderedThisWeek) continue;
      if (isRecurringOccurrenceResolved(deadline, weekKey)) continue;

      const dateTime = getEventDateTimeFromWeekKey(weekKey, deadline.day, deadline.startSlot);
      if (dateTime < now) continue;

      if (!nextItem || dateTime < nextItem.dateTime) {
        nextItem = { deadline, weekKey, dateTime };
      }
    }
  }

  return nextItem;
}

function updateNextDeadlineCountdown() {
  if (!nextDeadlineCountdownEl) return;

  const nextDeadline = getNextUpcomingDeadline();

  if (!nextDeadline) {
    nextDeadlineCountdownEl.textContent = 'No upcoming active deadlines';
    nextDeadlineCountdownEl.classList.add('is-clear');
    return;
  }

  nextDeadlineCountdownEl.classList.remove('is-clear');
  const countdown = formatCountdown(nextDeadline.dateTime - new Date());
  nextDeadlineCountdownEl.textContent = `Next deadline: ${nextDeadline.deadline.title} • ${formatDeadlineTimestamp(nextDeadline.dateTime)} • ${countdown}`;
}

function addCategory(name, color) {
  const id = 'cat-' + Math.random().toString(36).slice(2, 9);

  state.categories.push({
    id,
    name,
    color
  });

  renderCategoryOptions();
  renderAll();
}

function renderCategoryList() {
  categoryListEl.innerHTML = '';

  state.categories.forEach((cat) => {
    const el = document.createElement('div');
    el.className = 'template-item';
    el.innerHTML = `
      <div class="task-title">${cat.name}</div>
      <div class="task-meta">${cat.color}</div>
      <div class="task-actions">
        <button class="delete-category-btn">Delete</button>
      </div>
    `;
    applyCategoryStyle(el, cat.id);

    el.querySelector('.delete-category-btn').addEventListener('click', () => {
      deleteCategory(cat.id);
    });

    categoryListEl.appendChild(el);
  });
}

function deleteCategory(categoryId) {
  const isUsedInTasks = Object.values(state.weeks).some((week) =>
    week.tasks.some((task) => task.category === categoryId)
  );

  const isUsedInTemplates = state.weeklyTemplates.some((t) => t.category === categoryId);
  const isUsedInFixed = state.recurringFixedSchedules.some((e) => e.category === categoryId);

  if (isUsedInTasks || isUsedInTemplates || isUsedInFixed) {
    return alert('This category is still being used by existing tasks.');
  }

  state.categories = state.categories.filter((cat) => cat.id !== categoryId);
  renderCategoryOptions();
  renderAll();
}

function renderCategoryOptions() {
  taskCategoryInput.innerHTML = '';
  templateTaskCategoryInput.innerHTML = '';

  state.categories.forEach((cat) => {
    const option1 = document.createElement('option');
    option1.value = cat.id;
    option1.textContent = cat.name;
    taskCategoryInput.appendChild(option1);

    const option2 = document.createElement('option');
    option2.value = cat.id;
    option2.textContent = cat.name;
    templateTaskCategoryInput.appendChild(option2);
  });
}

async function saveState() {
  const { error } = await supabaseClient
    .from('planner_states')
    .upsert(
      {
        user_id: USER_ID,
        state_json: state,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' }
    );

  if (error) {
    console.error('Save failed:', error);
    alert('Failed to save data to Supabase.');
  }
}

async function loadState() {
  const { data, error } = await supabaseClient
    .from('planner_states')
    .select('state_json')
    .eq('user_id', USER_ID)
    .maybeSingle();

  if (error) {
    console.error('Load failed:', error);
    return;
  }

  if (!data || !data.state_json) return;

  state = normalizeState(data.state_json);
}

function getWeekStartDate(offset = state.currentWeekOffset) {
  const now = new Date();
  const currentDay = now.getDay();
  const mondayDistance = currentDay === 0 ? -6 : 1 - currentDay;

  const monday = new Date(now);
  monday.setHours(0, 0, 0, 0);
  monday.setDate(now.getDate() + mondayDistance + offset * 7);
  return monday;
}

function renderLegend() {
  legendListEl.innerHTML = '';

  state.categories.forEach((cat) => {
    const item = document.createElement('div');
    item.className = 'legend-item';
    item.innerHTML = `
      <span class="legend-color" style="background:${cat.color}"></span>
      ${cat.name}
    `;
    legendListEl.appendChild(item);
  });
}

function formatDateYYYYMMDD(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function formatPrettyDate(date) {
  return `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()}`;
}

function getWeekKey(offset = state.currentWeekOffset) {
  return formatDateYYYYMMDD(getWeekStartDate(offset));
}

function getCurrentWeekData() {
  return state.weeks[getWeekKey()];
}

function ensureCurrentWeekExists() {
  const weekKey = getWeekKey();

  if (!state.weeks[weekKey]) {
    state.weeks[weekKey] = {
      tasks: [],
      fixedEvents: [],
      appliedTemplateIds: [],
    };
  }

  injectWeeklyTemplatesIntoCurrentWeek();
}

function injectWeeklyTemplatesIntoCurrentWeek() {
  const weekData = getCurrentWeekData();
  if (!weekData.appliedTemplateIds) {
    weekData.appliedTemplateIds = [];
  }

  state.weeklyTemplates.forEach((template) => {
    if (weekData.appliedTemplateIds.includes(template.id)) return;

    weekData.tasks.push({
      id: generateId(),
      title: template.title,
      time: template.time,
      category: template.category,
      scheduled: null,
      completed: false,
      sourceTemplateId: template.id,
    });

    weekData.appliedTemplateIds.push(template.id);
  });
}

function addTemplateToCurrentAndFutureWeeks(template) {
  const currentWeekStart = getWeekStartDate(state.currentWeekOffset);

  Object.keys(state.weeks).forEach((weekKey) => {
    const weekStart = new Date(weekKey + 'T00:00:00');
    if (weekStart < currentWeekStart) return;

    const weekData = state.weeks[weekKey];

    if (!weekData.appliedTemplateIds) {
      weekData.appliedTemplateIds = [];
    }

    if (weekData.appliedTemplateIds.includes(template.id)) return;

    weekData.tasks.push({
      id: generateId(),
      title: template.title,
      time: template.time,
      category: template.category,
      scheduled: null,
      completed: false,
      sourceTemplateId: template.id,
    });

    weekData.appliedTemplateIds.push(template.id);
  });
}

function buildCalendarStructure() {
  calendarEl.innerHTML = '';

  const corner = document.createElement('div');
  corner.className = 'corner-cell';
  calendarEl.appendChild(corner);

  const weekStart = getWeekStartDate();

  DAYS.forEach((day, index) => {
    const date = new Date(weekStart);
    date.setDate(weekStart.getDate() + index);

    const header = document.createElement('div');
    header.className = 'day-header';
    header.innerHTML = `
      <div class="day-header-top">${day}</div>
      <div class="day-header-date">${date.getMonth() + 1}/${date.getDate()}</div>
      <div class="day-header-bottom" id="remaining-${day}">Remaining: 0 min</div>
    `;
    calendarEl.appendChild(header);
  });

  for (let slotIndex = 0; slotIndex < TOTAL_SLOTS_PER_DAY; slotIndex++) {
    const timeLabel = document.createElement('div');
    timeLabel.className = 'time-label';
    timeLabel.textContent = formatSlotTime(slotIndex);
    calendarEl.appendChild(timeLabel);

    DAYS.forEach((day) => {
      const slot = document.createElement('div');
      slot.className = 'slot';
      slot.dataset.day = day;
      slot.dataset.slotIndex = slotIndex;
      slot.addEventListener('dragover', handleSlotDragOver);
      slot.addEventListener('dragleave', handleSlotDragLeave);
      slot.addEventListener('drop', handleSlotDrop);
      calendarEl.appendChild(slot);
    });
  }

  const summaryLabel = document.createElement('div');
  summaryLabel.className = 'day-summary';
  summaryLabel.textContent = 'Daily Summary';
  calendarEl.appendChild(summaryLabel);

  DAYS.forEach((day) => {
    const summary = document.createElement('div');
    summary.className = 'day-summary';
    summary.id = `summary-${day}`;
    summary.textContent = 'Scheduled: 0 min';
    calendarEl.appendChild(summary);
  });
}

function bindEvents() {

  addCategoryBtn.addEventListener('click', () => {
    const name = newCategoryNameInput.value.trim();
    const color = newCategoryColorInput.value;

    if (!name) return alert('Please enter a category name.');

    addCategory(name, color);
    newCategoryNameInput.value = '';
    newCategoryColorInput.value = '#8b5cf6';
  });

  prevWeekBtn.addEventListener('click', () => {
    state.currentWeekOffset -= 1;
    ensureCurrentWeekExists();
    buildCalendarStructure();
    renderAll();
  });

  nextWeekBtn.addEventListener('click', () => {
    state.currentWeekOffset += 1;
    ensureCurrentWeekExists();
    buildCalendarStructure();
    renderAll();
  });

  toggleWeeklyTasksBtn.addEventListener('click', () => {
    state.showWeeklyTasksPanel = !state.showWeeklyTasksPanel;
    renderWeeklyTasksPanelVisibility();
    saveState();
  });

  toggleFixedScheduleBtn.addEventListener('click', () => {
    state.showFixedSchedulePanel = !state.showFixedSchedulePanel;
    renderFixedSchedulePanelVisibility();
    saveState();
  });

  addTaskBtn.addEventListener('click', openAddModal);
  addTemplateTaskBtn.addEventListener('click', openAddTemplateModal);
  addFixedScheduleBtn.addEventListener('click', () => {
    openAddModal();
    taskTypeInput.value = 'fixed';
    toggleFixedFields();
  });

  saveTaskBtn.addEventListener('click', saveTaskFromModal);
  deleteTaskBtn.addEventListener('click', () => {
    if (!editingTaskId) return;
    if (editingMode === 'task') deleteTask(editingTaskId);
    else if (editingMode === 'fixed') deleteFixedEvent(editingTaskId);
    else deleteDeadline(editingTaskId);
    closeModal();
  });
  cancelTaskBtn.addEventListener('click', closeModal);
  taskTypeInput.addEventListener('change', toggleFixedFields);
  deadlineOneTimeInput.addEventListener('change', toggleFixedFields);

  saveTemplateTaskBtn.addEventListener('click', saveTemplateTaskFromModal);
  deleteTemplateTaskBtn.addEventListener('click', () => {
    if (!editingTemplateTaskId) return;
    deleteWeeklyTemplateTask(editingTemplateTaskId);
    closeTemplateModal();
  });
  cancelTemplateTaskBtn.addEventListener('click', closeTemplateModal);

  taskModal.addEventListener('click', (e) => {
    if (e.target === taskModal) closeModal();
  });
  templateModal.addEventListener('click', (e) => {
    if (e.target === templateModal) closeTemplateModal();
  });

  bindTaskListDropZone();
}

function bindTaskListDropZone() {
  taskListEl.addEventListener('dragover', (e) => {
    e.preventDefault();
    taskListEl.classList.add('drag-over');
  });

  taskListEl.addEventListener('dragleave', () => {
    taskListEl.classList.remove('drag-over');
  });

  taskListEl.addEventListener('drop', (e) => {
    e.preventDefault();
    taskListEl.classList.remove('drag-over');

    if (!draggedTaskId) return;
    const task = getCurrentWeekData().tasks.find((t) => t.id === draggedTaskId);
    if (!task) return;

    task.scheduled = null;
    renderAll();
  });
}

function renderAll() {
  renderWeekLabel();
  renderWeeklyTasksPanelVisibility();
  renderFixedSchedulePanelVisibility();
  renderTaskList();
  renderWeeklyTemplateList();
  renderFixedScheduleList();
  clearTaskBlocks();
  renderFixedEvents();
  renderScheduledTasks();
  updateOccupiedStyles();
  renderDeadlineWarnings();
  renderDeadlineLines();
  updateStats();
  updateDailySummaries();
  renderLegend();
  renderCategoryList();
  updateNextDeadlineCountdown();

  if (!document.getElementById('nowLine') || !document.getElementById('nowDot')) {
    createNowLine();
  } else {
    updateNowLine();
  }

  queueSaveState();
}

let saveTimer = null;

function queueSaveState() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    saveState();
  }, 500);
}

function renderWeekLabel() {
  const start = getWeekStartDate();
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  currentWeekLabelEl.textContent = `${formatPrettyDate(start)} - ${formatPrettyDate(end)}`;
}

function renderWeeklyTasksPanelVisibility() {
  weeklyTasksContent.classList.toggle('hidden', !state.showWeeklyTasksPanel);
}

function renderFixedSchedulePanelVisibility() {
  fixedScheduleContent.classList.toggle('hidden', !state.showFixedSchedulePanel);
}

function renderTaskList() {
  taskListEl.innerHTML = '';
  const unscheduledTasks = getCurrentWeekData().tasks.filter((task) => !task.scheduled);

  unscheduledTasks.forEach((task) => {
    const taskEl = document.createElement('div');
    taskEl.className = `task${isTaskCompleted(task) ? ' completed' : ''}`;
    applyCategoryStyle(taskEl, task.category, isTaskCompleted(task));
    taskEl.draggable = !isTaskCompleted(task);
    taskEl.innerHTML = `
      <div class="task-title">${task.title}</div>
      <div class="task-meta">${task.time} min • ${getCategoryById(task.category).name}${isTaskCompleted(task) ? ' • Solved' : ''}</div>
      <div class="task-actions">
        <button class="toggle-complete-btn">${isTaskCompleted(task) ? 'Undo' : 'Solve'}</button>
        <button class="edit-btn">Edit</button>
        <button class="delete-btn">Delete</button>
      </div>
    `;

    if (!isTaskCompleted(task)) {
      taskEl.addEventListener('dragstart', () => {
        draggedTaskId = task.id;
        taskEl.classList.add('dragging');
      });
      taskEl.addEventListener('dragend', () => taskEl.classList.remove('dragging'));
    }

    taskEl.querySelector('.toggle-complete-btn').addEventListener('click', () => toggleTaskCompleted(task.id));
    taskEl.querySelector('.edit-btn').addEventListener('click', () => openEditModal(task.id));
    taskEl.querySelector('.delete-btn').addEventListener('click', () => deleteTask(task.id));

    taskListEl.appendChild(taskEl);
  });
}

function renderWeeklyTemplateList() {
  weeklyTemplateListEl.innerHTML = '';

  state.weeklyTemplates.forEach((item) => {
    const el = document.createElement('div');
    el.className = 'template-item';
    applyCategoryStyle(el, item.category);
    el.innerHTML = `
      <div class="task-title">${item.title}</div>
      <div class="task-meta">${item.time} min • ${capitalize(item.category)}</div>
      <div class="task-actions">
        <button class="edit-template-btn">Edit</button>
        <button class="delete-template-btn">Delete</button>
      </div>
    `;
    el.querySelector('.edit-template-btn').addEventListener('click', () => openEditTemplateModal(item.id));
    el.querySelector('.delete-template-btn').addEventListener('click', () => deleteWeeklyTemplateTask(item.id));
    weeklyTemplateListEl.appendChild(el);
  });
}

function renderFixedScheduleList() {
  fixedScheduleListEl.innerHTML = '';

  const fixedItems = getRenderedFixedEventsForCurrentWeek().map((event) => ({
    ...event,
    itemType: 'fixed'
  }));

  const deadlineItems = getRenderedDeadlinesForCurrentWeek().map((event) => ({
    ...event,
    itemType: 'deadline'
  }));

  [...fixedItems, ...deadlineItems]
    .sort((a, b) => a.day.localeCompare(b.day) || a.startSlot - b.startSlot)
    .forEach((event) => {
      const weekKey = getCurrentWeekKey();
      const isResolved = isRecurringOccurrenceResolved(event, weekKey);
      const el = document.createElement('div');
      el.className = `template-item${isResolved ? ' completed' : ''}`;
      applyCategoryStyle(el, event.category, isResolved);

      const detailTime = event.itemType === 'deadline'
        ? formatDeadlineSlotTime(event.startSlot)
        : formatSlotTime(event.startSlot);

      const detailText = event.itemType === 'deadline'
        ? `${event.day} • ${detailTime} • Deadline • ${event.warningHours || 0}h warning${event.oneTimeOnly ? ' • One-time' : ''}${isResolved ? ' • Solved' : ''}`
        : `${event.day} • ${detailTime} • ${event.time} min • Fixed Event${isResolved ? ' • Solved' : ''}`;

      el.innerHTML = `
        <div class="task-title">${event.title}</div>
        <div class="task-meta">${detailText}</div>
        <div class="task-actions">
          <button class="toggle-resolved-btn">${isResolved ? 'Undo' : 'Solve'}</button>
          <button class="edit-fixed-btn">Edit</button>
          <button class="delete-fixed-btn">Delete</button>
        </div>
      `;

      el.querySelector('.toggle-resolved-btn').addEventListener('click', () => {
        if (event.itemType === 'deadline') toggleDeadlineResolved(event.id, weekKey);
        else toggleFixedResolved(event.id, weekKey);
      });

      el.querySelector('.edit-fixed-btn').addEventListener('click', () => {
        if (event.itemType === 'deadline') openEditDeadlineModal(event.id);
        else openEditFixedModal(event.id);
      });

      el.querySelector('.delete-fixed-btn').addEventListener('click', () => {
        if (event.itemType === 'deadline') deleteDeadline(event.id);
        else deleteFixedEvent(event.id);
      });

      fixedScheduleListEl.appendChild(el);
    });
}

function openAddModal() {
  editingTaskId = null;
  editingMode = 'task';
  modalTitle.textContent = 'Add Task';
  taskNameInput.value = '';
  taskTimeInput.value = 60;
  taskCategoryInput.value = 'work';
  taskTypeInput.value = 'task';
  fixedDayInput.value = 'Mon';
  fixedStartInput.value = 0;
  fixedRepeatInput.value = 1;
  deadlineWarningInput.value = 2;
  deadlineOneTimeInput.checked = false;

  const today = new Date();
  fixedStartDateInput.value = formatDateYYYYMMDD(today);

  deleteTaskBtn.classList.add('hidden');
  toggleFixedFields();
  taskModal.classList.remove('hidden');
}

function openEditModal(taskId) {
  const task = getCurrentWeekData().tasks.find((t) => t.id === taskId);
  if (!task) return;

  editingTaskId = taskId;
  editingMode = 'task';
  modalTitle.textContent = 'Edit Task';
  taskNameInput.value = task.title;
  taskTimeInput.value = task.time;
  taskCategoryInput.value = task.category;
  taskTypeInput.value = 'task';
  deleteTaskBtn.classList.remove('hidden');
  toggleFixedFields();
  taskModal.classList.remove('hidden');
}

function openEditFixedModal(eventId) {
  const event = state.recurringFixedSchedules.find((e) => e.id === eventId);
  if (!event) return;

  editingTaskId = eventId;
  editingMode = 'fixed';

  modalTitle.textContent = 'Edit Fixed Event';
  taskNameInput.value = event.title;
  taskTimeInput.value = event.time;
  taskCategoryInput.value = event.category;
  taskTypeInput.value = 'fixed';
  fixedDayInput.value = event.day;
  fixedStartInput.value = event.startSlot;
  fixedRepeatInput.value = event.repeatEveryWeeks || 1;
  fixedStartDateInput.value = event.startDate || formatDateYYYYMMDD(getWeekStartDate());

  deleteTaskBtn.classList.remove('hidden');
  toggleFixedFields();
  taskModal.classList.remove('hidden');
}

function openEditDeadlineModal(eventId) {
  const event = state.recurringDeadlines.find((e) => e.id === eventId);
  if (!event) return;

  editingTaskId = eventId;
  editingMode = 'deadline';

  modalTitle.textContent = 'Edit Deadline';
  taskNameInput.value = event.title;
  taskTimeInput.value = 30;
  taskCategoryInput.value = event.category;
  taskTypeInput.value = 'deadline';
  fixedDayInput.value = event.day;
  fixedStartInput.value = event.startSlot;
  fixedRepeatInput.value = event.repeatEveryWeeks || 1;
  fixedStartDateInput.value = event.startDate || formatDateYYYYMMDD(getWeekStartDate());
  deadlineWarningInput.value = event.warningHours || 2;
  deadlineOneTimeInput.checked = Boolean(event.oneTimeOnly);

  deleteTaskBtn.classList.remove('hidden');
  toggleFixedFields();
  taskModal.classList.remove('hidden');
}


function closeModal() {
  taskModal.classList.add('hidden');
}

function openAddTemplateModal() {
  editingTemplateTaskId = null;
  templateModalTitle.textContent = 'Add Weekly Task';
  templateTaskNameInput.value = '';
  templateTaskTimeInput.value = 60;
  templateTaskCategoryInput.value = 'work';
  deleteTemplateTaskBtn.classList.add('hidden');
  templateModal.classList.remove('hidden');
}

function openEditTemplateModal(templateId) {
  const item = state.weeklyTemplates.find((t) => t.id === templateId);
  if (!item) return;

  editingTemplateTaskId = templateId;
  templateModalTitle.textContent = 'Edit Weekly Task';
  templateTaskNameInput.value = item.title;
  templateTaskTimeInput.value = item.time;
  templateTaskCategoryInput.value = item.category;
  deleteTemplateTaskBtn.classList.remove('hidden');
  templateModal.classList.remove('hidden');
}

function closeTemplateModal() {
  templateModal.classList.add('hidden');
}

function saveTaskFromModal() {
  const title = taskNameInput.value.trim();
  const time = Number(taskTimeInput.value);
  const category = taskCategoryInput.value;
  const type = taskTypeInput.value;

  if (!title) return alert('Please enter a task name.');

  if (type === 'task' || type === 'fixed') {
    if (!time || time < 30 || time % 30 !== 0) {
      return alert('Duration must be at least 30 minutes and in 30-minute steps.');
    }
  }

  if (type === 'task') {
    if (editingTaskId && editingMode === 'task') updateTask(editingTaskId, title, time, category);
    else addTask(title, time, category);
  } else if (type === 'fixed') {
    const day = fixedDayInput.value;
    const startSlot = Number(fixedStartInput.value);

    if (startSlot >= TOTAL_SLOTS_PER_DAY) {
      return alert('Fixed events must start before 23:59.');
    }
    const repeatEveryWeeks = Number(fixedRepeatInput.value) || 1;
    const startDate = fixedStartDateInput.value;

    if (!startDate) {
      return alert('Please select a start date.');
    }

    if (repeatEveryWeeks < 1) {
      return alert('Repeat Every must be at least 1 week.');
    }

    if (editingTaskId && editingMode === 'fixed') {
      updateFixedEvent(
        editingTaskId,
        title,
        time,
        category,
        day,
        startSlot,
        repeatEveryWeeks,
        startDate
      );
    } else {
      addFixedEvent(
        title,
        time,
        category,
        day,
        startSlot,
        repeatEveryWeeks,
        startDate
      );
    }
  } else if (type === 'deadline') {
    const day = fixedDayInput.value;
    const startSlot = Number(fixedStartInput.value);

    if (startSlot > TOTAL_SLOTS_PER_DAY) {
      return alert('Invalid deadline time.');
    }
    const repeatEveryWeeks = Number(fixedRepeatInput.value) || 1;
    const startDate = fixedStartDateInput.value;
    const warningHours = Number(deadlineWarningInput.value) || 0;
    const oneTimeOnly = deadlineOneTimeInput.checked;

    if (!startDate) {
      return alert('Please select a start date.');
    }

    if (!oneTimeOnly && repeatEveryWeeks < 1) {
      return alert('Repeat Every must be at least 1 week.');
    }

    if (warningHours < 0) {
      return alert('Warning window cannot be negative.');
    }

    if (editingTaskId && editingMode === 'deadline') {
      updateDeadline(
        editingTaskId,
        title,
        category,
        day,
        startSlot,
        repeatEveryWeeks,
        startDate,
        warningHours,
        oneTimeOnly
      );
    } else {
      addDeadline(
        title,
        category,
        day,
        startSlot,
        repeatEveryWeeks,
        startDate,
        warningHours,
        oneTimeOnly
      );
    }
  }

  closeModal();
}

function saveTemplateTaskFromModal() {
  const title = templateTaskNameInput.value.trim();
  const time = Number(templateTaskTimeInput.value);
  const category = templateTaskCategoryInput.value;

  if (!title) return alert('Please enter a task name.');
  if (!time || time < 30 || time % 30 !== 0) {
    return alert('Duration must be at least 30 minutes and in 30-minute steps.');
  }

  if (editingTemplateTaskId) updateWeeklyTemplateTask(editingTemplateTaskId, title, time, category);
  else addWeeklyTemplateTask(title, time, category);

  closeTemplateModal();
}

function addTask(title, time, category) {
  getCurrentWeekData().tasks.push({
    id: generateId(),
    title,
    time,
    category,
    scheduled: null,
    completed: false,
  });
  renderAll();
}

function updateTask(taskId, title, time, category) {
  const task = getCurrentWeekData().tasks.find((t) => t.id === taskId);
  if (!task) return;

  const oldScheduled = task.scheduled ? { ...task.scheduled } : null;
  task.title = title;
  task.time = time;
  task.category = category;

  if (oldScheduled) {
    const durationSlots = minutesToSlots(task.time);
    if (
      oldScheduled.startSlot + durationSlots > TOTAL_SLOTS_PER_DAY ||
      hasAnyConflict(task.id, oldScheduled.day, oldScheduled.startSlot, durationSlots, false)
    ) {
      task.scheduled = null;
    } else {
      task.scheduled = oldScheduled;
    }
  }

  renderAll();
}

function deleteTask(taskId) {
  getCurrentWeekData().tasks = getCurrentWeekData().tasks.filter((task) => task.id !== taskId);
  renderAll();
}

function addWeeklyTemplateTask(title, time, category) {
  const newTemplate = {
    id: generateId(),
    title,
    time,
    category,
  };

  state.weeklyTemplates.push(newTemplate);

  addTemplateToCurrentAndFutureWeeks(newTemplate);

  ensureCurrentWeekExists();
  saveState();
  renderAll();
}

function updateWeeklyTemplateTask(templateId, title, time, category) {
  const item = state.weeklyTemplates.find((t) => t.id === templateId);
  if (!item) return;

  item.title = title;
  item.time = time;
  item.category = category;

  const currentWeekStart = getWeekStartDate(state.currentWeekOffset);

  Object.keys(state.weeks).forEach((weekKey) => {
    const weekStart = new Date(weekKey + 'T00:00:00');
    if (weekStart < currentWeekStart) return;

    const weekData = state.weeks[weekKey];

    weekData.tasks.forEach((task) => {
      if (task.sourceTemplateId !== templateId) return;

      // 只更新還沒排進行事曆的 weekly task
      if (task.scheduled) return;

      task.title = title;
      task.time = time;
      task.category = category;
    });
  });

  saveState();
  renderAll();
}

function deleteWeeklyTemplateTask(templateId) {
  state.weeklyTemplates = state.weeklyTemplates.filter((t) => t.id !== templateId);

  const currentWeekStart = getWeekStartDate(state.currentWeekOffset);

  Object.keys(state.weeks).forEach((weekKey) => {
    const weekStart = new Date(weekKey + 'T00:00:00');
    if (weekStart < currentWeekStart) return;

    const weekData = state.weeks[weekKey];

    weekData.tasks = weekData.tasks.filter((task) => {
      if (task.sourceTemplateId !== templateId) return true;
      return !!task.scheduled;
    });

    if (weekData.appliedTemplateIds) {
      weekData.appliedTemplateIds = weekData.appliedTemplateIds.filter(
        (id) => id !== templateId
      );
    }
  });

  saveState();
  renderAll();
}

function addFixedEvent(title, time, category, day, startSlot, repeatEveryWeeks = 1, startDate) {
  const durationSlots = minutesToSlots(time);

  if (startSlot + durationSlots > TOTAL_SLOTS_PER_DAY) {
    return alert('Fixed event exceeds the day range.');
  }

  if (hasAnyConflict(null, day, startSlot, durationSlots, true)) {
    return alert('This time range is already occupied.');
  }

  state.recurringFixedSchedules.push({
    id: generateId(),
    title,
    time,
    category,
    day,
    startSlot,
    repeatEveryWeeks,
    startDate,
    resolvedWeeks: [],
  });

  renderAll();
}

function getWeekDifference(startDateStr, currentWeekStartStr) {
  const start = new Date(startDateStr + 'T00:00:00');
  const current = new Date(currentWeekStartStr + 'T00:00:00');

  const diffMs = current - start;
  return Math.floor(diffMs / (7 * 24 * 60 * 60 * 1000));
}

function getRenderedFixedEventsForCurrentWeek() {
  const currentWeekStart = getWeekStartDate();
  const currentWeekKey = formatDateYYYYMMDD(currentWeekStart);

  return (state.recurringFixedSchedules || []).filter((event) => {
    const repeatEveryWeeks = event.repeatEveryWeeks || 1;

    if (!event.startDate) {
      return true;
    }

    const startDate = new Date(event.startDate + 'T00:00:00');
    const eventStartWeek = new Date(startDate);
    const jsDay = eventStartWeek.getDay();
    const mondayDistance = jsDay === 0 ? -6 : 1 - jsDay;
    eventStartWeek.setDate(eventStartWeek.getDate() + mondayDistance);
    eventStartWeek.setHours(0, 0, 0, 0);

    const eventStartWeekKey = formatDateYYYYMMDD(eventStartWeek);

    const weekDiff = getWeekDifference(eventStartWeekKey, currentWeekKey);

    if (weekDiff < 0) return false;

    return weekDiff % repeatEveryWeeks === 0;
  });
}

function updateFixedEvent(
  eventId,
  title,
  time,
  category,
  day,
  startSlot,
  repeatEveryWeeks = 1,
  startDate
) {
  const event = state.recurringFixedSchedules.find((e) => e.id === eventId);
  if (!event) return;

  const durationSlots = minutesToSlots(time);

  if (startSlot + durationSlots > TOTAL_SLOTS_PER_DAY) {
    return alert('Fixed event exceeds the day range.');
  }

  if (hasAnyConflict(eventId, day, startSlot, durationSlots, true)) {
    return alert('This time range is already occupied.');
  }

  event.title = title;
  event.time = time;
  event.category = category;
  event.day = day;
  event.startSlot = startSlot;
  event.repeatEveryWeeks = repeatEveryWeeks;
  event.startDate = startDate;
  event.resolvedWeeks = event.resolvedWeeks || [];

  renderAll();
}

function deleteFixedEvent(eventId) {
  state.recurringFixedSchedules = state.recurringFixedSchedules.filter(
    (e) => e.id !== eventId
  );
  renderAll();
}


function addDeadline(title, category, day, startSlot, repeatEveryWeeks = 1, startDate, warningHours = 0, oneTimeOnly = false) {
  if (hasDeadlineConflict(null, day, startSlot)) {
    return alert('There is already a deadline at this time.');
  }

  state.recurringDeadlines.push({
    id: generateId(),
    title,
    category,
    day,
    startSlot,
    repeatEveryWeeks,
    startDate,
    warningHours,
    oneTimeOnly,
    resolvedWeeks: [],
  });

  renderAll();
}

function updateDeadline(
  eventId,
  title,
  category,
  day,
  startSlot,
  repeatEveryWeeks = 1,
  startDate,
  warningHours = 0,
  oneTimeOnly = false
) {
  const event = state.recurringDeadlines.find((e) => e.id === eventId);
  if (!event) return;

  if (hasDeadlineConflict(eventId, day, startSlot)) {
    return alert('There is already a deadline at this time.');
  }

  event.title = title;
  event.category = category;
  event.day = day;
  event.startSlot = startSlot;
  event.repeatEveryWeeks = repeatEveryWeeks;
  event.startDate = startDate;
  event.warningHours = warningHours;
  event.oneTimeOnly = oneTimeOnly;
  event.resolvedWeeks = event.resolvedWeeks || [];

  renderAll();
}

function deleteDeadline(eventId) {
  state.recurringDeadlines = state.recurringDeadlines.filter((e) => e.id !== eventId);
  renderAll();
}

function getRenderedDeadlineForWeek(event, weekStartDate, weekKey) {
  const repeatEveryWeeks = event.repeatEveryWeeks || 1;

  if (!event.startDate) {
    return event;
  }

  const startDate = new Date(event.startDate + 'T00:00:00');
  const eventStartWeek = new Date(startDate);
  const jsDay = eventStartWeek.getDay();
  const mondayDistance = jsDay === 0 ? -6 : 1 - jsDay;
  eventStartWeek.setDate(eventStartWeek.getDate() + mondayDistance);
  eventStartWeek.setHours(0, 0, 0, 0);

  const eventStartWeekKey = formatDateYYYYMMDD(eventStartWeek);
  const weekDiff = getWeekDifference(eventStartWeekKey, weekKey);

  if (weekDiff < 0) return null;
  if (event.oneTimeOnly) return weekDiff === 0 ? event : null;
  return weekDiff % repeatEveryWeeks === 0 ? event : null;
}

function getRenderedDeadlinesForCurrentWeek() {
  const currentWeekStart = getWeekStartDate();
  const currentWeekKey = formatDateYYYYMMDD(currentWeekStart);

  return (state.recurringDeadlines || []).filter((event) =>
    Boolean(getRenderedDeadlineForWeek(event, currentWeekStart, currentWeekKey))
  );
}

function hasDeadlineConflict(itemId, day, startSlot) {
  return getRenderedDeadlinesForCurrentWeek().some((event) => {
    if (event.id === itemId) return false;
    return event.day === day && event.startSlot === startSlot;
  });
}

function renderDeadlineWarnings() {
  getRenderedDeadlinesForCurrentWeek().forEach((deadline) => {
    const warningSlots = Math.ceil((Number(deadline.warningHours) || 0) * 60 / SLOT_MINUTES);

    for (let i = 1; i <= warningSlots; i++) {
      const slotIndex = deadline.startSlot - i;
      if (slotIndex < 0) break;

      const slot = document.querySelector(
        `.slot[data-day="${deadline.day}"][data-slot-index="${slotIndex}"]`
      );

      if (slot) {
        slot.classList.add('deadline-warning');
      }
    }
  });
}

function renderDeadlineLines() {
  const weekKey = getCurrentWeekKey();

  getRenderedDeadlinesForCurrentWeek().forEach((deadline) => {
    let anchorCell = document.querySelector(
      `.slot[data-day="${deadline.day}"][data-slot-index="${deadline.startSlot}"]`
    );
    let pinToBottom = false;

    if (!anchorCell && deadline.startSlot === TOTAL_SLOTS_PER_DAY) {
      anchorCell = document.querySelector(
        `.slot[data-day="${deadline.day}"][data-slot-index="${TOTAL_SLOTS_PER_DAY - 1}"]`
      );
      pinToBottom = true;
    }

    if (!anchorCell) return;

    const isResolved = isRecurringOccurrenceResolved(deadline, weekKey);
    const marker = document.createElement('div');
    marker.className = `deadline-line${isResolved ? ' completed' : ''}`;
    if (pinToBottom) {
      marker.style.top = 'auto';
      marker.style.bottom = '-2px';
    }

    marker.innerHTML = `
      <span class="deadline-pill">
        ${deadline.title}
        <button type="button" class="deadline-toggle-btn">${isResolved ? 'Undo' : 'Solve'}</button>
      </span>
    `;
    marker.addEventListener('dblclick', () => openEditDeadlineModal(deadline.id));
    marker.querySelector('.deadline-toggle-btn').addEventListener('click', (e) => {
      e.stopPropagation();
      toggleDeadlineResolved(deadline.id, weekKey);
    });
    anchorCell.appendChild(marker);
  });
}

function clearTaskBlocks() {
  document.querySelectorAll('.task-block').forEach((el) => el.remove());
}

function renderFixedEvents() {
  const weekKey = getCurrentWeekKey();

  getRenderedFixedEventsForCurrentWeek().forEach((event) => {
    const durationSlots = minutesToSlots(event.time);
    const startCell = document.querySelector(
      `.slot[data-day="${event.day}"][data-slot-index="${event.startSlot}"]`
    );
    if (!startCell) return;

    const isResolved = isRecurringOccurrenceResolved(event, weekKey);
    const block = document.createElement('div');
    block.className = `task-block${isResolved ? ' completed' : ''}`;
    applyCategoryStyle(block, event.category, isResolved);
    block.style.height = `${durationSlots * 40 - 4}px`;
    block.style.border = '2px solid #111';
    block.innerHTML = `
      <div class="block-title">${event.title}</div>
      <div class="block-time">${formatSlotTime(event.startSlot)} - ${formatSlotTime(event.startSlot + durationSlots)}</div>
      <div class="block-time">Fixed Event${isResolved ? ' • Solved' : ''}</div>
      <div class="task-block-actions">
        <button type="button" class="toggle-fixed-block-btn">${isResolved ? 'Undo' : 'Solve'}</button>
      </div>
    `;

    block.querySelector('.toggle-fixed-block-btn').addEventListener('click', (e) => {
      e.stopPropagation();
      toggleFixedResolved(event.id, weekKey);
    });
    block.addEventListener('dblclick', () => openEditFixedModal(event.id));
    startCell.appendChild(block);
  });
}

function renderScheduledTasks() {
  getCurrentWeekData().tasks.filter((task) => task.scheduled).forEach((task) => {
    const durationSlots = minutesToSlots(task.time);
    const startCell = document.querySelector(`.slot[data-day="${task.scheduled.day}"][data-slot-index="${task.scheduled.startSlot}"]`);
    if (!startCell) return;

    const completed = isTaskCompleted(task);
    const block = document.createElement('div');
    block.className = `task-block${completed ? ' completed' : ''}`;
    block.draggable = !completed;
    applyCategoryStyle(block, task.category, completed);
    block.style.height = `${durationSlots * 40 - 4}px`;
    block.innerHTML = `
      <div class="block-title">${task.title}</div>
      <div class="block-time">${formatSlotTime(task.scheduled.startSlot)} - ${formatSlotTime(task.scheduled.startSlot + durationSlots)}</div>
      <div class="task-block-actions">
        <button type="button" class="toggle-task-block-btn">${completed ? 'Undo' : 'Solve'}</button>
      </div>
    `;

    if (!completed) {
      block.addEventListener('dragstart', () => {
        draggedTaskId = task.id;
        block.classList.add('dragging');
      });
      block.addEventListener('dragend', () => block.classList.remove('dragging'));
    }

    block.querySelector('.toggle-task-block-btn').addEventListener('click', (e) => {
      e.stopPropagation();
      toggleTaskCompleted(task.id);
    });
    block.addEventListener('dblclick', () => openEditModal(task.id));
    startCell.appendChild(block);
  });
}

function handleSlotDragOver(e) {
  e.preventDefault();
  e.currentTarget.classList.add('drag-over');
}

function handleSlotDragLeave(e) {
  e.currentTarget.classList.remove('drag-over');
}

function handleSlotDrop(e) {
  e.preventDefault();
  e.currentTarget.classList.remove('drag-over');

  if (!draggedTaskId) return;
  scheduleTask(draggedTaskId, e.currentTarget.dataset.day, Number(e.currentTarget.dataset.slotIndex));
}

function scheduleTask(taskId, day, startSlot) {
  const task = getCurrentWeekData().tasks.find((t) => t.id === taskId);
  if (!task || isTaskCompleted(task)) return;

  const durationSlots = minutesToSlots(task.time);
  if (startSlot + durationSlots > TOTAL_SLOTS_PER_DAY) return alert('Not enough space.');
  if (hasAnyConflict(taskId, day, startSlot, durationSlots, false)) return alert('This time range is already occupied.');

  task.scheduled = { day, startSlot };
  renderAll();
}

function hasAnyConflict(itemId, day, startSlot, durationSlots, checkingFixed = false) {
  const newStart = startSlot;
  const newEnd = startSlot + durationSlots;
  const weekData = getCurrentWeekData();

  const taskConflict = weekData.tasks.some((task) => {
    if (!checkingFixed && task.id === itemId) return false;
    if (!task.scheduled || task.scheduled.day !== day) return false;
    const existingStart = task.scheduled.startSlot;
    const existingEnd = existingStart + minutesToSlots(task.time);
    return newStart < existingEnd && newEnd > existingStart;
  });

  const fixedConflict = getRenderedFixedEventsForCurrentWeek().some((event) => {
    if (checkingFixed && event.id === itemId) return false;
    if (event.day !== day) return false;
    const existingStart = event.startSlot;
    const existingEnd = existingStart + minutesToSlots(event.time);
    return newStart < existingEnd && newEnd > existingStart;
  });

  return taskConflict || fixedConflict;
}

function updateOccupiedStyles() {
  document.querySelectorAll('.slot').forEach((slot) => slot.classList.remove('occupied', 'deadline-warning'));

  getCurrentWeekData().tasks.forEach((task) => {
    if (!task.scheduled) return;
    const durationSlots = minutesToSlots(task.time);
    for (let i = 0; i < durationSlots; i++) {
      const slot = document.querySelector(
        `.slot[data-day="${task.scheduled.day}"][data-slot-index="${task.scheduled.startSlot + i}"]`
      );
      if (slot) slot.classList.add('occupied');
    }
  });

  getRenderedFixedEventsForCurrentWeek().forEach((event) => {
    const durationSlots = minutesToSlots(event.time);
    for (let i = 0; i < durationSlots; i++) {
      const slot = document.querySelector(
        `.slot[data-day="${event.day}"][data-slot-index="${event.startSlot + i}"]`
      );
      if (slot) slot.classList.add('occupied');
    }
  });
}

function updateStats() {
  const weekData = getCurrentWeekData();
  const unscheduledTasks = weekData.tasks.filter((task) => !task.scheduled && !isTaskCompleted(task));
  const scheduledTasks = weekData.tasks.filter((task) => task.scheduled);

  tasksLeftEl.textContent = unscheduledTasks.length;
  timeLeftEl.textContent = unscheduledTasks.reduce((sum, task) => sum + task.time, 0);
  scheduledTimeEl.textContent =
    scheduledTasks.reduce((sum, task) => sum + task.time, 0) +
    getRenderedFixedEventsForCurrentWeek().reduce((sum, event) => sum + event.time, 0);
}

function updateDailySummaries() {
  const weekData = getCurrentWeekData();

  DAYS.forEach((day) => {
    const scheduledMinutes =
      weekData.tasks
        .filter((task) => task.scheduled && task.scheduled.day === day)
        .reduce((sum, task) => sum + task.time, 0) +
      getRenderedFixedEventsForCurrentWeek()
        .filter((event) => event.day === day)
        .reduce((sum, event) => sum + event.time, 0);

    const totalDayMinutes = (END_HOUR - START_HOUR) * 60;
    const remainingMinutes = totalDayMinutes - scheduledMinutes;

    document.getElementById(`remaining-${day}`).textContent =
      `Remaining: ${remainingMinutes} min`;
    document.getElementById(`summary-${day}`).textContent =
      `Scheduled: ${scheduledMinutes} min`;
  });
}

function formatSlotTime(slotIndex) {
  const totalMinutes = START_HOUR * 60 + slotIndex * SLOT_MINUTES;
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

function formatDeadlineSlotTime(slotIndex) {
  if (slotIndex >= TOTAL_SLOTS_PER_DAY) return '23:59';
  return formatSlotTime(slotIndex);
}

function minutesToSlots(minutes) {
  return Math.ceil(minutes / SLOT_MINUTES);
}

function capitalize(text) {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function fillFixedStartOptions() {
  fixedStartInput.innerHTML = '';
  for (let i = 0; i <= TOTAL_SLOTS_PER_DAY; i++) {
    const option = document.createElement('option');
    option.value = i;
    option.textContent = i === TOTAL_SLOTS_PER_DAY ? '23:59' : formatSlotTime(i);
    fixedStartInput.appendChild(option);
  }
}

function toggleFixedFields() {
  const type = taskTypeInput.value;
  const isFixedLike = type === 'fixed' || type === 'deadline';
  const isDeadline = type === 'deadline';
  const isOneTimeDeadline = isDeadline && deadlineOneTimeInput.checked;

  [...fixedStartInput.options].forEach((option) => {
    option.disabled = type === 'fixed' && Number(option.value) === TOTAL_SLOTS_PER_DAY;
  });

  if (type === 'fixed' && Number(fixedStartInput.value) === TOTAL_SLOTS_PER_DAY) {
    fixedStartInput.value = TOTAL_SLOTS_PER_DAY - 1;
  }

  fixedDayWrapper.classList.toggle('hidden', !isFixedLike);
  fixedStartWrapper.classList.toggle('hidden', !isFixedLike);
  fixedRepeatWrapper.classList.toggle('hidden', !isFixedLike || isOneTimeDeadline);
  fixedStartDateWrapper.classList.toggle('hidden', !isFixedLike);
  deadlineWarningWrapper.classList.toggle('hidden', !isDeadline);
  deadlineOneTimeWrapper.classList.toggle('hidden', !isDeadline);
  taskTimeInput.closest('label').classList.toggle('hidden', isDeadline);
}


function createNowLine() {
  if (document.getElementById('nowLine') || document.getElementById('nowDot')) {
    updateNowLine();
    return;
  }

  const line = document.createElement('div');
  line.className = 'now-line';
  line.id = 'nowLine';

  const dot = document.createElement('div');
  dot.className = 'now-dot';
  dot.id = 'nowDot';

  calendarEl.appendChild(line);
  calendarEl.appendChild(dot);

  updateNowLine();
  setInterval(updateNowLine, 60000);
}

function updateNowLine() {
  const line = document.getElementById('nowLine');
  const dot = document.getElementById('nowDot');
  if (!line || !dot) return;

  if (state.currentWeekOffset !== 0) {
    line.style.display = 'none';
    dot.style.display = 'none';
    return;
  }

  const now = new Date();
  const jsDay = now.getDay();
  const dayMap = { 1: 'Mon', 2: 'Tue', 3: 'Wed', 4: 'Thu', 5: 'Fri', 6: 'Sat', 0: 'Sun' };
  const today = dayMap[jsDay];

  const minutesNow = now.getHours() * 60 + now.getMinutes();
  const startMinutes = START_HOUR * 60;
  const endMinutes = END_HOUR * 60;

  if (minutesNow < startMinutes || minutesNow > endMinutes) {
    line.style.display = 'none';
    dot.style.display = 'none';
    return;
  }

  const firstSlot = document.querySelector(`.slot[data-day="${today}"][data-slot-index="0"]`);
  if (!firstSlot) {
    line.style.display = 'none';
    dot.style.display = 'none';
    return;
  }

  const top = (minutesNow - startMinutes) * (40 / SLOT_MINUTES) + 56;

  line.style.display = 'block';
  dot.style.display = 'block';
  line.style.top = `${top}px`;
  line.style.left = `${firstSlot.offsetLeft}px`;
  line.style.width = `${firstSlot.offsetWidth}px`;

  dot.style.top = `${top - 4}px`;
  dot.style.left = `${firstSlot.offsetLeft - 5}px`;
}