// PWA Registration, Lifecycle, and Install Manager
// Curated by Senior Developer for Attendee

(function () {
    let deferredPrompt = null;

    // 1. Service Worker Registration
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('/sw.js')
                .then(registration => {
                    console.log('[PWA] Service Worker registered successfully with scope:', registration.scope);

                    // Listen for updates in the service worker
                    registration.addEventListener('updatefound', () => {
                        const newWorker = registration.installing;
                        newWorker.addEventListener('statechange', () => {
                            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                                // A new service worker version is waiting, trigger dynamic reload toast
                                triggerUpdateNotification(newWorker);
                            }
                        });
                    });
                })
                .catch(error => {
                    console.error('[PWA] Service Worker registration failed:', error);
                });
        });

        // Handle controllerchange (when new worker takes control)
        let refreshing = false;
        navigator.serviceWorker.addEventListener('controllerchange', () => {
            if (!refreshing) {
                refreshing = true;
                window.location.reload();
            }
        });
    }

    // 2. Capture App Install Prompt Event
    window.addEventListener('beforeinstallprompt', (e) => {
        // Prevent default browser banner
        e.preventDefault();
        // Store event for programmatical installation triggers
        deferredPrompt = e;
        window.deferredPwaPrompt = e;

        console.log('[PWA] Capture beforeinstallprompt event. Ready for stand-alone installation.');

        // Proactively dispatch custom event for templates to know that installation is available
        const event = new CustomEvent('pwaInstallAvailable');
        window.dispatchEvent(event);

        // Auto-show local custom install button triggers if they exist in DOM
        showInstallUIElements();
    });

    // 3. Custom Installation Trigger
    window.triggerPwaInstallation = function () {
        if (!deferredPrompt) {
            console.log('[PWA] Install prompt not available or already installed.');
            return;
        }

        // Show native install prompt
        deferredPrompt.prompt();

        // Await user's decision
        deferredPrompt.userChoice.then((choiceResult) => {
            if (choiceResult.outcome === 'accepted') {
                console.log('[PWA] User accepted the Attendee application install.');
                hideInstallUIElements();
            } else {
                console.log('[PWA] User dismissed the Attendee application install.');
            }
            deferredPrompt = null;
            window.deferredPwaPrompt = null;
        });
    };

    // Helper: Show custom installation elements on the screen
    function showInstallUIElements() {
        const installBtns = document.querySelectorAll('.pwa-install-btn');
        installBtns.forEach(btn => {
            btn.classList.remove('hidden');
            btn.style.display = 'inline-flex';
            // Bind click trigger if not already bound
            if (!btn.dataset.bound) {
                btn.addEventListener('click', window.triggerPwaInstallation);
                btn.dataset.bound = 'true';
            }
        });
    }

    // Helper: Hide custom installation elements from the screen
    function hideInstallUIElements() {
        const installBtns = document.querySelectorAll('.pwa-install-btn');
        installBtns.forEach(btn => {
            btn.classList.add('hidden');
            btn.style.display = 'none';
        });
    }

    // 4. Premium SweetAlert Toast asking user to reload for New Version
    function triggerUpdateNotification(worker) {
        if (typeof Swal !== 'undefined') {
            Swal.fire({
                title: 'Update Available!',
                text: 'A new version of Attendee is available. Update now to access new features.',
                icon: 'info',
                showCancelButton: true,
                confirmButtonText: 'Update & Reload',
                cancelButtonText: 'Later',
                confirmButtonColor: '#1e293b',
                cancelButtonColor: '#94a3b8',
                toast: true,
                position: 'top-end',
                timer: 15000,
                timerProgressBar: true
            }).then((result) => {
                if (result.isConfirmed) {
                    worker.postMessage('skipWaiting');
                }
            });
        } else {
            // Fallback plain notification banner in case SweetAlert is not loaded yet
            const updateDiv = document.createElement('div');
            updateDiv.className = 'fixed bottom-4 right-4 bg-slate-900 text-white p-4 rounded-xl shadow-2xl flex items-center gap-4 z-[9999] animate-bounce';
            updateDiv.innerHTML = `
                <span class="text-sm font-semibold">New version available!</span>
                <button id="pwaUpdateBtn" class="px-3 py-1.5 bg-blue-500 hover:bg-blue-600 text-xs font-bold rounded-lg transition-all">Reload</button>
            `;
            document.body.appendChild(updateDiv);
            document.getElementById('pwaUpdateBtn').addEventListener('click', () => {
                worker.postMessage('skipWaiting');
            });
        }
    }

    // Auto-check on load if UI elements are already rendered
    document.addEventListener('DOMContentLoaded', () => {
        if (deferredPrompt) {
            showInstallUIElements();
        }
        
        // Listen for standard app state check (e.g. dynamic section loads)
        window.addEventListener('pwaInstallAvailable', showInstallUIElements);
    });

    // Detect if app is running in stand-alone (installed) display mode
    window.addEventListener('DOMContentLoaded', () => {
        if (window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone) {
            console.log('[PWA] Running in stand-alone (installed) display mode.');
            document.body.classList.add('pwa-standalone');
        }
        
        // 5. Offline/Online Network Indicator Banner
        const networkBanner = document.createElement('div');
        networkBanner.id = 'pwaNetworkBanner';
        networkBanner.className = 'hidden fixed top-0 left-0 w-full bg-red-600 text-white text-center py-2 text-sm font-semibold z-[9999] shadow-md transition-all';
        networkBanner.innerHTML = '<i class="ph ph-wifi-slash mr-2"></i>You are currently offline. Changes will sync later.';
        document.body.prepend(networkBanner);

        function updateNetworkStatus() {
            if (navigator.onLine) {
                networkBanner.classList.add('hidden');
                networkBanner.classList.remove('block');
            } else {
                networkBanner.classList.remove('hidden');
                networkBanner.classList.add('block');
            }
        }

        window.addEventListener('online', updateNetworkStatus);
        window.addEventListener('offline', updateNetworkStatus);
        
        // Initialize status
        updateNetworkStatus();
    });
})();
