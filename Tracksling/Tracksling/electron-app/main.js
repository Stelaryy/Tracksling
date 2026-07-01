const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');

const PROJECT_FILE_EXTENSION = 'json';

function createDefaultState() {
  const firstBoardId = cryptoRandomId();
  return {
    activeBoardId: firstBoardId,
    boards: [
      {
        id: firstBoardId,
        name: 'Nouveau tableau',
        description: '',
        borderColor: '#4f46e5',
        fillColor: '#eef2ff',
        widgets: [],
        columns: [],
        rows: []
      }
    ]
  };
}

function normalizeColor(color, fallback = '#4f46e5') {
  if (typeof color !== 'string') return fallback;
  const trimmed = color.trim();
  if (/^#[0-9a-fA-F]{6}$/.test(trimmed)) return trimmed;
  if (/^#[0-9a-fA-F]{3}$/.test(trimmed)) {
    const r = trimmed[1];
    const g = trimmed[2];
    const b = trimmed[3];
    return `#${r}${r}${g}${g}${b}${b}`;
  }
  return fallback;
}

function cryptoRandomId() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

let currentState = createDefaultState();
let currentProjectPath = null;
let hasUnsavedChanges = false;

function getDefaultProjectFileName() {
  const activeBoard = currentState.boards.find((board) => board.id === currentState.activeBoardId) || currentState.boards[0];
  const slug = (activeBoard?.name || 'tracksling-project')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  return `${slug || 'tracksling-project'}.${PROJECT_FILE_EXTENSION}`;
}

function readProjectFile(filePath) {
  const raw = fs.readFileSync(filePath, 'utf-8');
  const parsed = JSON.parse(raw);
  if (!parsed || !Array.isArray(parsed.boards)) {
    throw new Error('Format invalide');
  }

  return normalizeState(parsed);
}

function writeProjectFile(filePath, state) {
  const normalized = normalizeState(state);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(normalized, null, 2), 'utf-8');
  return normalized;
}

function loadState() {
  return currentState;
}

function saveState(state) {
  currentState = normalizeState(state);
  if (!currentProjectPath) {
    hasUnsavedChanges = true;
    return currentState;
  }

  currentState = writeProjectFile(currentProjectPath, currentState);
  hasUnsavedChanges = false;
  return currentState;
}

function createNewProjectState() {
  currentState = createDefaultState();
  currentProjectPath = null;
  hasUnsavedChanges = false;
  return currentState;
}

function openProjectFromPath(filePath) {
  currentState = readProjectFile(filePath);
  currentProjectPath = filePath;
  hasUnsavedChanges = false;
  return currentState;
}

function saveProjectToPath(filePath) {
  currentState = writeProjectFile(filePath, loadState());
  currentProjectPath = filePath;
  hasUnsavedChanges = false;
  return currentState;
}

function getProjectInfo() {
  return {
    mode: 'project-file',
    projectFilePath: currentProjectPath,
    projectDirectoryPath: currentProjectPath ? path.dirname(currentProjectPath) : null,
    hasProjectFile: !!currentProjectPath,
    hasUnsavedChanges
  };
}

async function promptOpenProject() {
  const result = await dialog.showOpenDialog({
    title: 'Ouvrir un projet Tracksling',
    properties: ['openFile'],
    filters: [{ name: 'Projet Tracksling JSON', extensions: [PROJECT_FILE_EXTENSION] }]
  });

  if (result.canceled || !result.filePaths?.[0]) {
    return { ok: false, canceled: true, state: loadState(), projectInfo: getProjectInfo() };
  }

  try {
    const state = openProjectFromPath(result.filePaths[0]);
    return { ok: true, path: result.filePaths[0], state, projectInfo: getProjectInfo() };
  } catch (error) {
    return { ok: false, message: error?.message || 'Ouverture impossible', state: loadState(), projectInfo: getProjectInfo() };
  }
}

async function promptSaveProject(defaultPath, title) {
  const result = await dialog.showSaveDialog({
    title,
    defaultPath,
    filters: [{ name: 'Projet Tracksling JSON', extensions: [PROJECT_FILE_EXTENSION] }]
  });

  if (result.canceled || !result.filePath) {
    return { ok: false, canceled: true, state: loadState(), projectInfo: getProjectInfo() };
  }

  try {
    const state = saveProjectToPath(result.filePath);
    return { ok: true, path: result.filePath, state, projectInfo: getProjectInfo() };
  } catch (error) {
    return { ok: false, message: error?.message || 'Enregistrement impossible', state: loadState(), projectInfo: getProjectInfo() };
  }
}

function findBoard(state, boardId) {
  return state.boards.find((board) => board.id === boardId);
}

function ensureBoardShape(board) {
  board.widgets ??= [];
  board.columns ??= [];
  board.rows ??= [];
}

function normalizeState(state) {
  if (!state || !Array.isArray(state.boards)) {
    return createDefaultState();
  }

  for (const board of state.boards) {
    ensureBoardShape(board);
    board.description = typeof board.description === 'string' ? board.description : '';
    board.borderColor = normalizeColor(board.borderColor);
    board.fillColor = normalizeColor(board.fillColor, '#eef2ff');
    for (const row of board.rows) {
      row.cells ??= {};
      for (const column of board.columns) {
        row.cells[column.id] ??= '';
      }
    }
  }

  if (state.boards.length === 0) {
    state.activeBoardId = null;
    return state;
  }

  const hasActive = state.boards.some((board) => board.id === state.activeBoardId);
  if (!hasActive) {
    state.activeBoardId = state.boards[0].id;
  }

  return state;
}

function registerIpcHandlers() {
  ipcMain.handle('tracksling:getState', () => {
    const state = loadState();
    return state;
  });

  ipcMain.handle('tracksling:getProjectInfo', () => {
    return getProjectInfo();
  });

  ipcMain.handle('tracksling:getRuntimeInfo', () => {
    return {
      machineName: os.hostname()
    };
  });

  ipcMain.handle('tracksling:newProject', () => {
    const state = createNewProjectState();
    return { ok: true, state, projectInfo: getProjectInfo() };
  });

  ipcMain.handle('tracksling:openProject', async () => {
    return promptOpenProject();
  });

  ipcMain.handle('tracksling:saveProject', async () => {
    if (!currentProjectPath) {
      return promptSaveProject(getDefaultProjectFileName(), 'Enregistrer le projet Tracksling');
    }

    try {
      const state = saveProjectToPath(currentProjectPath);
      return { ok: true, path: currentProjectPath, state, projectInfo: getProjectInfo() };
    } catch (error) {
      return { ok: false, message: error?.message || 'Enregistrement impossible', state: loadState(), projectInfo: getProjectInfo() };
    }
  });

  ipcMain.handle('tracksling:saveProjectAs', async () => {
    return promptSaveProject(currentProjectPath || getDefaultProjectFileName(), 'Enregistrer le projet Tracksling sous');
  });

  ipcMain.handle('tracksling:openProjectFolder', async () => {
    if (!currentProjectPath) {
      return { ok: false, message: 'Aucun fichier projet local' };
    }

    shell.showItemInFolder(currentProjectPath);
    return { ok: true, path: currentProjectPath };
  });

  ipcMain.handle('tracksling:createBoard', (_, name, description, useCustomColors, borderColor, fillColor) => {
    const state = loadState();
    const custom = !!useCustomColors;
    const board = {
      id: cryptoRandomId(),
      name: (name || '').trim() || `Tableau ${state.boards.length + 1}`,
      description: typeof description === 'string' ? description.trim() : '',
      borderColor: custom ? normalizeColor(borderColor) : '#4f46e5',
      fillColor: custom ? normalizeColor(fillColor, '#eef2ff') : '#eef2ff',
      widgets: [],
      columns: [],
      rows: []
    };
    state.boards.push(board);
    state.activeBoardId = board.id;
    saveState(state);
    return state;
  });

  ipcMain.handle('tracksling:setActiveBoard', (_, boardId) => {
    const state = loadState();
    const exists = state.boards.some((board) => board.id === boardId);
    if (exists) {
      state.activeBoardId = boardId;
      saveState(state);
    }
    return state;
  });

  ipcMain.handle('tracksling:deleteBoard', (_, boardId) => {
    const state = loadState();
    state.boards = state.boards.filter((board) => board.id !== boardId);
    if (state.boards.length === 0) {
      state.activeBoardId = null;
      saveState(state);
      return state;
    }
    if (!state.boards.some((board) => board.id === state.activeBoardId)) {
      state.activeBoardId = state.boards[0].id;
    }
    saveState(state);
    return state;
  });

  ipcMain.handle('tracksling:updateBoardName', (_, boardId, name) => {
    const state = loadState();
    const board = findBoard(state, boardId);
    if (board) {
      board.name = (name || '').trim() || board.name;
      saveState(state);
    }
    return state;
  });

  ipcMain.handle('tracksling:updateBoardColor', (_, boardId, color) => {
    const state = loadState();
    const board = findBoard(state, boardId);
    if (board) {
      board.borderColor = normalizeColor(color);
      saveState(state);
    }
    return state;
  });

  ipcMain.handle('tracksling:updateBoardFillColor', (_, boardId, color) => {
    const state = loadState();
    const board = findBoard(state, boardId);
    if (board) {
      board.fillColor = normalizeColor(color, '#eef2ff');
      saveState(state);
    }
    return state;
  });

  ipcMain.handle('tracksling:addColumn', (_, boardId, label) => {
    const state = loadState();
    const board = findBoard(state, boardId);
    if (!board) return state;

    ensureBoardShape(board);
    const column = {
      id: cryptoRandomId(),
      label: (label || '').trim() || `Colonne ${board.columns.length + 1}`
    };
    board.columns.push(column);
    for (const row of board.rows) {
      row.cells ??= {};
      row.cells[column.id] = row.cells[column.id] || '';
    }

    saveState(state);
    return state;
  });

  ipcMain.handle('tracksling:addRow', (_, boardId, label) => {
    const state = loadState();
    const board = findBoard(state, boardId);
    if (!board) return state;

    ensureBoardShape(board);
    const row = {
      id: cryptoRandomId(),
      label: (label || '').trim() || `Ligne ${board.rows.length + 1}`,
      cells: {}
    };

    for (const column of board.columns) {
      row.cells[column.id] = '';
    }

    board.rows.push(row);
    saveState(state);
    return state;
  });

  ipcMain.handle('tracksling:updateCell', (_, boardId, rowId, columnId, value) => {
    const state = loadState();
    const board = findBoard(state, boardId);
    if (!board) return state;

    const row = board.rows.find((item) => item.id === rowId);
    if (!row) return state;

    row.cells ??= {};
    row.cells[columnId] = value ?? '';
    saveState(state);
    return state;
  });

  ipcMain.handle('tracksling:renameRow', (_, boardId, rowId, newLabel) => {
    const state = loadState();
    const board = findBoard(state, boardId);
    if (!board) return state;

    const row = board.rows.find((item) => item.id === rowId);
    if (row && (newLabel || '').trim()) {
      row.label = newLabel.trim();
      saveState(state);
    }

    return state;
  });

  ipcMain.handle('tracksling:deleteRow', (_, boardId, rowId) => {
    const state = loadState();
    const board = findBoard(state, boardId);
    if (!board) return state;

    board.rows = board.rows.filter((item) => item.id !== rowId);
    saveState(state);
    return state;
  });

  ipcMain.handle('tracksling:renameColumn', (_, boardId, columnId, newLabel) => {
    const state = loadState();
    const board = findBoard(state, boardId);
    if (!board) return state;

    const column = board.columns.find((item) => item.id === columnId);
    if (column && (newLabel || '').trim()) {
      column.label = newLabel.trim();
      saveState(state);
    }

    return state;
  });

  ipcMain.handle('tracksling:deleteColumn', (_, boardId, columnId) => {
    const state = loadState();
    const board = findBoard(state, boardId);
    if (!board) return state;

    board.columns = board.columns.filter((item) => item.id !== columnId);
    for (const row of board.rows) {
      if (row.cells && Object.prototype.hasOwnProperty.call(row.cells, columnId)) {
        delete row.cells[columnId];
      }
    }

    saveState(state);
    return state;
  });

  ipcMain.handle('tracksling:addWidgetPreset', (_, boardId, preset) => {
    const state = loadState();
    const board = findBoard(state, boardId);
    if (!board) return state;

    ensureBoardShape(board);
    board.widgets.push({
      id: cryptoRandomId(),
      title: preset?.title || 'Widget',
      type: preset?.type || 'number',
      values: Array.isArray(preset?.values) ? preset.values : [0],
      position: board.widgets.length
    });

    saveState(state);
    return state;
  });

  ipcMain.handle('tracksling:renameWidget', (_, boardId, widgetId, newTitle) => {
    const state = loadState();
    const board = findBoard(state, boardId);
    if (!board) return state;

    ensureBoardShape(board);
    const widget = board.widgets.find((item) => item.id === widgetId);
    if (!widget) return state;

    const nextTitle = (newTitle || '').trim();
    if (!nextTitle) return state;

    widget.title = nextTitle;
    saveState(state);
    return state;
  });

  ipcMain.handle('tracksling:deleteWidget', (_, boardId, widgetId) => {
    const state = loadState();
    const board = findBoard(state, boardId);
    if (!board) return state;

    ensureBoardShape(board);
    board.widgets = board.widgets.filter((item) => item.id !== widgetId);
    board.widgets.forEach((widget, index) => {
      widget.position = index;
    });

    saveState(state);
    return state;
  });

  ipcMain.handle('tracksling:moveWidget', (_, boardId, fromIndex, toIndex) => {
    const state = loadState();
    const board = findBoard(state, boardId);
    if (!board || !Array.isArray(board.widgets)) return state;

    const from = Number(fromIndex);
    const to = Number(toIndex);
    if (Number.isNaN(from) || Number.isNaN(to)) return state;
    if (from < 0 || to < 0 || from >= board.widgets.length || to >= board.widgets.length) return state;
    if (from === to) return state;

    const [item] = board.widgets.splice(from, 1);
    board.widgets.splice(to, 0, item);
    board.widgets.forEach((widget, index) => {
      widget.position = index;
    });

    saveState(state);
    return state;
  });

  ipcMain.handle('tracksling:exportJson', async () => {
    return promptSaveProject(currentProjectPath || getDefaultProjectFileName(), 'Exporter le projet Tracksling');
  });

  ipcMain.handle('tracksling:importJson', async () => {
    return promptOpenProject();
  });
}

function createWindow() {
  const window = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 1024,
    minHeight: 700,
    backgroundColor: '#f6f5f3',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  window.loadFile(path.join(__dirname, 'src', 'index.html'));
}

app.whenReady().then(() => {
  registerIpcHandlers();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
