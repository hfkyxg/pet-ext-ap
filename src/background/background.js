chrome.runtime.onInstalled.addListener(() => {
  console.log("Claw'd instalado e estrutura refatorada com sucesso!");
  
  chrome.storage.local.set({
    clawdState: {
      position: { x: null, y: null },
      profession: "idle",
      emotion: "happy"
    }
  });
});