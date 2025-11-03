self.addEventListener("install", () => {
  console.log("Service worker installed");
});

self.addEventListener("activate", event => {
  console.log("Service worker activated");

  // Force channel creation
  event.waitUntil(
    self.registration.showNotification(" ", {
      silent: true,
      android_channel_id: "high-priority"
    })
  );
});

self.addEventListener("push", event => {
  let data = {};
  try {
    data = event.data.json();
  } catch (_) {}

  const title = data.title || "New Message";
  const body = data.body || "";
  const tag = data.mode || "default";

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      tag,
      requireInteraction: false,
      priority: "high",
      renotify: true,
      android_channel_id: "high-priority"
    })
  );
});
