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

        li.onmouseenter = () => li.style.backgroundColor = "#2f303a";
        li.onmouseleave = () => li.style.backgroundColor = "";

 
        li.onclick = (e) => {
          if (e.target.tagName.toLowerCase() === "button") return; // ignore clear btn

          chrome.tabs.query({ url: bookmark.url }, (existingTabs) => {
            const scrollScript = `
              function findAndScrollToMessage(messageId, attempts = 0) {
                const el = document.querySelector('[data-message-id="' + messageId + '"]');
                if (el) {
                  el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                } else if (attempts < 20) {
                  window.scrollBy(0, 200);
                  setTimeout(() => findAndScrollToMessage(messageId, attempts + 1), 300);
                } else {
                  alert("Message not found after trying.");
                }
              }
              findAndScrollToMessage("${bookmark.id}");
            `;

            if (existingTabs.length > 0) {
              chrome.tabs.update(existingTabs[0].id, { active: true });
              chrome.tabs.executeScript(existingTabs[0].id, { code: scrollScript });
            } else {
              chrome.tabs.create({ url: bookmark.url }, (newTab) => {
                chrome.tabs.onUpdated.addListener(function waitForLoad(tabId, info) {
                  if (tabId === newTab.id && info.status === "complete") {
                    chrome.tabs.onUpdated.removeListener(waitForLoad);
                    chrome.tabs.executeScript(newTab.id, { code: scrollScript });
                  }
                });
              });
            }
          });
        };

        // Clear button
        const clearImg = document.createElement("img");
        clearImg.src = chrome.runtime.getURL('assets/clear.svg');
        clearImg.className = 'clear-img';
        clearImg.style.height = '16px';
        clearImg.style.width = '16px';
        clearImg.alt = "Clear";
        clearImg.style.marginLeft = "10px";
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
