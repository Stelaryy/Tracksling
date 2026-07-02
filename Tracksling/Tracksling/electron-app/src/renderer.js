const api = window.tracksling;

const appState = {
  project: { activeBoardId: null, boards: [] },
  projectInfo: {
    projectFilePath: null,
    hasProjectFile: false,
    hasUnsavedChanges: false
  },
  runtimeInfo: {
    machineName: '-'
  }
};

const widgetPresets = {
  number: { title: 'KPI principal', type: 'number', values: [42] },
  donut: { title: 'Repartition', type: 'donut', values: [72, 28] },
  curve: { title: 'Tendance', type: 'curve', values: [12, 18, 9, 24, 15, 27] }
};

const elements = {};

let toastTimer = null;

document.addEventListener('DOMContentLoaded', () => {
  cacheElements();
  bindEvents();
  bootstrap().catch((error) => {
    showToast(error?.message || 'Impossible de charger Tracksling.', 'error');
  });
});

function cacheElements() {
  elements.landingPage = document.getElementById('landingPage');
  elements.landingMachineName = document.getElementById('landingMachineName');
  elements.enterAppButton = document.getElementById('enterAppButton');
  elements.appShell = document.getElementById('appShell');
  elements.projectSummary = document.getElementById('projectSummary');
  elements.newProjectButton = document.getElementById('newProjectButton');
  elements.openProjectButton = document.getElementById('openProjectButton');
  elements.saveProjectButton = document.getElementById('saveProjectButton');
  elements.saveProjectAsButton = document.getElementById('saveProjectAsButton');
  elements.openProjectFolderButton = document.getElementById('openProjectFolderButton');
  elements.boardForm = document.getElementById('boardForm');
  elements.boardNameInput = document.getElementById('boardNameInput');
  elements.boardDescriptionInput = document.getElementById('boardDescriptionInput');
  elements.customColorsCheckbox = document.getElementById('customColorsCheckbox');
  elements.boardBorderInput = document.getElementById('boardBorderInput');
  elements.boardFillInput = document.getElementById('boardFillInput');
  elements.boardList = document.getElementById('boardList');
  elements.boardCountBadge = document.getElementById('boardCountBadge');
  elements.heroTitle = document.getElementById('heroTitle');
  elements.heroSubtitle = document.getElementById('heroSubtitle');
  elements.machineNameMetric = document.getElementById('machineNameMetric');
  elements.boardCountMetric = document.getElementById('boardCountMetric');
  elements.saveStateMetric = document.getElementById('saveStateMetric');
  elements.emptyState = document.getElementById('emptyState');
  elements.boardWorkspace = document.getElementById('boardWorkspace');
  elements.toast = document.getElementById('toast');
}

function bindEvents() {
  elements.enterAppButton.addEventListener('click', () => {
    showMainApp();
  });

  elements.newProjectButton.addEventListener('click', async () => {
    await runResultAction(() => api.newProject(), 'Nouveau projet pret.');
  });

  elements.openProjectButton.addEventListener('click', async () => {
    await runResultAction(() => api.openProject(), 'Projet ouvert.');
  });

  elements.saveProjectButton.addEventListener('click', async () => {
    await runResultAction(() => api.saveProject(), 'Projet enregistre.');
  });

  elements.saveProjectAsButton.addEventListener('click', async () => {
    await runResultAction(() => api.saveProjectAs(), 'Projet enregistre sous un nouveau fichier.');
  });

  elements.openProjectFolderButton.addEventListener('click', async () => {
    await runResultAction(() => api.openProjectFolder(), 'Dossier du projet ouvert.');
  });

  elements.boardForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const name = elements.boardNameInput.value.trim();
    const description = elements.boardDescriptionInput.value.trim();
    const useCustomColors = elements.customColorsCheckbox.checked;
    const borderColor = elements.boardBorderInput.value;
    const fillColor = elements.boardFillInput.value;

    await runStateAction(
      () => api.createBoard(name, description, useCustomColors, borderColor, fillColor),
      'Tableau ajoute.'
    );

    elements.boardForm.reset();
    elements.boardBorderInput.value = '#4f46e5';
    elements.boardFillInput.value = '#eef2ff';
  });

  elements.boardList.addEventListener('click', async (event) => {
    const action = event.target.closest('[data-action]');
    if (!action) {
      return;
    }

    const { action: type, boardId } = action.dataset;
    if (!boardId) {
      return;
    }

    if (type === 'set-board') {
      await runStateAction(() => api.setActiveBoard(boardId));
      return;
    }

    if (type === 'delete-board') {
      const confirmed = window.confirm('Supprimer ce tableau ?');
      if (!confirmed) {
        return;
      }
      await runStateAction(() => api.deleteBoard(boardId), 'Tableau supprime.');
    }
  });

  elements.boardWorkspace.addEventListener('click', async (event) => {
    const action = event.target.closest('[data-action]');
    if (!action) {
      return;
    }

    const type = action.dataset.action;
    const boardId = action.dataset.boardId || appState.project.activeBoardId;
    const widgetId = action.dataset.widgetId;
    const columnId = action.dataset.columnId;
    const rowId = action.dataset.rowId;

    if (!boardId) {
      return;
    }

    if (type === 'add-widget') {
      const presetKey = action.dataset.preset;
      const preset = widgetPresets[presetKey];
      if (preset) {
        await runStateAction(() => api.addWidgetPreset(boardId, preset), 'Widget ajoute.');
      }
      return;
    }

    if (type === 'delete-widget' && widgetId) {
      await runStateAction(() => api.deleteWidget(boardId, widgetId), 'Widget supprime.');
      return;
    }

    if ((type === 'move-widget-left' || type === 'move-widget-right') && widgetId) {
      const fromIndex = Number(action.dataset.index);
      const toIndex = type === 'move-widget-left' ? fromIndex - 1 : fromIndex + 1;
      await runStateAction(() => api.moveWidget(boardId, fromIndex, toIndex));
      return;
    }

    if (type === 'add-column') {
      const label = window.prompt('Nom de la colonne', `Colonne ${(getActiveBoard()?.columns.length || 0) + 1}`);
      if (label !== null) {
        await runStateAction(() => api.addColumn(boardId, label), 'Colonne ajoutee.');
      }
      return;
    }

    if (type === 'add-row') {
      const label = window.prompt('Nom de la ligne', `Ligne ${(getActiveBoard()?.rows.length || 0) + 1}`);
      if (label !== null) {
        await runStateAction(() => api.addRow(boardId, label), 'Ligne ajoutee.');
      }
      return;
    }

    if (type === 'delete-column' && columnId) {
      await runStateAction(() => api.deleteColumn(boardId, columnId), 'Colonne supprimee.');
      return;
    }

    if (type === 'delete-row' && rowId) {
      await runStateAction(() => api.deleteRow(boardId, rowId), 'Ligne supprimee.');
    }
  });

  elements.boardWorkspace.addEventListener('change', async (event) => {
    const target = event.target;
    if (!(target instanceof HTMLInputElement)) {
      return;
    }

    const field = target.dataset.field;
    const boardId = target.dataset.boardId || appState.project.activeBoardId;
    if (!field || !boardId) {
      return;
    }

    if (field === 'board-name') {
      await runStateAction(() => api.updateBoardName(boardId, target.value), 'Nom du tableau mis a jour.');
      return;
    }

    if (field === 'board-border') {
      await runStateAction(() => api.updateBoardColor(boardId, target.value), 'Couleur de bordure mise a jour.');
      return;
    }

    if (field === 'board-fill') {
      await runStateAction(() => api.updateBoardFillColor(boardId, target.value), 'Couleur de fond mise a jour.');
      return;
    }

    if (field === 'widget-title' && target.dataset.widgetId) {
      await runStateAction(
        () => api.renameWidget(boardId, target.dataset.widgetId, target.value),
        'Titre du widget mis a jour.'
      );
      return;
    }

    if (field === 'column-label' && target.dataset.columnId) {
      await runStateAction(
        () => api.renameColumn(boardId, target.dataset.columnId, target.value),
        'Colonne renommee.'
      );
      return;
    }

    if (field === 'row-label' && target.dataset.rowId) {
      await runStateAction(
        () => api.renameRow(boardId, target.dataset.rowId, target.value),
        'Ligne renommee.'
      );
      return;
    }

    if (field === 'cell-value' && target.dataset.rowId && target.dataset.columnId) {
      await runStateAction(
        () => api.updateCell(boardId, target.dataset.rowId, target.dataset.columnId, target.value),
        'Cellule mise a jour.'
      );
    }
  });
}

async function bootstrap() {
  if (!api) {
    elements.landingMachineName.textContent = 'inconnu';
    elements.heroTitle.textContent = 'API Electron indisponible';
    elements.heroSubtitle.textContent = 'Le preload Electron n a pas expose window.tracksling.';
    showToast('window.tracksling est indisponible.', 'error');
    return;
  }

  await refreshAll();
}

async function refreshAll() {
  const [project, projectInfo, runtimeInfo] = await Promise.all([
    api.getState(),
    api.getProjectInfo(),
    api.getRuntimeInfo()
  ]);

  appState.project = normalizeProject(project);
  appState.projectInfo = projectInfo || appState.projectInfo;
  appState.runtimeInfo = runtimeInfo || appState.runtimeInfo;
  render();
}

function normalizeProject(project) {
  if (!project || !Array.isArray(project.boards)) {
    return { activeBoardId: null, boards: [] };
  }
  return project;
}

function render() {
  const activeBoard = getActiveBoard();
  const boardCount = appState.project.boards.length;
  const hasProjectFile = !!appState.projectInfo?.hasProjectFile;
  const hasUnsavedChanges = !!appState.projectInfo?.hasUnsavedChanges;

  elements.boardCountBadge.textContent = String(boardCount);
  elements.boardCountMetric.textContent = String(boardCount);
  elements.machineNameMetric.textContent = appState.runtimeInfo?.machineName || '-';
  elements.landingMachineName.textContent = appState.runtimeInfo?.machineName || 'cet appareil';
  elements.saveStateMetric.textContent = hasProjectFile
    ? hasUnsavedChanges
      ? 'Modifications locales'
      : 'Synchronise'
    : 'En memoire';

  elements.heroTitle.textContent = activeBoard ? activeBoard.name : 'Aucun tableau actif';
  elements.heroSubtitle.textContent = hasProjectFile
    ? `Projet local: ${appState.projectInfo.projectFilePath}`
    : 'Le projet courant existe seulement en memoire tant que vous ne l enregistrez pas.';

  elements.openProjectFolderButton.disabled = !hasProjectFile;

  renderProjectSummary(boardCount, hasProjectFile, hasUnsavedChanges);
  renderBoardList(activeBoard);

  elements.emptyState.classList.toggle('hidden', !!activeBoard);
  elements.boardWorkspace.classList.toggle('hidden', !activeBoard);

  if (activeBoard) {
    renderBoardWorkspace(activeBoard);
  } else {
    elements.boardWorkspace.innerHTML = '';
  }
}

function showMainApp() {
  elements.landingPage.classList.add('hidden');
  elements.appShell.classList.remove('hidden');
}

function renderProjectSummary(boardCount, hasProjectFile, hasUnsavedChanges) {
  const stateLabel = hasProjectFile
    ? hasUnsavedChanges
      ? 'Modifications non enregistrees'
      : 'Projet enregistre'
    : 'Projet temporaire';

  const pathLabel = hasProjectFile ? appState.projectInfo.projectFilePath : 'Aucun fichier selectionne';

  elements.projectSummary.innerHTML = `
    <div class="summary-row">
      <span class="summary-label">Etat</span>
      <span class="summary-value">${escapeHtml(stateLabel)}</span>
    </div>
    <div class="summary-row">
      <span class="summary-label">Machine</span>
      <span class="summary-value">${escapeHtml(appState.runtimeInfo?.machineName || '-')}</span>
    </div>
    <div class="summary-row">
      <span class="summary-label">Tableaux</span>
      <span class="summary-value">${boardCount}</span>
    </div>
    <div class="project-path-row">
      <span class="summary-label">Fichier</span>
      <span class="summary-value dimmed meta-path">${escapeHtml(pathLabel)}</span>
    </div>
  `;
}

function renderBoardList(activeBoard) {
  if (appState.project.boards.length === 0) {
    elements.boardList.innerHTML = `
      <div class="workspace-note">
        <h3>Aucun tableau</h3>
        <p class="muted">Utilisez le formulaire ci-dessus pour creer votre premier tableau.</p>
      </div>
    `;
    return;
  }

  elements.boardList.innerHTML = appState.project.boards
    .map((board) => {
      const isActive = activeBoard && activeBoard.id === board.id;
      return `
        <article class="board-card ${isActive ? 'active' : ''}">
          <button class="board-select" data-action="set-board" data-board-id="${board.id}" type="button">
            <strong>${escapeHtml(board.name)}</strong>
            <small>${escapeHtml(board.description || 'Sans description')}</small>
          </button>
          <button
            class="icon-button board-delete"
            data-action="delete-board"
            data-board-id="${board.id}"
            type="button"
            aria-label="Supprimer ${escapeAttribute(board.name)}"
          >
            ×
          </button>
        </article>
      `;
    })
    .join('');
}

function renderBoardWorkspace(board) {
  elements.boardWorkspace.innerHTML = `
    <section class="panel workspace-note">
      <div class="panel-heading">
        <div>
          <p class="eyebrow">Tableau actif</p>
          <h3>${escapeHtml(board.name)}</h3>
        </div>
        <div class="chips-row">
          <span class="chip">${board.widgets.length} widgets</span>
          <span class="chip">${board.columns.length} colonnes</span>
          <span class="chip">${board.rows.length} lignes</span>
        </div>
      </div>

      <div class="settings-grid">
        <label class="field">
          <span>Nom du tableau</span>
          <input
            class="board-name-input"
            data-field="board-name"
            data-board-id="${board.id}"
            type="text"
            value="${escapeAttribute(board.name)}"
          />
        </label>

        <label class="field">
          <span>Bordure</span>
          <input data-field="board-border" data-board-id="${board.id}" type="color" value="${escapeAttribute(board.borderColor)}" />
        </label>

        <label class="field">
          <span>Fond</span>
          <input data-field="board-fill" data-board-id="${board.id}" type="color" value="${escapeAttribute(board.fillColor)}" />
        </label>
      </div>

      <div class="description-box">
        <span class="description-label">Description</span>
        <p>${escapeHtml(board.description || 'Aucune description pour ce tableau.')}</p>
      </div>
    </section>

    <div class="workspace-grid">
      <section class="panel widgets-panel">
        <div class="panel-heading">
          <div>
            <p class="eyebrow">Widgets</p>
            <h3>Indicateurs visuels</h3>
          </div>
          <div class="widget-actions">
            <button class="chip-button" data-action="add-widget" data-preset="number" data-board-id="${board.id}" type="button">Nombre</button>
            <button class="chip-button" data-action="add-widget" data-preset="donut" data-board-id="${board.id}" type="button">Donut</button>
            <button class="chip-button" data-action="add-widget" data-preset="curve" data-board-id="${board.id}" type="button">Courbe</button>
          </div>
        </div>
        <div class="widget-list">${renderWidgets(board)}</div>
      </section>

      <section class="panel table-panel">
        <div class="panel-heading">
          <div>
            <p class="eyebrow">Table editable</p>
            <h3>Structure des donnees</h3>
          </div>
          <div class="table-toolbar">
            <button class="secondary-button" data-action="add-column" data-board-id="${board.id}" type="button">Ajouter colonne</button>
            <button class="secondary-button" data-action="add-row" data-board-id="${board.id}" type="button">Ajouter ligne</button>
          </div>
        </div>
        ${renderTable(board)}
      </section>
    </div>
  `;
}

function renderWidgets(board) {
  if (!board.widgets.length) {
    return `
      <article class="workspace-note">
        <h3>Aucun widget</h3>
        <p class="muted">Ajoutez un preset pour afficher un indicateur sur ce tableau.</p>
      </article>
    `;
  }

  return board.widgets
    .map((widget, index) => {
      const preview = renderWidgetPreview(widget);
      return `
        <article class="widget-card">
          <div class="widget-title-row">
            <h4>${escapeHtml(widget.type || 'widget')}</h4>
            <div class="widget-actions">
              <button
                class="icon-button"
                data-action="move-widget-left"
                data-board-id="${board.id}"
                data-widget-id="${widget.id}"
                data-index="${index}"
                type="button"
                ${index === 0 ? 'disabled' : ''}
                aria-label="Deplacer vers la gauche"
              >
                ←
              </button>
              <button
                class="icon-button"
                data-action="move-widget-right"
                data-board-id="${board.id}"
                data-widget-id="${widget.id}"
                data-index="${index}"
                type="button"
                ${index === board.widgets.length - 1 ? 'disabled' : ''}
                aria-label="Deplacer vers la droite"
              >
                →
              </button>
              <button
                class="icon-button"
                data-action="delete-widget"
                data-board-id="${board.id}"
                data-widget-id="${widget.id}"
                type="button"
                aria-label="Supprimer le widget"
              >
                ×
              </button>
            </div>
          </div>

          <label class="field">
            <span>Titre</span>
            <input
              class="widget-title-input"
              data-field="widget-title"
              data-board-id="${board.id}"
              data-widget-id="${widget.id}"
              type="text"
              value="${escapeAttribute(widget.title || 'Widget')}"
            />
          </label>

          <div class="widget-preview">${preview}</div>

          <div class="widget-meta">
            <span class="status-pill">Position ${index + 1}</span>
            <span class="status-pill">${escapeHtml(Array.isArray(widget.values) ? widget.values.join(' / ') : 'n/a')}</span>
          </div>
        </article>
      `;
    })
    .join('');
}

function renderWidgetPreview(widget) {
  const values = Array.isArray(widget.values) ? widget.values : [0];
  if (widget.type === 'donut') {
    const value = clamp(Number(values[0]) || 0, 0, 100);
    return `
      <div class="donut-preview">
        <div class="donut-ring" style="--donut-value:${value}"></div>
        <strong>${value}%</strong>
      </div>
    `;
  }

  if (widget.type === 'curve') {
    const points = buildSparklinePoints(values);
    const area = `${points} 120,120 0,120`;
    return `
      <div class="sparkline">
        <svg viewBox="0 0 120 120" preserveAspectRatio="none" role="img" aria-label="Courbe des valeurs">
          <path class="area" d="M ${area} Z"></path>
          <path class="line" d="M ${points}"></path>
        </svg>
      </div>
    `;
  }

  return `
    <div class="number-preview">
      <strong>${escapeHtml(String(values[0] ?? 0))}</strong>
      <span class="muted">Valeur principale</span>
    </div>
  `;
}

function renderTable(board) {
  if (!board.columns.length && !board.rows.length) {
    return `
      <article class="workspace-note">
        <h3>Table vide</h3>
        <p class="muted">Ajoutez des colonnes et des lignes pour commencer a saisir des donnees.</p>
      </article>
    `;
  }

  const header = board.columns
    .map(
      (column) => `
        <th class="table-cell-head" scope="col">
          <div class="table-edit-group">
            <input
              class="table-edit-input"
              data-field="column-label"
              data-board-id="${board.id}"
              data-column-id="${column.id}"
              type="text"
              value="${escapeAttribute(column.label || '')}"
            />
            <button
              class="icon-button"
              data-action="delete-column"
              data-board-id="${board.id}"
              data-column-id="${column.id}"
              type="button"
              aria-label="Supprimer la colonne"
            >
              ×
            </button>
          </div>
        </th>
      `
    )
    .join('');

  const rows = board.rows.length
    ? board.rows
        .map(
          (row) => `
            <tr>
              <th class="table-label-cell" scope="row">
                <div class="table-edit-group">
                  <input
                    class="table-edit-input"
                    data-field="row-label"
                    data-board-id="${board.id}"
                    data-row-id="${row.id}"
                    type="text"
                    value="${escapeAttribute(row.label || '')}"
                  />
                  <button
                    class="icon-button"
                    data-action="delete-row"
                    data-board-id="${board.id}"
                    data-row-id="${row.id}"
                    type="button"
                    aria-label="Supprimer la ligne"
                  >
                    ×
                  </button>
                </div>
              </th>
              ${board.columns
                .map((column) => {
                  const value = row.cells && Object.prototype.hasOwnProperty.call(row.cells, column.id)
                    ? row.cells[column.id]
                    : '';
                  return `
                    <td>
                      <input
                        class="table-edit-input"
                        data-field="cell-value"
                        data-board-id="${board.id}"
                        data-row-id="${row.id}"
                        data-column-id="${column.id}"
                        type="text"
                        value="${escapeAttribute(value || '')}"
                      />
                    </td>
                  `;
                })
                .join('')}
            </tr>
          `
        )
        .join('')
    : `
      <tr>
        <td colspan="${Math.max(board.columns.length + 1, 1)}">
          <div class="workspace-note">
            <h3>Aucune ligne</h3>
            <p class="muted">Ajoutez une ligne pour renseigner votre premiere entree.</p>
          </div>
        </td>
      </tr>
    `;

  return `
    <div class="table-wrapper">
      <table class="data-table">
        <thead>
          <tr>
            <th class="table-label-cell" scope="col">Lignes</th>
            ${header}
          </tr>
        </thead>
        <tbody>
          ${rows}
        </tbody>
      </table>
    </div>
  `;
}

function getActiveBoard() {
  return appState.project.boards.find((board) => board.id === appState.project.activeBoardId) || null;
}

async function runStateAction(action, successMessage) {
  try {
    const nextState = await action();
    appState.project = normalizeProject(nextState);
    appState.projectInfo = await api.getProjectInfo();
    render();
    if (successMessage) {
      showToast(successMessage);
    }
  } catch (error) {
    showToast(error?.message || 'Operation impossible.', 'error');
  }
}

async function runResultAction(action, successMessage) {
  try {
    const result = await action();
    if (result?.canceled) {
      return;
    }

    if (result && result.ok === false) {
      if (result.state) {
        appState.project = normalizeProject(result.state);
      }
      if (result.projectInfo) {
        appState.projectInfo = result.projectInfo;
      }
      render();
      showToast(result.message || 'Operation impossible.', 'error');
      return;
    }

    if (result?.state) {
      appState.project = normalizeProject(result.state);
    }
    if (result?.projectInfo) {
      appState.projectInfo = result.projectInfo;
    } else {
      appState.projectInfo = await api.getProjectInfo();
    }

    render();

    if (successMessage) {
      showToast(successMessage);
    }
  } catch (error) {
    showToast(error?.message || 'Operation impossible.', 'error');
  }
}

function buildSparklinePoints(values) {
  const safeValues = values.map((value) => Number(value) || 0);
  const minValue = Math.min(...safeValues);
  const maxValue = Math.max(...safeValues);
  const range = maxValue - minValue || 1;

  return safeValues
    .map((value, index) => {
      const x = safeValues.length === 1 ? 60 : (index / (safeValues.length - 1)) * 120;
      const y = 100 - ((value - minValue) / range) * 70;
      return `${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(' ');
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function escapeAttribute(value) {
  return escapeHtml(value);
}

function showToast(message, tone = 'info') {
  elements.toast.textContent = message;
  elements.toast.classList.remove('error', 'visible');
  if (tone === 'error') {
    elements.toast.classList.add('error');
  }

  window.clearTimeout(toastTimer);
  requestAnimationFrame(() => {
    elements.toast.classList.add('visible');
  });

  toastTimer = window.setTimeout(() => {
    elements.toast.classList.remove('visible');
  }, 2800);
}