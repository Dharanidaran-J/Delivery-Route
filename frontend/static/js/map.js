/**
 * RouteGen - Interactive Leaflet Map Manager
 * Handles Original OpenStreetMap rendering, Satellite layers, custom markers, polylines & interaction
 */

const MapManager = {
    map: null,
    baseMaps: {},
    warehouseLayer: null,
    stopsLayer: null,
    originalRouteLayer: null,
    optimizedRouteLayer: null,
    roadRouteLayer: null,
    pickCoordinateMarker: null,
    isCoordinatePickerActive: false,
    
    // Default initial coordinates (Chennai, Tamil Nadu)
    defaultCenter: [13.0694, 80.1948],
    defaultZoom: 12,

    initMap: function(containerId = 'leaflet-map') {
        if (this.map) {
            this.invalidateMapSize();
            return;
        }

        const mapEl = document.getElementById(containerId);
        if (!mapEl) return;

        // Initialize Leaflet map
        this.map = L.map(containerId, {
            center: this.defaultCenter,
            zoom: this.defaultZoom,
            zoomControl: true,
            scrollWheelZoom: true
        });

        // 1. Original OpenStreetMap (Standard official OSM - full color, true road geometry)
        const osmStandard = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19,
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a> contributors'
        });

        // 2. Satellite Imagery (Esri World Imagery)
        const esriSatellite = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
            maxZoom: 19,
            attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
        });

        // 3. Detailed Street Map (Esri World Street Map)
        const esriStreet = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}', {
            maxZoom: 19,
            attribution: 'Tiles &copy; Esri &mdash; National Geographic, Esri, DeLorme, NAVTEQ, UNEP-WCMC, USGS, NASA, ESA, METI, NRCAN, GEBCO, NOAA, increment P Corp.'
        });

        // Add Original OpenStreetMap by default
        osmStandard.addTo(this.map);

        this.baseMaps = {
            "Original OpenStreetMap": osmStandard,
            "Satellite View (Esri)": esriSatellite,
            "Street Map (Esri)": esriStreet
        };

        // Add Layer Control for base map switching (topright)
        L.control.layers(this.baseMaps, null, {
            position: 'topright',
            collapsed: false
        }).addTo(this.map);

        // Add Scale control (bottomleft)
        L.control.scale({
            imperial: false,
            metric: true,
            position: 'bottomleft'
        }).addTo(this.map);

        // Initialize Layer Groups for Markers & Polylines
        this.warehouseLayer = L.layerGroup().addTo(this.map);
        this.stopsLayer = L.layerGroup().addTo(this.map);
        this.originalRouteLayer = L.layerGroup().addTo(this.map);
        this.optimizedRouteLayer = L.layerGroup().addTo(this.map);
        this.roadRouteLayer = L.layerGroup().addTo(this.map);

        // Map Click Event for Coordinate Picking
        this.map.on('click', (e) => {
            if (this.isCoordinatePickerActive) {
                const { lat, lng } = e.latlng;
                this.setPickedCoordinate(lat, lng);
            }
        });

        // Window resize listener
        window.addEventListener('resize', () => {
            this.invalidateMapSize();
        });

        // Invalidate map size after initial paint to prevent grey tile blocks
        this.invalidateMapSize();
    },

    invalidateMapSize: function() {
        if (!this.map) return;
        this.map.invalidateSize();
        setTimeout(() => { if (this.map) this.map.invalidateSize(); }, 80);
        setTimeout(() => { if (this.map) this.map.invalidateSize(); }, 250);
        setTimeout(() => { if (this.map) this.map.invalidateSize(); }, 600);
    },

    resetToCenter: function() {
        if (!this.map) return;
        this.map.setView(this.defaultCenter, this.defaultZoom);
        this.invalidateMapSize();
    },

    clearAllLayers: function() {
        if (!this.map) return;
        this.warehouseLayer.clearLayers();
        this.stopsLayer.clearLayers();
        this.originalRouteLayer.clearLayers();
        this.optimizedRouteLayer.clearLayers();
        this.roadRouteLayer.clearLayers();
    },

    // Render locations (Warehouse + Deliveries)
    renderLocations: function(warehouse, deliveries) {
        if (!this.map) this.initMap();
        this.clearAllLayers();

        const allLatLngs = [];

        // 1. Warehouse Marker (Depot)
        if (warehouse) {
            const whLatLng = [warehouse.latitude, warehouse.longitude];
            allLatLngs.push(whLatLng);

            const whIcon = L.divIcon({
                className: 'custom-leaflet-marker marker-depot',
                html: '<span style="font-size: 10px; font-weight: 800; letter-spacing: 0.5px;">DEPOT</span>',
                iconSize: [44, 44],
                iconAnchor: [22, 22],
                popupAnchor: [0, -22]
            });

            const whMarker = L.marker(whLatLng, { icon: whIcon });
            whMarker.bindPopup(`
                <div style="padding: 6px; font-family: Inter, sans-serif;">
                    <div style="font-weight: 700; color: #f43f5e; margin-bottom: 4px;">🏢 Warehouse Depot (Start/Return)</div>
                    <div style="font-size: 0.95rem; font-weight: 600;">${warehouse.name}</div>
                    <div style="font-size: 0.8rem; color: #94a3b8; margin-top: 4px;">${warehouse.customer_address || 'Central Dispatch Hub'}</div>
                    <div style="font-size: 0.75rem; color: #64748b; margin-top: 4px;">Lat: ${warehouse.latitude.toFixed(4)}, Lon: ${warehouse.longitude.toFixed(4)}</div>
                </div>
            `);
            this.warehouseLayer.addLayer(whMarker);
        }

        // 2. Delivery Stops Markers
        if (deliveries && deliveries.length > 0) {
            deliveries.forEach((loc, idx) => {
                const latLng = [loc.latitude, loc.longitude];
                allLatLngs.push(latLng);

                const stopIcon = L.divIcon({
                    className: 'custom-leaflet-marker marker-stop',
                    html: `<span>${idx + 1}</span>`,
                    iconSize: [30, 30],
                    iconAnchor: [15, 15],
                    popupAnchor: [0, -16]
                });

                const marker = L.marker(latLng, { icon: stopIcon });
                marker.bindPopup(`
                    <div style="padding: 6px; font-family: Inter, sans-serif;">
                        <div style="font-weight: 700; color: #06b6d4; margin-bottom: 4px;">📦 Stop #${idx + 1}</div>
                        <div style="font-size: 0.95rem; font-weight: 600;">${loc.name}</div>
                        <div style="font-size: 0.82rem; color: #cbd5e1; margin-top: 2px;">Customer: <b>${loc.customer_name || 'N/A'}</b></div>
                        <div style="font-size: 0.78rem; color: #94a3b8; margin-top: 2px;">${loc.customer_address || ''}</div>
                        <div style="font-size: 0.72rem; color: #64748b; margin-top: 4px;">Lat: ${loc.latitude.toFixed(4)}, Lon: ${loc.longitude.toFixed(4)}</div>
                    </div>
                `);
                this.stopsLayer.addLayer(marker);
            });
        }

        // Zoom map to bounds
        if (allLatLngs.length > 0) {
            this.map.fitBounds(allLatLngs, { padding: [50, 50], maxZoom: 15 });
        } else {
            this.resetToCenter();
        }
        
        this.invalidateMapSize();
    },

    // Render Routes Comparison
    renderOptimizedRoutes: function(originalRoute, optimizedRoute, roadRouting = null) {
        if (!this.map) this.initMap();
        this.clearAllLayers();

        const allLatLngs = [];

        // 1. Draw Original Route (Dashed Pink/Red)
        if (originalRoute && originalRoute.length > 1) {
            const origCoords = originalRoute.map(s => [s.latitude, s.longitude]);
            const origPolyline = L.polyline(origCoords, {
                color: '#f43f5e',
                weight: 3.5,
                opacity: 0.75,
                dashArray: '8, 8',
                lineJoin: 'round'
            });
            origPolyline.bindTooltip("Original Delivery Sequence", { sticky: true });
            this.originalRouteLayer.addLayer(origPolyline);
        }

        // 2. Draw Optimized Route (Cyan Glow Polyline)
        if (optimizedRoute && optimizedRoute.length > 1) {
            const optCoords = optimizedRoute.map(s => [s.latitude, s.longitude]);
            allLatLngs.push(...optCoords);

            const optPolyline = L.polyline(optCoords, {
                color: '#06b6d4',
                weight: 5,
                opacity: 0.95,
                lineJoin: 'round'
            });
            optPolyline.bindTooltip("GA Optimized Route Sequence", { sticky: true });
            this.optimizedRouteLayer.addLayer(optPolyline);
        }

        // 3. Draw Road Routing Geometry if available from OSRM
        if (roadRouting && roadRouting.road_geometry) {
            const roadPolyline = L.polyline(roadRouting.road_geometry, {
                color: '#10b981',
                weight: 5,
                opacity: 0.9
            });
            roadPolyline.bindTooltip(`Actual Street Road Route (${roadRouting.road_distance_km} km)`, { sticky: true });
            this.roadRouteLayer.addLayer(roadPolyline);
        }

        // 4. Place Numbered Sequence Markers for Optimized Route
        if (optimizedRoute && optimizedRoute.length > 0) {
            optimizedRoute.forEach((stop, idx) => {
                const latLng = [stop.latitude, stop.longitude];
                const isDepot = stop.is_warehouse === 1;

                const icon = L.divIcon({
                    className: `custom-leaflet-marker ${isDepot ? 'marker-depot' : 'marker-stop'}`,
                    html: isDepot ? '<span style="font-size: 10px; font-weight: 800;">DEPOT</span>' : `<span>${stop.stop_order}</span>`,
                    iconSize: isDepot ? [44, 44] : [30, 30],
                    iconAnchor: isDepot ? [22, 22] : [15, 15]
                });

                const marker = L.marker(latLng, { icon: icon });
                marker.bindPopup(`
                    <div style="padding: 6px; font-family: Inter, sans-serif;">
                        <div style="font-weight: 700; color: ${isDepot ? '#f43f5e' : '#06b6d4'}; font-size: 0.85rem; margin-bottom: 2px;">
                            ${isDepot ? 'DEPOT WAREHOUSE' : `STOP #${stop.stop_order}`}
                        </div>
                        <div style="font-weight: 700; font-size: 0.98rem; margin-bottom: 4px;">${stop.name}</div>
                        <div style="font-size: 0.8rem; color: #cbd5e1;">Customer: <b>${stop.customer_name || 'N/A'}</b></div>
                        ${stop.customer_address ? `<div style="font-size: 0.78rem; color: #94a3b8; margin-top: 2px;">${stop.customer_address}</div>` : ''}
                        <hr style="border: none; border-top: 1px solid rgba(255,255,255,0.1); margin: 6px 0;">
                        <div style="font-size: 0.78rem; color: #10b981;"><b>Leg Distance:</b> ${stop.distance_from_prev_km} km</div>
                        <div style="font-size: 0.78rem; color: #38bdf8;"><b>Cumulative:</b> ${stop.cumulative_distance_km} km</div>
                        <div style="font-size: 0.78rem; color: #f59e0b;"><b>Est. Arrival:</b> +${stop.estimated_arrival_minutes} min</div>
                    </div>
                `);

                if (isDepot) {
                    this.warehouseLayer.addLayer(marker);
                } else {
                    this.stopsLayer.addLayer(marker);
                }
            });
        }

        // Fit map bounds
        if (allLatLngs.length > 0) {
            this.map.fitBounds(allLatLngs, { padding: [60, 60], maxZoom: 15 });
        }
        
        this.invalidateMapSize();
    },

    // Interactive coordinate picking
    activateCoordinatePicker: function(callback) {
        this.isCoordinatePickerActive = true;
        this.coordinatePickerCallback = callback;
        if (this.map) {
            this.map.getContainer().style.cursor = 'crosshair';
        }
    },

    deactivateCoordinatePicker: function() {
        this.isCoordinatePickerActive = false;
        this.coordinatePickerCallback = null;
        if (this.map) {
            this.map.getContainer().style.cursor = '';
        }
        if (this.pickCoordinateMarker) {
            this.map.removeLayer(this.pickCoordinateMarker);
            this.pickCoordinateMarker = null;
        }
    },

    setPickedCoordinate: function(lat, lng) {
        if (!this.map) return;
        
        if (this.pickCoordinateMarker) {
            this.pickCoordinateMarker.setLatLng([lat, lng]);
        } else {
            this.pickCoordinateMarker = L.marker([lat, lng], {
                icon: L.divIcon({
                    className: 'custom-leaflet-marker',
                    html: '📍',
                    iconSize: [32, 32],
                    iconAnchor: [16, 16]
                })
            }).addTo(this.map);
        }

        if (typeof this.coordinatePickerCallback === 'function') {
            this.coordinatePickerCallback(lat, lng);
        }
    },

    toggleLayer: function(layerName, visible) {
        if (!this.map) return;
        const layerMap = {
            'warehouse': this.warehouseLayer,
            'stops': this.stopsLayer,
            'original': this.originalRouteLayer,
            'optimized': this.optimizedRouteLayer,
            'road': this.roadRouteLayer
        };
        const layer = layerMap[layerName];
        if (layer) {
            if (visible) {
                if (!this.map.hasLayer(layer)) this.map.addLayer(layer);
            } else {
                if (this.map.hasLayer(layer)) this.map.removeLayer(layer);
            }
        }
    }
};
