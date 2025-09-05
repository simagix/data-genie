"""
app.py
@ken.chen
"""
import unittest
import requests
import warnings

# Suppress ResourceWarnings for clean test output
warnings.filterwarnings('ignore', category=ResourceWarning)
import socket
from app import app

class FlaskServerTestCase(unittest.TestCase):
    def setUp(self):
        self.app = app.test_client()
        self.app.testing = True

    def test_save_project(self):
        response = self.app.post('/api/save_config', json={
            'name': 'unittest_project',
            'config': {
                'mongo_uri': 'mongodb://localhost/datagenie',
                'collection': 'tests',
                'pipeline': []
            }
        })
        self.assertEqual(response.status_code, 200)
        self.assertIn('saved', response.get_json().get('status', ''))

    def test_load_projects(self):
        response = self.app.get('/api/load_configs')
        self.assertEqual(response.status_code, 200)
        self.assertIn('unittest_project', str(response.get_json()))

    def test_validate_script(self):
        response = self.app.post('/api/validate_script', json={
            'script': 'print(123)'
        })
        self.assertEqual(response.status_code, 200)
        self.assertTrue('valid' in response.get_json())

    def test_export(self):
        response = self.app.post('/api/export', json={
            'graded': [{'score': 100, 'name': 'Test'}]
        })
        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.data)

class FlaskServerIntegrationTest(unittest.TestCase):
    BASE_URL = 'http://127.0.0.1:5000'

    def test_server_running(self):
        # Check if port 5000 is open
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        result = sock.connect_ex(('127.0.0.1', 5000))
        sock.close()
        self.assertEqual(result, 0, 'Flask server is not running on port 5000')

    def test_save_and_load_project(self):
        try:
            response = requests.post(f'{self.BASE_URL}/api/save_config', json={
                'name': 'unittest_project',
                'config': {
                    'mongo_uri': 'mongodb://localhost/datagenie',
                    'collection': 'tests',
                    'pipeline': []
                }
            }, timeout=3)
            self.assertEqual(response.status_code, 200)
            self.assertIn('saved', response.json().get('status', ''))

            response2 = requests.get(f'{self.BASE_URL}/api/load_configs', timeout=3)
            self.assertEqual(response2.status_code, 200)
            self.assertIn('unittest_project', response2.text)
        except Exception as e:
            self.fail(f'Failed to connect to /api/save_config or /api/load_configs: {e}')

    def test_cors_headers(self):
        url = f'{self.BASE_URL}/api/save_config'
        headers = {'Origin': 'http://localhost'}
        response = requests.options(url, headers=headers)
        try:
            self.assertIn('Access-Control-Allow-Origin', response.headers)
        except Exception as e:
            self.fail(f'Failed to check CORS headers: {e}')

class TestDataGenieAPI(unittest.TestCase):
    BASE_URL = 'http://127.0.0.1:5000'
    TEST_MONGO_URI = 'mongodb://localhost/datagenie'

    def test_ping(self):
        r = requests.get(f'{self.BASE_URL}/ping')
        self.assertEqual(r.status_code, 200)
        self.assertIn('pong', r.text)

    def test_save_and_load_project(self):
        # Save project
        payload = {
            'name': 'unittest_project',
            'config': {
                'mongo_uri': self.TEST_MONGO_URI,
                'collection': 'test_collection',
                'pipeline': []
            }
        }
        r = requests.post(f'{self.BASE_URL}/api/save_config', json=payload)
        self.assertEqual(r.status_code, 200)
        self.assertIn('saved', r.text)

        # Load projects
        r2 = requests.get(f'{self.BASE_URL}/api/load_configs')
        self.assertEqual(r2.status_code, 200)
        self.assertIn('unittest_project', r2.text)

if __name__ == '__main__':
    unittest.main()
