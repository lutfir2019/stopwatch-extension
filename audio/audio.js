chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "playSound") {
    const audio = new Audio(request.url);
    audio.volume = request.volume;

    audio
      .play()
      .then(() => {
        sendResponse({ status: "success" });

        // Only close the window if it is a popup
        if (chrome.extension.getViews({ type: "popup" }).length > 0) {
          setTimeout(() => {
            window.close();
          }, 3500);
        }
      })
      .catch((error) => {
        console.error("Error playing sound:", error);
        sendResponse({ status: "error", error: error.message });
      });
  }
  return true; // Keep the message channel open for async response
});
