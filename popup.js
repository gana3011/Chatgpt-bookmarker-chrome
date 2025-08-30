async function getThemeFromPage() {
  return new Promise((resolve) => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (!tabs[0]) return resolve("light");
      chrome.tabs.sendMessage(
        tabs[0].id,
        { action: "getTheme" },
        (response) => {
          if (chrome.runtime.lastError || !response) {
            chrome.storage.local.get("chatgptTheme", (data) => {
              resolve(data.chatgptTheme || "light");
            });
          } else {
            resolve(response.theme);
          }
        }
      );
    });
  });
}

function applyThemeToPopup(theme) {
  const body = document.body;
  if (theme === "dark") {
    body.style.backgroundColor = "#202123";
    body.style.color = "#ECECF1";
  } else {
    body.style.backgroundColor = "#FFFFFF";
    body.style.color = "#202123";
  }
}

function updateBookmarkIcons(theme) {
  const iconPath =
    theme === "dark" ? "assets/bookmark-dark.svg" : "assets/bookmark-light.svg";
  document.querySelectorAll(".bookmark-img").forEach((img) => {
    img.src = chrome.runtime.getURL(iconPath);
  });
}

document.addEventListener("DOMContentLoaded", async () => {
  let theme = await getThemeFromPage();
  applyThemeToPopup(theme);
  updateBookmarkIcons(theme);

  const list = document.getElementById("bookmarkList");

  // Clear All Bookmarks
  document.getElementById("clearAllBtn").onclick = () => {
    if (confirm("Are you sure you want to delete all bookmarks?")) {
      chrome.storage.local.set({ chatgptBookmarks: [] }, () => {
        list.innerHTML = "<li>No bookmarks yet.</li>";
      });
    }
  };

  //detect theme changes
  chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === "local" && changes.chatgptTheme) {
      theme = changes.chatgptTheme.newValue;
      updateBookmarkIcons(theme);
    }
  });

  chrome.tabs.query({ active: true, currentWindow: true }, () => {
    chrome.storage.local.get({ chatgptBookmarks: [] }, (data) => {
      const bookmarks = data.chatgptBookmarks;
      list.innerHTML = "";

      if (bookmarks.length === 0) {
        list.innerHTML = "<li>No bookmarks yet.</li>";
        return;
      }

      bookmarks.forEach((bookmark) => {
        const li = document.createElement("li");
        li.textContent = bookmark.preview;

        li.style.cursor = "pointer";
        li.style.padding = "8px";
        li.style.borderRadius = "6px";
        li.style.transition = "background-color 0.2s ease";
        li.style.display = "flex";
        li.style.justifyContent = "space-between";
        li.style.alignItems = "center";
        
        li.onmouseenter = () =>
          (li.style.backgroundColor = theme === "dark" ? "#2f303a" : "#F0F0F0");
        li.onmouseleave = () => (li.style.backgroundColor = "");

        li.onclick = (e) => {
          if (e.target.tagName.toLowerCase() === "img") return;

          chrome.tabs.query({ url: bookmark.url }, (existingTabs) => {
            if (existingTabs.length > 0) {
              chrome.tabs.update(existingTabs[0].id, { active: true });
              chrome.scripting.executeScript({
                target: { tabId: existingTabs[0].id },
                func: (messageId) => {
                  function findAndScrollToMessage(messageId, attempts = 0) {
                    // Wait for page to be fully loaded
                    if (attempts === 0 && document.readyState !== "complete") {
                      setTimeout(
                        () => findAndScrollToMessage(messageId, 0),
                        500
                      );
                      return;
                    }

                    const el = document.querySelector(
                      '[data-message-id="' + messageId + '"]'
                    );
                    if (el) {
                      // Found the message, scroll to it
                      el.scrollIntoView({
                        behavior: "smooth",
                        block: "center",
                      });
                    } else if (attempts < 50) {
                      // Scroll down to load more messages and try again
                      window.scrollBy(0, 300);
                      setTimeout(
                        () => findAndScrollToMessage(messageId, attempts + 1),
                        500
                      );
                    } else {
                      // Last resort: try scrolling to top and then searching again
                      if (attempts === 50) {
                        window.scrollTo(0, 0);
                        setTimeout(
                          () => findAndScrollToMessage(messageId, 51),
                          1000
                        );
                      } else if (attempts < 100) {
                        window.scrollBy(0, 200);
                        setTimeout(
                          () => findAndScrollToMessage(messageId, attempts + 1),
                          300
                        );
                      } else {
                        alert(
                          "Message not found. The conversation might have been modified or the message may no longer exist."
                        );
                      }
                    }
                  }
                  setTimeout(() => findAndScrollToMessage(messageId), 100);
                },
                args: [bookmark.id],
              });
            } else {
              // Store the message ID to scroll to when the new tab loads
              chrome.storage.local.set(
                {
                  pendingScroll: {
                    messageId: bookmark.id,
                    url: bookmark.url,
                    timestamp: Date.now(),
                  },
                },
                () => {
                  chrome.tabs.create({ url: bookmark.url });
                }
              );
            }
          });
        };

        // Clear Button
        const clearImg = document.createElement("img");
        const iconPath =
          theme === "dark" ? "assets/clear-dark.svg" : "assets/clear-light.svg";
        clearImg.src = chrome.runtime.getURL(iconPath);
        clearImg.className = "clear-img";
        clearImg.style.height = "16px";
        clearImg.style.width = "16px";
        clearImg.alt = "Clear";
        clearImg.style.marginLeft = "10px";
        clearImg.style.transition = "transform 0.2s";

        clearImg.onmouseenter = () => {
          clearImg.style.transform = "rotate(15deg)";
        };
        clearImg.onmouseleave = () => {
          clearImg.style.transform = "rotate(0deg)";
        };

        clearImg.onclick = () => {
          const newBookmarks = bookmarks.filter(
            (b) => b.id !== bookmark.id || b.url !== bookmark.url
          );
          chrome.storage.local.set({ chatgptBookmarks: newBookmarks }, () => {
            li.remove();
            if (newBookmarks.length === 0) {
              list.innerHTML = "<li>No bookmarks yet.</li>";
            }
          });
        };

        li.appendChild(clearImg);
        list.appendChild(li);
      });
    });
  });
});
