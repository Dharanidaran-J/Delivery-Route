import os
from flask import Flask, render_template, send_from_directory, jsonify
from config import Config
from database.db import init_db, query_db, execute_db
from werkzeug.security import generate_password_hash
from backend.auth import auth_bp
from backend.locations import locations_bp
from backend.optimizer import optimizer_bp
from backend.dashboard import dashboard_bp
from backend.reports import reports_bp
from database.seed_data import SAMPLE_SCENARIOS

def create_app():
    app = Flask(
        __name__,
        template_folder=Config.TEMPLATES_FOLDER,
        static_folder=Config.STATIC_FOLDER,
        static_url_path='/static'
    )
    app.config.from_object(Config)

    # Initialize Database Schema
    init_db()

    # Pre-seed demo user and sample locations if db is fresh
    init_demo_user_if_needed()

    # Register Blueprints
    app.register_blueprint(auth_bp)
    app.register_blueprint(locations_bp)
    app.register_blueprint(optimizer_bp)
    app.register_blueprint(dashboard_bp)
    app.register_blueprint(reports_bp)

    @app.route('/')
    def index():
        return render_template('index.html')

    @app.route('/api/health')
    def health():
        return jsonify({
            "status": "healthy",
            "app": "RouteGen – Smart Delivery Route Optimizer",
            "version": "2.0.0"
        })

    @app.errorhandler(404)
    def page_not_found(e):
        return render_template('index.html'), 200

    return app

def init_demo_user_if_needed():
    """Seeds a demo account with pre-loaded Tamil Nadu delivery points for immediate evaluation."""
    demo_user = query_db("SELECT id FROM users WHERE username = ?", ("demo_dispatcher",), one=True)
    if not demo_user:
        pwd_hash = generate_password_hash("RouteGen2026!")
        user_id, _ = execute_db(
            """INSERT INTO users (username, email, password_hash, full_name, company) 
               VALUES (?, ?, ?, ?, ?)""",
            ("demo_dispatcher", "dispatcher@routegen.internal", pwd_hash, 
             "Alex Mercer", "RouteGen Tamil Nadu Smart Logistics")
        )
    else:
        user_id = demo_user['id']
        
    # Check if user already has Tamil Nadu locations; if not or if old, reload Chennai
    existing_loc = query_db("SELECT id, name FROM delivery_locations WHERE user_id = ? LIMIT 1", (user_id,), one=True)
    if not existing_loc or "New York" in existing_loc['name'] or "Midtown" in existing_loc['name']:
        execute_db("DELETE FROM delivery_locations WHERE user_id = ?", (user_id,))
        chennai = SAMPLE_SCENARIOS['chennai']
        wh = chennai['warehouse']
        execute_db(
            """INSERT INTO delivery_locations 
               (user_id, name, customer_name, customer_phone, customer_address, 
                latitude, longitude, is_warehouse, delivery_order, priority, notes)
               VALUES (?, ?, ?, ?, ?, ?, ?, 1, 0, ?, ?)""",
            (user_id, wh['name'], wh['customer_name'], wh['customer_phone'], 
             wh['customer_address'], wh['latitude'], wh['longitude'], wh['priority'], wh['notes'])
        )
        for idx, d in enumerate(chennai['deliveries'], start=1):
            execute_db(
                """INSERT INTO delivery_locations 
                   (user_id, name, customer_name, customer_phone, customer_address, 
                    latitude, longitude, is_warehouse, delivery_order, priority, notes)
                   VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?)""",
                (user_id, d['name'], d['customer_name'], d['customer_phone'],
                 d['customer_address'], d['latitude'], d['longitude'], idx, d['priority'], d['notes'])
            )

app = create_app()

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    debug = os.environ.get('FLASK_DEBUG', 'False').lower() in ('true', '1', 't')
    print(f"================================================================")
    print(f" RouteGen - Smart Delivery Route Optimizer Server")
    print(f" Running at: http://127.0.0.1:{port}")
    print(f" Demo User: demo_dispatcher / RouteGen2026!")
    print(f"================================================================")
    app.run(host='127.0.0.1', port=port, debug=debug)
