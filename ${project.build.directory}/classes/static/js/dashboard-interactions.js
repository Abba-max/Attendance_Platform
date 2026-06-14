(function () {
    const icons = {
        bell: '<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-1.4-1.4A2 2 0 0118 14.2V11a6 6 0 00-4-5.7V5a2 2 0 10-4 0v.3A6 6 0 006 11v3.2c0 .5-.2 1-.6 1.4L4 17h11zm0 0a3 3 0 11-6 0"></path></svg>',
        user: '<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg>',
        settings: '<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.3 4.3c.4-1.8 2.9-1.8 3.4 0a1.7 1.7 0 002.6 1c1.5-.9 3.3.9 2.4 2.4a1.7 1.7 0 001 2.6c1.8.4 1.8 2.9 0 3.4a1.7 1.7 0 00-1 2.6c.9 1.5-.9 3.3-2.4 2.4a1.7 1.7 0 00-2.6 1c-.4 1.8-2.9 1.8-3.4 0a1.7 1.7 0 00-2.6-1c-1.5.9-3.3-.9-2.4-2.4a1.7 1.7 0 00-1-2.6c-1.8-.4-1.8-2.9 0-3.4a1.7 1.7 0 001-2.6c-.9-1.5.9-3.3 2.4-2.4 1 .6 2.3.1 2.6-1z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>',
        key: '<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 7a4 4 0 11-7.5 2M14 14l6-6m-3 0h3v3"></path></svg>',
        logout: '<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path></svg>',
        close: '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>'
    };

    const roleLabels = {
        admin: 'Administrator',
        pedagog: 'Pedagogic Assistant',
        teacher: 'Teacher',
        student: 'Student',
        supervisor: 'Supervisor'
    };

    const sampleNotifications = {
        admin: [
            ['New password reset request', 'A staff member requested password assistance.', 'Just now'],
            ['Academic year status updated', 'The active session context is ready.', '12 min ago'],
            ['Institution data synced', 'Dashboard data was refreshed successfully.', 'Today']
        ],
        pedagog: [
            ['Student migration ready', 'Eligible source and destination classes are available.', 'Just now'],
            ['Weekly planning updated', 'A timetable change was published for review.', '18 min ago'],
            ['Attendance review pending', 'New attendance records need validation.', 'Today']
        ],
        teacher: [
            ['Upcoming session', 'You have a class scheduled soon.', 'Just now'],
            ['Attendance draft saved', 'Recent roll call data is available.', '22 min ago'],
            ['Student list refreshed', 'Your classroom roster has been updated.', 'Today']
        ],
        student: [
            ['Attendance status updated', 'Your latest attendance record was processed.', 'Just now'],
            ['Upcoming class reminder', 'Check today\'s academic schedule.', '30 min ago'],
            ['Justification review', 'Recent absence requests are visible in your dashboard.', 'Today']
        ],
        supervisor: [
            ['Department review ready', 'A supervised department summary is available.', 'Just now'],
            ['Attendance anomaly flagged', 'A class needs supervisory review.', '24 min ago'],
            ['Staff assignment updated', 'A department staffing change was synced.', 'Today']
        ]
    };

    function dashboardRole() {
        return document.body.dataset.dashboardRole || inferRole();
    }

    function inferRole() {
        const path = window.location.pathname.toLowerCase();
        if (path.includes('/admin')) return 'admin';
        if (path.includes('/pedagog')) return 'pedagog';
        if (path.includes('/teacher')) return 'teacher';
        if (path.includes('/student')) return 'student';
        if (path.includes('/supervisor')) return 'supervisor';
        return 'user';
    }

    function profileData() {
        const profileButton = document.querySelector('[data-dashboard-profile-button], #profile-btn');
        const rawName = document.body.dataset.dashboardName ||
            Array.from(profileButton?.querySelectorAll('p') || []).map(p => p.textContent?.trim()).find(value => value && !isEmail(value)) ||
            document.querySelector('[id^="profileDisplayName"]')?.textContent?.trim() ||
            '';
        const email = document.body.dataset.dashboardEmail ||
            Array.from(profileButton?.querySelectorAll('p') || []).map(p => p.textContent?.trim()).find(isEmail) ||
            document.querySelector('[id^="profileDisplayUsername"]')?.textContent?.trim() ||
            'Account';
        const name = normalizeDisplayName(rawName, email);
        const role = roleLabels[dashboardRole()] || 'Dashboard User';
        return { name, email, role };
    }

    function isEmail(value) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || '').trim());
    }

    function normalizeDisplayName(name, email) {
        const cleaned = String(name || '').trim();
        if (cleaned && !isEmail(cleaned) && cleaned.toLowerCase() !== 'account') return cleaned;
        const localPart = isEmail(email) ? String(email).split('@')[0] : '';
        if (!localPart) return cleaned || 'Dashboard User';
        return localPart
            .replace(/[._-]+/g, ' ')
            .split(' ')
            .filter(Boolean)
            .map(part => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
            .join(' ') || 'Dashboard User';
    }

    function hideLegacyNotificationPanels() {
        document.querySelectorAll('#notification-panel:not([data-dashboard-notification-menu])').forEach(panel => {
            panel.classList.add('hidden');
            panel.style.display = 'none';
        });
    }

    function ensureNotificationDropdown(button) {
        const wrapper = button.closest('.relative') || button.parentElement;
        let panel = wrapper.querySelector('[data-dashboard-notification-menu]');
        if (panel) return panel;

        const notifications = sampleNotifications[dashboardRole()] || [];
        panel = document.createElement('div');
        panel.className = 'dashboard-dropdown hidden';
        panel.dataset.dashboardNotificationMenu = 'true';
        panel.id = panel.id || 'dashboard-notification-menu';
        panel.innerHTML = `
            <div class="dashboard-dropdown-header">
                <span class="dashboard-dropdown-title">Notifications</span>
                <button type="button" class="text-[11px] font-bold text-blue-500 hover:text-blue-600" data-dashboard-mark-read>Mark all read</button>
            </div>
            <div class="dashboard-dropdown-list">
                ${notifications.length ? notifications.map(([title, text, time]) => `
                    <div class="dashboard-notification-item">
                        <span class="dashboard-notification-icon">${icons.bell}</span>
                        <span>
                            <span class="block text-slate-800 dark:text-slate-100 font-bold">${title}</span>
                            <span class="block text-slate-500 text-xs mt-0.5">${text}</span>
                            <span class="dashboard-notification-time">${time}</span>
                        </span>
                    </div>`).join('') : '<div class="p-8 text-center text-sm font-semibold text-slate-400">No new notifications</div>'}
            </div>`;
        wrapper.appendChild(panel);

        const badge = button.querySelector('.dashboard-notification-badge') || document.createElement('span');
        if (notifications.length) {
            badge.className = 'dashboard-notification-badge';
            badge.textContent = String(notifications.length);
            if (!badge.parentElement) button.appendChild(badge);
        }
        panel.querySelector('[data-dashboard-mark-read]')?.addEventListener('click', () => {
            panel.querySelector('.dashboard-dropdown-list').innerHTML = '<div class="p-8 text-center text-sm font-semibold text-slate-400">No new notifications</div>';
            badge.remove();
        });
        return panel;
    }

    function ensureProfileMenu(button) {
        const wrapper = button.closest('.relative') || button.parentElement;
        let menu = wrapper.querySelector('[data-dashboard-profile-menu], #profile-menu');
        if (!menu) {
            menu = document.createElement('div');
            wrapper.appendChild(menu);
        }
        menu.id = menu.id || 'profile-menu';
        menu.dataset.dashboardProfileMenu = 'true';
        menu.className = 'dashboard-dropdown hidden';
        menu.innerHTML = `
            <div class="dashboard-dropdown-header"><span class="dashboard-dropdown-title">Account</span></div>
            <button type="button" class="dashboard-menu-item" data-dashboard-modal="profile"><span class="dashboard-menu-icon">${icons.user}</span><span>My Profile</span></button>
            <button type="button" class="dashboard-menu-item" data-dashboard-modal="settings"><span class="dashboard-menu-icon">${icons.settings}</span><span>Settings</span></button>
            <button type="button" class="dashboard-menu-item" data-dashboard-modal="password"><span class="dashboard-menu-icon">${icons.key}</span><span>Change Password</span></button>
            <a href="/logout" class="dashboard-menu-item text-red-600 hover:bg-red-50" data-dashboard-logout><span class="dashboard-menu-icon">${icons.logout}</span><span>Logout</span></a>`;
        return menu;
    }

    function closeDropdowns(except) {
        document.querySelectorAll('[data-dashboard-notification-menu], [data-dashboard-profile-menu], #profile-menu, #notification-panel').forEach(el => {
            if (el !== except) el.classList.add('hidden');
            if (el.id === 'notification-panel' && !el.dataset.dashboardNotificationMenu) el.style.display = 'none';
        });
    }

    function toggleDropdown(panel) {
        const hidden = panel.classList.contains('hidden');
        closeDropdowns(panel);
        panel.classList.toggle('hidden', !hidden);
    }

    function modalShell(id, title, body, actions = '', panelClass = '') {
        let modal = document.getElementById(id);
        if (!modal) {
            modal = document.createElement('div');
            modal.id = id;
            modal.className = 'dashboard-modal hidden';
            document.body.appendChild(modal);
        }
        modal.innerHTML = `
            <div class="dashboard-modal-panel ${panelClass}" role="dialog" aria-modal="true">
                <div class="dashboard-modal-header">
                    <h3 class="dashboard-modal-title">${title}</h3>
                    <button type="button" class="dashboard-header-action" data-dashboard-close-modal>${icons.close}</button>
                </div>
                <div class="dashboard-modal-body">${body}</div>
                ${actions ? `<div class="dashboard-modal-actions">${actions}</div>` : ''}
            </div>`;
        modal.classList.remove('hidden');
        return modal;
    }

    function openProfileModal() {
        const data = profileData();
        const initial = (data.name || data.email || 'U').trim()[0]?.toUpperCase() || 'U';
        modalShell('dashboardProfileModal', 'My Profile', `
            <div class="dashboard-profile-cover"></div>
            <div class="-mt-14 px-2 pb-2">
                <div class="flex flex-col md:flex-row md:items-end gap-5">
                    <div class="dashboard-profile-avatar" id="dashboardProfileAvatar">
                        <span id="dashboardProfileInitial">${initial}</span>
                        <img id="dashboardProfilePreview" alt="Profile preview" class="hidden">
                    </div>
                    <div class="flex-1 pb-2">
                        <p class="text-2xl font-black text-slate-900 dark:text-slate-100">${data.name}</p>
                        <p class="text-sm font-semibold text-slate-500 mt-1">${data.email}</p>
                        <div class="flex flex-wrap gap-2 mt-3">
                            <span class="px-3 py-1 rounded-full bg-blue-50 text-blue-600 text-xs font-black uppercase">${data.role}</span>
                            <span class="px-3 py-1 rounded-full bg-emerald-50 text-emerald-600 text-xs font-black uppercase">Active Session</span>
                        </div>
                    </div>
                    <div class="pb-2">
                        <input type="file" id="dashboardProfilePhotoInput" accept="image/*" class="hidden">
                        <button type="button" class="px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-bold hover:bg-slate-50 dark:hover:bg-slate-800" data-dashboard-change-photo>
                            Change Photo
                        </button>
                    </div>
                </div>
            </div>
            <div class="dashboard-profile-grid mt-6">
                <div class="dashboard-profile-card">
                    <p class="text-xs font-black text-slate-400 uppercase tracking-wider mb-4">Account Details</p>
                    <div class="dashboard-field"><label>Full name / username</label><input id="dashboardProfileName" value="${escapeAttribute(data.name)}" class="w-full px-4 py-3 border border-slate-200 rounded-xl bg-white dark:bg-slate-900"></div>
                    <div class="dashboard-field"><label>Email</label><input id="dashboardProfileEmail" value="${escapeAttribute(data.email)}" class="w-full px-4 py-3 border border-slate-200 rounded-xl bg-white dark:bg-slate-900"></div>
                </div>
                <div class="dashboard-profile-card">
                    <p class="text-xs font-black text-slate-400 uppercase tracking-wider mb-4">Session</p>
                    <div class="space-y-3">
                        <div><p class="text-xs font-bold text-slate-400 uppercase">Role</p><p class="font-bold text-slate-800 dark:text-slate-100">${data.role}</p></div>
                        <div><p class="text-xs font-bold text-slate-400 uppercase">Account status</p><p class="font-bold text-emerald-600">Active</p></div>
                        <div><p class="text-xs font-bold text-slate-400 uppercase">Photo upload</p><p class="text-sm font-semibold text-slate-500">Preview only. No backend upload is changed here.</p></div>
                    </div>
                </div>
            </div>`, '<button type="button" class="px-5 py-2.5 rounded-xl border border-slate-200 font-bold" data-dashboard-close-modal>Cancel</button><button type="button" class="px-5 py-2.5 rounded-xl bg-[#00B0FF] text-white font-bold" data-dashboard-profile-save>Save Changes</button>', 'profile-panel');
    }

    function escapeAttribute(value) {
        return String(value || '')
            .replace(/&/g, '&amp;')
            .replace(/"/g, '&quot;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
    }

    function openSettingsModal() {
        modalShell('dashboardSettingsModal', 'Settings', `
            <div class="space-y-4">
                <div class="flex items-center justify-between p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
                    <div><p class="font-bold text-slate-900 dark:text-slate-100">Theme</p><p class="text-sm text-slate-500">Use the moon/sun control in the top bar.</p></div>
                    <span class="text-xs font-black uppercase text-blue-500">Enabled</span>
                </div>
                <div class="dashboard-field">
                    <label>Language</label>
                    <select class="w-full px-4 py-3 border border-slate-200 rounded-xl bg-white dark:bg-slate-900">
                        <option>English</option>
                        <option>French</option>
                    </select>
                </div>
                <label class="flex items-center gap-3 text-sm font-semibold text-slate-600"><input type="checkbox" checked class="rounded"> Email notifications</label>
                <label class="flex items-center gap-3 text-sm font-semibold text-slate-600"><input type="checkbox" checked class="rounded"> Dashboard activity summaries</label>
            </div>`, '<button type="button" class="px-5 py-2.5 rounded-xl bg-[#00B0FF] text-white font-bold" data-dashboard-close-modal>Done</button>');
    }

    function openPasswordModal() {
        modalShell('dashboardPasswordModal', 'Change Password', `
            <div id="dashboardPasswordFeedback" class="hidden mb-4 text-sm font-semibold px-4 py-3 rounded-xl"></div>
            <div class="dashboard-field"><label>Current password</label><input id="dashboardCurrentPassword" type="password" class="w-full px-4 py-3 border border-slate-200 rounded-xl bg-white dark:bg-slate-900"></div>
            <div class="dashboard-field"><label>New password</label><input id="dashboardNewPassword" type="password" class="w-full px-4 py-3 border border-slate-200 rounded-xl bg-white dark:bg-slate-900"></div>
            <div class="dashboard-field"><label>Confirm password</label><input id="dashboardConfirmPassword" type="password" class="w-full px-4 py-3 border border-slate-200 rounded-xl bg-white dark:bg-slate-900"></div>`,
            '<button type="button" class="px-5 py-2.5 rounded-xl border border-slate-200 font-bold" data-dashboard-close-modal>Cancel</button><button type="button" class="px-5 py-2.5 rounded-xl bg-[#00B0FF] text-white font-bold" data-dashboard-save-password>Update Password</button>');
    }

    async function savePassword() {
        const feedback = document.getElementById('dashboardPasswordFeedback');
        const current = document.getElementById('dashboardCurrentPassword')?.value || '';
        const next = document.getElementById('dashboardNewPassword')?.value || '';
        const confirm = document.getElementById('dashboardConfirmPassword')?.value || '';
        const setFeedback = (message, ok) => {
            if (!feedback) return;
            feedback.textContent = message;
            feedback.className = `mb-4 text-sm font-semibold px-4 py-3 rounded-xl ${ok ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`;
        };
        if (!current || !next || !confirm) return setFeedback('All fields are required.', false);
        if (next !== confirm) return setFeedback('New passwords do not match.', false);
        if (next.length < 6) return setFeedback('Password must be at least 6 characters.', false);
        try {
            const res = await fetch('/api/user/password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ currentPassword: current, newPassword: next })
            });
            if (!res.ok) throw new Error(await res.text());
            setFeedback('Password updated successfully.', true);
        } catch (err) {
            setFeedback(err.message || 'Update failed. Check your current password.', false);
        }
    }

    document.addEventListener('click', (event) => {
        const notificationButton = event.target.closest('[data-dashboard-notification-button], #notification-btn');
        if (notificationButton) {
            event.preventDefault();
            event.stopImmediatePropagation();
            hideLegacyNotificationPanels();
            toggleDropdown(ensureNotificationDropdown(notificationButton));
            return;
        }

        const profileButton = event.target.closest('[data-dashboard-profile-button], #profile-btn');
        if (profileButton) {
            event.preventDefault();
            event.stopImmediatePropagation();
            toggleDropdown(ensureProfileMenu(profileButton));
            return;
        }

        const modalAction = event.target.closest('[data-dashboard-modal]');
        if (modalAction) {
            event.preventDefault();
            closeDropdowns();
            const modal = modalAction.dataset.dashboardModal;
            if (modal === 'profile') openProfileModal();
            if (modal === 'settings') openSettingsModal();
            if (modal === 'password') openPasswordModal();
            return;
        }

        if (event.target.closest('[data-dashboard-close-modal]')) {
            event.preventDefault();
            event.target.closest('.dashboard-modal')?.classList.add('hidden');
            return;
        }

        if (event.target.closest('[data-dashboard-save-password]')) {
            event.preventDefault();
            savePassword();
            return;
        }

        if (event.target.closest('[data-dashboard-change-photo]')) {
            event.preventDefault();
            document.getElementById('dashboardProfilePhotoInput')?.click();
            return;
        }

        if (event.target.closest('[data-dashboard-profile-save]')) {
            event.preventDefault();
            const modal = event.target.closest('.dashboard-modal');
            const notice = document.createElement('div');
            notice.className = 'mt-4 px-4 py-3 rounded-xl bg-emerald-50 text-emerald-700 text-sm font-semibold';
            notice.textContent = 'Profile changes are previewed in the UI. Photo upload is not persisted by this shared modal.';
            modal?.querySelector('.dashboard-modal-body')?.appendChild(notice);
            return;
        }

        if (!event.target.closest('.dashboard-dropdown') && !event.target.closest('[data-dashboard-notification-button], #notification-btn, [data-dashboard-profile-button], #profile-btn')) {
            closeDropdowns();
        }
    }, true);

    document.addEventListener('change', (event) => {
        if (event.target?.id !== 'dashboardProfilePhotoInput') return;
        const file = event.target.files?.[0];
        if (!file) return;
        const preview = document.getElementById('dashboardProfilePreview');
        const initial = document.getElementById('dashboardProfileInitial');
        if (!preview) return;
        const reader = new FileReader();
        reader.onload = () => {
            preview.src = reader.result;
            preview.classList.remove('hidden');
            initial?.classList.add('hidden');
        };
        reader.readAsDataURL(file);
    });

    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') {
            closeDropdowns();
            document.querySelectorAll('.dashboard-modal').forEach(modal => modal.classList.add('hidden'));
        }
    });

    document.addEventListener('DOMContentLoaded', () => {
        hideLegacyNotificationPanels();
        document.querySelectorAll('[data-dashboard-notification-menu], [data-dashboard-profile-menu], #profile-menu').forEach(el => el.classList.add('hidden'));
    });

    hideLegacyNotificationPanels();
    document.querySelectorAll('[data-dashboard-notification-menu], [data-dashboard-profile-menu], #profile-menu').forEach(el => el.classList.add('hidden'));
})();
