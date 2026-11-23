// Content Script runs on Ms. Dung Shiny Web App (localhost)
console.log("[Ms. Dung Shiny Bridge] Web App Hook Initialized.");

// Đánh dấu để web app biết Extension đã được cài đặt
window.__MS_DUNG_ZALO_EXTENSION_INSTALLED__ = true;
document.documentElement.setAttribute("data-ms-dung-zalo-bridge", "active");

// Lắng nghe sự kiện từ Web App để chuyển tiếp sang Zalo Web (Tự động gửi 100%)
window.addEventListener("MS_DUNG_ZALO_DISPATCH", (event) => {
  const data = event.detail;
  if (!data || !data.message) return;

  console.log("[Ms. Dung Shiny Bridge] Dispatched message to Zalo (Auto-Send Enabled):", data);

  chrome.storage.local.set({
    pendingZaloMessage: {
      phone: data.phone || "",
      recipientName: data.recipientName || "Phụ huynh",
      studentName: data.studentName || "",
      message: data.message,
      timestamp: Date.now(),
      autoSend: data.autoSend !== undefined ? data.autoSend : true,
    }
  }, () => {
    console.log("[Ms. Dung Shiny Bridge] Saved to chrome.storage.local (Auto-Send Active)");
  });
});
