/**
 * RouteGen - Reports & Export Module
 * Generates downloadable CSV exports and formatted academic PDF reports
 * Supports both Flask Backend API and Client-Side Export (GitHub Pages)
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
                this.exportSummaryCSV();
            });
        }
    },

    loadHistory: async function() {
        try {
            const res = await fetch('/api/optimize/history');
            if (res && res.ok) {
                const data = await res.json();
                if (data.success) {
                    this.optimizations = data.optimizations || [];
                    this.renderHistoryTable();
                    return;
                }
            }
        } catch (err) {}

        // Static mode fallback
        const list = StaticStorage.getOptimizations();
        this.optimizations = list.map(item => ({
            id: item.optimization_id,
            title: item.title,
            num_locations: item.summary.num_deliveries,
            original_distance_km: item.summary.original_distance_km,
            optimized_distance_km: item.summary.optimized_distance_km,
            distance_saved_km: item.summary.distance_saved_km,
            improvement_percentage: item.summary.improvement_percentage,
            time_saved_minutes: item.summary.time_saved_minutes,
            created_at: new Date(item.optimization_id).toLocaleDateString(),
            raw: item
        }));
        this.renderHistoryTable();
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
                            Map
                        </button>
                        <button class="btn btn-secondary btn-sm" onclick="ReportsManager.downloadCSV(${opt.id})" title="Download CSV">
                            CSV
                        </button>
                        <button class="btn btn-primary btn-sm" onclick="ReportsManager.downloadPDF(${opt.id})" title="Download PDF Report">
                            PDF
                        </button>
                    </div>
                </td>
            `;
            tbody.appendChild(tr);
        });
    },

    viewOptimization: async function(optId) {
        let optData = null;
        try {
            App.showToast("Loading route data...", "info");
            const res = await fetch(`/api/optimize/${optId}`);
            if (res && res.ok) {
                const data = await res.json();
                if (data.success) {
                    optData = data.optimization;
                }
            }
        } catch (err) {}

        if (!optData) {
            // Find in static storage
            const list = StaticStorage.getOptimizations();
            const found = list.find(x => x.optimization_id === optId);
            if (found) {
                optData = {
                    stops: found.optimized_route,
                    route_sequence: found.optimized_route
                };
            }
        }

        if (optData) {
            App.switchTab('map');
            const stops = optData.stops || optData.route_sequence || [];
            MapManager.renderOptimizedRoutes([], stops);
            App.showToast(`Showing Optimization #${optId} on Map`, "success");
        } else {
            App.showToast("Optimization details not found", "error");
        }
    },

    downloadCSV: async function(optId) {
        try {
            // Check if backend responds
            const res = await fetch(`/api/reports/csv/${optId}`);
            if (res && res.ok) {
                window.location.href = `/api/reports/csv/${optId}`;
                return;
            }
        } catch (err) {}

        // Static Client-side CSV generation
        const list = StaticStorage.getOptimizations();
        const found = list.find(x => x.optimization_id === optId);
        if (!found) {
            App.showToast("Report record not found for CSV export", "error");
            return;
        }

        let csv = "RouteGen Delivery Optimization Report\n";
        csv += `Optimization ID,${found.optimization_id}\n`;
        csv += `Title,"${found.title}"\n`;
        csv += `Stops,${found.summary.num_deliveries}\n`;
        csv += `Original Distance (km),${found.summary.original_distance_km}\n`;
        csv += `Optimized Distance (km),${found.summary.optimized_distance_km}\n`;
        csv += `Distance Saved (km),${found.summary.distance_saved_km}\n`;
        csv += `Improvement (%),${found.summary.improvement_percentage}%\n\n`;

        csv += "Stop Order,Location Name,Customer Name,Latitude,Longitude,Leg Distance (km),Cumulative Distance (km),Est. Arrival (min)\n";
        found.optimized_route.forEach(s => {
            csv += `${s.stop_order},"${s.name}","${s.customer_name || 'N/A'}",${s.latitude},${s.longitude},${s.distance_from_prev_km},${s.cumulative_distance_km},${s.estimated_arrival_minutes}\n`;
        });

        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = `RouteGen_Optimization_${optId}.csv`;
        link.click();
        App.showToast("CSV report downloaded", "success");
    },

    exportSummaryCSV: function() {
        const list = StaticStorage.getOptimizations();
        if (list.length === 0) {
            window.location.href = '/api/reports/summary-csv';
            return;
        }

        let csv = "ID,Title,Locations,Original Dist (km),Optimized Dist (km),Saved Dist (km),Improvement (%)\n";
        list.forEach(o => {
            csv += `${o.optimization_id},"${o.title}",${o.summary.num_deliveries},${o.summary.original_distance_km},${o.summary.optimized_distance_km},${o.summary.distance_saved_km},${o.summary.improvement_percentage}%\n`;
        });

        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = "RouteGen_Historical_Summary.csv";
        link.click();
        App.showToast("Summary CSV downloaded", "success");
    },

    downloadPDF: async function(optId) {
        try {
            App.showToast("Compiling PDF Dispatch Report...", "info");
            let opt = null;
            let stops = [];

            try {
                const res = await fetch(`/api/optimize/${optId}`);
                if (res && res.ok) {
                    const data = await res.json();
                    if (data.success) {
                        opt = data.optimization;
                        stops = opt.stops || [];
                    }
                }
            } catch (e) {}

            if (!opt) {
                const list = StaticStorage.getOptimizations();
                const found = list.find(x => x.optimization_id === optId);
                if (found) {
                    opt = {
                        id: found.optimization_id,
                        title: found.title,
                        created_at: new Date(found.optimization_id).toLocaleString(),
                        num_locations: found.summary.num_deliveries,
                        original_distance_km: found.summary.original_distance_km,
                        optimized_distance_km: found.summary.optimized_distance_km,
                        distance_saved_km: found.summary.distance_saved_km,
                        improvement_percentage: found.summary.improvement_percentage,
                        original_time_minutes: found.summary.original_time_minutes,
                        optimized_time_minutes: found.summary.optimized_time_minutes,
                        time_saved_minutes: found.summary.time_saved_minutes,
                        population_size: found.summary.parameters.population_size,
                        generations: found.summary.parameters.generations,
                        mutation_rate: found.summary.parameters.mutation_rate,
                        crossover_rate: found.summary.parameters.crossover_rate,
                        execution_time_seconds: found.summary.execution_time_seconds
                    };
                    stops = found.optimized_route || [];
                }
            }

            if (!opt) {
                App.showToast("Failed to fetch optimization data for PDF", "error");
                return;
            }

            const { jsPDF } = window.jspdf || {};
            if (!jsPDF) {
                App.showToast("PDF Engine loading. Please retry in a moment.", "warning");
                return;
            }

            const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });

            // 1. Header & Title Banner
            doc.setFillColor(15, 28, 50);
            doc.rect(0, 0, 595, 80, 'F');

            doc.setTextColor(255, 255, 255);
            doc.setFontSize(20);
            doc.setFont('helvetica', 'bold');
            doc.text("RouteGen - Delivery Route Optimization Report", 30, 42);

            doc.setFontSize(10);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(6, 182, 212);
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
                s.name || s.location_name,
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

            doc.save(`RouteGen_Optimization_Report_${optId}.pdf`);
            App.showToast("PDF report successfully generated!", "success");

        } catch (err) {
            console.error("PDF generation failed:", err);
            App.showToast("Failed to compile PDF report", "error");
        }
    }
};
