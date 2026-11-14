/**
 * RouteGen - Reports & Export Module
 * Generates downloadable CSV exports and formatted academic PDF reports
 */

const ReportsManager = {
    optimizations: [],

    init: function() {
        this.bindEvents();
        this.loadHistory();
    },

    bindEvents: function() {
        const btnExportSummary = document.getElementById('btn-export-summary-csv');
        if (btnExportSummary) {
            btnExportSummary.addEventListener('click', () => {
                window.location.href = '/api/reports/summary-csv';
            });
        }
    },

    loadHistory: async function() {
        try {
            const res = await fetch('/api/optimize/history');
            const data = await res.json();
            if (data.success) {
                this.optimizations = data.optimizations || [];
                this.renderHistoryTable();
            }
        } catch (err) {
            console.error("Error loading history:", err);
        }
    },

    renderHistoryTable: function() {
        const tbody = document.getElementById('reports-table-body');
        const emptyState = document.getElementById('reports-empty-state');
        if (!tbody) return;

        tbody.innerHTML = '';

        if (!this.optimizations || this.optimizations.length === 0) {
            if (emptyState) emptyState.style.display = 'block';
            return;
        }

        if (emptyState) emptyState.style.display = 'none';

        this.optimizations.forEach(opt => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><span style="font-weight: 700; color: #06b6d4;">#${opt.id}</span></td>
                <td>
                    <div style="font-weight: 600; color: #fff;">${opt.title}</div>
                    <div style="font-size: 0.74rem; color: #64748b;">${opt.created_at}</div>
                </td>
                <td><span class="badge badge-standard">${opt.num_locations} Stops</span></td>
                <td><span style="color: #fda4af;">${opt.original_distance_km.toFixed(1)} km</span></td>
                <td><span style="color: #67e8f9; font-weight: 700;">${opt.optimized_distance_km.toFixed(1)} km</span></td>
                <td>
                    <span style="color: #10b981; font-weight: 700;">
                        -${opt.distance_saved_km.toFixed(1)} km (${opt.improvement_percentage.toFixed(1)}%)
                    </span>
                </td>
                <td><span style="color: #cbd5e1;">${opt.time_saved_minutes} min</span></td>
                <td>
                    <div style="display: flex; gap: 6px;">
                        <button class="btn btn-secondary btn-sm" onclick="ReportsManager.viewOptimization(${opt.id})" title="View on Map">
                            🗺️ Map
                        </button>
                        <button class="btn btn-secondary btn-sm" onclick="ReportsManager.downloadCSV(${opt.id})" title="Download CSV">
                            📥 CSV
                        </button>
                        <button class="btn btn-primary btn-sm" onclick="ReportsManager.downloadPDF(${opt.id})" title="Download PDF Report">
                            📄 PDF
                        </button>
                    </div>
                </td>
            `;
            tbody.appendChild(tr);
        });
    },

    viewOptimization: async function(optId) {
        try {
            App.showToast("Loading route data...", "info");
            const res = await fetch(`/api/optimize/${optId}`);
            const data = await res.json();
            if (data.success) {
                const opt = data.optimization;
                App.switchTab('map');
                
                // Construct stops for map rendering
                const stops = opt.stops || opt.route_sequence || [];
                MapManager.renderOptimizedRoutes([], stops);
                App.showToast(`Showing Optimization #${optId} on Map`, "success");
            }
        } catch (err) {
            App.showToast("Error loading optimization details", "error");
        }
    },

    downloadCSV: function(optId) {
        window.location.href = `/api/reports/csv/${optId}`;
    },

    downloadPDF: async function(optId) {
        try {
            App.showToast("Compiling PDF Dispatch Report...", "info");
            const res = await fetch(`/api/optimize/${optId}`);
            const data = await res.json();
            if (!data.success) {
                App.showToast("Failed to fetch optimization data for PDF", "error");
                return;
            }

            const opt = data.optimization;
            const stops = opt.stops || [];

            // Check if jsPDF is available
            const { jsPDF } = window.jspdf || {};
            if (!jsPDF) {
                App.showToast("PDF Engine loading. Please retry in a moment.", "warning");
                return;
            }

            const doc = new jsPDF({
                orientation: 'portrait',
                unit: 'pt',
                format: 'a4'
            });

            // 1. Header & Title Banner
            doc.setFillColor(15, 28, 50); // Navy Dark Banner
            doc.rect(0, 0, 595, 80, 'F');

            doc.setTextColor(255, 255, 255);
            doc.setFontSize(20);
            doc.setFont('helvetica', 'bold');
            doc.text("RouteGen – Delivery Route Optimization Report", 30, 42);

            doc.setFontSize(10);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(6, 182, 212); // Cyan accent
            doc.text("Powered by Genetic Algorithm (Traveling Salesperson Problem Engine)", 30, 60);

            // 2. Metadata Section
            doc.setTextColor(40, 40, 40);
            doc.setFontSize(11);
            doc.setFont('helvetica', 'bold');
            doc.text("Optimization Summary", 30, 110);

            doc.setFont('helvetica', 'normal');
            doc.setFontSize(9.5);
            doc.text(`Report ID: #${opt.id}`, 30, 128);
            doc.text(`Title: ${opt.title}`, 30, 142);
            doc.text(`Timestamp: ${opt.created_at}`, 30, 156);
            doc.text(`Delivery Stops: ${opt.num_locations} destinations`, 30, 170);

            doc.text(`GA Population Size: ${opt.population_size}`, 320, 128);
            doc.text(`GA Generations: ${opt.generations}`, 320, 142);
            doc.text(`Mutation Rate: ${opt.mutation_rate} | Crossover: ${opt.crossover_rate}`, 320, 156);
            doc.text(`Algorithm Runtime: ${opt.execution_time_seconds}s`, 320, 170);

            // 3. KPI Metrics Comparison Box
            doc.autoTable({
                startY: 185,
                margin: { left: 30, right: 30 },
                head: [['Optimization Metric', 'Original Sequence', 'GA Optimized Tour', 'Net Improvement']],
                body: [
                    ['Total Tour Distance', `${opt.original_distance_km.toFixed(2)} km`, `${opt.optimized_distance_km.toFixed(2)} km`, `-${opt.distance_saved_km.toFixed(2)} km (${opt.improvement_percentage.toFixed(1)}%)`],
                    ['Estimated Trip Duration', `${opt.original_time_minutes} minutes`, `${opt.optimized_time_minutes} minutes`, `-${opt.time_saved_minutes} minutes`],
                    ['Estimated Carbon Footprint', `${(opt.original_distance_km * 0.192).toFixed(2)} kg CO2`, `${(opt.optimized_distance_km * 0.192).toFixed(2)} kg CO2`, `-${(opt.distance_saved_km * 0.192).toFixed(2)} kg CO2 saved`],
                    ['Estimated Fuel Expense', `$${(opt.original_distance_km * 0.15).toFixed(2)}`, `$${(opt.optimized_distance_km * 0.15).toFixed(2)}`, `+$${(opt.distance_saved_km * 0.15).toFixed(2)} saved`]
                ],
                theme: 'striped',
                headStyles: { fillColor: [15, 28, 50], textColor: [255, 255, 255], fontStyle: 'bold' },
                styles: { fontSize: 9, cellPadding: 6 }
            });

            // 4. Turn-by-Turn Delivery Waypoint Table
            const finalY = doc.lastAutoTable.finalY + 25;
            doc.setFontSize(11);
            doc.setFont('helvetica', 'bold');
            doc.text("Optimized Delivery Sequence & Waypoint Itinerary", 30, finalY);

            const tableRows = stops.map(s => [
                s.stop_order === 0 ? 'START' : s.stop_order,
                s.location_name,
                s.customer_name || 'N/A',
                `${s.latitude.toFixed(4)}, ${s.longitude.toFixed(4)}`,
                `${s.distance_from_prev_km.toFixed(2)} km`,
                `${s.cumulative_distance_km.toFixed(2)} km`,
                `+${s.estimated_arrival_minutes} min`
            ]);

            doc.autoTable({
                startY: finalY + 10,
                margin: { left: 30, right: 30 },
                head: [['Stop #', 'Location Name', 'Customer', 'Coordinates', 'Leg Distance', 'Cumulative', 'Est. Arrival']],
                body: tableRows,
                theme: 'grid',
                headStyles: { fillColor: [6, 182, 212], textColor: [255, 255, 255], fontStyle: 'bold' },
                styles: { fontSize: 8.5, cellPadding: 5 }
            });

            // Footer
            const pageCount = doc.internal.getNumberOfPages();
            for (let i = 1; i <= pageCount; i++) {
                doc.setPage(i);
                doc.setFontSize(8);
                doc.setTextColor(120, 120, 120);
                doc.text(
                    `RouteGen Delivery Route Optimizer | Final-Year Project Demonstration | Page ${i} of ${pageCount}`,
                    30,
                    820
                );
            }

            // Save PDF
            doc.save(`RouteGen_Optimization_Report_${optId}.pdf`);
            App.showToast("PDF report successfully generated!", "success");

        } catch (err) {
            console.error("PDF generation failed:", err);
            App.showToast("Failed to compile PDF report", "error");
        }
    }
};
