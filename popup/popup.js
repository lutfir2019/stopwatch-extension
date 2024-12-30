/**
 * Timer Extension with Sound Alert
 * Manages a timer with start, pause, reset functionality and sound alert
 * Persists state using Chrome storage API
 */

// State variables
let timerInterval = null;
let seconds = 0;
let isRunning = false;
let audioPlayed = false; // Track if audio has been played for current minute

// Constants
const STORAGE_KEYS = {
  IS_RUNNING: "isRunning",
  TIMER_SECONDS: "timerSeconds",
};

const TIMER_UPDATE_INTERVAL = 1000; // 1 second
const ALERT_TIME = 10; // Alert at 1 minute

// Create audio element
const alertSound = new Audio(
  // "https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3"
  "https://assets.mixkit.co/music/691/691.mp3"
);
alertSound.volume = 0.5; // Set volume to 50%

/**
 * Plays alert sound when timer reaches 1 minute
 */
const playAlertSound = () => {
  try {
    if (seconds === ALERT_TIME && !audioPlayed) {
      alertSound
        .play()
        .then(() =>
          chrome.notifications.create({
            type: "basic",
            iconUrl: "../images/icon_timer.png",
            title: "Timer",
            message: "Playing bell!",
          })
        )
        .catch((error) => console.error("Error playing sound:", error));
      audioPlayed = true;
    } else if (seconds !== ALERT_TIME) {
      audioPlayed = false; // Reset flag when not at alert time
    }
  } catch (error) {
    console.error("Error handling alert sound:", error);
  }
};

/**
 * Stops the currently playing alert sound
 */
const stopAlertSound = () => {
  try {
    alertSound.pause();
    alertSound.currentTime = 0; // Reset audio to beginning
  } catch (error) {
    console.error("Error stopping sound:", error);
  }
};

/**
 * Formats seconds into HH:MM:SS
 * @param {number} seconds - Number of seconds to format
 * @returns {string} Formatted time string
 */
const formatTime = (seconds) => {
  try {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    return [hrs, mins, secs]
      .map((val) => String(val).padStart(2, "0"))
      .join(":");
  } catch (error) {
    console.error("Error formatting time:", error);
    return "00:00:00";
  }
};

/**
 * Updates the timer display in the DOM
 */
const updateTimerDisplay = () => {
  try {
    const timerElement = document.getElementById("timer");
    if (!timerElement) {
      throw new Error("Timer element not found");
    }
    timerElement.textContent = formatTime(seconds);
  } catch (error) {
    console.error("Error updating timer display:", error);
  }
};

/**
 * Controls the timer's running state
 * @param {boolean} running - Whether the timer should be running
 */
const setTimerState = (running) => {
  try {
    if (running && !timerInterval) {
      timerInterval = setInterval(() => {
        seconds++;
        updateTimerDisplay();
        playAlertSound(); // Check for alert condition
        saveState();
      }, TIMER_UPDATE_INTERVAL);
    } else if (!running && timerInterval) {
      clearInterval(timerInterval);
      timerInterval = null;
    }
    isRunning = running;
  } catch (error) {
    console.error("Error setting timer state:", error);
    clearInterval(timerInterval);
    timerInterval = null;
    isRunning = false;
  }
};

/**
 * Saves the current timer state to Chrome storage
 */
const saveState = () => {
  try {
    chrome.storage.local.set({
      [STORAGE_KEYS.IS_RUNNING]: isRunning,
      [STORAGE_KEYS.TIMER_SECONDS]: seconds,
    });
  } catch (error) {
    console.error("Error saving state:", error);
  }
};

/**
 * Loads the timer state from Chrome storage
 * @returns {Promise<void>}
 */
const loadState = async () => {
  try {
    const state = await chrome.storage.local.get([
      STORAGE_KEYS.IS_RUNNING,
      STORAGE_KEYS.TIMER_SECONDS,
    ]);

    seconds = state[STORAGE_KEYS.TIMER_SECONDS] || 0;
    isRunning = state[STORAGE_KEYS.IS_RUNNING] || false;

    updateTimerDisplay();
    setTimerState(isRunning);
  } catch (error) {
    console.error("Error loading state:", error);
    seconds = 0;
    isRunning = false;
    updateTimerDisplay();
  }
};

/**
 * Sends a message to the background script
 * @param {string} action - The action to send
 */
const sendMessage = (action) => {
  try {
    chrome.runtime.sendMessage({ action });
  } catch (error) {
    console.error("Error sending message:", error);
  }
};

// Event Listeners
document.addEventListener("DOMContentLoaded", () => {
  try {
    // Start button
    document.getElementById("start")?.addEventListener("click", () => {
      setTimerState(true);
      saveState();
      sendMessage("start");
    });

    // Pause button
    document.getElementById("pause")?.addEventListener("click", () => {
      setTimerState(false);
      saveState();
      sendMessage("pause");
      stopAlertSound();
    });

    // Reset button
    document.getElementById("reset")?.addEventListener("click", () => {
      setTimerState(false);
      seconds = 0;
      audioPlayed = false; // Reset audio flag
      updateTimerDisplay();
      saveState();
      sendMessage("reset");
      stopAlertSound();
    });

    // Initialize timer
    loadState();
  } catch (error) {
    console.error("Error setting up event listeners:", error);
  }
});

// Clean up on window unload
window.addEventListener("unload", () => {
  if (timerInterval) {
    clearInterval(timerInterval);
  }
});

// function openDemoTab() {
//   chrome.tabs.create({ url: "https://lutfir.vercel.app" });
// }

// openDemoTab();
