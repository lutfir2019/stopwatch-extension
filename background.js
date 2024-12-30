let timerSeconds = 0;
let isRunning = false;
let timerInterval;

const updateTimer = async () => {
  if (isRunning) {
    timerSeconds++;
    console.log("Timer:", timerSeconds);
    chrome.storage.local.set({ timerSeconds });
  }
};

chrome.runtime.onInstalled.addListener(async () => {
  chrome.notifications.create({
    type: "basic",
    iconUrl: "images/icon_timer.png",
    title: "Timer",
    message: "Timer Extension is installed!",
  });
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "start") {
    if (!isRunning) {
      isRunning = true;
      chrome.storage.local.set({ isRunning });
      timerInterval = setInterval(updateTimer, 1000);
    }
  } else if (message.action === "pause") {
    isRunning = false;
    clearInterval(timerInterval);
    chrome.storage.local.set({ isRunning });
  } else if (message.action === "reset") {
    isRunning = false;
    clearInterval(timerInterval);
    timerSeconds = 0;
    chrome.storage.local.set({ timerSeconds, isRunning });
  }
  sendResponse({ status: "ok" });
});
