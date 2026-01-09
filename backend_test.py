import requests
import sys
import json
from datetime import datetime

class JaipurFurnitureAPITester:
    def __init__(self, base_url="https://jaipur-quoter.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []

    def run_test(self, name, method, endpoint, expected_status, data=None, headers=None):
        """Run a single API test"""
        url = f"{self.api_url}/{endpoint}"
        if headers is None:
            headers = {'Content-Type': 'application/json'}

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=headers)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                self.test_results.append({"test": name, "status": "PASS", "response_code": response.status_code})
                return True, response.json() if response.content else {}
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                if response.content:
                    print(f"   Response: {response.text[:200]}")
                self.test_results.append({"test": name, "status": "FAIL", "expected": expected_status, "actual": response.status_code})
                return False, {}

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            self.test_results.append({"test": name, "status": "ERROR", "error": str(e)})
            return False, {}

    def test_categories_api(self):
        """Test Categories API - especially POST /api/categories for adding new categories"""
        print("\n=== TESTING CATEGORIES API ===")
        
        # Get existing categories
        success, categories = self.run_test("Get Categories", "GET", "categories", 200)
        if success:
            print(f"   Found {len(categories)} existing categories")
        
        # Test creating new category
        new_category = {
            "name": f"Test Category {datetime.now().strftime('%H%M%S')}"
        }
        success, created_cat = self.run_test("Create New Category", "POST", "categories", 200, new_category)
        if success:
            print(f"   Created category: {created_cat.get('name', 'Unknown')}")
            return created_cat.get('id')
        return None

    def test_orders_with_factory_inform_date(self):
        """Test Orders API with Factory Inform Date field"""
        print("\n=== TESTING ORDERS WITH FACTORY INFORM DATE ===")
        
        # Create test order with factory_inform_date
        test_order = {
            "sales_order_ref": f"SO-TEST-{datetime.now().strftime('%H%M%S')}",
            "buyer_po_ref": "PO-TEST-001",
            "buyer_name": "Test Buyer",
            "entry_date": "2024-01-15",
            "factory_inform_date": "2024-01-20",  # New field to test
            "status": "Draft",
            "factory": "Test Factory",
            "items": []
        }
        
        success, created_order = self.run_test("Create Order with Factory Inform Date", "POST", "orders", 200, test_order)
        if success:
            order_id = created_order.get('id')
            print(f"   Created order: {order_id}")
            
            # Verify the order has factory_inform_date
            success, order_data = self.run_test("Get Order with Factory Inform Date", "GET", f"orders/{order_id}", 200)
            if success:
                factory_inform_date = order_data.get('factory_inform_date')
                if factory_inform_date == "2024-01-20":
                    print(f"   ✅ Factory Inform Date correctly saved: {factory_inform_date}")
                    return order_id
                else:
                    print(f"   ❌ Factory Inform Date mismatch: expected '2024-01-20', got '{factory_inform_date}'")
        return None

    def test_orders_with_multiple_items(self):
        """Test saving orders with 4+ items"""
        print("\n=== TESTING ORDERS WITH MULTIPLE ITEMS (4+) ===")
        
        # Create order with 5 items
        test_items = []
        for i in range(5):
            item = {
                "id": f"item-{i+1}",
                "product_code": f"TEST-{i+1:03d}",
                "description": f"Test Product {i+1}",
                "category": "Chair",
                "height_cm": 80 + i,
                "depth_cm": 50 + i,
                "width_cm": 60 + i,
                "cbm": 0.24 + (i * 0.01),
                "quantity": i + 1,
                "notes": f"Test notes for item {i+1}"
            }
            test_items.append(item)
        
        test_order = {
            "sales_order_ref": f"SO-MULTI-{datetime.now().strftime('%H%M%S')}",
            "buyer_po_ref": "PO-MULTI-001",
            "buyer_name": "Multi Item Buyer",
            "entry_date": "2024-01-15",
            "factory_inform_date": "2024-01-20",
            "status": "Draft",
            "factory": "Test Factory",
            "items": test_items
        }
        
        success, created_order = self.run_test("Create Order with 5 Items", "POST", "orders", 200, test_order)
        if success:
            order_id = created_order.get('id')
            items_count = len(created_order.get('items', []))
            print(f"   Created order with {items_count} items")
            
            if items_count == 5:
                print(f"   ✅ All 5 items saved correctly")
                return order_id
            else:
                print(f"   ❌ Items count mismatch: expected 5, got {items_count}")
        return None

    def test_pdf_export(self, order_id):
        """Test PDF export functionality"""
        print("\n=== TESTING PDF EXPORT ===")
        
        if not order_id:
            print("   ❌ No order ID provided for PDF export test")
            return False
            
        # Test PDF export endpoint
        pdf_url = f"{self.api_url}/orders/{order_id}/export/pdf"
        try:
            response = requests.get(pdf_url)
            if response.status_code == 200:
                content_type = response.headers.get('content-type', '')
                if 'application/pdf' in content_type:
                    print(f"   ✅ PDF export successful - Content-Type: {content_type}")
                    print(f"   ✅ PDF size: {len(response.content)} bytes")
                    self.tests_passed += 1
                    self.test_results.append({"test": "PDF Export", "status": "PASS", "pdf_size": len(response.content)})
                    return True
                else:
                    print(f"   ❌ Wrong content type: {content_type}")
            else:
                print(f"   ❌ PDF export failed - Status: {response.status_code}")
        except Exception as e:
            print(f"   ❌ PDF export error: {str(e)}")
        
        self.tests_passed += 1  # Count the test
        self.test_results.append({"test": "PDF Export", "status": "FAIL"})
        return False

    def test_basic_apis(self):
        """Test basic API endpoints"""
        print("\n=== TESTING BASIC APIs ===")
        
        # Test root endpoint
        self.run_test("API Root", "GET", "", 200)
        
        # Test dashboard stats
        self.run_test("Dashboard Stats", "GET", "dashboard/stats", 200)
        
        # Test factories
        self.run_test("Get Factories", "GET", "factories", 200)
        
        # Test leather library
        self.run_test("Get Leather Library", "GET", "leather-library", 200)
        
        # Test finish library
        self.run_test("Get Finish Library", "GET", "finish-library", 200)

def main():
    print("🧪 JAIPUR Fine Wood Furniture - Backend API Testing")
    print("=" * 60)
    
    tester = JaipurFurnitureAPITester()
    
    # Test basic APIs first
    tester.test_basic_apis()
    
    # Test Categories API (for Add New Category feature)
    category_id = tester.test_categories_api()
    
    # Test Orders with Factory Inform Date
    order_id = tester.test_orders_with_factory_inform_date()
    
    # Test Orders with multiple items (4+)
    multi_order_id = tester.test_orders_with_multiple_items()
    
    # Test PDF export with larger images
    if order_id:
        tester.test_pdf_export(order_id)
    elif multi_order_id:
        tester.test_pdf_export(multi_order_id)
    
    # Print final results
    print(f"\n📊 FINAL RESULTS")
    print("=" * 40)
    print(f"Tests Run: {tester.tests_run}")
    print(f"Tests Passed: {tester.tests_passed}")
    print(f"Success Rate: {(tester.tests_passed/tester.tests_run*100):.1f}%")
    
    # Print detailed results
    print(f"\n📋 DETAILED RESULTS:")
    for result in tester.test_results:
        status_icon = "✅" if result["status"] == "PASS" else "❌"
        print(f"   {status_icon} {result['test']}: {result['status']}")
    
    return 0 if tester.tests_passed == tester.tests_run else 1

if __name__ == "__main__":
    sys.exit(main())