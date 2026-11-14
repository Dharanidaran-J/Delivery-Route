/**
 * RouteGen - Charts Manager (Chart.js)
 * Manages Convergence Curve, Comparison Bar Chart, and Dashboard Analytics
 */

const ChartsManager = {
    convergenceChart: null,
    comparisonChart: null,
    dashboardTrendChart: null,

    // Initialize or update the Genetic Algorithm Convergence Chart
    renderConvergenceChart: function(canvasId, convergenceHistory) {
        const ctx = document.getElementById(canvasId);
        if (!ctx) return;

        if (this.convergenceChart) {
            this.convergenceChart.destroy();
        }

        const labels = convergenceHistory.map(item => `Gen ${item.generation}`);
        const bestDistances = convergenceHistory.map(item => item.best_distance);
        const avgDistances = convergenceHistory.map(item => item.avg_distance);

        this.convergenceChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'Best Route Distance (km)',
                        data: bestDistances,
                        borderColor: '#06b6d4',
                        backgroundColor: 'rgba(6, 182, 212, 0.1)',
                        borderWidth: 2.5,
                        fill: true,
                        tension: 0.25,
                        pointRadius: convergenceHistory.length > 50 ? 1 : 3,
                        pointHoverRadius: 6,
                        pointBackgroundColor: '#06b6d4'
                    },
                    {
                        label: 'Population Average Distance (km)',
                        data: avgDistances,
                        borderColor: '#818cf8',
                        borderDash: [5, 5],
                        borderWidth: 1.8,
                        fill: false,
                        tension: 0.2,
                        pointRadius: 0,
                        pointHoverRadius: 4,
                        pointBackgroundColor: '#818cf8'
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: {
                    mode: 'index',
                    intersect: false
                },
                plugins: {
                    legend: {
                        position: 'top',
                        labels: {
                            color: '#94a3b8',
                            font: { family: 'Inter', size: 12, weight: 600 }
                        }
                    },
                    tooltip: {
                        backgroundColor: '#0f172a',
                        titleColor: '#f1f5f9',
                        bodyColor: '#cbd5e1',
                        borderColor: 'rgba(255, 255, 255, 0.1)',
                        borderWidth: 1,
                        padding: 12,
                        boxPadding: 6,
                        usePointStyle: true
                    }
                },
                scales: {
                    x: {
                        grid: { color: 'rgba(255, 255, 255, 0.05)' },
                        ticks: { color: '#64748b', maxTicksLimit: 12 }
                    },
                    y: {
                        grid: { color: 'rgba(255, 255, 255, 0.05)' },
                        ticks: { 
                            color: '#64748b',
                            callback: function(val) { return val + ' km'; }
                        },
                        title: {
                            display: true,
                            text: 'Total Round-Trip Distance (km)',
                            color: '#94a3b8',
                            font: { size: 11, weight: 600 }
                        }
                    }
                }
            }
        });
    },

    // Initialize or update the Route Comparison Bar Chart
    renderComparisonChart: function(canvasId, originalDist, optimizedDist, originalTime, optimizedTime) {
        const ctx = document.getElementById(canvasId);
        if (!ctx) return;

        if (this.comparisonChart) {
            this.comparisonChart.destroy();
        }

        this.comparisonChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: ['Total Distance (km)', 'Est. Duration (min)'],
                datasets: [
                    {
                        label: 'Original Sequence',
                        data: [originalDist, originalTime],
                        backgroundColor: 'rgba(244, 63, 94, 0.75)',
                        borderColor: '#f43f5e',
                        borderWidth: 1,
                        borderRadius: 6
                    },
                    {
                        label: 'GA Optimized Route',
                        data: [optimizedDist, optimizedTime],
                        backgroundColor: 'rgba(16, 185, 129, 0.85)',
                        borderColor: '#10b981',
                        borderWidth: 1,
                        borderRadius: 6
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'top',
                        labels: {
                            color: '#94a3b8',
                            font: { family: 'Inter', size: 12, weight: 600 }
                        }
                    },
                    tooltip: {
                        backgroundColor: '#0f172a',
                        titleColor: '#f1f5f9',
                        bodyColor: '#cbd5e1',
                        borderColor: 'rgba(255, 255, 255, 0.1)',
                        borderWidth: 1,
                        padding: 12
                    }
                },
                scales: {
                    x: {
                        grid: { display: false },
                        ticks: { color: '#94a3b8', font: { weight: 600 } }
                    },
                    y: {
                        grid: { color: 'rgba(255, 255, 255, 0.05)' },
                        ticks: { color: '#64748b' },
                        beginAtZero: true
                    }
                }
            }
        });
    },

    // Dashboard Historical Trend Chart
    renderDashboardTrendChart: function(canvasId, chartData) {
        const ctx = document.getElementById(canvasId);
        if (!ctx) return;

        if (this.dashboardTrendChart) {
            this.dashboardTrendChart.destroy();
        }

        if (!chartData || !chartData.labels || chartData.labels.length === 0) {
            return;
        }

        this.dashboardTrendChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: chartData.labels,
                datasets: [
                    {
                        type: 'bar',
                        label: 'Distance Saved (km)',
                        data: chartData.distance_saved,
                        backgroundColor: 'rgba(6, 182, 212, 0.75)',
                        borderRadius: 6,
                        yAxisID: 'y'
                    },
                    {
                        type: 'line',
                        label: 'Improvement (%)',
                        data: chartData.improvement_percentages,
                        borderColor: '#10b981',
                        borderWidth: 2.5,
                        pointBackgroundColor: '#10b981',
                        tension: 0.3,
                        yAxisID: 'y1'
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'top',
                        labels: { color: '#94a3b8', font: { family: 'Inter', size: 12 } }
                    },
                    tooltip: {
                        backgroundColor: '#0f172a',
                        borderColor: 'rgba(255, 255, 255, 0.1)',
                        borderWidth: 1
                    }
                },
                scales: {
                    x: {
                        grid: { display: false },
                        ticks: { color: '#64748b' }
                    },
                    y: {
                        type: 'linear',
                        display: true,
                        position: 'left',
                        grid: { color: 'rgba(255, 255, 255, 0.05)' },
                        ticks: { 
                            color: '#64748b',
                            callback: function(val) { return val + ' km'; }
                        }
                    },
                    y1: {
                        type: 'linear',
                        display: true,
                        position: 'right',
                        grid: { drawOnChartArea: false },
                        ticks: { 
                            color: '#10b981',
                            callback: function(val) { return val + '%'; }
                        }
                    }
                }
            }
        });
    }
};
