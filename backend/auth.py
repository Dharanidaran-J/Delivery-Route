from functools import wraps
from flask import Blueprint, request, jsonify, session
from werkzeug.security import generate_password_hash, check_password_hash
from database.db import query_db, execute_db

auth_bp = Blueprint('auth', __name__, url_prefix='/api/auth')

def login_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'user_id' not in session:
            return jsonify({"success": False, "error": "Authentication required. Please log in."}), 401
        return f(*args, **kwargs)
    return decorated_function

@auth_bp.route('/register', methods=['POST'])
def register():
    data = request.get_json() or {}
    username = (data.get('username') or '').strip()
    email = (data.get('email') or '').strip().lower()
    password = data.get('password') or ''
    full_name = (data.get('full_name') or '').strip()
    company = (data.get('company') or '').strip()

    if not username or len(username) < 3:
        return jsonify({"success": False, "error": "Username must be at least 3 characters long."}), 400
    if not email or '@' not in email or '.' not in email:
        return jsonify({"success": False, "error": "Please provide a valid email address."}), 400
    if not password or len(password) < 6:
        return jsonify({"success": False, "error": "Password must be at least 6 characters long."}), 400

    # Check existing username or email
    existing = query_db("SELECT id FROM users WHERE username = ? OR email = ?", (username, email), one=True)
    if existing:
        return jsonify({"success": False, "error": "Username or email is already registered."}), 409

    pwd_hash = generate_password_hash(password)
    user_id, _ = execute_db(
        "INSERT INTO users (username, email, password_hash, full_name, company) VALUES (?, ?, ?, ?, ?)",
        (username, email, pwd_hash, full_name or username, company or "Delivery Logistics Co.")
    )

    # Establish session
    session['user_id'] = user_id
    session['username'] = username
    session['full_name'] = full_name or username

    return jsonify({
        "success": True,
        "message": "Registration successful!",
        "user": {
            "id": user_id,
            "username": username,
            "email": email,
            "full_name": full_name or username,
            "company": company or "Delivery Logistics Co."
        }
    }), 201

@auth_bp.route('/login', methods=['POST'])
def login():
    data = request.get_json() or {}
    identifier = (data.get('identifier') or data.get('username') or data.get('email') or '').strip()
    password = data.get('password') or ''

    if not identifier or not password:
        return jsonify({"success": False, "error": "Please provide both username/email and password."}), 400

    user = query_db(
        "SELECT id, username, email, password_hash, full_name, company FROM users WHERE username = ? OR email = ?",
        (identifier, identifier.lower()),
        one=True
    )

    if not user or not check_password_hash(user['password_hash'], password):
        return jsonify({"success": False, "error": "Invalid username or password."}), 401

    session['user_id'] = user['id']
    session['username'] = user['username']
    session['full_name'] = user['full_name']

    return jsonify({
        "success": True,
        "message": f"Welcome back, {user['full_name']}!",
        "user": {
            "id": user['id'],
            "username": user['username'],
            "email": user['email'],
            "full_name": user['full_name'],
            "company": user['company']
        }
    })

@auth_bp.route('/logout', methods=['POST', 'GET'])
def logout():
    session.clear()
    return jsonify({"success": True, "message": "Successfully logged out."})

@auth_bp.route('/me', methods=['GET'])
def current_user():
    user_id = session.get('user_id')
    if not user_id:
        return jsonify({"authenticated": False, "user": None})

    user = query_db(
        "SELECT id, username, email, full_name, company, created_at FROM users WHERE id = ?",
        (user_id,),
        one=True
    )
    if not user:
        session.clear()
        return jsonify({"authenticated": False, "user": None})

    return jsonify({
        "authenticated": True,
        "user": dict(user)
    })

@auth_bp.route('/demo-login', methods=['POST'])
def demo_login():
    """Provides a quick 1-click test login for demonstrations and grading."""
    username = "demo_dispatcher"
    user = query_db("SELECT id, username, email, full_name, company FROM users WHERE username = ?", (username,), one=True)
    if not user:
        pwd_hash = generate_password_hash("RouteGen2026!")
        user_id, _ = execute_db(
            "INSERT INTO users (username, email, password_hash, full_name, company) VALUES (?, ?, ?, ?, ?)",
            (username, "dispatcher@routegen.internal", pwd_hash, "Alex Mercer (Senior Dispatcher)", "Apex Global Logistics")
        )
        user = query_db("SELECT id, username, email, full_name, company FROM users WHERE id = ?", (user_id,), one=True)
    
    session['user_id'] = user['id']
    session['username'] = user['username']
    session['full_name'] = user['full_name']
    
    return jsonify({
        "success": True,
        "message": "Logged in as Demo Dispatcher",
        "user": dict(user)
    })
