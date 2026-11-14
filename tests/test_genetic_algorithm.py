import unittest
import sys
import os

# Add parent directory to sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from algorithm.distance import haversine_distance, build_distance_matrix
from algorithm.genetic_algorithm import GeneticAlgorithm

class TestGeneticAlgorithm(unittest.TestCase):
    def setUp(self):
        # 1 Depot + 6 delivery locations in Tamil Nadu (Chennai)
        self.warehouse = {
            "id": 1,
            "name": "Koyambedu Central Depot",
            "latitude": 13.0694,
            "longitude": 80.1948,
            "is_warehouse": 1
        }
        self.deliveries = [
            {"id": 2, "name": "T. Nagar Commercial Hub", "latitude": 13.0418, "longitude": 80.2341, "is_warehouse": 0},
            {"id": 3, "name": "Anna Nagar West Retail", "latitude": 13.0850, "longitude": 80.2101, "is_warehouse": 0},
            {"id": 4, "name": "Nungambakkam Corporate Center", "latitude": 13.0604, "longitude": 80.2437, "is_warehouse": 0},
            {"id": 5, "name": "Mylapore Heritage Corner", "latitude": 13.0336, "longitude": 80.2677, "is_warehouse": 0},
            {"id": 6, "name": "Guindy Industrial Estate", "latitude": 13.0102, "longitude": 80.2120, "is_warehouse": 0},
            {"id": 7, "name": "Adyar River View Plaza", "latitude": 13.0064, "longitude": 80.2575, "is_warehouse": 0}
        ]

    def test_haversine_distance_positive(self):
        d = haversine_distance(
            (self.warehouse['latitude'], self.warehouse['longitude']),
            (self.deliveries[0]['latitude'], self.deliveries[0]['longitude'])
        )
        self.assertGreater(d, 0.0)
        self.assertLess(d, 15.0)  # Koyambedu to T. Nagar is roughly 5-7 km

    def test_crossover_maintains_permutation(self):
        ga = GeneticAlgorithm(self.warehouse, self.deliveries, population_size=20, generations=10)
        p1 = [2, 3, 4, 5, 6, 7]
        p2 = [7, 6, 5, 4, 3, 2]
        child = ga.ordered_crossover(p1, p2)
        
        self.assertEqual(len(child), len(p1))
        self.assertEqual(sorted(child), sorted(p1))
        self.assertEqual(len(set(child)), len(p1))  # No duplicates

    def test_mutation_maintains_permutation(self):
        ga = GeneticAlgorithm(self.warehouse, self.deliveries, population_size=20, generations=10)
        chrom = [2, 3, 4, 5, 6, 7]
        mutated = ga.mutate(chrom)
        self.assertEqual(len(mutated), len(chrom))
        self.assertEqual(sorted(mutated), sorted(chrom))

    def test_ga_execution_and_improvement(self):
        ga = GeneticAlgorithm(
            self.warehouse, 
            self.deliveries, 
            population_size=40, 
            generations=30,
            mutation_rate=0.2, 
            crossover_rate=0.85
        )
        res = ga.run()
        self.assertTrue(res['success'])
        self.assertIn('summary', res)
        summary = res['summary']
        self.assertLessEqual(summary['optimized_distance_km'], summary['original_distance_km'])
        self.assertGreater(len(res['optimized_route']), 0)
        self.assertGreater(len(res['convergence_history']), 0)

if __name__ == '__main__':
    unittest.main()
