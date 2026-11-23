// Content Script runs on https://chat.zalo.me/*
console.log("[Ms. Dung Shiny Bridge] Zalo Web Hook Loaded.");

function showBridgeBanner(text, isSuccess = true) {
  let banner = document.getElementById("ms-dung-zalo-banner");
  if (!banner) {
    banner = document.createElement("div");
    banner.id = "ms-dung-zalo-banner";
    banner.style.position = "fixed";
    banner.style.bottom = "20px";
    banner.style.right = "20px";
    banner.style.zIndex = "9999999";
    banner.style.padding = "12px 18px";
    banner.style.borderRadius = "14px";
    banner.style.fontSize = "13px";
    banner.style.fontWeight = "bold";
    banner.style.boxShadow = "0 10px 25px -5px rgba(0,0,0,0.3)";
    banner.style.display = "flex";
    banner.style.alignItems = "center";
    banner.style.gap = "8px";
    banner.style.transition = "all 0.3s ease";
    banner.style.fontFamily = "system-ui, -apple-system, sans-serif";
    document.body.appendChild(banner);
  }

  banner.style.backgroundColor = isSuccess ? "#059669" : "#2563eb";
  banner.style.color = "#ffffff";
  banner.innerHTML = `<span>💬</span> <span>${text}</span>`;
  banner.style.opacity = "1";
  banner.style.transform = "translateY(0)";

  setTimeout(() => {
    if (banner) {
      banner.style.opacity = "0";
      banner.style.transform = "translateY(10px)";
    }
  }, 6000);
}

function pasteTextIntoZaloChat(messageText) {
  // Tìm ô gõ chat của Zalo Web
  const selectors = [
    '#input_content',
    'div[contenteditable="true"]',
    '[data-id="chat-input"]',
    '.chat-input__content',
    '#chat-input-pannel'
  ];

  let inputEl = null;
  for (const sel of selectors) {
    const el = document.querySelector(sel);
    if (el && (el.contentEditable === "true" || el.tagName === "TEXTAREA" || el.tagName === "INPUT")) {
      inputEl = el;
      break;
    }
  }

  if (!inputEl) {
    console.warn("[Ms. Dung Shiny Bridge] Chat input box not found yet. Retrying in 500ms...");
    return false;
  }

  inputEl.focus();

  try {
    // Thử dùng insertText của trình duyệt để kích hoạt bộ gõ tự nhiên của Zalo
    const success = document.execCommand("insertText", false, messageText);
    if (!success) {
      if (inputEl.contentEditable === "true") {
        inputEl.innerText = messageText;
      } else {
        inputEl.value = messageText;
      }
    }

    // Phát sự kiện input để Zalo nhận diện thay đổi nội dung
    inputEl.dispatchEvent(new Event("input", { bubbles: true }));
    inputEl.dispatchEvent(new Event("change", { bubbles: true }));
    inputEl.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, key: " " }));
    inputEl.dispatchEvent(new KeyboardEvent("keyup", { bubbles: true, key: " " }));

    return true;
  } catch (err) {
    console.error("[Ms. Dung Shiny Bridge] Failed to insert text:", err);
    return false;
  }
}

// Hàm kích hoạt gửi tự động (Tự động click nút Gửi hoặc gõ phím Enter trên Zalo Web)
function triggerAutoSend(inputEl) {
  setTimeout(() => {
    // 1. Tìm các nút gửi tin nhắn thường gặp trên Zalo Web
    const sendBtnSelectors = [
      '[data-id="btn-send"]',
      '.chat-input__send-btn',
      '.chat-input__action-send',
      'div[title*="Gửi"]',
      'button[title*="Gửi"]',
      'span[data-translate-inner="STR_SEND"]',
      '.fa-paper-plane'
    ];
    let clicked = false;
    for (const sel of sendBtnSelectors) {
      const btn = document.querySelector(sel);
      if (btn && btn.offsetParent !== null) {
        btn.click();
        clicked = true;
        break;
      }
    }

    // 2. Fallback: Phát sự kiện phím Enter trực tiếp vào ô chat Zalo
    if (!clicked && inputEl) {
      inputEl.focus();
      const enterOpts = { bubbles: true, cancelable: true, key: "Enter", code: "Enter", keyCode: 13, which: 13 };
      inputEl.dispatchEvent(new KeyboardEvent("keydown", enterOpts));
      inputEl.dispatchEvent(new KeyboardEvent("keypress", enterOpts));
      inputEl.dispatchEvent(new KeyboardEvent("keyup", enterOpts));
    }
  }, 400);
}

function checkAndApplyPendingMessage() {
  chrome.storage.local.get(["pendingZaloMessage"], (result) => {
    const pending = result.pendingZaloMessage;
    if (!pending || !pending.message) return;

    // Chỉ áp dụng tin nhắn trong vòng 3 phút gần nhất
    const now = Date.now();
    if (now - pending.timestamp > 180000) {
      chrome.storage.local.remove(["pendingZaloMessage"]);
      return;
    }

    let attempts = 0;
    const interval = setInterval(() => {
      attempts++;
      const pasted = pasteTextIntoZaloChat(pending.message);
      if (pasted) {
        clearInterval(interval);
        
        // Tự động bấm gửi nếu autoSend !== false (Mặc định tự động gửi 100%)
        if (pending.autoSend !== false) {
          triggerAutoSend(pasted === true ? null : pasted);
          showBridgeBanner(
            `⚡ ĐÃ TỰ ĐỘNG GỬI tin nhắn Zalo cho ${pending.studentName ? `bé ${pending.studentName}` : pending.recipientName} thành công!`,
            true
          );
        } else {
          showBridgeBanner(
            `Đã tự động điền tin nhắn cho ${pending.studentName ? `bé ${pending.studentName}` : pending.recipientName}!`,
            true
          );
        }

        // Xóa tin chờ sau khi đã xử lý xong
        chrome.storage.local.remove(["pendingZaloMessage"]);
      } else if (attempts >= 10) {
        clearInterval(interval);
        console.warn("[Ms. Dung Shiny Bridge] Could not find Zalo chat box after 10 attempts.");
      }
    }, 500);
  });
}

// Kiểm tra ngay khi tải trang
checkAndApplyPendingMessage();

// Lắng nghe khi có tin nhắn mới được dispatch từ web app
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "local" && changes.pendingZaloMessage && changes.pendingZaloMessage.newValue) {
    checkAndApplyPendingMessage();
  }
});
