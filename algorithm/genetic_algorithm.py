import random
import time
from config import Config
from algorithm.distance import (
    haversine_distance, 
    build_distance_matrix, 
    calculate_route_distance,
    estimate_travel_time_minutes,
    calculate_eco_metrics
)

class GeneticAlgorithm:
    """
    Genetic Algorithm implementation for the Traveling Salesperson Problem (TSP)
    specifically tailored for Last-Mile Delivery Route Optimization.
    """
    
    def __init__(self, warehouse, delivery_locations, 
                 population_size=100, 
                 generations=150, 
                 mutation_rate=0.15, 
                 crossover_rate=0.85, 
                 elitism_count=2,
                 selection_method='tournament',
                 crossover_method='ox',
                 mutation_method='inversion',
                 use_road_multiplier=False):
        """
        warehouse: dict containing depot info (id, name, lat, lon)
        delivery_locations: list of dicts for delivery points
        population_size: number of chromosomes per generation
        generations: total iteration cycles
        mutation_rate: probability of mutating an offspring (0.0 - 1.0)
        crossover_rate: probability of performing crossover (0.0 - 1.0)
        elitism_count: number of elite chromosomes preserved directly
        selection_method: 'tournament' or 'roulette'
        crossover_method: 'ox' (Ordered Crossover) or 'pmx' (Partially Mapped)
        mutation_method: 'inversion' (2-opt) or 'swap' or 'scramble'
        """
        self.warehouse = warehouse
        self.deliveries = delivery_locations
        self.pop_size = max(10, int(population_size))
        self.generations = max(10, int(generations))
        self.mutation_rate = float(mutation_rate)
        self.crossover_rate = float(crossover_rate)
        self.elitism_count = max(1, min(int(elitism_count), self.pop_size // 2))
        self.selection_method = selection_method
        self.crossover_method = crossover_method
        self.mutation_method = mutation_method
        
        # Build lookup table and distance matrix
        self.locations_map = {loc['id']: loc for loc in self.deliveries}
        self.locations_map[self.warehouse['id']] = self.warehouse
        
        all_locs = [self.warehouse] + self.deliveries
        self.distance_matrix = build_distance_matrix(all_locs, use_road_multiplier=use_road_multiplier)
        
        self.delivery_ids = [loc['id'] for loc in self.deliveries]
        self.num_deliveries = len(self.delivery_ids)
        
    def _create_greedy_chromosome(self):
        """Generates a nearest-neighbor heuristic chromosome to seed high initial fitness."""
        if not self.delivery_ids:
            return []
        unvisited = set(self.delivery_ids)
        current = self.warehouse['id']
        tour = []
        
        while unvisited:
            nearest = min(unvisited, key=lambda loc_id: self.distance_matrix[current][loc_id])
            tour.append(nearest)
            unvisited.remove(nearest)
            current = nearest
        return tour

    def initialize_population(self):
        """
        Generates the initial population of permutation chromosomes.
        Includes 1 greedy nearest-neighbor seed + random permutations.
        """
        population = []
        
        # Seed with nearest neighbor if more than 2 deliveries
        if self.num_deliveries > 2:
            greedy_chrom = self._create_greedy_chromosome()
            population.append(greedy_chrom)
            
        while len(population) < self.pop_size:
            chrom = self.delivery_ids[:]
            random.shuffle(chrom)
            population.append(chrom)
            
        return population

    def calculate_distance(self, chromosome):
        """
        Computes the full round-trip route distance for a chromosome:
        Warehouse -> Stop 1 -> Stop 2 -> ... -> Stop N -> Warehouse.
        """
        if not chromosome:
            return 0.0
        
        w_id = self.warehouse['id']
        total = self.distance_matrix[w_id][chromosome[0]]
        
        for i in range(len(chromosome) - 1):
            total += self.distance_matrix[chromosome[i]][chromosome[i + 1]]
            
        total += self.distance_matrix[chromosome[-1]][w_id]
        return round(total, 4)

    def fitness(self, chromosome):
        """
        Fitness function: Inversely proportional to total travel distance.
        Shorter distance yields significantly higher fitness.
        """
        dist = self.calculate_distance(chromosome)
        if dist <= 0.0001:
            return 100000.0
        return 1000.0 / dist

    def select_parent(self, population, fitnesses):
        """Selection operator: Tournament selection or Roulette wheel selection."""
        if self.selection_method == 'roulette':
            total_fitness = sum(fitnesses)
            if total_fitness <= 0:
                return random.choice(population)
            pick = random.uniform(0, total_fitness)
            current = 0.0
            for chrom, fit in zip(population, fitnesses):
                current += fit
                if current >= pick:
                    return chrom
            return population[-1]
        else:
            # Tournament selection (default k=5)
            k = min(5, len(population))
            tournament_indices = random.sample(range(len(population)), k)
            best_idx = max(tournament_indices, key=lambda idx: fitnesses[idx])
            return population[best_idx]

    def ordered_crossover(self, parent1, parent2):
        """
        Ordered Crossover (OX): Preserves relative order of genes without duplicates.
        A random slice from Parent 1 is copied, and remaining slots are filled from Parent 2.
        """
        size = len(parent1)
        if size <= 2:
            return parent1[:]
            
        start, end = sorted(random.sample(range(size), 2))
        
        child = [None] * size
        child[start:end+1] = parent1[start:end+1]
        
        child_set = set(child[start:end+1])
        p2_remaining = [gene for gene in parent2 if gene not in child_set]
        
        fill_idx = 0
        for i in range(size):
            if child[i] is None:
                child[i] = p2_remaining[fill_idx]
                fill_idx += 1
                
        return child

    def partially_mapped_crossover(self, parent1, parent2):
        """
        Partially Mapped Crossover (PMX): Creates offspring by respecting gene positions
        and building a mapping relationship between the two parents.
        """
        size = len(parent1)
        if size <= 2:
            return parent1[:]
            
        start, end = sorted(random.sample(range(size), 2))
        child = [None] * size
        child[start:end+1] = parent1[start:end+1]
        
        for i in range(start, end + 1):
            val = parent2[i]
            if val not in child:
                pos = i
                while start <= pos <= end:
                    val_in_p1 = parent1[pos]
                    pos = parent2.index(val_in_p1)
                child[pos] = val
                
        for i in range(size):
            if child[i] is None:
                child[i] = parent2[i]
                
        return child

    def crossover(self, parent1, parent2):
        """Performs crossover based on selected operator."""
        if random.random() > self.crossover_rate:
            return parent1[:]
            
        if self.crossover_method == 'pmx':
            return self.partially_mapped_crossover(parent1, parent2)
        else:
            return self.ordered_crossover(parent1, parent2)

    def mutate(self, chromosome):
        """
        Mutation operator:
        - Inversion (2-opt reversal): highly effective for spatial TSP
        - Swap: swaps two random stops
        - Scramble: shuffles a random sub-segment
        """
        if random.random() > self.mutation_rate or len(chromosome) < 2:
            return chromosome
            
        mutated = chromosome[:]
        size = len(mutated)
        
        if self.mutation_method == 'swap' or size == 2:
            idx1, idx2 = random.sample(range(size), 2)
            mutated[idx1], mutated[idx2] = mutated[idx2], mutated[idx1]
        elif self.mutation_method == 'scramble':
            idx1, idx2 = sorted(random.sample(range(size), 2))
            sub = mutated[idx1:idx2+1]
            random.shuffle(sub)
            mutated[idx1:idx2+1] = sub
        else:
            # Inversion / 2-Opt (Default)
            idx1, idx2 = sorted(random.sample(range(size), 2))
            mutated[idx1:idx2+1] = reversed(mutated[idx1:idx2+1])
            
        return mutated

    def run(self):
        """
        Executes the Genetic Algorithm and returns complete convergence telemetry,
        best route sequence, comparison metrics, and execution runtime.
        """
        start_time = time.time()
        
        # If fewer than 2 stops, optimization is trivial
        if self.num_deliveries <= 1:
            best_route = self.delivery_ids[:]
            dist = self.calculate_distance(best_route)
            original_dist = dist
            return self._build_results(best_route, original_dist, dist, [{
                "generation": 0, "best_distance": dist, "avg_distance": dist
            }], time.time() - start_time)

        # 1. Original route (as entered by the user)
        original_chromosome = self.delivery_ids[:]
        original_distance = self.calculate_distance(original_chromosome)
        
        # 2. Initial Population
        population = self.initialize_population()
        
        convergence_history = []
        best_chromosome = None
        best_distance = float('inf')
        
        # Evolution Loop
        for gen in range(self.generations):
            # Calculate fitness for all chromosomes
            distances = [self.calculate_distance(ind) for ind in population]
            fitnesses = [1000.0 / max(0.0001, d) for d in distances]
            
            gen_best_dist = min(distances)
            gen_avg_dist = round(sum(distances) / len(distances), 4)
            best_idx = distances.index(gen_best_dist)
            
            if gen_best_dist < best_distance:
                best_distance = gen_best_dist
                best_chromosome = population[best_idx][:]
                
            # Log telemetry every 2 generations (and first/last)
            if gen % 2 == 0 or gen == self.generations - 1:
                convergence_history.append({
                    "generation": gen + 1,
                    "best_distance": round(best_distance, 4),
                    "avg_distance": gen_avg_dist
                })
                
            # Elitism: Sort and preserve top k best individuals
            sorted_indices = sorted(range(len(population)), key=lambda i: fitnesses[i], reverse=True)
            next_population = [population[i][:] for i in sorted_indices[:self.elitism_count]]
            
            # Fill the rest of the new generation
            while len(next_population) < self.pop_size:
                parent1 = self.select_parent(population, fitnesses)
                parent2 = self.select_parent(population, fitnesses)
                child = self.crossover(parent1, parent2)
                child = self.mutate(child)
                next_population.append(child)
                
            population = next_population

        execution_time = round(time.time() - start_time, 4)
        return self._build_results(best_chromosome, original_distance, best_distance, convergence_history, execution_time)

    def _build_results(self, best_chromosome, original_distance, best_distance, convergence_history, execution_time):
        """Constructs detailed dictionary containing all comparison and sequence data."""
        distance_saved = round(max(0.0, original_distance - best_distance), 4)
        improvement_pct = round((distance_saved / original_distance * 100.0) if original_distance > 0 else 0.0, 2)
        
        orig_time_min = estimate_travel_time_minutes(original_distance, self.num_deliveries)
        opt_time_min = estimate_travel_time_minutes(best_distance, self.num_deliveries)
        time_saved_min = round(max(0.0, orig_time_min - opt_time_min), 1)
        
        orig_eco = calculate_eco_metrics(original_distance)
        opt_eco = calculate_eco_metrics(best_distance)
        fuel_saved = round(max(0.0, orig_eco['fuel_cost_est'] - opt_eco['fuel_cost_est']), 2)
        co2_saved = round(max(0.0, orig_eco['co2_emissions_kg'] - opt_eco['co2_emissions_kg']), 2)
        
        # Build structured ordered sequence with step-by-step distances
        ordered_stops = []
        w_id = self.warehouse['id']
        current_loc = self.warehouse
        cum_dist = 0.0
        cum_time = 0.0
        
        # 1. Starting at Warehouse
        ordered_stops.append({
            "stop_order": 0,
            "location_id": self.warehouse['id'],
            "name": self.warehouse['name'],
            "customer_name": self.warehouse.get('customer_name', 'Depot Dispatcher'),
            "customer_phone": self.warehouse.get('customer_phone', ''),
            "customer_address": self.warehouse.get('customer_address', ''),
            "latitude": self.warehouse['latitude'],
            "longitude": self.warehouse['longitude'],
            "is_warehouse": 1,
            "distance_from_prev_km": 0.0,
            "cumulative_distance_km": 0.0,
            "estimated_arrival_minutes": 0.0,
            "action": "START: Vehicle Loading & Departure"
        })
        
        # 2. Optimized Delivery Sequence
        for order_idx, loc_id in enumerate(best_chromosome, start=1):
            loc = self.locations_map[loc_id]
            leg_dist = self.distance_matrix[current_loc['id']][loc_id]
            cum_dist += leg_dist
            leg_time = (leg_dist / Config.DEFAULT_SPEED_KMH) * 60.0 + Config.STOP_SERVICE_TIME_MIN
            cum_time += leg_time
            
            ordered_stops.append({
                "stop_order": order_idx,
                "location_id": loc['id'],
                "name": loc['name'],
                "customer_name": loc.get('customer_name', 'Customer'),
                "customer_phone": loc.get('customer_phone', ''),
                "customer_address": loc.get('customer_address', ''),
                "latitude": loc['latitude'],
                "longitude": loc['longitude'],
                "is_warehouse": 0,
                "distance_from_prev_km": round(leg_dist, 4),
                "cumulative_distance_km": round(cum_dist, 4),
                "estimated_arrival_minutes": round(cum_time, 1),
                "priority": loc.get('priority', 'Standard'),
                "notes": loc.get('notes', ''),
                "action": f"DELIVER #{order_idx}: Handover parcel"
            })
            current_loc = loc
            
        # 3. Return to Warehouse
        return_dist = self.distance_matrix[current_loc['id']][w_id]
        cum_dist += return_dist
        cum_time += (return_dist / Config.DEFAULT_SPEED_KMH) * 60.0
        
        ordered_stops.append({
            "stop_order": len(ordered_stops),
            "location_id": self.warehouse['id'],
            "name": f"{self.warehouse['name']} (Return)",
            "customer_name": "Depot Dispatcher",
            "customer_phone": self.warehouse.get('customer_phone', ''),
            "customer_address": self.warehouse.get('customer_address', ''),
            "latitude": self.warehouse['latitude'],
            "longitude": self.warehouse['longitude'],
            "is_warehouse": 1,
            "distance_from_prev_km": round(return_dist, 4),
            "cumulative_distance_km": round(cum_dist, 4),
            "estimated_arrival_minutes": round(cum_time, 1),
            "action": "END: Depot Check-in & End of Shift"
        })
        
        # Build original sequence for map comparison
        original_ordered_stops = []
        orig_cum = 0.0
        orig_curr = self.warehouse
        original_ordered_stops.append({
            "stop_order": 0,
            "location_id": self.warehouse['id'],
            "latitude": self.warehouse['latitude'],
            "longitude": self.warehouse['longitude'],
            "name": self.warehouse['name']
        })
        for orig_idx, loc_id in enumerate(self.delivery_ids, start=1):
            loc = self.locations_map[loc_id]
            leg_dist = self.distance_matrix[orig_curr['id']][loc_id]
            orig_cum += leg_dist
            original_ordered_stops.append({
                "stop_order": orig_idx,
                "location_id": loc['id'],
                "latitude": loc['latitude'],
                "longitude": loc['longitude'],
                "name": loc['name']
            })
            orig_curr = loc
        original_ordered_stops.append({
            "stop_order": len(original_ordered_stops),
            "location_id": self.warehouse['id'],
            "latitude": self.warehouse['latitude'],
            "longitude": self.warehouse['longitude'],
            "name": f"{self.warehouse['name']} (Return)"
        })

        return {
            "success": True,
            "summary": {
                "num_deliveries": self.num_deliveries,
                "original_distance_km": round(original_distance, 4),
                "optimized_distance_km": round(best_distance, 4),
                "distance_saved_km": distance_saved,
                "improvement_percentage": improvement_pct,
                "original_time_minutes": orig_time_min,
                "optimized_time_minutes": opt_time_min,
                "time_saved_minutes": time_saved_min,
                "fuel_saved_cost": fuel_saved,
                "co2_saved_kg": co2_saved,
                "execution_time_seconds": execution_time,
                "parameters": {
                    "population_size": self.pop_size,
                    "generations": self.generations,
                    "mutation_rate": self.mutation_rate,
                    "crossover_rate": self.crossover_rate,
                    "elitism_count": self.elitism_count,
                    "selection_method": self.selection_method,
                    "crossover_method": self.crossover_method,
                    "mutation_method": self.mutation_method
                }
            },
            "convergence_history": convergence_history,
            "optimized_route": ordered_stops,
            "original_route": original_ordered_stops
        }
