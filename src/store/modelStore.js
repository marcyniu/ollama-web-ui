import { useSyncExternalStore } from 'react';

let state = {
  downloads: {},
};

const listeners = new Set();

function emit() {
  for (const listener of listeners) {
    listener();
  }
}

function setState(updater) {
  const nextState = typeof updater === 'function' ? updater(state) : updater;
  state = { ...state, ...nextState };
  emit();
}

function subscribe(listener) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot() {
  return state;
}

function normalizeProgress(progress = {}) {
  const completed = Number(progress.completed) || 0;
  const total = Number(progress.total) || 0;
  const percentage = total > 0 ? Math.min(100, Math.round((completed / total) * 100)) : 0;

  return {
    status: progress.status || 'downloading',
    completed,
    total,
    percentage,
    message: progress.message || '',
  };
}

export function setModelDownload(name, progress) {
  const modelName = (name || '').trim();
  if (!modelName) return;

  setState((prev) => ({
    downloads: {
      ...prev.downloads,
      [modelName]: normalizeProgress(progress),
    },
  }));
}

export function clearModelDownload(name) {
  setState((prev) => {
    const next = { ...prev.downloads };
    delete next[name];
    return { downloads: next };
  });
}

export function clearAllModelDownloads() {
  setState({ downloads: {} });
}

export function useModelStore(selector = (snapshot) => snapshot) {
  return useSyncExternalStore(subscribe, () => selector(getSnapshot()), () => selector(getSnapshot()));
}
