import os

BASE_DIR = os.path.abspath(os.path.dirname(__file__))

class Config:
    SECRET_KEY = os.environ.get('SECRET_KEY', 'routegen_super_secret_key_2026_academic_project')
    DATABASE_PATH = os.path.join(BASE_DIR, 'database', 'routegen.db')
    SCHEMA_PATH = os.path.join(BASE_DIR, 'database', 'schema.sql')
    
    # Genetic Algorithm Default Parameters
    DEFAULT_POP_SIZE = 100
    DEFAULT_GENERATIONS = 150
    DEFAULT_MUTATION_RATE = 0.15
    DEFAULT_CROSSOVER_RATE = 0.85
    DEFAULT_ELITISM_COUNT = 2
    DEFAULT_TOURNAMENT_SIZE = 5
    
    # Delivery Simulation Parameters
    DEFAULT_SPEED_KMH = 35.0  # Urban/Suburban average delivery van speed
    STOP_SERVICE_TIME_MIN = 8.0  # Time spent at each delivery drop (parking, signature, handover)
    CO2_KG_PER_KM = 0.192  # Approx kg CO2 emitted per kilometer by light commercial vehicle
    FUEL_COST_PER_KM = 0.15  # Approx fuel cost per kilometer in USD/units
    
    # Flask template & static folders
    TEMPLATES_FOLDER = os.path.join(BASE_DIR, 'frontend', 'templates')
    STATIC_FOLDER = os.path.join(BASE_DIR, 'frontend', 'static')
