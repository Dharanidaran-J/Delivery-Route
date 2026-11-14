/**
 * RouteGen - Core Application Controller
 * Handles Navigation, Manual Authentication, Dashboard Statistics, Modals & Toast Alerts
 */

const App = {
    currentUser: null,
    currentTab: 'dashboard',

    init: async function() {
        this.bindGlobalEvents();
        await this.checkAuthStatus();
        
        // Initialize child modules
        LocationsManager.init();
        OptimizerManager.init();
        ReportsManager.init();
        
        // Initialize Map in the background
        MapManager.initMap();
        
        // Render lucide icons if library loaded
        if (window.lucide) {
            window.lucide.createIcons();
        }
    },

    bindGlobalEvents: function() {
        // Navigation links
        document.querySelectorAll('.nav-item[data-tab]').forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const tab = e.currentTarget.getAttribute('data-tab');
                this.switchTab(tab);
            });
        });

        // Logout button
        const btnLogout = document.getElementById('btn-logout');
        if (btnLogout) {
            btnLogout.addEventListener('click', () => this.handleLogout());
        }

        // Fill Demo Credentials helper button (Fills the fields manually so user can inspect and submit)
        const btnFillDemo = document.getElementById('btn-fill-demo-creds');
        if (btnFillDemo) {
            btnFillDemo.addEventListener('click', () => {
                // Switch to login tab
                document.getElementById('tab-auth-login')?.click();
                
                const idInput = document.getElementById('login-identifier');
                const pwdInput = document.getElementById('login-password');
                if (idInput && pwdInput) {
                    idInput.value = 'demo_dispatcher';
                    pwdInput.value = 'RouteGen2026!';
                    idInput.focus();
                }
                this.showToast("Pre-filled demo credentials into form. Click 'Sign In' to proceed.", "info");
            });
        }

        // Toggle Login Password visibility
        const btnTogglePwd = document.getElementById('btn-toggle-login-pwd');
        if (btnTogglePwd) {
            btnTogglePwd.addEventListener('click', () => {
                const pwdInput = document.getElementById('login-password');
                if (!pwdInput) return;
                if (pwdInput.type === 'password') {
                    pwdInput.type = 'text';
                    btnTogglePwd.innerText = 'Hide Password';
                } else {
                    pwdInput.type = 'password';
                    btnTogglePwd.innerText = 'Show Password';
                }
            });
        }

        // Modal backdrop click close (Only close if user is authenticated)
        document.querySelectorAll('.modal-backdrop').forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    if (modal.id === 'modal-auth' && !this.currentUser) {
                        // Prevent closing auth modal if not signed in
                        return;
                    }
                    modal.classList.remove('show');
                }
            });
        });

        // Modal close buttons
        document.querySelectorAll('.btn-close-modal').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const modal = e.target.closest('.modal-backdrop');
                if (modal) {
                    if (modal.id === 'modal-auth' && !this.currentUser) {
                        return;
                    }
                    modal.classList.remove('show');
                }
            });
        });

        // Manual Login Form Submit Listener
        const loginForm = document.getElementById('login-form');
        if (loginForm) {
            loginForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleLogin();
            });
        }

        // Manual Registration Form Submit Listener
        const registerForm = document.getElementById('register-form');
        if (registerForm) {
            registerForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleRegister();
            });
        }

        // Auth Tab Toggle (Sign In vs Register)
        const tabLogin = document.getElementById('tab-auth-login');
        const tabRegister = document.getElementById('tab-auth-register');
        if (tabLogin && tabRegister) {
            tabLogin.addEventListener('click', () => {
                tabLogin.style.color = '#fff';
                tabLogin.style.borderBottom = '2px solid var(--primary-cyan)';
                tabRegister.style.color = 'var(--text-muted)';
                tabRegister.style.borderBottom = 'none';

                document.getElementById('login-form').style.display = 'block';
                document.getElementById('register-form').style.display = 'none';

                this.hideAuthErrors();
            });

            tabRegister.addEventListener('click', () => {
                tabRegister.style.color = '#fff';
                tabRegister.style.borderBottom = '2px solid var(--primary-cyan)';
                tabLogin.style.color = 'var(--text-muted)';
                tabLogin.style.borderBottom = 'none';

                document.getElementById('login-form').style.display = 'none';
                document.getElementById('register-form').style.display = 'block';

                this.hideAuthErrors();
            });
        }

        // Map Layer Toggles
        document.querySelectorAll('.map-layer-toggle').forEach(chk => {
            chk.addEventListener('change', (e) => {
                const layer = e.target.getAttribute('data-layer');
                MapManager.toggleLayer(layer, e.target.checked);
            });
        });

        // Zoom to fit button
        const btnFitBounds = document.getElementById('btn-map-fit-bounds');
        if (btnFitBounds) {
            btnFitBounds.addEventListener('click', () => {
                if (OptimizerManager.lastOptimizationResult) {
                    MapManager.renderOptimizedRoutes(
                        OptimizerManager.lastOptimizationResult.original_route,
                        OptimizerManager.lastOptimizationResult.optimized_route,
                        OptimizerManager.lastOptimizationResult.road_routing
                    );
                } else {
                    LocationsManager.loadLocations();
                }
            });
        }
    },

    hideAuthErrors: function() {
        const loginErr = document.getElementById('login-error-alert');
        const regErr = document.getElementById('register-error-alert');
        if (loginErr) loginErr.style.display = 'none';
        if (regErr) regErr.style.display = 'none';
    },

    checkAuthStatus: async function() {
        try {
            const res = await fetch('/api/auth/me');
            const data = await res.json();
            if (data.authenticated && data.user) {
                this.setAuthenticatedUser(data.user);
                this.loadDashboardStats();
            } else {
                // Not authenticated -> Require manual sign in
                this.openModal('modal-auth', true);
            }
        } catch (err) {
            console.error("Auth check failed:", err);
            this.openModal('modal-auth', true);
        }
    },

    setAuthenticatedUser: function(user) {
        this.currentUser = user;
        
        // Show close button on modal once authenticated
        const btnClose = document.getElementById('btn-close-auth-modal');
        if (btnClose) btnClose.style.display = 'flex';

        this.closeModal('modal-auth');

        // Update UI Badges
        const nameEl = document.getElementById('user-display-name');
        const roleEl = document.getElementById('user-display-role');
        const avatarEl = document.getElementById('user-avatar-initials');

        if (nameEl) nameEl.innerText = user.full_name || user.username;
        if (roleEl) roleEl.innerText = user.company || 'RouteGen Dispatcher';
        if (avatarEl) {
            const initials = (user.full_name || user.username)
                .split(' ')
                .map(n => n[0])
                .join('')
                .toUpperCase()
                .slice(0, 2);
            avatarEl.innerText = initials || 'RG';
        }
    },

    handleLogin: async function() {
        const identifier = document.getElementById('login-identifier').value.trim();
        const password = document.getElementById('login-password').value;
        const errAlert = document.getElementById('login-error-alert');
        const submitBtn = document.getElementById('btn-submit-login');

        if (!identifier || !password) {
            if (errAlert) {
                errAlert.innerHTML = `<span>⚠️ Please enter both your username/email and password.</span>`;
                errAlert.style.display = 'flex';
            }
            return;
        }

        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.innerHTML = `<span>Signing In...</span>`;
        }

        try {
            const res = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ identifier, password })
            });
            const data = await res.json();
            if (data.success) {
                if (errAlert) errAlert.style.display = 'none';
                this.setAuthenticatedUser(data.user);
                this.loadDashboardStats();
                LocationsManager.loadLocations();
                this.showToast(`Welcome, ${data.user.full_name || data.user.username}!`, "success");
            } else {
                if (errAlert) {
                    errAlert.innerHTML = `<span>❌ ${data.error || "Invalid username or password"}</span>`;
                    errAlert.style.display = 'flex';
                }
                this.showToast(data.error || "Sign in failed", "error");
            }
        } catch (err) {
            if (errAlert) {
                errAlert.innerHTML = `<span>⚠️ Network error occurred during sign in.</span>`;
                errAlert.style.display = 'flex';
            }
            this.showToast("Network error during login", "error");
        } finally {
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.innerHTML = `<span>Sign In</span> <i data-lucide="arrow-right"></i>`;
                if (window.lucide) window.lucide.createIcons();
            }
        }
    },

    handleRegister: async function() {
        const full_name = document.getElementById('reg-fullname').value.trim();
        const username = document.getElementById('reg-username').value.trim();
        const email = document.getElementById('reg-email').value.trim();
        const company = document.getElementById('reg-company').value.trim();
        const password = document.getElementById('reg-password').value;
        const confirm_password = document.getElementById('reg-confirm-password').value;
        const errAlert = document.getElementById('register-error-alert');
        const submitBtn = document.getElementById('btn-submit-register');

        if (!username || !email || !password) {
            if (errAlert) {
                errAlert.innerHTML = `<span>⚠️ Full name, username, email, and password are required.</span>`;
                errAlert.style.display = 'flex';
            }
            return;
        }

        if (password.length < 6) {
            if (errAlert) {
                errAlert.innerHTML = `<span>⚠️ Password must be at least 6 characters long.</span>`;
                errAlert.style.display = 'flex';
            }
            return;
        }

        if (password !== confirm_password) {
            if (errAlert) {
                errAlert.innerHTML = `<span>⚠️ Passwords do not match. Please re-enter identical passwords.</span>`;
                errAlert.style.display = 'flex';
            }
            return;
        }

        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.innerHTML = `<span>Creating Account...</span>`;
        }

        try {
            const res = await fetch('/api/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, email, password, full_name, company })
            });
            const data = await res.json();
            if (data.success) {
                if (errAlert) errAlert.style.display = 'none';
                this.setAuthenticatedUser(data.user);
                this.loadDashboardStats();
                LocationsManager.loadLocations();
                this.showToast("Account created and logged in successfully!", "success");
            } else {
                if (errAlert) {
                    errAlert.innerHTML = `<span>❌ ${data.error || "Registration failed"}</span>`;
                    errAlert.style.display = 'flex';
                }
                this.showToast(data.error || "Registration failed", "error");
            }
        } catch (err) {
            if (errAlert) {
                errAlert.innerHTML = `<span>⚠️ Network error during account creation.</span>`;
                errAlert.style.display = 'flex';
            }
            this.showToast("Network error during registration", "error");
        } finally {
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.innerHTML = `<span>Create Dispatcher Account</span> <i data-lucide="user-plus"></i>`;
                if (window.lucide) window.lucide.createIcons();
            }
        }
    },

    handleLogout: async function() {
        try {
            await fetch('/api/auth/logout', { method: 'POST' });
            this.currentUser = null;
            
            // Reset input values
            document.getElementById('login-form')?.reset();
            document.getElementById('register-form')?.reset();
            this.hideAuthErrors();

            // Clear header badges
            const nameEl = document.getElementById('user-display-name');
            const roleEl = document.getElementById('user-display-role');
            const avatarEl = document.getElementById('user-avatar-initials');
            if (nameEl) nameEl.innerText = "Signed Out";
            if (roleEl) roleEl.innerText = "Please Sign In";
            if (avatarEl) avatarEl.innerText = "--";

            this.showToast("Signed out successfully. Please log in to continue.", "info");

            // Open auth modal in mandatory mode (cannot be closed without signing in)
            this.openModal('modal-auth', true);
        } catch (err) {
            this.showToast("Logout error", "error");
        }
    },

    switchTab: function(tabName) {
        if (!tabName) return;
        this.currentTab = tabName;

        // Update active class on nav links
        document.querySelectorAll('.nav-item[data-tab]').forEach(item => {
            if (item.getAttribute('data-tab') === tabName) {
                item.classList.add('active');
            } else {
                item.classList.remove('active');
            }
        });

        // Hide all views, display requested view
        document.querySelectorAll('.view-section').forEach(view => {
            view.classList.remove('active');
        });

        const targetView = document.getElementById(`view-${tabName}`);
        if (targetView) {
            targetView.classList.add('active');
        }

        // Trigger tab-specific actions
        if (tabName === 'dashboard') {
            this.loadDashboardStats();
        } else if (tabName === 'locations') {
            LocationsManager.loadLocations();
        } else if (tabName === 'map') {
            // Invalidate map size so all OpenStreetMap tiles render properly
            MapManager.invalidateMapSize();

            if (OptimizerManager.lastOptimizationResult) {
                MapManager.renderOptimizedRoutes(
                    OptimizerManager.lastOptimizationResult.original_route,
                    OptimizerManager.lastOptimizationResult.optimized_route,
                    OptimizerManager.lastOptimizationResult.road_routing
                );
            } else {
                LocationsManager.loadLocations();
            }
        } else if (tabName === 'reports') {
            ReportsManager.loadHistory();
        }

        if (window.lucide) window.lucide.createIcons();
    },

    loadDashboardStats: async function() {
        try {
            const res = await fetch('/api/dashboard/stats');
            const data = await res.json();
            if (data.success) {
                const s = data.stats;
                document.getElementById('stat-total-deliveries').innerText = s.total_deliveries;
                document.getElementById('stat-distance-travelled').innerText = `${s.total_distance_travelled_km} km`;
                document.getElementById('stat-optimized-routes').innerText = s.total_optimizations;
                document.getElementById('stat-distance-saved').innerText = `${s.total_distance_saved_km} km`;
                document.getElementById('stat-co2-saved').innerText = `${s.co2_saved_kg} kg`;
                document.getElementById('stat-fuel-saved').innerText = `$${s.fuel_saved_cost}`;
                document.getElementById('stat-avg-improvement').innerText = `${s.avg_improvement_pct}%`;

                // Render Dashboard trend chart
                if (data.chart_data) {
                    ChartsManager.renderDashboardTrendChart('chart-dashboard-trend', data.chart_data);
                }

                // Render recent table
                this.renderRecentOptimizationsTable(data.recent_optimizations);
            }
        } catch (err) {
            console.error("Dashboard stats error:", err);
        }
    },

    renderRecentOptimizationsTable: function(recent) {
        const tbody = document.getElementById('dashboard-recent-table');
        if (!tbody) return;
        tbody.innerHTML = '';

        if (!recent || recent.length === 0) {
            tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: #64748b; padding: 24px;">No optimization runs yet. Go to <b>Optimize Route</b> to run your first simulation!</td></tr>`;
            return;
        }

        recent.forEach(r => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><span style="font-weight: 700; color: #06b6d4;">#${r.id}</span></td>
                <td><span style="font-weight: 600; color: #fff;">${r.title}</span></td>
                <td><span class="badge badge-standard">${r.num_locations} Stops</span></td>
                <td><span style="color: #67e8f9;">${r.optimized_distance_km.toFixed(1)} km</span></td>
                <td><span style="color: #10b981; font-weight: 700;">-${r.distance_saved_km.toFixed(1)} km (${r.improvement_percentage.toFixed(1)}%)</span></td>
                <td>
                    <button class="btn btn-secondary btn-sm" onclick="ReportsManager.viewOptimization(${r.id})">
                        🗺️ Map
                    </button>
                </td>
            `;
            tbody.appendChild(tr);
        });
    },

    openModal: function(modalId, isMandatory = false) {
        const modal = document.getElementById(modalId);
        if (!modal) return;

        const btnClose = document.getElementById('btn-close-auth-modal');
        if (modalId === 'modal-auth') {
            if (isMandatory || !this.currentUser) {
                if (btnClose) btnClose.style.display = 'none';
            } else {
                if (btnClose) btnClose.style.display = 'flex';
            }
        }

        modal.classList.add('show');
    },

    closeModal: function(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) modal.classList.remove('show');
    },

    showToast: function(message, type = 'info') {
        const container = document.getElementById('toast-container');
        if (!container) return;

        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        
        let icon = 'ℹ️';
        if (type === 'success') icon = '✅';
        if (type === 'error') icon = '❌';
        if (type === 'warning') icon = '⚠️';

        toast.innerHTML = `
            <span>${icon}</span>
            <div class="toast-message">${message}</div>
        `;

        container.appendChild(toast);

        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateX(100%)';
            setTimeout(() => toast.remove(), 300);
        }, 4000);
    }
};

// Start application when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    App.init();
});
