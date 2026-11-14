from flask import Blueprint, jsonify, session
from backend.auth import login_required
from database.db import query_db

dashboard_bp = Blueprint('dashboard', __name__, url_prefix='/api/dashboard')

@dashboard_bp.route('/stats', methods=['GET'])
@login_required
def get_dashboard_stats():
    user_id = session['user_id']

    # 1. Total deliveries managed
    loc_count_row = query_db(
        "SELECT COUNT(*) as count FROM delivery_locations WHERE user_id = ? AND is_warehouse = 0",
        (user_id,),
        one=True
    )
    total_deliveries = loc_count_row['count'] if loc_count_row else 0

    # 2. Aggregations from route_optimizations
    agg_row = query_db(
        """SELECT 
               COUNT(*) as total_optimizations,
               COALESCE(SUM(optimized_distance_km), 0.0) as total_distance_travelled,
               COALESCE(SUM(original_distance_km), 0.0) as total_original_distance,
               COALESCE(SUM(distance_saved_km), 0.0) as total_distance_saved,
               COALESCE(AVG(improvement_percentage), 0.0) as avg_improvement_pct,
               COALESCE(SUM(time_saved_minutes), 0.0) as total_time_saved_min
           FROM route_optimizations 
           WHERE user_id = ?""",
        (user_id,),
        one=True
    )

    total_optimizations = agg_row['total_optimizations'] if agg_row else 0
    total_distance_travelled = round(agg_row['total_distance_travelled'], 2) if agg_row else 0.0
    total_original_distance = round(agg_row['total_original_distance'], 2) if agg_row else 0.0
    total_distance_saved = round(agg_row['total_distance_saved'], 2) if agg_row else 0.0
    avg_improvement_pct = round(agg_row['avg_improvement_pct'], 1) if agg_row else 0.0
    total_time_saved_min = round(agg_row['total_time_saved_min'], 1) if agg_row else 0.0

    # Eco savings (based on distance saved)
    co2_saved_kg = round(total_distance_saved * 0.192, 2)
    fuel_saved_cost = round(total_distance_saved * 0.15, 2)

    # 3. Recent 5 optimizations
    recent_rows = query_db(
        """SELECT id, title, num_locations, original_distance_km, optimized_distance_km, 
                  distance_saved_km, improvement_percentage, execution_time_seconds, created_at 
           FROM route_optimizations 
           WHERE user_id = ? 
           ORDER BY created_at DESC 
           LIMIT 5""",
        (user_id,)
    )
    recent_optimizations = [dict(r) for r in recent_rows]

    # 4. Chart trend data (last 7 optimizations)
    chart_rows = query_db(
        """SELECT id, title, original_distance_km, optimized_distance_km, distance_saved_km, improvement_percentage, created_at
           FROM route_optimizations 
           WHERE user_id = ? 
           ORDER BY created_at ASC 
           LIMIT 10""",
        (user_id,)
    )
    chart_data = {
        "labels": [f"Run #{r['id']}" for r in chart_rows],
        "original_distances": [round(r['original_distance_km'], 1) for r in chart_rows],
        "optimized_distances": [round(r['optimized_distance_km'], 1) for r in chart_rows],
        "distance_saved": [round(r['distance_saved_km'], 1) for r in chart_rows],
        "improvement_percentages": [round(r['improvement_percentage'], 1) for r in chart_rows]
    }

    return jsonify({
        "success": True,
        "stats": {
            "total_deliveries": total_deliveries,
            "total_distance_travelled_km": total_distance_travelled,
            "total_original_distance_km": total_original_distance,
            "total_optimizations": total_optimizations,
            "total_distance_saved_km": total_distance_saved,
            "avg_improvement_pct": avg_improvement_pct,
            "total_time_saved_min": total_time_saved_min,
            "co2_saved_kg": co2_saved_kg,
            "fuel_saved_cost": fuel_saved_cost
        },
        "recent_optimizations": recent_optimizations,
        "chart_data": chart_data
    })
