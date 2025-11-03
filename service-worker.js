
self.addEventListener("install", () => {
  console.log("Service worker installed");
});

self.addEventListener("activate", () => {
  console.log("Service worker activated");
});

self.addEventListener("push", event => {
    let data = {};
    try {
        data = event.data.json();
    } catch (e) {
        console.log("Non-JSON push", e);
    }

    const title = data.title || "New Message";
    const body = data.body || "";
    const tag = data.mode || "default";

    event.waitUntil(
        self.registration.showNotification(title, {
            body,
            tag
        })
    );
});
