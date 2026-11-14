import json
from flask import Blueprint, request, jsonify, session
from backend.auth import login_required
from database.db import query_db, execute_db
from algorithm.genetic_algorithm import GeneticAlgorithm
from algorithm.distance import try_fetch_osrm_road_route
from config import Config

optimizer_bp = Blueprint('optimizer', __name__, url_prefix='/api/optimize')

@optimizer_bp.route('', methods=['POST'])
@login_required
def run_optimization():
    user_id = session['user_id']
    data = request.get_json() or {}

    # 1. Fetch user's locations
    locations = query_db(
        "SELECT * FROM delivery_locations WHERE user_id = ? ORDER BY is_warehouse DESC, delivery_order ASC, id ASC",
        (user_id,)
    )
    if not locations:
        return jsonify({"success": False, "error": "No delivery locations found. Please add locations or load sample data."}), 400

    warehouse = next((dict(loc) for loc in locations if loc['is_warehouse'] == 1), None)
    if not warehouse:
        return jsonify({"success": False, "error": "No Warehouse depot designated! Please set one location as the Warehouse starting point."}), 400

    deliveries = [dict(loc) for loc in locations if loc['is_warehouse'] == 0]
    if len(deliveries) < 2:
        return jsonify({"success": False, "error": "Optimization requires at least 2 delivery destinations besides the Warehouse."}), 400

    # 2. Extract & validate parameters
    try:
        population_size = max(10, min(500, int(data.get('population_size', Config.DEFAULT_POP_SIZE))))
        generations = max(10, min(1000, int(data.get('generations', Config.DEFAULT_GENERATIONS))))
        mutation_rate = max(0.01, min(1.0, float(data.get('mutation_rate', Config.DEFAULT_MUTATION_RATE))))
        crossover_rate = max(0.1, min(1.0, float(data.get('crossover_rate', Config.DEFAULT_CROSSOVER_RATE))))
        elitism_count = max(1, min(10, int(data.get('elitism_count', Config.DEFAULT_ELITISM_COUNT))))
    except (ValueError, TypeError):
        return jsonify({"success": False, "error": "Invalid numerical algorithm configuration parameter."}), 400

    selection_method = data.get('selection_method', 'tournament')
    if selection_method not in ('tournament', 'roulette'):
        selection_method = 'tournament'

    crossover_method = data.get('crossover_method', 'ox')
    if crossover_method not in ('ox', 'pmx'):
        crossover_method = 'ox'

    mutation_method = data.get('mutation_method', 'inversion')
    if mutation_method not in ('inversion', 'swap', 'scramble'):
        mutation_method = 'inversion'

    use_road_multiplier = bool(data.get('use_road_multiplier', False))
    title = (data.get('title') or f"Optimization – {len(deliveries)} Stops ({selection_method.capitalize()} + {crossover_method.upper()})").strip()

    # 3. Instantiate and run Genetic Algorithm
    ga = GeneticAlgorithm(
        warehouse=warehouse,
        delivery_locations=deliveries,
        population_size=population_size,
        generations=generations,
        mutation_rate=mutation_rate,
        crossover_rate=crossover_rate,
        elitism_count=elitism_count,
        selection_method=selection_method,
        crossover_method=crossover_method,
        mutation_method=mutation_method,
        use_road_multiplier=use_road_multiplier
    )

    ga_result = ga.run()
    if not ga_result.get('success'):
        return jsonify({"success": False, "error": "Genetic Algorithm execution failed."}), 500

    summary = ga_result['summary']
    convergence_history = ga_result['convergence_history']
    optimized_route = ga_result['optimized_route']
    original_route = ga_result['original_route']

    # 4. Save to Database: route_optimizations
    opt_id, _ = execute_db(
        """INSERT INTO route_optimizations 
           (user_id, title, num_locations, population_size, generations, mutation_rate, crossover_rate,
            elitism_count, selection_method, crossover_method, mutation_method,
            original_distance_km, optimized_distance_km, distance_saved_km, improvement_percentage,
            original_time_minutes, optimized_time_minutes, time_saved_minutes, execution_time_seconds,
            warehouse_id, convergence_history, route_sequence)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
        (user_id, title, len(deliveries), population_size, generations, mutation_rate, crossover_rate,
         elitism_count, selection_method, crossover_method, mutation_method,
         summary['original_distance_km'], summary['optimized_distance_km'], summary['distance_saved_km'],
         summary['improvement_percentage'], summary['original_time_minutes'], summary['optimized_time_minutes'],
         summary['time_saved_minutes'], summary['execution_time_seconds'], warehouse['id'],
         json.dumps(convergence_history), json.dumps(optimized_route))
    )

    # 5. Save detailed stop-by-stop entries into route_history
    for stop in optimized_route:
        execute_db(
            """INSERT INTO route_history 
               (optimization_id, user_id, stop_order, location_id, location_name, customer_name,
                latitude, longitude, distance_from_prev_km, cumulative_distance_km, estimated_arrival_minutes)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (opt_id, user_id, stop['stop_order'], stop['location_id'], stop['name'],
             stop.get('customer_name', ''), stop['latitude'], stop['longitude'],
             stop['distance_from_prev_km'], stop['cumulative_distance_km'], stop['estimated_arrival_minutes'])
        )

    # 6. Optional: fetch real OSRM road geometry for the map if stops count is within reasonable limits
    road_routing_info = None
    if data.get('fetch_road_geometry', True) and len(optimized_route) <= 25:
        # Build coordinates list in [lon, lat] for OSRM
        osrm_coords = [[stop['longitude'], stop['latitude']] for stop in optimized_route]
        road_routing_info = try_fetch_osrm_road_route(osrm_coords)

    response_payload = {
        "success": True,
        "optimization_id": opt_id,
        "title": title,
        "summary": summary,
        "convergence_history": convergence_history,
        "optimized_route": optimized_route,
        "original_route": original_route,
        "road_routing": road_routing_info
    }

    return jsonify(response_payload), 200

@optimizer_bp.route('/history', methods=['GET'])
@login_required
def get_history():
    user_id = session['user_id']
    rows = query_db(
        """SELECT id, title, num_locations, population_size, generations, 
                  original_distance_km, optimized_distance_km, distance_saved_km, 
                  improvement_percentage, original_time_minutes, optimized_time_minutes, 
                  time_saved_minutes, execution_time_seconds, created_at 
           FROM route_optimizations 
           WHERE user_id = ? 
           ORDER BY created_at DESC""",
        (user_id,)
    )
    return jsonify({
        "success": True,
        "optimizations": [dict(r) for r in rows]
    })

@optimizer_bp.route('/<int:opt_id>', methods=['GET'])
@login_required
def get_optimization_detail(opt_id):
    user_id = session['user_id']
    row = query_db(
        "SELECT * FROM route_optimizations WHERE id = ? AND user_id = ?",
        (opt_id, user_id),
        one=True
    )
    if not row:
        return jsonify({"success": False, "error": "Optimization record not found."}), 404

    res = dict(row)
    if res.get('convergence_history'):
        try:
            res['convergence_history'] = json.loads(res['convergence_history'])
        except Exception:
            pass

    if res.get('route_sequence'):
        try:
            res['route_sequence'] = json.loads(res['route_sequence'])
        except Exception:
            pass

    # Fetch stop-by-stop history
    stops = query_db(
        """SELECT stop_order, location_id, location_name, customer_name, latitude, longitude,
                  distance_from_prev_km, cumulative_distance_km, estimated_arrival_minutes
           FROM route_history
           WHERE optimization_id = ?
           ORDER BY stop_order ASC""",
        (opt_id,)
    )
    res['stops'] = [dict(s) for s in stops]

    return jsonify({
        "success": True,
        "optimization": res
    })

@optimizer_bp.route('/<int:opt_id>', methods=['DELETE'])
@login_required
def delete_optimization(opt_id):
    user_id = session['user_id']
    rec = query_db("SELECT id FROM route_optimizations WHERE id = ? AND user_id = ?", (opt_id, user_id), one=True)
    if not rec:
        return jsonify({"success": False, "error": "Record not found."}), 404

    execute_db("DELETE FROM route_history WHERE optimization_id = ?", (opt_id,))
    execute_db("DELETE FROM route_optimizations WHERE id = ?", (opt_id,))

    return jsonify({"success": True, "message": "Optimization record deleted successfully."})
