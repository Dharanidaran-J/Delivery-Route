/**
 * RouteGen - Client-Side Genetic Algorithm & Offline Storage Adapter
 * Enables RouteGen to run seamlessly on static hosts like GitHub Pages
 * without requiring a live Python Flask server.
 */

const GAClientEngine = {
    EARTH_RADIUS_KM: 6371.0,

    haversineDistance: function(lat1, lon1, lat2, lon2) {
        const toRad = x => (x * Math.PI) / 180.0;
        const phi1 = toRad(lat1);
        const phi2 = toRad(lat2);
        const deltaPhi = toRad(lat2 - lat1);
        const deltaLambda = toRad(lon2 - lon1);

        const a = Math.sin(deltaPhi / 2.0) ** 2 +
                  Math.cos(phi1) * Math.cos(phi2) * (Math.sin(deltaLambda / 2.0) ** 2);
        const c = 2.0 * Math.atan2(Math.sqrt(a), Math.sqrt(1.0 - a));
        return parseFloat((this.EARTH_RADIUS_KM * c).toFixed(4));
    },

    buildDistanceMatrix: function(locations, useRoadMultiplier = false) {
        const matrix = {};
        const multiplier = useRoadMultiplier ? 1.28 : 1.0;

        for (let i = 0; i < locations.length; i++) {
            const id1 = locations[i].id;
            matrix[id1] = {};
            for (let j = 0; j < locations.length; j++) {
                const id2 = locations[j].id;
                if (id1 === id2) {
                    matrix[id1][id2] = 0.0;
                } else if (matrix[id2] && matrix[id2][id1] !== undefined) {
                    matrix[id1][id2] = matrix[id2][id1];
                } else {
                    const dist = this.haversineDistance(
                        locations[i].latitude, locations[i].longitude,
                        locations[j].latitude, locations[j].longitude
                    ) * multiplier;
                    matrix[id1][id2] = parseFloat(dist.toFixed(4));
                }
            }
        }
        return matrix;
    },

    calculateDistance: function(chromosome, warehouseId, distanceMatrix) {
        if (!chromosome || chromosome.length === 0) return 0.0;
        let total = distanceMatrix[warehouseId][chromosome[0]];
        for (let i = 0; i < chromosome.length - 1; i++) {
            total += distanceMatrix[chromosome[i]][chromosome[i + 1]];
        }
        total += distanceMatrix[chromosome[chromosome.length - 1]][warehouseId];
        return parseFloat(total.toFixed(4));
    },

    createGreedyChromosome: function(deliveryIds, warehouseId, distanceMatrix) {
        if (!deliveryIds || deliveryIds.length === 0) return [];
        const unvisited = new Set(deliveryIds);
        let current = warehouseId;
        const tour = [];

        while (unvisited.size > 0) {
            let nearest = null;
            let minDist = Infinity;
            unvisited.forEach(locId => {
                const d = distanceMatrix[current][locId];
                if (d < minDist) {
                    minDist = d;
                    nearest = locId;
                }
            });
            tour.push(nearest);
            unvisited.delete(nearest);
            current = nearest;
        }
        return tour;
    },

    orderedCrossover: function(p1, p2) {
        const size = p1.length;
        if (size <= 2) return p1.slice();

        const idx1 = Math.floor(Math.random() * size);
        const idx2 = Math.floor(Math.random() * size);
        const [start, end] = [Math.min(idx1, idx2), Math.max(idx1, idx2)];

        const child = new Array(size).fill(null);
        for (let i = start; i <= end; i++) {
            child[i] = p1[i];
        }

        const childSet = new Set(child.filter(x => x !== null));
        const p2Remaining = p2.filter(gene => !childSet.has(gene));

        let fillIdx = 0;
        for (let i = 0; i < size; i++) {
            if (child[i] === null) {
                child[i] = p2Remaining[fillIdx++];
            }
        }
        return child;
    },

    mutate: function(chromosome, mutationRate, mutationMethod = 'inversion') {
        if (Math.random() > mutationRate || chromosome.length < 2) {
            return chromosome.slice();
        }

        const mutated = chromosome.slice();
        const size = mutated.length;
        const idx1 = Math.floor(Math.random() * size);
        const idx2 = Math.floor(Math.random() * size);
        const [start, end] = [Math.min(idx1, idx2), Math.max(idx1, idx2)];

        if (mutationMethod === 'swap' || size === 2) {
            const temp = mutated[idx1];
            mutated[idx1] = mutated[idx2];
            mutated[idx2] = temp;
        } else {
            // Inversion (2-opt)
            const sub = mutated.slice(start, end + 1).reverse();
            for (let i = 0; i < sub.length; i++) {
                mutated[start + i] = sub[i];
            }
        }
        return mutated;
    },

    run: function(warehouse, deliveries, options = {}) {
        const startTime = performance.now();
        const popSize = Math.max(10, options.population_size || 100);
        const generations = Math.max(10, options.generations || 150);
        const mutationRate = options.mutation_rate || 0.15;
        const crossoverRate = options.crossover_rate || 0.85;
        const elitismCount = Math.max(1, Math.min(options.elitism_count || 2, Math.floor(popSize / 2)));
        const mutationMethod = options.mutation_method || 'inversion';
        const useRoadMultiplier = !!options.use_road_multiplier;

        const allLocs = [warehouse, ...deliveries];
        const locationsMap = {};
        allLocs.forEach(l => locationsMap[l.id] = l);

        const distanceMatrix = this.buildDistanceMatrix(allLocs, useRoadMultiplier);
        const deliveryIds = deliveries.map(d => d.id);
        const numDeliveries = deliveryIds.length;

        // Original distance
        const originalChromosome = deliveryIds.slice();
        const originalDistance = this.calculateDistance(originalChromosome, warehouse.id, distanceMatrix);

        // Initial Population
        const population = [];
        if (numDeliveries > 2) {
            population.push(this.createGreedyChromosome(deliveryIds, warehouse.id, distanceMatrix));
        }

        while (population.length < popSize) {
            const chrom = deliveryIds.slice();
            // Shuffle
            for (let i = chrom.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [chrom[i], chrom[j]] = [chrom[j], chrom[i]];
            }
            population.push(chrom);
        }

        const convergenceHistory = [];
        let bestChromosome = null;
        let bestDistance = Infinity;

        // Evolution Loop
        let currentPop = population;
        for (let gen = 0; gen < generations; gen++) {
            const distances = currentPop.map(c => this.calculateDistance(c, warehouse.id, distanceMatrix));
            const fitnesses = distances.map(d => 1000.0 / Math.max(0.0001, d));

            const genBestDist = Math.min(...distances);
            const sumDist = distances.reduce((a, b) => a + b, 0);
            const genAvgDist = parseFloat((sumDist / distances.length).toFixed(4));
            const bestIdx = distances.indexOf(genBestDist);

            if (genBestDist < bestDistance) {
                bestDistance = genBestDist;
                bestChromosome = currentPop[bestIdx].slice();
            }

            if (gen % 2 === 0 || gen === generations - 1) {
                convergenceHistory.push({
                    generation: gen + 1,
                    best_distance: parseFloat(bestDistance.toFixed(4)),
                    avg_distance: genAvgDist
                });
            }

            // Elitism: Preserve top k
            const sortedIndices = fitnesses
                .map((f, i) => ({ f, i }))
                .sort((a, b) => b.f - a.f)
                .map(item => item.i);

            const nextPop = sortedIndices.slice(0, elitismCount).map(i => currentPop[i].slice());

            // Fill population
            while (nextPop.length < popSize) {
                // Tournament selection
                const selectParent = () => {
                    const k = Math.min(5, currentPop.length);
                    let bestPIdx = Math.floor(Math.random() * currentPop.length);
                    for (let t = 1; t < k; t++) {
                        const cand = Math.floor(Math.random() * currentPop.length);
                        if (fitnesses[cand] > fitnesses[bestPIdx]) {
                            bestPIdx = cand;
                        }
                    }
                    return currentPop[bestPIdx];
                };

                const p1 = selectParent();
                const p2 = selectParent();
                let child = (Math.random() <= crossoverRate) ? this.orderedCrossover(p1, p2) : p1.slice();
                child = this.mutate(child, mutationRate, mutationMethod);
                nextPop.push(child);
            }

            currentPop = nextPop;
        }

        const executionTimeSec = parseFloat(((performance.now() - startTime) / 1000.0).toFixed(4));
        const distanceSaved = parseFloat(Math.max(0, originalDistance - bestDistance).toFixed(4));
        const improvementPct = parseFloat(((distanceSaved / originalDistance) * 100.0).toFixed(1));

        const origTimeMin = parseFloat(((originalDistance / 35.0) * 60.0 + numDeliveries * 8.0).toFixed(1));
        const optTimeMin = parseFloat(((bestDistance / 35.0) * 60.0 + numDeliveries * 8.0).toFixed(1));
        const timeSavedMin = parseFloat(Math.max(0, origTimeMin - optTimeMin).toFixed(1));

        const co2SavedKg = parseFloat((distanceSaved * 0.192).toFixed(2));
        const fuelSavedCost = parseFloat((distanceSaved * 0.15).toFixed(2));

        // Build Stop-by-Stop Waypoint Sequence
        const orderedStops = [];
        let cumDist = 0.0;
        let cumTime = 0.0;
        let prevLoc = warehouse;

        // 1. Warehouse Start
        orderedStops.push({
            stop_order: 0,
            location_id: warehouse.id,
            name: warehouse.name,
            customer_name: warehouse.customer_name || 'Depot Dispatcher',
            customer_phone: warehouse.customer_phone || '',
            customer_address: warehouse.customer_address || '',
            latitude: warehouse.latitude,
            longitude: warehouse.longitude,
            is_warehouse: 1,
            distance_from_prev_km: 0.0,
            cumulative_distance_km: 0.0,
            estimated_arrival_minutes: 0.0,
            action: "START: Vehicle Loading & Departure"
        });

        // 2. Deliveries in optimized order
        bestChromosome.forEach((locId, idx) => {
            const loc = locationsMap[locId];
            const legDist = distanceMatrix[prevLoc.id][locId];
            cumDist += legDist;
            const legTime = (legDist / 35.0) * 60.0 + 8.0;
            cumTime += legTime;

            orderedStops.push({
                stop_order: idx + 1,
                location_id: loc.id,
                name: loc.name,
                customer_name: loc.customer_name || 'Customer',
                customer_phone: loc.customer_phone || '',
                customer_address: loc.customer_address || '',
                latitude: loc.latitude,
                longitude: loc.longitude,
                is_warehouse: 0,
                distance_from_prev_km: parseFloat(legDist.toFixed(4)),
                cumulative_distance_km: parseFloat(cumDist.toFixed(4)),
                estimated_arrival_minutes: parseFloat(cumTime.toFixed(1)),
                priority: loc.priority || 'Standard',
                notes: loc.notes || '',
                action: `DELIVER #${idx + 1}: Handover parcel`
            });
            prevLoc = loc;
        });

        // 3. Return to Warehouse
        const returnDist = distanceMatrix[prevLoc.id][warehouse.id];
        cumDist += returnDist;
        cumTime += (returnDist / 35.0) * 60.0;

        orderedStops.push({
            stop_order: orderedStops.length,
            location_id: warehouse.id,
            name: `${warehouse.name} (Return)`,
            customer_name: "Depot Dispatcher",
            customer_phone: warehouse.customer_phone || '',
            customer_address: warehouse.customer_address || '',
            latitude: warehouse.latitude,
            longitude: warehouse.longitude,
            is_warehouse: 1,
            distance_from_prev_km: parseFloat(returnDist.toFixed(4)),
            cumulative_distance_km: parseFloat(cumDist.toFixed(4)),
            estimated_arrival_minutes: parseFloat(cumTime.toFixed(1)),
            action: "END: Depot Check-in & End of Shift"
        });

        // Original Route for map comparison
        const originalOrderedStops = [];
        let origCurr = warehouse;
        originalOrderedStops.push({
            stop_order: 0,
            location_id: warehouse.id,
            latitude: warehouse.latitude,
            longitude: warehouse.longitude,
            name: warehouse.name
        });
        deliveryIds.forEach((locId, idx) => {
            const loc = locationsMap[locId];
            originalOrderedStops.push({
                stop_order: idx + 1,
                location_id: loc.id,
                latitude: loc.latitude,
                longitude: loc.longitude,
                name: loc.name
            });
            origCurr = loc;
        });
        originalOrderedStops.push({
            stop_order: originalOrderedStops.length,
            location_id: warehouse.id,
            latitude: warehouse.latitude,
            longitude: warehouse.longitude,
            name: `${warehouse.name} (Return)`
        });

        return {
            success: true,
            optimization_id: Date.now(),
            title: options.title || `Optimization - ${numDeliveries} Stops (Tamil Nadu Tour)`,
            summary: {
                num_deliveries: numDeliveries,
                original_distance_km: originalDistance,
                optimized_distance_km: bestDistance,
                distance_saved_km: distanceSaved,
                improvement_percentage: improvementPct,
                original_time_minutes: origTimeMin,
                optimized_time_minutes: optTimeMin,
                time_saved_minutes: timeSavedMin,
                fuel_saved_cost: fuelSavedCost,
                co2_saved_kg: co2SavedKg,
                execution_time_seconds: executionTimeSec,
                parameters: {
                    population_size: popSize,
                    generations: generations,
                    mutation_rate: mutationRate,
                    crossover_rate: crossoverRate,
                    elitism_count: elitismCount,
                    selection_method: options.selection_method || 'tournament',
                    crossover_method: options.crossover_method || 'ox',
                    mutation_method: mutationMethod
                }
            },
            convergence_history: convergenceHistory,
            optimized_route: orderedStops,
            original_route: originalOrderedStops,
            road_routing: null
        };
    }
};

/**
 * Client-Side LocalStorage Data Layer for Static Hosting (e.g. GitHub Pages)
 */
const StaticStorage = {
    TAMIL_NADU_SCENARIOS: {
        chennai: {
            title: "Chennai Metro Logistics Express",
            warehouse: {
                id: 101,
                name: "Chennai Central Distribution Hub - Koyambedu",
                customer_name: "RouteGen Tamil Nadu Logistics HQ",
                customer_phone: "+91 44 2479 0100",
                customer_address: "Koyambedu Wholesale Market Complex, Chennai, Tamil Nadu 600107",
                latitude: 13.0694,
                longitude: 80.1948,
                is_warehouse: 1,
                priority: "High",
                notes: "Main regional depot with multi-bay loading docks"
            },
            deliveries: [
                { id: 102, name: "Drop #1 - T. Nagar Commercial Hub", customer_name: "Pothys Traditional Wear & Silks", customer_phone: "+91 44 2431 0120", customer_address: "Usman Road, T. Nagar, Chennai, TN 600017", latitude: 13.0418, longitude: 80.2341, is_warehouse: 0, priority: "High" },
                { id: 103, name: "Drop #2 - Anna Nagar West Retail", customer_name: "VR Chennai Mall Logistics Bay", customer_phone: "+91 44 2621 0188", customer_address: "Jawaharlal Nehru Road, Anna Nagar West, Chennai, TN 600040", latitude: 13.0850, longitude: 80.2101, is_warehouse: 0, priority: "Standard" },
                { id: 104, name: "Drop #3 - Nungambakkam Corporate Center", customer_name: "Apex IT Towers & Business Park", customer_phone: "+91 44 2827 0210", customer_address: "Khader Nawaz Khan Rd, Nungambakkam, Chennai, TN 600034", latitude: 13.0604, longitude: 80.2437, is_warehouse: 0, priority: "Urgent" },
                { id: 105, name: "Drop #4 - George Town Wholesale Market", customer_name: "Parry's Hardware & Spices Wholesale", customer_phone: "+91 44 2534 0310", customer_address: "NSC Bose Road, George Town, Chennai, TN 600001", latitude: 13.0906, longitude: 80.2885, is_warehouse: 0, priority: "Standard" },
                { id: 106, name: "Drop #5 - Mylapore Heritage Corner", customer_name: "Kapaleeshwarar Artisan Crafts", customer_phone: "+91 44 2498 0255", customer_address: "Kutchery Road, Mylapore, Chennai, TN 600004", latitude: 13.0336, longitude: 80.2677, is_warehouse: 0, priority: "Standard" },
                { id: 107, name: "Drop #6 - Guindy Industrial Estate", customer_name: "Olympia Tech Park Logistics Desk", customer_phone: "+91 44 2235 0415", customer_address: "SIDCO Industrial Estate, Guindy, Chennai, TN 600032", latitude: 13.0102, longitude: 80.2120, is_warehouse: 0, priority: "High" },
                { id: 108, name: "Drop #7 - Adyar River View Plaza", customer_name: "Green Valley Organics Co-op", customer_phone: "+91 44 2441 0380", customer_address: "Sardar Patel Road, Adyar, Chennai, TN 600020", latitude: 13.0064, longitude: 80.2575, is_warehouse: 0, priority: "Standard" },
                { id: 109, name: "Drop #8 - Velachery Commercial Mall", customer_name: "Phoenix Marketcity Courier Hub", customer_phone: "+91 44 2244 0490", customer_address: "Velachery Main Road, Chennai, TN 600042", latitude: 12.9815, longitude: 80.2180, is_warehouse: 0, priority: "Standard" },
                { id: 110, name: "Drop #9 - OMR Tidel Park Corridor", customer_name: "Tidel Software Systems Ltd", customer_phone: "+91 44 2254 0530", customer_address: "Rajiv Gandhi Salai (OMR), Taramani, Chennai, TN 600113", latitude: 12.9897, longitude: 80.2473, is_warehouse: 0, priority: "Urgent" },
                { id: 111, name: "Drop #10 - Thoraipakkam IT Expressway", customer_name: "CloudSphere Technologies", customer_phone: "+91 44 2496 0610", customer_address: "200 Feet Radial Rd, Thoraipakkam, Chennai, TN 600097", latitude: 12.9416, longitude: 80.2362, is_warehouse: 0, priority: "Standard" },
                { id: 112, name: "Drop #11 - Porur Medical & Tech Hub", customer_name: "Sri Ramachandra Healthcare Supply", customer_phone: "+91 44 2476 0720", customer_address: "Mount Poonamallee Rd, Porur, Chennai, TN 600116", latitude: 13.0382, longitude: 80.1565, is_warehouse: 0, priority: "Urgent" },
                { id: 113, name: "Drop #12 - Ambattur Industrial Estate", customer_name: "Murugappa Group Ancillary Works", customer_phone: "+91 44 2625 0840", customer_address: "Ambattur Industrial Estate, Chennai, TN 600058", latitude: 13.1075, longitude: 80.1648, is_warehouse: 0, priority: "Standard" }
            ]
        },
        coimbatore: {
            title: "Coimbatore Industrial Corridor",
            warehouse: {
                id: 201,
                name: "Peelamedu Central Logistics Hub",
                customer_name: "RouteGen Kovai Dispatch",
                customer_phone: "+91 422 257 0101",
                customer_address: "Avinashi Road, Peelamedu, Coimbatore, TN 641004",
                latitude: 11.0267,
                longitude: 77.0028,
                is_warehouse: 1,
                priority: "High"
            },
            deliveries: [
                { id: 202, name: "Drop #1 - RS Puram Commercial Center", customer_name: "Kovai Silk House", latitude: 11.0089, longitude: 76.9507, is_warehouse: 0, priority: "High" },
                { id: 203, name: "Drop #2 - Gandhipuram Retail Market", customer_name: "Cross-Cut Trade Emporium", latitude: 11.0183, longitude: 76.9644, is_warehouse: 0, priority: "Standard" },
                { id: 204, name: "Drop #3 - Saibaba Colony Healthcare", customer_name: "Kongu Medico Distributors", latitude: 11.0284, longitude: 76.9427, is_warehouse: 0, priority: "Urgent" },
                { id: 205, name: "Drop #4 - Ganapathy Industrial Spares", customer_name: "Sharp Motor & Pump Ancillary", latitude: 11.0410, longitude: 76.9806, is_warehouse: 0, priority: "Standard" },
                { id: 206, name: "Drop #5 - Singanallur Machinery Depot", customer_name: "Premier Loom Equipment", latitude: 10.9992, longitude: 77.0267, is_warehouse: 0, priority: "Standard" },
                { id: 207, name: "Drop #6 - Saravanampatti IT Park", customer_name: "CHIL-SEZ Technology Center", latitude: 11.0805, longitude: 76.9958, is_warehouse: 0, priority: "Urgent" },
                { id: 208, name: "Drop #7 - Ukkadam Commercial Exchange", customer_name: "South Kovai Wholesale Traders", latitude: 10.9904, longitude: 76.9602, is_warehouse: 0, priority: "Standard" },
                { id: 209, name: "Drop #8 - Kuniyamuthur Distribution Node", customer_name: "Annamalai Agro Supplies", latitude: 10.9634, longitude: 76.9535, is_warehouse: 0, priority: "Standard" },
                { id: 210, name: "Drop #9 - Thudiyalur Engineering Works", customer_name: "Texcity Spares Corp", latitude: 11.0772, longitude: 76.9388, is_warehouse: 0, priority: "Standard" }
            ]
        },
        madurai: {
            title: "Madurai Heritage & Trade Express",
            warehouse: {
                id: 301,
                name: "Mattuthavani Logistics Depot",
                customer_name: "RouteGen Pandian Hub",
                customer_phone: "+91 452 258 0912",
                customer_address: "Melur Road, Mattuthavani, Madurai, TN 625007",
                latitude: 9.9405,
                longitude: 78.1568,
                is_warehouse: 1,
                priority: "High"
            },
            deliveries: [
                { id: 302, name: "Drop #1 - Simmakkal Wholesale Market", customer_name: "Meenakshi Spices", latitude: 9.9298, longitude: 78.1214, is_warehouse: 0, priority: "Standard" },
                { id: 303, name: "Drop #2 - Meenakshi Amman Temple Zone", customer_name: "Chithirai Silk House", latitude: 9.9195, longitude: 78.1193, is_warehouse: 0, priority: "High" },
                { id: 304, name: "Drop #3 - Goripalayam Healthcare Center", customer_name: "Vaigai Pharma Distribution", latitude: 9.9325, longitude: 78.1325, is_warehouse: 0, priority: "Urgent" },
                { id: 305, name: "Drop #4 - Anna Nagar Trade Complex", customer_name: "Supreme Textile Showroom", latitude: 9.9234, longitude: 78.1488, is_warehouse: 0, priority: "Standard" },
                { id: 306, name: "Drop #5 - K.K. Nagar Corporate Plaza", customer_name: "Madurai Infotech Systems", latitude: 9.9312, longitude: 78.1512, is_warehouse: 0, priority: "Standard" },
                { id: 307, name: "Drop #6 - Teppakulam Heritage Quarter", customer_name: "Vandiyur Crafts", latitude: 9.9125, longitude: 78.1534, is_warehouse: 0, priority: "Standard" },
                { id: 308, name: "Drop #7 - Villapuram Logistics Point", customer_name: "South Vaigai Transports", latitude: 9.9015, longitude: 78.1287, is_warehouse: 0, priority: "Standard" },
                { id: 309, name: "Drop #8 - Pasumalai Industrial Park", customer_name: "Madura Coats Technical Fibers", latitude: 9.8970, longitude: 78.0890, is_warehouse: 0, priority: "Urgent" }
            ]
        }
    },

    getLocations: function() {
        const stored = localStorage.getItem('routegen_locations');
        if (stored) {
            try { return JSON.parse(stored); } catch (e) {}
        }
        // Seed Chennai by default
        const ch = this.TAMIL_NADU_SCENARIOS.chennai;
        const initial = [ch.warehouse, ...ch.deliveries];
        this.saveLocations(initial);
        return initial;
    },

    saveLocations: function(locations) {
        localStorage.setItem('routegen_locations', JSON.stringify(locations));
    },

    getOptimizations: function() {
        const stored = localStorage.getItem('routegen_optimizations');
        if (stored) {
            try { return JSON.parse(stored); } catch (e) {}
        }
        return [];
    },

    saveOptimization: function(opt) {
        const list = this.getOptimizations();
        list.unshift(opt);
        localStorage.setItem('routegen_optimizations', JSON.stringify(list.slice(0, 30)));
    }
};
