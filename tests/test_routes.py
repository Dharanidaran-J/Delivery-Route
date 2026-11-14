import unittest
import sys
import os
import json

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app import create_app

class TestRouteGenCompleteSuite(unittest.TestCase):
    def setUp(self):
        self.app = create_app()
        self.app.config['TESTING'] = True
        self.client = self.app.test_client()
        # Authenticate as demo dispatcher
        self.client.post('/api/auth/demo-login')

    def test_01_health_and_index(self):
        res = self.client.get('/api/health')
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.get_json()['status'], 'healthy')

        res_idx = self.client.get('/')
        self.assertEqual(res_idx.status_code, 200)
        self.assertIn(b'RouteGen', res_idx.data)

    def test_02_locations_crud(self):
        # 1. Add Location
        new_loc = {
            "name": "Test Hospital Drop",
            "customer_name": "St. Jude Clinic",
            "customer_phone": "+1 555-0199",
            "customer_address": "450 10th Ave, NY",
            "latitude": 40.7550,
            "longitude": -74.0001,
            "priority": "Urgent",
            "notes": "Emergency loading bay",
            "is_warehouse": 0
        }
        res_add = self.client.post('/api/locations', json=new_loc)
        self.assertEqual(res_add.status_code, 201)
        loc_data = res_add.get_json()['location']
        loc_id = loc_data['id']
        self.assertEqual(loc_data['name'], "Test Hospital Drop")

        # 2. Update Location
        res_upd = self.client.put(f'/api/locations/{loc_id}', json={"name": "Test Hospital Drop (Updated)"})
        self.assertEqual(res_upd.status_code, 200)
        self.assertEqual(res_upd.get_json()['location']['name'], "Test Hospital Drop (Updated)")

        # 3. Delete Location
        res_del = self.client.delete(f'/api/locations/{loc_id}')
        self.assertEqual(res_del.status_code, 200)

    def test_03_seed_scenarios(self):
        for scenario in ['chennai', 'coimbatore', 'madurai']:
            res = self.client.post('/api/locations/seed', json={"scenario": scenario})
            self.assertEqual(res.status_code, 200)
            data = res.get_json()
            self.assertTrue(data['success'])

            # Verify locations populated
            res_locs = self.client.get('/api/locations')
            locs_data = res_locs.get_json()
            self.assertIsNotNone(locs_data['warehouse'])
            self.assertGreaterEqual(len(locs_data['deliveries']), 7)

    def test_04_ga_optimization_and_convergence(self):
        # Seed Chennai scenario first
        self.client.post('/api/locations/seed', json={"scenario": "chennai"})

        payload = {
            "title": "Comprehensive GA Test",
            "population_size": 40,
            "generations": 25,
            "mutation_rate": 0.15,
            "crossover_rate": 0.85,
            "selection_method": "tournament",
            "crossover_method": "ox",
            "mutation_method": "inversion",
            "use_road_multiplier": True,
            "fetch_road_geometry": False
        }
        res = self.client.post('/api/optimize', json=payload)
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertTrue(data['success'])
        
        summary = data['summary']
        self.assertLessEqual(summary['optimized_distance_km'], summary['original_distance_km'])
        self.assertGreaterEqual(summary['distance_saved_km'], 0.0)
        self.assertGreaterEqual(summary['improvement_percentage'], 0.0)
        self.assertGreater(len(data['convergence_history']), 0)
        self.assertGreater(len(data['optimized_route']), 0)
        
        opt_id = data['optimization_id']

        # Verify optimization detail endpoint
        res_det = self.client.get(f'/api/optimize/{opt_id}')
        self.assertEqual(res_det.status_code, 200)
        det_data = res_det.get_json()
        self.assertEqual(det_data['optimization']['id'], opt_id)

    def test_05_reports_and_csv_export(self):
        # Run an optimization to have data
        opt_res = self.client.post('/api/optimize', json={
            "population_size": 20,
            "generations": 15
        }).get_json()
        opt_id = opt_res['optimization_id']

        # 1. Stop-by-stop CSV export
        res_csv = self.client.get(f'/api/reports/csv/{opt_id}')
        self.assertEqual(res_csv.status_code, 200)
        self.assertEqual(res_csv.content_type, 'text/csv; charset=utf-8')
        self.assertIn(b'Stop Order', res_csv.data)
        self.assertIn(b'RouteGen Delivery Optimization Report', res_csv.data)

        # 2. Historical Summary CSV
        res_sum = self.client.get('/api/reports/summary-csv')
        self.assertEqual(res_sum.status_code, 200)
        self.assertEqual(res_sum.content_type, 'text/csv; charset=utf-8')
        self.assertIn(b'Original Dist (km)', res_sum.data)

    def test_06_dashboard_statistics(self):
        res = self.client.get('/api/dashboard/stats')
        self.assertEqual(res.status_code, 200)
        stats_data = res.get_json()
        self.assertTrue(stats_data['success'])
        stats = stats_data['stats']
        self.assertGreater(stats['total_deliveries'], 0)
        self.assertGreater(stats['total_optimizations'], 0)
        self.assertIn('recent_optimizations', stats_data)
        self.assertIn('chart_data', stats_data)

if __name__ == '__main__':
    unittest.main()
