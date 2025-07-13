document.addEventListener("DOMContentLoaded", () => {
  const list = document.getElementById("bookmarkList");

  // Clear All Bookmarks
  document.getElementById("clearAllBtn").onclick = () => {
    if (confirm("Are you sure you want to delete all bookmarks?")) {
      chrome.storage.local.set({ chatgptBookmarks: [] }, () => {
        list.innerHTML = "<li>No bookmarks yet.</li>";
      });
    }
  };

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

        li.onmouseenter = () => (li.style.backgroundColor = "#2f303a");
        li.onmouseleave = () => (li.style.backgroundColor = "");

        li.onclick = (e) => {
          if (e.target.tagName.toLowerCase() === "img") return;

          chrome.tabs.query({ url: bookmark.url }, (existingTabs) => {
            const execScroll = (tabId) => {
              chrome.scripting.executeScript({
                target: { tabId },
                func: (messageId) => {
                  const highlightAndScroll = (el) => {
                    el.scrollIntoView({ behavior: 'smooth', block: 'center' });

                  };

                  const tryScroll = () => {
                    const el = document.querySelector(`[data-message-id="${messageId}"]`);
                    if (el) return highlightAndScroll(el);

                    const observer = new MutationObserver((_, obs) => {
                      const el = document.querySelector(`[data-message-id="${messageId}"]`);
                      if (el) {
                        highlightAndScroll(el);
                        obs.disconnect();
                      }
                    });

                    observer.observe(document.body, {
                      childList: true,
                      subtree: true,
                    });

                    // Fallback: disconnect observer after 10s
                    setTimeout(() => observer.disconnect(), 10000);
                  };

                  tryScroll();
                },
                args: [bookmark.id],
              });
            };

            if (existingTabs.length > 0) {
              chrome.tabs.update(existingTabs[0].id, { active: true });
              execScroll(existingTabs[0].id);
            } else {
              chrome.tabs.create({ url: bookmark.url }, (newTab) => {
                chrome.tabs.onUpdated.addListener(function waitForLoad(tabId, info) {
                  if (tabId === newTab.id && info.status === "complete") {
                    chrome.tabs.onUpdated.removeListener(waitForLoad);
                    execScroll(newTab.id);
                  }
                });
              });
            }
          });
        };

        // Clear Button
        const clearImg = document.createElement("img");
        clearImg.src = chrome.runtime.getURL("assets/clear.svg");
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
