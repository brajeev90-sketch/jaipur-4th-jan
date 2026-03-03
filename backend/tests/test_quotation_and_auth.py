"""
Backend API tests for JAIPUR furniture app
Focus: 1) Quotation save with image field 2) Change password API 3) Items persistence
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestAuthEndpoints:
    """Authentication endpoint tests including change password"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup for each test"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
    
    def get_auth_token(self):
        """Helper to get authentication token"""
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "username": "admin",
            "password": "admin123"
        })
        if response.status_code == 200:
            return response.json().get("token")
        return None
    
    def test_login_success(self):
        """Test login with valid credentials"""
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "username": "admin",
            "password": "admin123"
        })
        print(f"Login response status: {response.status_code}")
        print(f"Login response: {response.text[:500] if response.text else 'No response'}")
        
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert "token" in data, "Token not in response"
        assert data["username"] == "admin", "Username mismatch"
        print("✅ Login test passed")
    
    def test_login_invalid_credentials(self):
        """Test login with invalid credentials"""
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "username": "wrong_user",
            "password": "wrong_pass"
        })
        print(f"Invalid login response status: {response.status_code}")
        assert response.status_code == 401, "Should return 401 for invalid credentials"
        print("✅ Invalid credentials test passed")
    
    def test_change_password_endpoint(self):
        """Test change password API with JSON body (POST /api/auth/change-password)"""
        token = self.get_auth_token()
        assert token, "Failed to get auth token"
        
        # Test change password with correct current password
        response = self.session.post(
            f"{BASE_URL}/api/auth/change-password",
            json={
                "current_password": "admin123",
                "new_password": "newpassword123"
            },
            headers={"Authorization": f"Bearer {token}"}
        )
        print(f"Change password response status: {response.status_code}")
        print(f"Change password response: {response.text[:500] if response.text else 'No response'}")
        
        assert response.status_code == 200, f"Change password failed: {response.text}"
        data = response.json()
        assert "message" in data, "Message not in response"
        print("✅ Change password test passed")
        
        # Now change it back to admin123
        # Get new token with new password
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "username": "admin",
            "password": "newpassword123"
        })
        if login_response.status_code == 200:
            new_token = login_response.json().get("token")
            # Revert password
            revert_response = self.session.post(
                f"{BASE_URL}/api/auth/change-password",
                json={
                    "current_password": "newpassword123",
                    "new_password": "admin123"
                },
                headers={"Authorization": f"Bearer {new_token}"}
            )
            print(f"Password reverted: {revert_response.status_code}")
    
    def test_change_password_wrong_current(self):
        """Test change password with wrong current password"""
        token = self.get_auth_token()
        assert token, "Failed to get auth token"
        
        response = self.session.post(
            f"{BASE_URL}/api/auth/change-password",
            json={
                "current_password": "wrongpassword",
                "new_password": "newpassword123"
            },
            headers={"Authorization": f"Bearer {token}"}
        )
        print(f"Wrong current password response: {response.status_code}")
        assert response.status_code == 401, "Should return 401 for wrong current password"
        print("✅ Wrong current password test passed")
    
    def test_verify_token(self):
        """Test token verification endpoint"""
        token = self.get_auth_token()
        assert token, "Failed to get auth token"
        
        response = self.session.get(
            f"{BASE_URL}/api/auth/verify",
            headers={"Authorization": f"Bearer {token}"}
        )
        print(f"Verify token response: {response.status_code}")
        assert response.status_code == 200, f"Token verification failed: {response.text}"
        data = response.json()
        assert data["valid"] == True, "Token should be valid"
        print("✅ Token verification test passed")


class TestQuotationEndpoints:
    """Quotation CRUD tests - verifying items with image field are saved correctly"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup for each test"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
    
    def test_create_quotation_with_items_and_images(self):
        """Test creating a quotation with items containing image field"""
        # Create quotation with items that have image field
        quotation_data = {
            "reference": "TEST_QT-001",
            "customer_name": "Test Customer",
            "customer_email": "test@example.com",
            "date": "2024-01-15",
            "currency": "FOB_USD",
            "notes": "Test quotation for image field",
            "items": [
                {
                    "id": "test-item-1",
                    "product_id": "prod-1",
                    "product_code": "TABLE-001",
                    "description": "Dining Table",
                    "height_cm": 75,
                    "depth_cm": 90,
                    "width_cm": 180,
                    "cbm": 1.215,
                    "quantity": 2,
                    "fob_price": 500.00,
                    "total": 1000.00,
                    "image": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
                },
                {
                    "id": "test-item-2",
                    "product_id": "prod-2",
                    "product_code": "CHAIR-001",
                    "description": "Dining Chair",
                    "height_cm": 45,
                    "depth_cm": 45,
                    "width_cm": 45,
                    "cbm": 0.091,
                    "quantity": 4,
                    "fob_price": 150.00,
                    "total": 600.00,
                    "image": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=="
                }
            ],
            "total_items": 6,
            "total_cbm": 2.579,
            "total_value": 1600.00,
            "status": "draft"
        }
        
        response = self.session.post(f"{BASE_URL}/api/quotations", json=quotation_data)
        print(f"Create quotation response status: {response.status_code}")
        print(f"Create quotation response: {response.text[:1000] if response.text else 'No response'}")
        
        assert response.status_code in [200, 201], f"Create quotation failed: {response.text}"
        data = response.json()
        assert "id" in data, "Quotation ID not returned"
        assert len(data.get("items", [])) == 2, "Should have 2 items"
        
        # Verify items have image field preserved
        for item in data.get("items", []):
            assert "image" in item, f"Image field missing in item: {item}"
            if item.get("product_code") == "TABLE-001":
                assert item.get("image", "").startswith("data:image"), "Image should be base64 data"
        
        print("✅ Quotation created with items and images")
        return data["id"]
    
    def test_get_quotation_retrieves_items_with_images(self):
        """Test that getting a quotation retrieves items with their images"""
        # First create a quotation
        quotation_data = {
            "reference": "TEST_QT-GET-001",
            "customer_name": "Test Customer GET",
            "date": "2024-01-15",
            "currency": "FOB_USD",
            "items": [
                {
                    "id": "get-test-item-1",
                    "product_code": "SOFA-001",
                    "description": "3 Seater Sofa",
                    "quantity": 1,
                    "fob_price": 800.00,
                    "total": 800.00,
                    "image": "data:image/png;base64,testImageData123"
                }
            ],
            "total_value": 800.00,
            "status": "draft"
        }
        
        create_response = self.session.post(f"{BASE_URL}/api/quotations", json=quotation_data)
        assert create_response.status_code in [200, 201], f"Create failed: {create_response.text}"
        created_data = create_response.json()
        quotation_id = created_data["id"]
        
        # Now GET the quotation and verify items with images
        get_response = self.session.get(f"{BASE_URL}/api/quotations/{quotation_id}")
        print(f"Get quotation response status: {get_response.status_code}")
        print(f"Get quotation response: {get_response.text[:1000] if get_response.text else 'No response'}")
        
        assert get_response.status_code == 200, f"Get quotation failed: {get_response.text}"
        retrieved_data = get_response.json()
        
        # Verify items are retrieved with image field
        assert "items" in retrieved_data, "Items not in response"
        assert len(retrieved_data["items"]) > 0, "No items retrieved"
        
        for item in retrieved_data["items"]:
            print(f"Item: {item.get('product_code')} - Image field present: {'image' in item}")
            assert "image" in item, f"Image field missing in retrieved item: {item}"
        
        print("✅ Quotation retrieved with items containing images")
        return quotation_id
    
    def test_update_quotation_preserves_item_images(self):
        """Test that updating a quotation preserves item images"""
        # Create quotation
        create_data = {
            "reference": "TEST_QT-UPDATE-001",
            "customer_name": "Update Test Customer",
            "date": "2024-01-15",
            "items": [
                {
                    "id": "update-item-1",
                    "product_code": "BED-001",
                    "description": "King Size Bed",
                    "quantity": 1,
                    "fob_price": 1200.00,
                    "total": 1200.00,
                    "image": "data:image/png;base64,originalImageData"
                }
            ],
            "total_value": 1200.00,
            "status": "draft"
        }
        
        create_response = self.session.post(f"{BASE_URL}/api/quotations", json=create_data)
        assert create_response.status_code in [200, 201]
        quotation_id = create_response.json()["id"]
        
        # Update quotation - change customer name but keep items
        update_data = {
            "customer_name": "Updated Customer Name",
            "items": [
                {
                    "id": "update-item-1",
                    "product_code": "BED-001",
                    "description": "King Size Bed",
                    "quantity": 2,  # Changed quantity
                    "fob_price": 1200.00,
                    "total": 2400.00,
                    "image": "data:image/png;base64,originalImageData"  # Same image
                }
            ],
            "total_value": 2400.00
        }
        
        update_response = self.session.put(f"{BASE_URL}/api/quotations/{quotation_id}", json=update_data)
        print(f"Update quotation response: {update_response.status_code}")
        print(f"Update response body: {update_response.text[:500] if update_response.text else 'No response'}")
        
        assert update_response.status_code == 200, f"Update failed: {update_response.text}"
        updated_data = update_response.json()
        
        # Verify item image is preserved
        assert updated_data["customer_name"] == "Updated Customer Name"
        assert len(updated_data["items"]) == 1
        assert updated_data["items"][0].get("image") == "data:image/png;base64,originalImageData"
        
        print("✅ Quotation updated with item images preserved")
    
    def test_list_all_quotations(self):
        """Test listing all quotations"""
        response = self.session.get(f"{BASE_URL}/api/quotations")
        print(f"List quotations response: {response.status_code}")
        
        assert response.status_code == 200, f"List quotations failed: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"✅ Listed {len(data)} quotations")


class TestProductsEndpoints:
    """Test products API to verify image field handling"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
    
    def test_create_product_with_image(self):
        """Test creating a product with image field"""
        product_data = {
            "product_code": "TEST_PROD-001",
            "description": "Test Product with Image",
            "category": "table",
            "height_cm": 75,
            "depth_cm": 90,
            "width_cm": 180,
            "cbm": 1.215,
            "fob_price_usd": 500,
            "image": "data:image/png;base64,testProductImageData",
            "images": ["data:image/png;base64,image1", "data:image/png;base64,image2"]
        }
        
        response = self.session.post(f"{BASE_URL}/api/products", json=product_data)
        print(f"Create product response: {response.status_code}")
        print(f"Create product body: {response.text[:500] if response.text else 'No response'}")
        
        # Handle both 201 (created) and 400 (duplicate) scenarios
        if response.status_code == 400 and "already exists" in response.text:
            print("✅ Product already exists (expected for repeat runs)")
            return
        
        assert response.status_code in [200, 201], f"Create product failed: {response.text}"
        data = response.json()
        assert data.get("image") == "data:image/png;base64,testProductImageData"
        assert len(data.get("images", [])) == 2
        print("✅ Product created with image fields")
    
    def test_get_products(self):
        """Test getting products list"""
        response = self.session.get(f"{BASE_URL}/api/products")
        print(f"Get products response: {response.status_code}")
        
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✅ Got {len(data)} products")


class TestCleanup:
    """Cleanup test data after tests"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
    
    def test_cleanup_test_quotations(self):
        """Clean up test quotations created during tests"""
        response = self.session.get(f"{BASE_URL}/api/quotations")
        if response.status_code == 200:
            quotations = response.json()
            for q in quotations:
                if q.get("reference", "").startswith("TEST_"):
                    delete_response = self.session.delete(f"{BASE_URL}/api/quotations/{q['id']}")
                    print(f"Deleted quotation {q['reference']}: {delete_response.status_code}")
        print("✅ Cleanup completed")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
