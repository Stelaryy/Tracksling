const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('tracksling', {
  getState: () => ipcRenderer.invoke('tracksling:getState'),
  createBoard: (name, description, useCustomColors, borderColor, fillColor) => ipcRenderer.invoke('tracksling:createBoard', name, description, useCustomColors, borderColor, fillColor),
  setActiveBoard: (boardId) => ipcRenderer.invoke('tracksling:setActiveBoard', boardId),
  deleteBoard: (boardId) => ipcRenderer.invoke('tracksling:deleteBoard', boardId),
  updateBoardName: (boardId, name) => ipcRenderer.invoke('tracksling:updateBoardName', boardId, name),
  updateBoardColor: (boardId, color) => ipcRenderer.invoke('tracksling:updateBoardColor', boardId, color),
  updateBoardFillColor: (boardId, color) => ipcRenderer.invoke('tracksling:updateBoardFillColor', boardId, color),
  addColumn: (boardId, label) => ipcRenderer.invoke('tracksling:addColumn', boardId, label),
  addRow: (boardId, label) => ipcRenderer.invoke('tracksling:addRow', boardId, label),
  updateCell: (boardId, rowId, columnId, value) => ipcRenderer.invoke('tracksling:updateCell', boardId, rowId, columnId, value),
  renameRow: (boardId, rowId, newLabel) => ipcRenderer.invoke('tracksling:renameRow', boardId, rowId, newLabel),
  deleteRow: (boardId, rowId) => ipcRenderer.invoke('tracksling:deleteRow', boardId, rowId),
  renameColumn: (boardId, columnId, newLabel) => ipcRenderer.invoke('tracksling:renameColumn', boardId, columnId, newLabel),
  deleteColumn: (boardId, columnId) => ipcRenderer.invoke('tracksling:deleteColumn', boardId, columnId),
  addWidgetPreset: (boardId, preset) => ipcRenderer.invoke('tracksling:addWidgetPreset', boardId, preset),
  renameWidget: (boardId, widgetId, newTitle) => ipcRenderer.invoke('tracksling:renameWidget', boardId, widgetId, newTitle),
  deleteWidget: (boardId, widgetId) => ipcRenderer.invoke('tracksling:deleteWidget', boardId, widgetId),
  moveWidget: (boardId, fromIndex, toIndex) => ipcRenderer.invoke('tracksling:moveWidget', boardId, fromIndex, toIndex),
  exportJson: () => ipcRenderer.invoke('tracksling:exportJson'),
  importJson: () => ipcRenderer.invoke('tracksling:importJson')
});
