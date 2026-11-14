/**
 * RouteGen - Optimization Module
 * Controls Genetic Algorithm Hyperparameters, execution, convergence tracking & route comparison
 */

const OptimizerManager = {
    lastOptimizationResult: null,
    isOptimizing: false,

    init: function() {
        this.bindSliderInputs();
        this.bindEvents();
    },

    bindSliderInputs: function() {
        // Sync sliders with value labels
        const bindSlider = (sliderId, labelId, formatFn = val => val) => {
            const slider = document.getElementById(sliderId);
            const label = document.getElementById(labelId);
            if (slider && label) {
                slider.addEventListener('input', (e) => {
                    label.innerText = formatFn(e.target.value);
                });
            }
        };

        bindSlider('ga-pop-size', 'ga-pop-size-val');
        bindSlider('ga-generations', 'ga-generations-val');
        bindSlider('ga-mutation-rate', 'ga-mutation-rate-val', v => parseFloat(v).toFixed(2));
        bindSlider('ga-crossover-rate', 'ga-crossover-rate-val', v => parseFloat(v).toFixed(2));
    },

    bindEvents: function() {
        const btnRun = document.getElementById('btn-run-optimization');
        if (btnRun) {
            btnRun.addEventListener('click', () => {
                this.executeOptimization();
            });
        }

        const btnViewMap = document.getElementById('btn-view-opt-map');
        if (btnViewMap) {
            btnViewMap.addEventListener('click', () => {
                if (this.lastOptimizationResult) {
                    App.switchTab('map');
                    MapManager.renderOptimizedRoutes(
                        this.lastOptimizationResult.original_route,
                        this.lastOptimizationResult.optimized_route,
                        this.lastOptimizationResult.road_routing
                    );
                }
            });
        }
    },

    executeOptimization: async function() {
        if (this.isOptimizing) return;

        const popSize = parseInt(document.getElementById('ga-pop-size').value);
        const generations = parseInt(document.getElementById('ga-generations').value);
        const mutationRate = parseFloat(document.getElementById('ga-mutation-rate').value);
        const crossoverRate = parseFloat(document.getElementById('ga-crossover-rate').value);
        const selectionMethod = document.getElementById('ga-selection-method').value;
        const crossoverMethod = document.getElementById('ga-crossover-method').value;
        const mutationMethod = document.getElementById('ga-mutation-method').value;
        const useRoadMultiplier = document.getElementById('ga-road-factor')?.checked || false;
        const fetchRoadGeometry = document.getElementById('ga-osrm-geom')?.checked || true;

        const btnRun = document.getElementById('btn-run-optimization');
        const progressContainer = document.getElementById('opt-progress-container');
        const progressBar = document.getElementById('opt-progress-bar');
        const progressText = document.getElementById('opt-progress-text');

        this.isOptimizing = true;
        btnRun.disabled = true;
        btnRun.innerHTML = `<span>⏳ Optimizing Tour...</span>`;
        if (progressContainer) progressContainer.style.display = 'block';

        // Animate simulated progress bar while algorithm runs
        let progress = 10;
        const interval = setInterval(() => {
            progress = Math.min(progress + 15, 90);
            if (progressBar) progressBar.style.width = `${progress}%`;
            if (progressText) progressText.innerText = `Simulating Natural Selection... Generation ${Math.floor((progress / 100) * generations)} of ${generations}`;
        }, 120);

        try {
            const res = await fetch('/api/optimize', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    population_size: popSize,
                    generations: generations,
                    mutation_rate: mutationRate,
                    crossover_rate: crossoverRate,
                    selection_method: selectionMethod,
                    crossover_method: crossoverMethod,
                    mutation_method: mutationMethod,
                    use_road_multiplier: useRoadMultiplier,
                    fetch_road_geometry: fetchRoadGeometry
                })
            });

            clearInterval(interval);
            if (progressBar) progressBar.style.width = '100%';
            if (progressText) progressText.innerText = 'Optimal Tour Converged!';

            const data = await res.json();
            if (data.success) {
                this.lastOptimizationResult = data;
                App.showToast(`Route optimized successfully! Distance saved: ${data.summary.distance_saved_km} km (${data.summary.improvement_percentage}%)`, "success");
                
                // Render results
                this.displayResults(data);
                
                // Refresh dashboard stats in background
                App.loadDashboardStats();
            } else {
                App.showToast(data.error || "Optimization failed", "error");
            }
        } catch (err) {
            clearInterval(interval);
            console.error(err);
            App.showToast("Server error during optimization execution", "error");
        } finally {
            this.isOptimizing = false;
            btnRun.disabled = false;
            btnRun.innerHTML = `<span>⚡ Run Genetic Optimization</span>`;
            setTimeout(() => {
                if (progressContainer) progressContainer.style.display = 'none';
                if (progressBar) progressBar.style.width = '0%';
            }, 800);
        }
    },

    displayResults: function(data) {
        const resultsContainer = document.getElementById('opt-results-section');
        if (resultsContainer) resultsContainer.style.display = 'block';

        const summary = data.summary;

        // Populate Comparison Metrics
        document.getElementById('metric-orig-dist').innerText = `${summary.original_distance_km.toFixed(2)} km`;
        document.getElementById('metric-opt-dist').innerText = `${summary.optimized_distance_km.toFixed(2)} km`;
        document.getElementById('metric-saved-dist').innerText = `-${summary.distance_saved_km.toFixed(2)} km`;
        document.getElementById('metric-improvement-pct').innerText = `${summary.improvement_percentage.toFixed(1)}%`;
        
        document.getElementById('metric-orig-time').innerText = `${summary.original_time_minutes} min`;
        document.getElementById('metric-opt-time').innerText = `${summary.optimized_time_minutes} min`;
        document.getElementById('metric-saved-time').innerText = `${summary.time_saved_minutes} min saved`;

        document.getElementById('metric-co2-saved').innerText = `${summary.co2_saved_kg} kg`;
        document.getElementById('metric-fuel-saved').innerText = `$${summary.fuel_saved_cost}`;
        document.getElementById('metric-runtime').innerText = `${summary.execution_time_seconds}s`;

        // Render Convergence Plot
        if (data.convergence_history && data.convergence_history.length > 0) {
            ChartsManager.renderConvergenceChart('chart-convergence', data.convergence_history);
        }

        // Render Comparison Bar Chart
        ChartsManager.renderComparisonChart(
            'chart-comparison',
            summary.original_distance_km,
            summary.optimized_distance_km,
            summary.original_time_minutes,
            summary.optimized_time_minutes
        );

        // Render Step-by-Step Waypoint Itinerary
        this.renderWaypointSequence(data.optimized_route);

        // Scroll smoothly to results
        resultsContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
    },

    renderWaypointSequence: function(stops) {
        const container = document.getElementById('opt-stops-list');
        if (!container) return;

        container.innerHTML = '';
        if (!stops || stops.length === 0) return;

        stops.forEach((stop, idx) => {
            const isDepot = stop.is_warehouse === 1;
            const item = document.createElement('div');
            item.className = 'stop-item-card';

            item.innerHTML = `
                <div class="stop-order-bubble ${isDepot ? 'depot' : ''}">
                    ${isDepot ? '🏢' : stop.stop_order}
                </div>
                <div class="stop-item-info">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <span class="stop-item-name">${stop.name}</span>
                        <span style="font-size: 0.76rem; font-weight: 700; color: ${isDepot ? '#fda4af' : '#67e8f9'};">
                            ${stop.distance_from_prev_km > 0 ? `+${stop.distance_from_prev_km.toFixed(2)} km` : 'Depot Start'}
                        </span>
                    </div>
                    <div class="stop-item-meta">
                        <span>👤 ${stop.customer_name || 'Dispatcher'}</span>
                        <span>⏱️ Arr: +${stop.estimated_arrival_minutes}m</span>
                        <span>📍 Cum: ${stop.cumulative_distance_km.toFixed(2)} km</span>
                    </div>
                    <div style="font-size: 0.72rem; color: #10b981; margin-top: 4px; font-weight: 600;">
                        ${stop.action || 'Stop'}
                    </div>
                </div>
            `;
            container.appendChild(item);
        });
    }
};
