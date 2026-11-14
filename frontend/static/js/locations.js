/**
 * RouteGen - Location Management Module
 * Handles CRUD operations, coordinate picking, and scenario seeding
 * Supports both Flask Backend API and Static GitHub Pages Storage
 */

const LocationsManager = {
    locations: [],
    warehouse: null,
    editingLocationId: null,

    init: function() {
        this.bindEvents();
        this.loadLocations();
    },

    bindEvents: function() {
        // Location Form Submit
        const form = document.getElementById('location-form');
        if (form) {
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleFormSubmit();
            });
        }

        // Pick on map button
        const btnPickMap = document.getElementById('btn-pick-coords');
        if (btnPickMap) {
            btnPickMap.addEventListener('click', () => {
                this.startCoordinatePicker();
            });
        }

        // Scenario Seeding Buttons
        document.querySelectorAll('.btn-seed-scenario').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const scenario = e.currentTarget.getAttribute('data-scenario') || 'chennai';
                this.seedScenario(scenario);
            });
        });

        // Clear All Locations Button
        const btnClear = document.getElementById('btn-clear-locations');
        if (btnClear) {
            btnClear.addEventListener('click', () => {
                if (confirm("Are you sure you want to clear all delivery locations and the warehouse?")) {
                    this.clearAll();
                }
            });
        }
    },

    loadLocations: async function() {
        try {
            const res = await fetch('/api/locations');
            if (res.ok) {
                const data = await res.json();
                if (data.success) {
                    this.locations = data.all_locations || [];
                    this.warehouse = data.warehouse;
                    this.renderLocationsTable();
                    if (document.getElementById('view-map').classList.contains('active')) {
                        MapManager.renderLocations(this.warehouse, data.deliveries);
                    }
                    return;
                }
            }
        } catch (err) {
            // Static mode fallback (GitHub Pages)
        }

        // Client-Side LocalStorage Fallback
        const all = StaticStorage.getLocations();
        this.locations = all;
        this.warehouse = all.find(l => l.is_warehouse === 1) || null;
        const deliveries = all.filter(l => l.is_warehouse === 0);
        this.renderLocationsTable();
        if (document.getElementById('view-map').classList.contains('active')) {
            MapManager.renderLocations(this.warehouse, deliveries);
        }
    },

    renderLocationsTable: function() {
        const tbody = document.getElementById('locations-table-body');
        const emptyState = document.getElementById('locations-empty-state');
        if (!tbody) return;

        tbody.innerHTML = '';

        if (!this.locations || this.locations.length === 0) {
            if (emptyState) emptyState.style.display = 'block';
            return;
        }

        if (emptyState) emptyState.style.display = 'none';

        this.locations.forEach((loc, idx) => {
            const tr = document.createElement('tr');
            const isWh = loc.is_warehouse === 1;

            let priorityBadge = '';
            if (loc.priority === 'Urgent') {
                priorityBadge = '<span class="badge badge-urgent">Urgent</span>';
            } else if (loc.priority === 'High') {
                priorityBadge = '<span class="badge badge-warning">High</span>';
            } else {
                priorityBadge = '<span class="badge badge-standard">Standard</span>';
            }

            tr.innerHTML = `
                <td>
                    ${isWh 
                        ? '<span class="badge badge-warehouse">🏢 Warehouse Depot</span>' 
                        : `<span class="badge badge-stop">📦 Stop #${loc.delivery_order || idx}</span>`}
                </td>
                <td>
                    <div style="font-weight: 600; color: #fff;">${loc.name}</div>
                    <div style="font-size: 0.76rem; color: #94a3b8;">${loc.customer_address || 'No street address'}</div>
                </td>
                <td>
                    <div style="font-size: 0.86rem; font-weight: 500;">${loc.customer_name || 'N/A'}</div>
                    <div style="font-size: 0.74rem; color: #64748b;">${loc.customer_phone || ''}</div>
                </td>
                <td>
                    <code style="font-size: 0.8rem; color: #38bdf8; background: rgba(56, 189, 248, 0.1); padding: 2px 6px; border-radius: 4px;">
                        ${parseFloat(loc.latitude).toFixed(4)}, ${parseFloat(loc.longitude).toFixed(4)}
                    </code>
                </td>
                <td>${priorityBadge}</td>
                <td>
                    <div style="display: flex; gap: 6px;">
                        ${!isWh ? `
                            <button class="btn btn-secondary btn-sm" onclick="LocationsManager.setWarehouse(${loc.id})" title="Set as starting warehouse depot">
                                🏢 Make Depot
                            </button>
                        ` : ''}
                        <button class="btn btn-secondary btn-sm" onclick="LocationsManager.editLocation(${loc.id})" title="Edit location">
                            ✏️ Edit
                        </button>
                        <button class="btn btn-danger btn-sm" onclick="LocationsManager.deleteLocation(${loc.id})" title="Delete location">
                            🗑️
                        </button>
                    </div>
                </td>
            `;
            tbody.appendChild(tr);
        });

        // Update counts badge
        const countBadge = document.getElementById('locations-count-badge');
        if (countBadge) {
            countBadge.innerText = `${this.locations.length} Locations`;
        }
    },

    openAddModal: function() {
        this.editingLocationId = null;
        const form = document.getElementById('location-form');
        if (form) form.reset();
        
        document.getElementById('modal-location-title').innerText = "Add Delivery Destination";
        document.getElementById('loc-is-warehouse').checked = false;
        
        App.openModal('modal-location');
    },

    editLocation: function(id) {
        const loc = this.locations.find(l => l.id === id);
        if (!loc) return;

        this.editingLocationId = id;
        document.getElementById('modal-location-title').innerText = "Edit Delivery Location";

        document.getElementById('loc-name').value = loc.name || '';
        document.getElementById('loc-lat').value = loc.latitude;
        document.getElementById('loc-lng').value = loc.longitude;
        document.getElementById('loc-customer-name').value = loc.customer_name || '';
        document.getElementById('loc-customer-phone').value = loc.customer_phone || '';
        document.getElementById('loc-customer-address').value = loc.customer_address || '';
        document.getElementById('loc-priority').value = loc.priority || 'Standard';
        document.getElementById('loc-notes').value = loc.notes || '';
        document.getElementById('loc-is-warehouse').checked = (loc.is_warehouse === 1);

        App.openModal('modal-location');
    },

    handleFormSubmit: async function() {
        const name = document.getElementById('loc-name').value.trim();
        const lat = parseFloat(document.getElementById('loc-lat').value);
        const lng = parseFloat(document.getElementById('loc-lng').value);
        const customer_name = document.getElementById('loc-customer-name').value.trim();
        const customer_phone = document.getElementById('loc-customer-phone').value.trim();
        const customer_address = document.getElementById('loc-customer-address').value.trim();
        const priority = document.getElementById('loc-priority').value;
        const notes = document.getElementById('loc-notes').value.trim();
        const is_warehouse = document.getElementById('loc-is-warehouse').checked ? 1 : 0;

        if (!name) {
            App.showToast("Please enter a location name", "error");
            return;
        }

        if (isNaN(lat) || lat < -90 || lat > 90) {
            App.showToast("Latitude must be a valid number between -90 and 90", "error");
            return;
        }

        if (isNaN(lng) || lng < -180 || lng > 180) {
            App.showToast("Longitude must be a valid number between -180 and 180", "error");
            return;
        }

        const payload = {
            id: this.editingLocationId || Date.now(),
            name,
            latitude: lat,
            longitude: lng,
            customer_name,
            customer_phone,
            customer_address,
            priority,
            notes,
            is_warehouse
        };

        try {
            let res;
            if (this.editingLocationId) {
                res = await fetch(`/api/locations/${this.editingLocationId}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
            } else {
                res = await fetch('/api/locations', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
            }

            if (res && res.ok) {
                const data = await res.json();
                if (data.success) {
                    App.showToast(data.message, "success");
                    App.closeModal('modal-location');
                    this.loadLocations();
                    return;
                }
            }
        } catch (err) {
            // Client-side fallback
        }

        // Static mode update
        let list = StaticStorage.getLocations();
        if (is_warehouse === 1) {
            list.forEach(l => l.is_warehouse = 0);
        }

        if (this.editingLocationId) {
            const idx = list.findIndex(l => l.id === this.editingLocationId);
            if (idx !== -1) {
                list[idx] = { ...list[idx], ...payload };
            }
        } else {
            list.push(payload);
        }

        StaticStorage.saveLocations(list);
        App.showToast("Destination saved successfully!", "success");
        App.closeModal('modal-location');
        this.loadLocations();
    },

    deleteLocation: async function(id) {
        if (!confirm("Are you sure you want to delete this delivery point?")) return;

        try {
            const res = await fetch(`/api/locations/${id}`, { method: 'DELETE' });
            if (res && res.ok) {
                const data = await res.json();
                if (data.success) {
                    App.showToast(data.message, "success");
                    this.loadLocations();
                    return;
                }
            }
        } catch (err) {}

        // Static fallback
        let list = StaticStorage.getLocations().filter(l => l.id !== id);
        StaticStorage.saveLocations(list);
        App.showToast("Location removed", "success");
        this.loadLocations();
    },

    setWarehouse: async function(id) {
        try {
            const res = await fetch(`/api/locations/${id}/set-warehouse`, { method: 'POST' });
            if (res && res.ok) {
                const data = await res.json();
                if (data.success) {
                    App.showToast(data.message, "success");
                    this.loadLocations();
                    return;
                }
            }
        } catch (err) {}

        // Static fallback
        let list = StaticStorage.getLocations();
        list.forEach(l => {
            l.is_warehouse = (l.id === id) ? 1 : 0;
        });
        StaticStorage.saveLocations(list);
        App.showToast("Warehouse depot updated!", "success");
        this.loadLocations();
    },

    seedScenario: async function(scenarioKey) {
        try {
            App.showToast(`Loading '${scenarioKey.toUpperCase()}' delivery points...`, "info");
            const res = await fetch('/api/locations/seed', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ scenario: scenarioKey })
            });
            if (res && res.ok) {
                const data = await res.json();
                if (data.success) {
                    App.showToast(data.message, "success");
                    this.loadLocations();
                    return;
                }
            }
        } catch (err) {}

        // Static fallback
        const sc = StaticStorage.TAMIL_NADU_SCENARIOS[scenarioKey] || StaticStorage.TAMIL_NADU_SCENARIOS.chennai;
        const list = [sc.warehouse, ...sc.deliveries];
        StaticStorage.saveLocations(list);
        App.showToast(`Loaded '${sc.title}' with 1 warehouse + ${sc.deliveries.length} stops!`, "success");
        this.loadLocations();
    },

    clearAll: async function() {
        try {
            const res = await fetch('/api/locations/clear-all', { method: 'DELETE' });
            if (res && res.ok) {
                App.showToast("Locations cleared", "info");
                this.loadLocations();
                return;
            }
        } catch (err) {}

        // Static fallback
        StaticStorage.saveLocations([]);
        App.showToast("All locations cleared", "info");
        this.loadLocations();
    },

    startCoordinatePicker: function() {
        App.closeModal('modal-location');
        App.switchTab('map');
        App.showToast("Click anywhere on the map to select latitude and longitude coordinates!", "info");

        MapManager.activateCoordinatePicker((lat, lng) => {
            MapManager.deactivateCoordinatePicker();
            this.openAddModal();
            document.getElementById('loc-lat').value = lat.toFixed(6);
            document.getElementById('loc-lng').value = lng.toFixed(6);
            App.showToast(`Selected point: ${lat.toFixed(4)}, ${lng.toFixed(4)}`, "success");
        });
    }
};
