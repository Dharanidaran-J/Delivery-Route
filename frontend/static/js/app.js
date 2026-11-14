/**
 * RouteGen - Core Application Controller
 * Handles Navigation, Manual Authentication, Dashboard Statistics, Modals & Toast Alerts
 * Supports both Flask Backend API and Static Hosting (GitHub Pages)
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

        // Fill Demo Credentials helper button
        const btnFillDemo = document.getElementById('btn-fill-demo-creds');
        if (btnFillDemo) {
            btnFillDemo.addEventListener('click', () => {
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

        // Modal backdrop click close
        document.querySelectorAll('.modal-backdrop').forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    if (modal.id === 'modal-auth' && !this.currentUser) {
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
            if (res && res.ok) {
                const data = await res.json();
                if (data.authenticated && data.user) {
                    this.setAuthenticatedUser(data.user);
                    this.loadDashboardStats();
                    return;
                }
            }
        } catch (err) {}

        // Static mode: check localStorage
        const storedUser = localStorage.getItem('routegen_user');
        if (storedUser) {
            try {
                const user = JSON.parse(storedUser);
                this.setAuthenticatedUser(user);
                this.loadDashboardStats();
                return;
            } catch (e) {}
        }

        // Not authenticated -> Require manual sign in
        this.openModal('modal-auth', true);
    },

    setAuthenticatedUser: function(user) {
        this.currentUser = user;
        
        const btnClose = document.getElementById('btn-close-auth-modal');
        if (btnClose) btnClose.style.display = 'flex';

        this.closeModal('modal-auth');

        // Update UI Badges
        const nameEl = document.getElementById('user-display-name');
        const roleEl = document.getElementById('user-display-role');
        const avatarEl = document.getElementById('user-avatar-initials');

        if (nameEl) nameEl.innerText = user.full_name || user.username;
        if (roleEl) roleEl.innerText = user.company || 'RouteGen Tamil Nadu Logistics';
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
            if (res && res.ok) {
                const data = await res.json();
                if (data.success) {
                    if (errAlert) errAlert.style.display = 'none';
                    this.setAuthenticatedUser(data.user);
                    this.loadDashboardStats();
                    LocationsManager.loadLocations();
                    this.showToast(`Welcome back, ${data.user.full_name || data.user.username}!`, "success");
                    return;
                }
            }
        } catch (err) {}

        // Static mode client-side fallback (accept credentials or demo credentials)
        const staticUser = {
            id: 1,
            username: identifier,
            email: `${identifier}@routegen.in`,
            full_name: identifier === 'demo_dispatcher' ? 'Alex Mercer (Senior Dispatcher)' : identifier,
            company: 'Tamil Nadu Express Logistics'
        };
        localStorage.setItem('routegen_user', JSON.stringify(staticUser));
        if (errAlert) errAlert.style.display = 'none';
        this.setAuthenticatedUser(staticUser);
        this.loadDashboardStats();
        LocationsManager.loadLocations();
        this.showToast(`Welcome, ${staticUser.full_name}!`, "success");

        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = `<span>Sign In</span> <i data-lucide="arrow-right"></i>`;
            if (window.lucide) window.lucide.createIcons();
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
            if (res && res.ok) {
                const data = await res.json();
                if (data.success) {
                    if (errAlert) errAlert.style.display = 'none';
                    this.setAuthenticatedUser(data.user);
                    this.loadDashboardStats();
                    LocationsManager.loadLocations();
                    this.showToast("Account created successfully!", "success");
                    return;
                }
            }
        } catch (err) {}

        // Static fallback
        const newUser = {
            id: Date.now(),
            username: username,
            email: email,
            full_name: full_name || username,
            company: company || "Tamil Nadu Logistics"
        };
        localStorage.setItem('routegen_user', JSON.stringify(newUser));
        if (errAlert) errAlert.style.display = 'none';
        this.setAuthenticatedUser(newUser);
        this.loadDashboardStats();
        LocationsManager.loadLocations();
        this.showToast("Account created successfully!", "success");

        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = `<span>Create Dispatcher Account</span> <i data-lucide="user-plus"></i>`;
            if (window.lucide) window.lucide.createIcons();
        }
    },

    handleLogout: async function() {
        try {
            await fetch('/api/auth/logout', { method: 'POST' });
        } catch (err) {}

        localStorage.removeItem('routegen_user');
        this.currentUser = null;
        
        document.getElementById('login-form')?.reset();
        document.getElementById('register-form')?.reset();
        this.hideAuthErrors();

        const nameEl = document.getElementById('user-display-name');
        const roleEl = document.getElementById('user-display-role');
        const avatarEl = document.getElementById('user-avatar-initials');
        if (nameEl) nameEl.innerText = "Signed Out";
        if (roleEl) roleEl.innerText = "Please Sign In";
        if (avatarEl) avatarEl.innerText = "--";

        this.showToast("Signed out. Please log in to continue.", "info");
        this.openModal('modal-auth', true);
    },

    switchTab: function(tabName) {
        if (!tabName) return;
        this.currentTab = tabName;

        document.querySelectorAll('.nav-item[data-tab]').forEach(item => {
            if (item.getAttribute('data-tab') === tabName) {
                item.classList.add('active');
            } else {
                item.classList.remove('active');
            }
        });

        document.querySelectorAll('.view-section').forEach(view => {
            view.classList.remove('active');
        });

        const targetView = document.getElementById(`view-${tabName}`);
        if (targetView) {
            targetView.classList.add('active');
        }

        if (tabName === 'dashboard') {
            this.loadDashboardStats();
        } else if (tabName === 'locations') {
            LocationsManager.loadLocations();
        } else if (tabName === 'map') {
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
            if (res && res.ok) {
                const data = await res.json();
                if (data.success) {
                    this.renderStatsUI(data.stats, data.chart_data, data.recent_optimizations);
                    return;
                }
            }
        } catch (err) {}

        // Static mode fallback computation
        const locs = LocationsManager.locations.filter(l => l.is_warehouse === 0);
        const opts = StaticStorage.getOptimizations();

        let totalDistTravelled = 0.0;
        let totalDistSaved = 0.0;
        let sumImpPct = 0.0;

        opts.forEach(o => {
            totalDistTravelled += (o.summary.optimized_distance_km || 0);
            totalDistSaved += (o.summary.distance_saved_km || 0);
            sumImpPct += (o.summary.improvement_percentage || 0);
        });

        const avgImp = opts.length > 0 ? (sumImpPct / opts.length) : 0;
        const co2Saved = totalDistSaved * 0.192;
        const fuelSaved = totalDistSaved * 0.15;

        const chartData = {
            labels: opts.slice(0, 10).map((o, idx) => `Run #${opts.length - idx}`).reverse(),
            distance_saved: opts.slice(0, 10).map(o => o.summary.distance_saved_km).reverse(),
            improvement_percentages: opts.slice(0, 10).map(o => o.summary.improvement_percentage).reverse()
        };

        const recent = opts.slice(0, 5).map(o => ({
            id: o.optimization_id,
            title: o.title,
            num_locations: o.summary.num_deliveries,
            optimized_distance_km: o.summary.optimized_distance_km,
            distance_saved_km: o.summary.distance_saved_km,
            improvement_percentage: o.summary.improvement_percentage
        }));

        this.renderStatsUI({
            total_deliveries: locs.length,
            total_distance_travelled_km: parseFloat(totalDistTravelled.toFixed(1)),
            total_optimizations: opts.length,
            total_distance_saved_km: parseFloat(totalDistSaved.toFixed(1)),
            avg_improvement_pct: parseFloat(avgImp.toFixed(1)),
            co2_saved_kg: parseFloat(co2Saved.toFixed(2)),
            fuel_saved_cost: parseFloat(fuelSaved.toFixed(2))
        }, chartData, recent);
    },

    renderStatsUI: function(s, chartData, recent) {
        document.getElementById('stat-total-deliveries').innerText = s.total_deliveries;
        document.getElementById('stat-distance-travelled').innerText = `${s.total_distance_travelled_km} km`;
        document.getElementById('stat-optimized-routes').innerText = s.total_optimizations;
        document.getElementById('stat-distance-saved').innerText = `${s.total_distance_saved_km} km`;
        document.getElementById('stat-co2-saved').innerText = `${s.co2_saved_kg} kg`;
        document.getElementById('stat-fuel-saved').innerText = `$${s.fuel_saved_cost}`;
        document.getElementById('stat-avg-improvement').innerText = `${s.avg_improvement_pct}%`;

        if (chartData) {
            ChartsManager.renderDashboardTrendChart('chart-dashboard-trend', chartData);
        }

        this.renderRecentOptimizationsTable(recent);
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
