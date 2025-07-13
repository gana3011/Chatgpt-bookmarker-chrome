console.log("ChatGPT Bookmarker script loaded");

function addBookmarkButtons() {
  const messages = document.querySelectorAll('[data-message-author-role="assistant"]');

  messages.forEach((block) => {
    const messageId = block.getAttribute('data-message-id');
    if (!messageId || block.querySelector('.bookmark-img')) return;
    

    const img = document.createElement('img');
    img.src = chrome.runtime.getURL('assets/bookmark.svg');;
    img.className = 'bookmark-img';
    img.style.margin = '10px';
    img.style.height = '16px';
    img.style.width = '16px';
    img.alt = 'Bookmark icon';
    img.style.cursor = 'pointer';

    img.onclick = () => {
      const preview = block.innerText.slice(0,100);
      const bookmarks = JSON.parse(localStorage.getItem('chatgptBookmarks') || '[]');
      const chatUrl = window.location.href;
     chrome.storage.local.get({ chatgptBookmarks: [] }, (data) => {
  const bookmarks = data.chatgptBookmarks;
  bookmarks.push({ id: messageId, preview, url: chatUrl });
  chrome.storage.local.set({ chatgptBookmarks: bookmarks }, () => {
    alert("Bookmarked!");
  });
});

    };

    block.appendChild(img);
  });
}

const observer = new MutationObserver(addBookmarkButtons);
observer.observe(document.body, { childList: true, subtree: true });

window.addEventListener('load', addBookmarkButtons);