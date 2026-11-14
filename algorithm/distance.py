import math
import json
import urllib.request
import urllib.error
from config import Config

EARTH_RADIUS_KM = 6371.0

def haversine_distance(coord1, coord2):
    """
    Calculate the great circle distance between two points on the Earth 
    using the Haversine formula.
    
    coord1, coord2: tuples or dicts containing (lat, lon) in decimal degrees.
    Returns: Distance in kilometers (float).
    """
    if isinstance(coord1, dict):
        lat1, lon1 = float(coord1['latitude']), float(coord1['longitude'])
    else:
        lat1, lon1 = float(coord1[0]), float(coord1[1])
        
    if isinstance(coord2, dict):
        lat2, lon2 = float(coord2['latitude']), float(coord2['longitude'])
    else:
        lat2, lon2 = float(coord2[0]), float(coord2[1])

    # Convert decimal degrees to radians
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)

    # Haversine formula
    a = (math.sin(delta_phi / 2.0) ** 2 +
         math.cos(phi1) * math.cos(phi2) * (math.sin(delta_lambda / 2.0) ** 2))
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))

    distance = EARTH_RADIUS_KM * c
    return round(distance, 4)

def build_distance_matrix(locations, use_road_multiplier=False):
    """
    Precomputes an N x N pairwise distance matrix for all locations.
    Precomputing enables O(1) distance lookups during genetic algorithm execution.
    
    locations: list of location dicts with 'id', 'latitude', 'longitude'
    Returns: dict of dicts: matrix[loc_id_1][loc_id_2] = distance_km
    """
    matrix = {}
    multiplier = 1.28 if use_road_multiplier else 1.0  # Urban street network detour factor

    for i, loc1 in enumerate(locations):
        id1 = loc1['id']
        matrix[id1] = {}
        for j, loc2 in enumerate(locations):
            id2 = loc2['id']
            if id1 == id2:
                matrix[id1][id2] = 0.0
            elif id2 in matrix and id1 in matrix[id2]:
                matrix[id1][id2] = matrix[id2][id1]
            else:
                dist = haversine_distance(
                    (loc1['latitude'], loc1['longitude']),
                    (loc2['latitude'], loc2['longitude'])
                ) * multiplier
                matrix[id1][id2] = round(dist, 4)
    return matrix

def calculate_route_distance(route, warehouse, distance_matrix):
    """
    Calculates total round-trip distance for a given route sequence starting and ending at warehouse.
    
    warehouse: location dict representing depot
    route: list of delivery location dicts in order of visit
    distance_matrix: precomputed distance matrix
    Returns: total distance in km (float)
    """
    if not route:
        return 0.0

    w_id = warehouse['id']
    total_dist = 0.0

    # From Warehouse to 1st Stop
    total_dist += distance_matrix[w_id][route[0]['id']]

    # Between consecutive delivery stops
    for i in range(len(route) - 1):
        u_id = route[i]['id']
        v_id = route[i + 1]['id']
        total_dist += distance_matrix[u_id][v_id]

    # From last Stop back to Warehouse
    total_dist += distance_matrix[route[-1]['id']][w_id]

    return round(total_dist, 4)

def estimate_travel_time_minutes(distance_km, num_stops, avg_speed_kmh=Config.DEFAULT_SPEED_KMH, service_time_per_stop_min=Config.STOP_SERVICE_TIME_MIN):
    """
    Estimates total delivery trip duration in minutes:
    Duration = (Driving Time) + (Service Time per stop * num_stops)
    """
    if avg_speed_kmh <= 0:
        avg_speed_kmh = Config.DEFAULT_SPEED_KMH
    driving_hours = distance_km / avg_speed_kmh
    driving_minutes = driving_hours * 60.0
    service_minutes = num_stops * service_time_per_stop_min
    total_minutes = driving_minutes + service_minutes
    return round(total_minutes, 1)

def calculate_eco_metrics(distance_km):
    """
    Calculates estimated fuel cost and carbon footprint (CO2 emissions in kg).
    """
    fuel_cost = round(distance_km * Config.FUEL_COST_PER_KM, 2)
    co2_emissions_kg = round(distance_km * Config.CO2_KG_PER_KM, 2)
    return {
        "fuel_cost_est": fuel_cost,
        "co2_emissions_kg": co2_emissions_kg
    }

def try_fetch_osrm_road_route(coordinates):
    """
    Attempts to fetch realistic road geometry and road distance from Open Source Routing Machine (OSRM).
    coordinates: list of [longitude, latitude] pairs in order.
    Returns: dict with 'distance_km', 'duration_min', 'geometry' or None if unavailable.
    """
    if len(coordinates) < 2:
        return None
    try:
        coord_str = ";".join([f"{c[0]:.6f},{c[1]:.6f}" for c in coordinates])
        url = f"https://router.project-osrm.org/route/v1/driving/{coord_str}?overview=full&geometries=geojson"
        
        req = urllib.request.Request(
            url, 
            headers={'User-Agent': 'RouteGen-Delivery-Optimizer/1.0'}
        )
        with urllib.request.urlopen(req, timeout=3.0) as response:
            if response.status == 200:
                data = json.loads(response.read().decode('utf-8'))
                if data.get('code') == 'Ok' and 'routes' in data and len(data['routes']) > 0:
                    route = data['routes'][0]
                    dist_km = route.get('distance', 0) / 1000.0
                    dur_min = route.get('duration', 0) / 60.0
                    geometry = route.get('geometry', {}).get('coordinates', [])
                    # Geometry is [lon, lat], leaflet needs [lat, lon]
                    leaflet_coords = [[pt[1], pt[0]] for pt in geometry]
                    return {
                        "road_distance_km": round(dist_km, 3),
                        "road_duration_min": round(dur_min, 1),
                        "road_geometry": leaflet_coords
                    }
    except Exception:
        # Graceful fallback: when offline, behind firewall, or rate-limited
        pass
    return None
