/* ===================================================
   CLAW'D — SERVICE WORKER v2.1
   Garante o estado inicial apenas na primeira instalação.
   Importante: onInstalled também dispara em atualizações
   da extensão — por isso NUNCA sobrescreve um estado já
   existente (preserva configurações e XP do usuário).
   =================================================== */

importScripts('../common/core.js');

chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.get([CLAWD.STORAGE_KEY], (result) => {
    if (result[CLAWD.STORAGE_KEY]) return; // estado existente: preserva
    chrome.storage.local.set({ [CLAWD.STORAGE_KEY]: { ...CLAWD.DEFAULT_STATE } });
  });
});
