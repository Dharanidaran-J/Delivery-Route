# RouteGen – Smart Delivery Route Optimizer Using Genetic Algorithm

[![Python 3.9+](https://img.shields.io/badge/python-3.9+-blue.svg)](https://www.python.org/downloads/)
[![Flask](https://img.shields.io/badge/backend-Flask-black.svg)](https://flask.palletsprojects.com/)
[![SQLite](https://img.shields.io/badge/database-SQLite-lightgrey.svg)](https://www.sqlite.org/)
[![Leaflet](https://img.shields.io/badge/mapping-Leaflet.js-brightgreen.svg)](https://leafletjs.com/)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)

An academic final-year project delivering an intelligent, modern last-mile delivery route optimization system powered by a custom **Genetic Algorithm (GA)** for the **Traveling Salesperson Problem with Fixed Depot (TSP-FD)**.

---

## 1. Project Overview & Objectives

In modern last-mile logistics, delivery vehicles expend unnecessary fuel, produce excess $\text{CO}_2$ emissions, and lose valuable delivery hours due to sub-optimal route sequences. Finding the optimal route visiting $N$ delivery destinations is an **NP-Hard combinatorial optimization problem** where the search space scales as $(N-1)!$. For 15 delivery stops, there are over **43 billion possible routes**.

**RouteGen** implements an evolutionary **Genetic Algorithm** to search this vast combinatorial space and discover near-optimal delivery tours in sub-second runtimes, minimizing:
- **Total travel distance (km)**
- **Total driving duration & handover time**
- **Vehicle fuel expenditures**
- **Carbon footprint ($\text{CO}_2$ emissions)**

---

## 2. Technology Stack

| Layer | Technologies Used |
|---|---|
| **Frontend UI / UX** | HTML5, CSS3 (Dark Navy Glassmorphism Theme), Vanilla JavaScript (ES6+ Modular Architecture) |
| **Interactive Mapping** | [Leaflet.js](https://leafletjs.com/) with OpenStreetMap & CartoDB Dark Matter tiles |
| **Data Visualizations** | [Chart.js](https://www.chartjs.org/) (Dual-axis Convergence Curve, Comparison Bar Charts, Savings Trend) |
| **Icons & Design** | [Lucide Icons](https://lucide.dev/) |
| **Report Generation** | [jsPDF](https://github.com/parallax/jsPDF) & AutoTable plugin for browser-side PDF compilation; Python CSV streaming |
| **Backend API** | Python [Flask](https://flask.palletsprojects.com/) (RESTful Modular Blueprints) |
| **Database** | SQLite3 with relational foreign keys, indexing, and migration script |
| **Routing / Geodesy** | Haversine Great-Circle formula + Open Source Routing Machine (OSRM) integration |

---

## 3. Mathematical & Algorithmic Formulation

### A. Geodesic Distance Calculation (Haversine Formula)

The spherical distance between two coordinates $(\phi_1, \lambda_1)$ and $(\phi_2, \lambda_2)$ in radians is calculated via:

$$a = \sin^2\left(\frac{\Delta \phi}{2}\right) + \cos(\phi_1)\cos(\phi_2)\sin^2\left(\frac{\Delta \lambda}{2}\right)$$
$$c = 2 \cdot \text{atan2}\left(\sqrt{a}, \sqrt{1-a}\right)$$
$$d = R \cdot c$$

where $R = 6,371.0\text{ km}$ (Earth's mean volumetric radius).

An optional **Urban Street Detour Factor** ($\times 1.28$) can be toggled to model street grids, or realistic road geometry can be fetched via OSRM.

### B. Genetic Algorithm Operators

1. **Chromosome Representation**:
   A permutation vector $C = [s_1, s_2, \dots, s_N]$ where each gene $s_i$ denotes a unique delivery location ID. The complete tour is:
   $$\text{Depot} \to s_1 \to s_2 \to \dots \to s_N \to \text{Depot}$$

2. **Fitness Function**:
   $$F(C) = \frac{1000}{D(C)}$$
   Minimizing tour distance $D(C)$ directly maximizes individual fitness $F(C)$.

3. **Selection**:
   - **Tournament Selection ($k=5$)**: Draws $k$ candidates at random and selects the candidate with the highest fitness.
   - **Roulette Wheel Selection**: Probability $P(i) = \frac{f_i}{\sum f_j}$.

4. **Crossover (Permutation Preserving)**:
   - **Ordered Crossover (OX)**: Copies a contiguous sub-segment from Parent 1 and fills the remaining slots using the relative ordering from Parent 2 without duplicating genes.
   - **Partially Mapped Crossover (PMX)**: Builds mapping tuples across parent crossover points.

5. **Mutation**:
   - **Inversion (2-Opt Style)**: Inverts a random sub-sequence, highly effective for spatial route untangling.
   - **Swap**: Swaps positions of two distinct stops.
   - **Scramble**: Randomly shuffles a random sub-slice.

6. **Elitism**:
   Preserves the top $E$ best chromosomes directly into the next generation to guarantee monotonic best-fitness retention.

---

## 4. Project Folder Structure

```text
routegen/
├── app.py                      # Main Flask application entry point
├── config.py                   # Configuration, parameters & paths
├── requirements.txt            # Python dependencies
├── README.md                   # Academic project documentation
│
├── database/
│   ├── db.py                   # SQLite database connections & query helpers
│   ├── schema.sql              # Relational database schema
│   ├── seed_data.py            # Pre-configured Tamil Nadu delivery scenarios (Chennai, Coimbatore, Madurai)
│   └── routegen.db             # Auto-generated SQLite database
│
├── algorithm/
│   ├── __init__.py
│   ├── distance.py             # Haversine formula, pairwise distance matrix, OSRM road routing
│   └── genetic_algorithm.py    # Complete Genetic Algorithm engine for TSP
│
├── backend/
│   ├── __init__.py
│   ├── auth.py                 # User authentication, registration, password hashing & session management
│   ├── locations.py            # CRUD operations for delivery destinations and warehouse depot
│   ├── optimizer.py            # GA optimization execution API & history logging
│   ├── dashboard.py            # Real SQL aggregated KPI statistics & analytics
│   └── reports.py              # CSV & JSON reporting endpoints
│
├── frontend/
│   ├── templates/
│   │   └── index.html          # Modern Single Page Application dashboard UI
│   └── static/
│       ├── css/
│       │   └── style.css       # Dark navy theme, glassmorphic cards, responsive sidebar & animations
│       └── js/
│           ├── app.js          # Main frontend controller & navigation
│           ├── map.js          # Leaflet.js interactive map & route polylines
│           ├── charts.js       # Chart.js convergence plots & comparison graphs
│           ├── locations.js    # Delivery location management & coordinate picking
│           ├── optimizer.js    # GA hyperparameters sliders & results viewer
│           └── reports.js      # jsPDF academic dispatch reports & CSV exports
│
└── tests/
    ├── test_genetic_algorithm.py # Unit tests for distance, crossover, mutation, convergence
    └── test_routes.py          # Integration tests for Flask API endpoints
```

---

## 5. Database Schema

The SQLite relational database maintains 4 primary tables:

1. **`users`**:
   - `id`, `username`, `email`, `password_hash`, `full_name`, `company`, `created_at`
2. **`delivery_locations`**:
   - `id`, `user_id`, `name`, `customer_name`, `customer_phone`, `customer_address`, `latitude`, `longitude`, `is_warehouse`, `delivery_order`, `priority`, `notes`
3. **`route_optimizations`**:
   - `id`, `user_id`, `title`, `num_locations`, `population_size`, `generations`, `mutation_rate`, `crossover_rate`, `original_distance_km`, `optimized_distance_km`, `distance_saved_km`, `improvement_percentage`, `original_time_minutes`, `optimized_time_minutes`, `convergence_history` (JSON), `route_sequence` (JSON)
4. **`route_history`**:
   - `id`, `optimization_id`, `user_id`, `stop_order`, `location_id`, `location_name`, `latitude`, `longitude`, `distance_from_prev_km`, `cumulative_distance_km`, `estimated_arrival_minutes`

---

## 6. How to Run Locally in VS Code

### Step 1: Open the Project in VS Code
1. Launch **Visual Studio Code**.
2. Click **File** $\to$ **Open Folder...** and select:
   ```text
   C:\Users\<YourUser>\.gemini\antigravity\scratch\routegen
   ```

### Step 2: Open Terminal in VS Code
Open the integrated terminal (`Ctrl + \`` or **Terminal** $\to$ **New Terminal**).

### Step 3: Install Dependencies
Ensure Python is installed, then run:
```bash
python -m pip install -r requirements.txt
```

### Step 4: Run the Application Server
Run the Flask application:
```bash
python app.py
```

You will see:
```text
================================================================
 RouteGen - Smart Delivery Route Optimizer Server
 Running at: http://127.0.0.1:5000
 Demo User: demo_dispatcher / RouteGen2026!
================================================================
```

### Step 5: Open in Browser
Open your browser and navigate to:
```text
http://127.0.0.1:5000
```

---

## 7. Instant Demonstration & Evaluation Guide

1. **1-Click Demo Login**:
   Click **"1-Click Demo Dispatcher Login"** on the login dialog.
2. **Instant Delivery Scenario**:
   Go to **Manage Locations** $\to$ Click **"Chennai Metro (12 Stops)"** (or **Coimbatore Corridor**, **Madurai Express**).
   - Notice the designated **Warehouse Depot** (Red badge at Koyambedu) and delivery stops across Chennai.
3. **Run the Genetic Algorithm**:
   Go to **Optimize Route** $\to$ adjust Population Size (e.g., 100), Generations (e.g., 150), and click:
   $$\mathbf{Run\ Genetic\ Optimization}$$
4. **Inspect Real Calculated Results**:
   - **Comparison Banner**: Original vs Optimized Distance, % Saved, Fuel & Carbon saved.
   - **Convergence Plot**: Dual-line chart showing generational fitness improvement.
   - **Comparison Bar Chart**: Side-by-side travel distance and time.
   - **Waypoint Sequence**: Stop-by-stop cumulative kilometers and arrival times.
5. **Interactive Map**:
   Click **"View on Route Map"** to inspect:
   - Red dashed line = Original delivery route
   - Glowing cyan line = GA Optimized delivery route
   - Numbered markers indicating the exact delivery sequence
6. **Export Dispatch Reports**:
   Go to **Reports** $\to$ Click **"PDF"** to compile a publication-ready delivery dispatch report with jsPDF or **"CSV"** for spreadsheet analysis.

---

## 8. Running Automated Unit Tests

Execute the comprehensive test suite verifying genetic algorithm permutations, crossover integrity, mutation invariants, and Flask API endpoints:

```bash
python -m unittest discover tests
```

Expected Output:
```text
.........
----------------------------------------------------------------------
Ran 9 tests in 0.364s

OK
```

---

## 9. Academic Project Credits

- **Domain**: Artificial Intelligence / Metaheuristic Optimization / Operations Research
- **Topic**: Last-Mile Delivery Sequence Optimization via Genetic Algorithm
- **Problem**: Traveling Salesperson Problem with Fixed Depot (TSP-FD)
- **Year**: 2026 Academic Capstone Project
