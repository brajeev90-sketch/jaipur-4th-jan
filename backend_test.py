#!/usr/bin/env python3

import requests
import sys
import json
from datetime import datetime
import uuid

class JaipurAPITester:
    def __init__(self, base_url="https://furnisheets.preview.emergentagent.com"):
        self.base_url = base_url
        self.tests_run = 0
        self.tests_passed = 0
        self.created_order_id = None
        self.created_leather_id = None
        self.created_finish_id = None

    def run_test(self, name, method, endpoint, expected_status, data=None, headers=None):
        """Run a single API test"""
        url = f"{self.base_url}/{endpoint}"
        if headers is None:
            headers = {'Content-Type': 'application/json'}

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {url}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, timeout=10)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers, timeout=10)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=headers, timeout=10)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers, timeout=10)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    return success, response.json() if response.content else {}
                except:
                    return success, {}
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                print(f"   Response: {response.text[:200]}...")
                return False, {}

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            return False, {}

    def test_root_endpoint(self):
        """Test root API endpoint"""
        return self.run_test("Root API", "GET", "api/", 200)

    def test_dashboard_stats(self):
        """Test dashboard stats endpoint"""
        return self.run_test("Dashboard Stats", "GET", "api/dashboard/stats", 200)

    def test_factories_endpoint(self):
        """Test factories endpoint"""
        return self.run_test("Factories List", "GET", "api/factories", 200)

    def test_categories_endpoint(self):
        """Test categories endpoint"""
        return self.run_test("Categories List", "GET", "api/categories", 200)

    def test_template_settings(self):
        """Test template settings endpoints"""
        # Get settings
        success, response = self.run_test("Get Template Settings", "GET", "api/template-settings", 200)
        if not success:
            return False

        # Update settings
        settings_data = {
            "id": "default",
            "company_name": "JAIPUR – A fine wood furniture company",
            "logo_text": "JAIPUR TEST",
            "primary_color": "#3d2c1e",
            "accent_color": "#d4622e",
            "font_family": "Playfair Display, serif",
            "body_font": "Manrope, sans-serif",
            "page_margin_mm": 15,
            "show_borders": True,
            "header_height_mm": 25,
            "footer_height_mm": 20
        }
        success, _ = self.run_test("Update Template Settings", "PUT", "api/template-settings", 200, settings_data)
        return success

    def test_leather_library_crud(self):
        """Test leather library CRUD operations"""
        # Get all leather items
        success, _ = self.run_test("Get Leather Library", "GET", "api/leather-library", 200)
        if not success:
            return False

        # Create leather item
        leather_data = {
            "id": str(uuid.uuid4()),
            "code": f"TEST-LTH-{datetime.now().strftime('%H%M%S')}",
            "name": "Test Leather",
            "description": "Test leather description",
            "color": "#8B4513",
            "image": "",
            "created_at": datetime.now().isoformat()
        }
        success, response = self.run_test("Create Leather Item", "POST", "api/leather-library", 200, leather_data)
        if success:
            self.created_leather_id = leather_data["id"]

        # Update leather item
        if self.created_leather_id:
            leather_data["name"] = "Updated Test Leather"
            success, _ = self.run_test("Update Leather Item", "PUT", f"api/leather-library/{self.created_leather_id}", 200, leather_data)

        # Delete leather item
        if self.created_leather_id:
            success, _ = self.run_test("Delete Leather Item", "DELETE", f"api/leather-library/{self.created_leather_id}", 200)

        return True

    def test_finish_library_crud(self):
        """Test finish library CRUD operations"""
        # Get all finish items
        success, _ = self.run_test("Get Finish Library", "GET", "api/finish-library", 200)
        if not success:
            return False

        # Create finish item
        finish_data = {
            "id": str(uuid.uuid4()),
            "code": f"TEST-FIN-{datetime.now().strftime('%H%M%S')}",
            "name": "Test Finish",
            "description": "Test finish description",
            "color": "#d4a574",
            "image": "",
            "created_at": datetime.now().isoformat()
        }
        success, response = self.run_test("Create Finish Item", "POST", "api/finish-library", 200, finish_data)
        if success:
            self.created_finish_id = finish_data["id"]

        # Update finish item
        if self.created_finish_id:
            finish_data["name"] = "Updated Test Finish"
            success, _ = self.run_test("Update Finish Item", "PUT", f"api/finish-library/{self.created_finish_id}", 200, finish_data)

        # Delete finish item
        if self.created_finish_id:
            success, _ = self.run_test("Delete Finish Item", "DELETE", f"api/finish-library/{self.created_finish_id}", 200)

        return True

    def test_orders_crud(self):
        """Test orders CRUD operations"""
        # Get all orders
        success, _ = self.run_test("Get All Orders", "GET", "api/orders", 200)
        if not success:
            return False

        # Create order
        order_data = {
            "sales_order_ref": f"TEST-SO-{datetime.now().strftime('%Y%m%d%H%M%S')}",
            "buyer_po_ref": "TEST-PO-001",
            "buyer_name": "Test Buyer",
            "entry_date": datetime.now().strftime('%Y-%m-%d'),
            "status": "Draft",
            "factory": "Main Factory",
            "items": [
                {
                    "id": str(uuid.uuid4()),
                    "product_code": "TEST-PRD-001",
                    "description": "Test Product",
                    "category": "Chair",
                    "height_cm": 80,
                    "depth_cm": 60,
                    "width_cm": 50,
                    "cbm": 0.24,
                    "cbm_auto": True,
                    "quantity": 2,
                    "in_house_production": True,
                    "machine_hall": "Hall A",
                    "leather_code": "LTH-001",
                    "finish_code": "FIN-001",
                    "color_notes": "Antique brass",
                    "leg_color": "Dark brown",
                    "wood_finish": "Natural oak",
                    "notes": "Test notes for the product",
                    "images": [],
                    "reference_images": []
                }
            ]
        }
        success, response = self.run_test("Create Order", "POST", "api/orders", 200, order_data)
        if success and 'id' in response:
            self.created_order_id = response['id']

        # Get specific order
        if self.created_order_id:
            success, _ = self.run_test("Get Specific Order", "GET", f"api/orders/{self.created_order_id}", 200)

        # Update order
        if self.created_order_id:
            update_data = {
                "buyer_name": "Updated Test Buyer",
                "status": "In Production"
            }
            success, _ = self.run_test("Update Order", "PUT", f"api/orders/{self.created_order_id}", 200, update_data)

        return True

    def test_export_endpoints(self):
        """Test export endpoints"""
        if not self.created_order_id:
            print("⚠️  Skipping export tests - no order created")
            return True

        # Test PDF export
        success, _ = self.run_test("Export PDF", "GET", f"api/orders/{self.created_order_id}/export/pdf", 200)
        
        # Test PPT export
        success, _ = self.run_test("Export PPT", "GET", f"api/orders/{self.created_order_id}/export/ppt", 200)
        
        # Test HTML preview
        success, _ = self.run_test("Preview HTML", "GET", f"api/orders/{self.created_order_id}/preview-html", 200)

        # Test exports list
        success, _ = self.run_test("Get Exports", "GET", "api/exports", 200)
        
        # Test order exports
        success, _ = self.run_test("Get Order Exports", "GET", f"api/exports/{self.created_order_id}", 200)

        return True

    def cleanup(self):
        """Clean up test data"""
        if self.created_order_id:
            self.run_test("Cleanup Order", "DELETE", f"api/orders/{self.created_order_id}", 200)

    def run_all_tests(self):
        """Run all API tests"""
        print("🚀 Starting JAIPUR Production Sheet API Tests")
        print(f"   Base URL: {self.base_url}")
        print("=" * 60)

        try:
            # Basic endpoints
            self.test_root_endpoint()
            self.test_dashboard_stats()
            self.test_factories_endpoint()
            self.test_categories_endpoint()
            
            # Template settings
            self.test_template_settings()
            
            # Library management
            self.test_leather_library_crud()
            self.test_finish_library_crud()
            
            # Orders management
            self.test_orders_crud()
            
            # Export functionality
            self.test_export_endpoints()

        except KeyboardInterrupt:
            print("\n⚠️  Tests interrupted by user")
        except Exception as e:
            print(f"\n💥 Unexpected error: {str(e)}")
        finally:
            # Cleanup
            self.cleanup()

        # Print results
        print("\n" + "=" * 60)
        print(f"📊 Test Results: {self.tests_passed}/{self.tests_run} passed")
        
        if self.tests_passed == self.tests_run:
            print("🎉 All tests passed!")
            return 0
        else:
            print(f"❌ {self.tests_run - self.tests_passed} tests failed")
            return 1

def main():
    tester = JaipurAPITester()
    return tester.run_all_tests()

if __name__ == "__main__":
    sys.exit(main())