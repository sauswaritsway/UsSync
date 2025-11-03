// Configuration
const API_URL =   'https://mode-sync-worker.sauswaritsway.workers.dev'; // Change to your Cloudflare Worker URL when deployed

const PUBLIC_VAPID_KEY = "BA3RSfNcm-T3xcW7HFMx7VfsxWzVDB-wCQJBlufCSLKp30ORV4giZ0yPu_cRwqos5_WF9DjuHzl4P7T7Vs3rgM8";
// Detect device type
const isIPhone = /iPhone/i.test(navigator.userAgent);
const userName = isIPhone ? 'Sau' : 'Swarit';

// Local state
let states = {
    'best-friends': false,
    'baby-mode': false,
    'real-selves': false,
    'lovers': false,
    'benefits': false
};

let lastNotificationId = null;
let notificationPermissionGranted = false;

function urlBase64ToUint8Array(base64) {
    const padding = '='.repeat((4 - base64.length % 4) % 4);
    const base64Safe = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/');
    const raw = atob(base64Safe);
    return Uint8Array.from([...raw].map(ch => ch.charCodeAt(0)));
}
// Initialize app
async function init() {

    // Fetch states before showing UI
    await fetchStates();
    
    // Setup event listeners
    setupEventListeners();
    
    // Start polling for updates
    startPolling();
    
    // Check if notifications are supported
    checkNotificationSupport();


    if (notificationPermissionGranted) {
        registerPush();
    }
}

// Check notification support and request permission on first interaction
function checkNotificationSupport() {
    if (!('Notification' in window)) {
        console.log('This browser does not support notifications');
        return;
    }
    
    console.log('Current notification permission:', Notification.permission);
    
    if (Notification.permission === 'granted') {
        notificationPermissionGranted = true;
    }
}

async function registerPush() {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
        console.log("Push not supported");
        return;
    }

    const reg = await navigator.serviceWorker.register('/service-worker.js');
    console.log("Service worker registered", reg);

    // Subscribe
    const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(PUBLIC_VAPID_KEY)
    });

    // Send subscription to backend
    await fetch(`${API_URL}/subscribe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sub)
    });

    console.log("Subscribed to push");
}
// Request notification permission (must be triggered by user interaction)
async function requestNotificationPermission() {
    if (!('Notification' in window)) {
        alert('Your browser does not support notifications');
        return false;
    }

    if (Notification.permission === 'granted') {
        notificationPermissionGranted = true;
        return true;
    }

    if (Notification.permission === 'denied') {
        alert('Notifications are blocked. Please enable them in your browser settings.');
        return false;
    }

    // Request permission
    try {
        const permission = await Notification.requestPermission();
        console.log('Permission result:', permission);

        if (permission === 'granted') {
            notificationPermissionGranted = true;
            await registerPush();     // <-- ADD THIS

            const reg = await navigator.serviceWorker.getRegistration();
            reg?.showNotification('Notifications Enabled!', {
                body: 'You will now receive mode requests',
                tag: 'permission-granted'
            });
            return true;
        } else {
            alert('Notification permission denied');
            return false;
        }
    } catch (error) {
        console.error('Error requesting permission:', error);
        alert('Error requesting notification permission: ' + error.message);
        return false;
    }
}

// Setup event listeners
function setupEventListeners() {
    // Toggle switches
    document.querySelectorAll('.switch-container').forEach(el => {
        el.addEventListener('click', () => {
            const mode = el.dataset.mode;
            toggleSwitch(mode);
        });
    });

    // Notification buttons - request permission on first click
    document.querySelectorAll('.notify-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            e.stopPropagation();
            
            // Request permission if not granted
            if (!notificationPermissionGranted) {
                const granted = await requestNotificationPermission();
                if (!granted) {
                    return;
                }
            }
            
            const mode = btn.dataset.mode;
            await sendNotification(mode);
        });
    });
}

// Toggle switch
async function toggleSwitch(mode) {
    states[mode] = !states[mode];
    updateUI();
    await saveState(mode, states[mode]);
}

// Update UI based on current states
function updateUI() {
    for (let mode in states) {
        const el = document.querySelector(`.switch-container[data-mode="${mode}"]`);
        if (states[mode]) {
            el.classList.add('active');
        } else {
            el.classList.remove('active');
        }
    }
}

// API: Fetch current states from backend
async function fetchStates() {
    try {
        const response = await fetch(`${API_URL}/states`);
        if (response.ok) {
            const data = await response.json();
            states = data.states;
            updateUI();
        }
    } catch (error) {
        console.error('Error fetching states:', error);
    }
}

// API: Save state to backend
async function saveState(mode, value) {
    try {
        await fetch(`${API_URL}/state`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                mode: mode,
                value: value,
                user: userName
            })
        });
    } catch (error) {
        console.error('Error saving state:', error);
    }
}

// API: Send notification
async function sendNotification(mode) {
    const modeNames = {
        'best-friends': 'Best Friends',
        'baby-mode': 'Baby Mode',
        'real-selves': 'Real Selves',
        'lovers': 'Lovers',
        'benefits': 'Benefits'
    };

    try {
        const response = await fetch(`${API_URL}/notify`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                mode: mode,
                modeName: modeNames[mode],
                from: userName
            })
        });
        
        if (response.ok) {
            console.log('Notification sent successfully');
        }
        
        // Visual feedback
        const btn = document.querySelector(`.notify-btn[data-mode="${mode}"]`);
        btn.style.transform = 'scale(1.1)';
        setTimeout(() => {
            btn.style.transform = '';
        }, 200);
    } catch (error) {
        console.error('Error sending notification:', error);
    }
}

// API: Check for notifications
async function checkNotifications() {
    try {
        const response = await fetch(`${API_URL}/notifications?user=${userName}`);
        if (response.ok) {
            const data = await response.json();
            if (data.notification && data.notification.id !== lastNotificationId) {
                lastNotificationId = data.notification.id;
                console.log('New notification received:', data.notification);
                showNotification(data.notification);
            }
        }
    } catch (error) {
        console.error('Error checking notifications:', error);
    }
}

// Show browser notification
function showNotification(notification) {
    console.log('Attempting to show notification:', notification);
    console.log('Permission status:', Notification.permission);
    
    if (!('Notification' in window)) {
        console.log('Notifications not supported');
        // Fallback: show alert
        alert(notification.message);
        return;
    }

    if (Notification.permission === 'granted') {
        try {
            navigator.serviceWorker.getRegistration().then(reg => {
                if (reg) {
                    reg.showNotification('Mode Request', {
                        body: notification.message,
                        tag: notification.mode,
                        requireInteraction: false
                    });
                } else {
                    alert(notification.message);
                }
            });

            n.onclick = function() {
                window.focus();
                n.close();
            };
            
            console.log('Notification created successfully');
        } catch (error) {
            console.error('Error creating notification:', error);
            // Fallback to alert
            alert(notification.message);
        }
    } else {
        console.log('No notification permission, using alert');
        // Fallback: show alert
        alert(notification.message);
    }
}

// Poll for updates
function startPolling() {
    setInterval(async () => {
        await fetchStates();
        await checkNotifications();
    }, 2000); // Poll every 2 seconds
}

// Start the app when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
