from flask import Blueprint, request, jsonify, session
from backend.auth import login_required
from database.db import query_db, execute_db
from database.seed_data import SAMPLE_SCENARIOS

locations_bp = Blueprint('locations', __name__, url_prefix='/api/locations')

@locations_bp.route('', methods=['GET'])
@login_required
def get_locations():
    user_id = session['user_id']
    rows = query_db(
        """SELECT id, user_id, name, customer_name, customer_phone, customer_address, 
                  latitude, longitude, is_warehouse, delivery_order, priority, notes, created_at 
           FROM delivery_locations 
           WHERE user_id = ? 
           ORDER BY is_warehouse DESC, delivery_order ASC, id ASC""",
        (user_id,)
    )
    
    locations = [dict(row) for row in rows]
    warehouse = next((loc for loc in locations if loc['is_warehouse'] == 1), None)
    deliveries = [loc for loc in locations if loc['is_warehouse'] == 0]
    
    return jsonify({
        "success": True,
        "count": len(locations),
        "warehouse": warehouse,
        "deliveries": deliveries,
        "all_locations": locations
    })

@locations_bp.route('', methods=['POST'])
@login_required
def add_location():
    user_id = session['user_id']
    data = request.get_json() or {}

    name = (data.get('name') or '').strip()
    if not name:
        return jsonify({"success": False, "error": "Location name is required."}), 400

    try:
        latitude = float(data.get('latitude'))
        longitude = float(data.get('longitude'))
    except (ValueError, TypeError):
        return jsonify({"success": False, "error": "Valid numeric latitude and longitude are required."}), 400

    if not (-90.0 <= latitude <= 90.0):
        return jsonify({"success": False, "error": "Latitude must be between -90.0 and 90.0."}), 400
    if not (-180.0 <= longitude <= 180.0):
        return jsonify({"success": False, "error": "Longitude must be between -180.0 and 180.0."}), 400

    customer_name = (data.get('customer_name') or '').strip()
    customer_phone = (data.get('customer_phone') or '').strip()
    customer_address = (data.get('customer_address') or '').strip()
    is_warehouse = 1 if data.get('is_warehouse') in (1, True, '1', 'true') else 0
    priority = (data.get('priority') or 'Standard').strip()
    notes = (data.get('notes') or '').strip()

    # If marking as warehouse, unset existing warehouse for this user
    if is_warehouse == 1:
        execute_db("UPDATE delivery_locations SET is_warehouse = 0 WHERE user_id = ?", (user_id,))

    # Compute next delivery_order
    max_order_row = query_db(
        "SELECT MAX(delivery_order) as max_ord FROM delivery_locations WHERE user_id = ?",
        (user_id,),
        one=True
    )
    next_order = ((max_order_row['max_ord'] or 0) + 1) if max_order_row else 1

    loc_id, _ = execute_db(
        """INSERT INTO delivery_locations 
           (user_id, name, customer_name, customer_phone, customer_address, 
            latitude, longitude, is_warehouse, delivery_order, priority, notes)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
        (user_id, name, customer_name, customer_phone, customer_address,
         latitude, longitude, is_warehouse, next_order, priority, notes)
    )

    new_loc = query_db("SELECT * FROM delivery_locations WHERE id = ?", (loc_id,), one=True)

    return jsonify({
        "success": True,
        "message": f"{'Warehouse' if is_warehouse else 'Delivery location'} '{name}' added successfully.",
        "location": dict(new_loc)
    }), 201

@locations_bp.route('/<int:loc_id>', methods=['PUT'])
@login_required
def update_location(loc_id):
    user_id = session['user_id']
    data = request.get_json() or {}

    loc = query_db("SELECT * FROM delivery_locations WHERE id = ? AND user_id = ?", (loc_id, user_id), one=True)
    if not loc:
        return jsonify({"success": False, "error": "Location not found."}), 404

    name = (data.get('name') if 'name' in data else loc['name']).strip()
    if not name:
        return jsonify({"success": False, "error": "Location name cannot be empty."}), 400

    try:
        latitude = float(data.get('latitude', loc['latitude']))
        longitude = float(data.get('longitude', loc['longitude']))
    except (ValueError, TypeError):
        return jsonify({"success": False, "error": "Latitude and longitude must be valid numbers."}), 400

    if not (-90.0 <= latitude <= 90.0) or not (-180.0 <= longitude <= 180.0):
        return jsonify({"success": False, "error": "Coordinates out of bounds."}), 400

    customer_name = data.get('customer_name', loc['customer_name'])
    customer_phone = data.get('customer_phone', loc['customer_phone'])
    customer_address = data.get('customer_address', loc['customer_address'])
    is_warehouse = 1 if data.get('is_warehouse', loc['is_warehouse']) in (1, True, '1', 'true') else 0
    priority = data.get('priority', loc['priority'])
    notes = data.get('notes', loc['notes'])

    if is_warehouse == 1 and loc['is_warehouse'] == 0:
        execute_db("UPDATE delivery_locations SET is_warehouse = 0 WHERE user_id = ?", (user_id,))

    execute_db(
        """UPDATE delivery_locations 
           SET name = ?, customer_name = ?, customer_phone = ?, customer_address = ?,
               latitude = ?, longitude = ?, is_warehouse = ?, priority = ?, notes = ?
           WHERE id = ? AND user_id = ?""",
        (name, customer_name, customer_phone, customer_address,
         latitude, longitude, is_warehouse, priority, notes, loc_id, user_id)
    )

    updated = query_db("SELECT * FROM delivery_locations WHERE id = ?", (loc_id,), one=True)
    return jsonify({
        "success": True,
        "message": f"Location '{name}' updated successfully.",
        "location": dict(updated)
    })

@locations_bp.route('/<int:loc_id>', methods=['DELETE'])
@login_required
def delete_location(loc_id):
    user_id = session['user_id']
    loc = query_db("SELECT name FROM delivery_locations WHERE id = ? AND user_id = ?", (loc_id, user_id), one=True)
    if not loc:
        return jsonify({"success": False, "error": "Location not found."}), 404

    execute_db("DELETE FROM delivery_locations WHERE id = ? AND user_id = ?", (loc_id, user_id))
    return jsonify({
        "success": True,
        "message": f"Location '{loc['name']}' deleted."
    })

@locations_bp.route('/<int:loc_id>/set-warehouse', methods=['POST'])
@login_required
def set_warehouse(loc_id):
    user_id = session['user_id']
    loc = query_db("SELECT name FROM delivery_locations WHERE id = ? AND user_id = ?", (loc_id, user_id), one=True)
    if not loc:
        return jsonify({"success": False, "error": "Location not found."}), 404

    # Unset other warehouses for this user
    execute_db("UPDATE delivery_locations SET is_warehouse = 0 WHERE user_id = ?", (user_id,))
    execute_db("UPDATE delivery_locations SET is_warehouse = 1 WHERE id = ? AND user_id = ?", (loc_id, user_id))

    return jsonify({
        "success": True,
        "message": f"'{loc['name']}' is now set as the Warehouse Depot."
    })

@locations_bp.route('/seed', methods=['POST'])
@login_required
def seed_locations():
    """Seeds a selected scenario (chennai, coimbatore, madurai)."""
    user_id = session['user_id']
    data = request.get_json() or {}
    scenario_key = data.get('scenario', 'chennai').lower()
    
    if scenario_key not in SAMPLE_SCENARIOS:
        scenario_key = 'chennai'
        
    scenario = SAMPLE_SCENARIOS[scenario_key]
    
    # Clear existing locations for clean slate
    execute_db("DELETE FROM delivery_locations WHERE user_id = ?", (user_id,))
    
    # 1. Insert warehouse
    wh = scenario['warehouse']
    wh_id, _ = execute_db(
        """INSERT INTO delivery_locations 
           (user_id, name, customer_name, customer_phone, customer_address, 
            latitude, longitude, is_warehouse, delivery_order, priority, notes)
           VALUES (?, ?, ?, ?, ?, ?, ?, 1, 0, ?, ?)""",
        (user_id, wh['name'], wh['customer_name'], wh['customer_phone'], 
         wh['customer_address'], wh['latitude'], wh['longitude'], wh['priority'], wh['notes'])
    )
    
    # 2. Insert delivery destinations
    for idx, d in enumerate(scenario['deliveries'], start=1):
        execute_db(
            """INSERT INTO delivery_locations 
               (user_id, name, customer_name, customer_phone, customer_address, 
                latitude, longitude, is_warehouse, delivery_order, priority, notes)
               VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?)""",
            (user_id, d['name'], d['customer_name'], d['customer_phone'],
             d['customer_address'], d['latitude'], d['longitude'], idx, d['priority'], d['notes'])
        )
        
    return jsonify({
        "success": True,
        "message": f"Successfully loaded '{scenario['title']}' with 1 warehouse depot and {len(scenario['deliveries'])} delivery stops!",
        "scenario": scenario_key
    })

@locations_bp.route('/clear-all', methods=['DELETE', 'POST'])
@login_required
def clear_all_locations():
    user_id = session['user_id']
    _, deleted_count = execute_db("DELETE FROM delivery_locations WHERE user_id = ?", (user_id,))
    return jsonify({
        "success": True,
        "message": f"Cleared all {deleted_count} locations."
    })
