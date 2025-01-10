// Constants
const STORAGE_KEYS = {
  TIMER_SECONDS: "timerSeconds",
  IS_RUNNING: "isRunning",
  LAST_STATE: "lastState",
};

const ALARM_NAMES = {
  DAILY_REMINDER: "dailyReminder",
};

const NOTIFICATION_CONFIG = {
  type: "basic",
  iconUrl: "images/icon_timer.png",
};

const AUDIO_CONFIG = {
  // Example sound URLs - replace with your preferred sound
  ALARM_SOUND_URL:
    "https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3",
  // Backup sounds in case primary fails
  BACKUP_SOUNDS: [
    "https://assets.mixkit.co/active_storage/sfx/2870/2870-preview.mp3",
    "https://assets.mixkit.co/active_storage/sfx/2871/2871-preview.mp3",
  ],
  volume: 0.7,
  duration: 3000, // Duration in milliseconds
};

// State management
class TimerState {
  constructor() {
    this.timerSeconds = 0;
    this.isRunning = false;
    this.timerInterval = null;
    this.initializeState();
  }

  async initializeState() {
    try {
      const result = await chrome.storage.local.get([
        STORAGE_KEYS.TIMER_SECONDS,
        STORAGE_KEYS.IS_RUNNING,
      ]);

      this.timerSeconds = result.timerSeconds || 0;
      this.isRunning = result.isRunning || false;

      if (this.isRunning) {
        this.startTimer();
      }
    } catch (error) {
      console.error("Failed to initialize timer state:", error);
      this.resetTimer();
    }
  }

  async updateTimer() {
    if (!this.isRunning) return;

    try {
      this.timerSeconds++;
      await chrome.storage.local.set({
        [STORAGE_KEYS.TIMER_SECONDS]: this.timerSeconds,
      });
      console.log("Timer:", this.timerSeconds);
    } catch (error) {
      console.error("Failed to update timer:", error);
      this.pauseTimer();
    }
  }

  startTimer() {
    if (this.isRunning) return;

    this.isRunning = true;
    this.timerInterval = setInterval(() => this.updateTimer(), 1000);
    this.saveState();
  }

  pauseTimer() {
    this.isRunning = false;
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
    this.saveState();
  }

  resetTimer() {
    this.pauseTimer();
    this.timerSeconds = 0;
    this.saveState();
  }

  async saveState() {
    try {
      await chrome.storage.local.set({
        [STORAGE_KEYS.TIMER_SECONDS]: this.timerSeconds,
        [STORAGE_KEYS.IS_RUNNING]: this.isRunning,
      });
    } catch (error) {
      console.error("Failed to save timer state:", error);
    }
  }
}

// Notification handling
class NotificationManager {
  static async playAlarmSound() {
    try {
      // Create a popup window with audio.html
      const popup = await chrome.windows.create({
        url: "audio/audio.html",
        type: "popup",
        focused: false,
        width: 1,
        height: 1,
      });

      // Wait for the page to load
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Send message to play sound
      try {
        await chrome.tabs.query({ windowId: popup.id }, async (tabs) => {
          if (tabs.length > 0) {
            await chrome.tabs.sendMessage(tabs[0].id, {
              action: "playSound",
              url: AUDIO_CONFIG.ALARM_SOUND_URL,
              volume: AUDIO_CONFIG.volume,
            });
          }
        });
      } catch (error) {
        console.error("Failed to send message to audio tab:", error);
      }

      // Clean up the popup after sound plays
      setTimeout(() => {
        chrome.windows.remove(popup.id);
      }, 4000);
    } catch (error) {
      console.error("Failed to play alarm sound:", error);
    }
  }

  static async create(title, message) {
    try {
      await this.playAlarmSound();
      await chrome.notifications.create({
        ...NOTIFICATION_CONFIG,
        title,
        message,
      });
    } catch (error) {
      console.error("Failed to create notification:", error);
    }
  }

  static getNext9AMTime() {
    const now = new Date();
    const next9AM = new Date(now);
    next9AM.setHours(9, 0, 0, 0);

    if (now >= next9AM) {
      next9AM.setDate(next9AM.getDate() + 1);
    }

    return next9AM.getTime();
  }

  static setupDailyReminder() {
    chrome.alarms.clearAll(async () => {
      try {
        await chrome.alarms.create(ALARM_NAMES.DAILY_REMINDER, {
          when: this.getNext9AMTime(),
          periodInMinutes: 24 * 60, // 24 hours
        });
      } catch (error) {
        console.error("Failed to setup daily reminder:", error);
      }
    });
  }
}

// Initialize timer state
const timerState = new TimerState();

// Event listeners
chrome.runtime.onInstalled.addListener(async () => {
  await NotificationManager.create("Timer", "Timer Extension is installed!");
  NotificationManager.setupDailyReminder();
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  (async () => {
    try {
      switch (message.action) {
        case "start":
          timerState.startTimer();
          break;
        case "pause":
          timerState.pauseTimer();
          break;
        case "reset":
          timerState.resetTimer();
          break;
        default:
          console.warn("Unknown action:", message.action);
      }
      sendResponse({ status: "success" });
    } catch (error) {
      console.error("Error handling message:", error);
      sendResponse({ status: "error", error: error.message });
    }
  })();

  return true; // Keep the message channel open for async response
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === ALARM_NAMES.DAILY_REMINDER) {
    NotificationManager.create("Daily Reminder", "This is your 9 AM reminder!");
  }
});
