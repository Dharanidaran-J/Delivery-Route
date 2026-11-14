import csv
import io
from flask import Blueprint, jsonify, session, Response
from backend.auth import login_required
from database.db import query_db

reports_bp = Blueprint('reports', __name__, url_prefix='/api/reports')

@reports_bp.route('/csv/<int:opt_id>', methods=['GET'])
@login_required
def export_route_csv(opt_id):
    user_id = session['user_id']
    opt = query_db("SELECT * FROM route_optimizations WHERE id = ? AND user_id = ?", (opt_id, user_id), one=True)
    if not opt:
        return jsonify({"success": False, "error": "Optimization record not found."}), 404

    stops = query_db(
        """SELECT stop_order, location_name, customer_name, latitude, longitude,
                  distance_from_prev_km, cumulative_distance_km, estimated_arrival_minutes
           FROM route_history
           WHERE optimization_id = ?
           ORDER BY stop_order ASC""",
        (opt_id,)
    )

    output = io.StringIO()
    writer = csv.writer(output)

    # Metadata Header
    writer.writerow(["RouteGen Delivery Optimization Report"])
    writer.writerow(["Optimization ID", opt['id']])
    writer.writerow(["Title", opt['title']])
    writer.writerow(["Generated At", opt['created_at']])
    writer.writerow(["Number of Stops", opt['num_locations']])
    writer.writerow(["Original Distance (km)", opt['original_distance_km']])
    writer.writerow(["Optimized Distance (km)", opt['optimized_distance_km']])
    writer.writerow(["Distance Saved (km)", opt['distance_saved_km']])
    writer.writerow(["Improvement (%)", f"{opt['improvement_percentage']}%"])
    writer.writerow(["Original Duration (min)", opt['original_time_minutes']])
    writer.writerow(["Optimized Duration (min)", opt['optimized_time_minutes']])
    writer.writerow(["Time Saved (min)", opt['time_saved_minutes']])
    writer.writerow(["GA Population Size", opt['population_size']])
    writer.writerow(["GA Generations", opt['generations']])
    writer.writerow(["GA Mutation Rate", opt['mutation_rate']])
    writer.writerow(["GA Crossover Rate", opt['crossover_rate']])
    writer.writerow([])

    # Table of stops
    writer.writerow([
        "Stop Order", "Location Name", "Customer Name", "Latitude", "Longitude",
        "Leg Distance (km)", "Cumulative Distance (km)", "Est. Arrival (min)"
    ])

    for s in stops:
        writer.writerow([
            s['stop_order'],
            s['location_name'],
            s['customer_name'] or "N/A",
            s['latitude'],
            s['longitude'],
            s['distance_from_prev_km'],
            s['cumulative_distance_km'],
            s['estimated_arrival_minutes']
        ])

    csv_data = output.getvalue()
    filename = f"RouteGen_Optimization_{opt_id}.csv"

    return Response(
        csv_data,
        mimetype="text/csv",
        headers={"Content-Disposition": f"attachment;filename={filename}"}
    )

@reports_bp.route('/summary-csv', methods=['GET'])
@login_required
def export_summary_csv():
    user_id = session['user_id']
    opts = query_db(
        """SELECT id, title, num_locations, population_size, generations, mutation_rate, crossover_rate,
                  original_distance_km, optimized_distance_km, distance_saved_km, improvement_percentage,
                  original_time_minutes, optimized_time_minutes, time_saved_minutes, execution_time_seconds, created_at
           FROM route_optimizations
           WHERE user_id = ?
           ORDER BY created_at DESC""",
        (user_id,)
    )

    output = io.StringIO()
    writer = csv.writer(output)

    writer.writerow([
        "ID", "Title", "Locations", "Pop Size", "Generations", "Mutation Rate", "Crossover Rate",
        "Original Dist (km)", "Optimized Dist (km)", "Saved Dist (km)", "Improvement (%)",
        "Orig Time (min)", "Opt Time (min)", "Time Saved (min)", "Runtime (s)", "Date Created"
    ])

    for o in opts:
        writer.writerow([
            o['id'],
            o['title'],
            o['num_locations'],
            o['population_size'],
            o['generations'],
            o['mutation_rate'],
            o['crossover_rate'],
            o['original_distance_km'],
            o['optimized_distance_km'],
            o['distance_saved_km'],
            o['improvement_percentage'],
            o['original_time_minutes'],
            o['optimized_time_minutes'],
            o['time_saved_minutes'],
            o['execution_time_seconds'],
            o['created_at']
        ])

    csv_data = output.getvalue()
    return Response(
        csv_data,
        mimetype="text/csv",
        headers={"Content-Disposition": "attachment;filename=RouteGen_Historical_Summary.csv"}
    )
