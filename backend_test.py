#!/usr/bin/env python3
"""
SongSnap Backend API Testing Script
Tests all backend APIs for the SongSnap social music platform
"""

import requests
import json
import sys
from datetime import datetime
from typing import Dict, Any, Optional

# Configuration
BACKEND_URL = "https://mobilemelody.preview.emergentagent.com/api"
TEST_USER_TOKEN = None  # Will be set after authentication

class APITester:
    def __init__(self, base_url: str):
        self.base_url = base_url
        self.session = requests.Session()
        self.test_results = []
        self.auth_token = None
        self.test_user_id = None
        
    def log_test(self, test_name: str, success: bool, details: str = "", response_data: Any = None):
        """Log test result"""
        result = {
            "test": test_name,
            "success": success,
            "details": details,
            "timestamp": datetime.now().isoformat(),
            "response_data": response_data
        }
        self.test_results.append(result)
        
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status} {test_name}")
        if details:
            print(f"   Details: {details}")
        if not success and response_data:
            print(f"   Response: {response_data}")
        print()
    
    def make_request(self, method: str, endpoint: str, skip_auth: bool = False, **kwargs) -> requests.Response:
        """Make HTTP request with proper headers"""
        url = f"{self.base_url}{endpoint}"
        headers = kwargs.get('headers', {})
        
        if self.auth_token and 'Authorization' not in headers and not skip_auth:
            headers['Authorization'] = f"Bearer {self.auth_token}"
        
        kwargs['headers'] = headers
        
        try:
            response = self.session.request(method, url, **kwargs)
            return response
        except Exception as e:
            print(f"Request failed: {e}")
            raise
    
    def test_health_endpoints(self):
        """Test health check endpoints"""
        print("=== Testing Health Check Endpoints ===")
        
        # Test root endpoint
        try:
            response = self.make_request("GET", "/")
            if response.status_code == 200:
                data = response.json()
                self.log_test("GET /api/", True, f"Status: {response.status_code}, Message: {data.get('message', 'N/A')}")
            else:
                self.log_test("GET /api/", False, f"Status: {response.status_code}", response.text)
        except Exception as e:
            self.log_test("GET /api/", False, f"Exception: {str(e)}")
        
        # Test health endpoint
        try:
            response = self.make_request("GET", "/health")
            if response.status_code == 200:
                data = response.json()
                self.log_test("GET /api/health", True, f"Status: {response.status_code}, Health: {data.get('status', 'N/A')}")
            else:
                self.log_test("GET /api/health", False, f"Status: {response.status_code}", response.text)
        except Exception as e:
            self.log_test("GET /api/health", False, f"Exception: {str(e)}")
    
    def test_google_auth(self):
        """Test Google OAuth authentication"""
        print("=== Testing Google OAuth Authentication ===")
        
        # Test with mock Google token (this will fail but we can see the endpoint structure)
        mock_token = "mock_google_token_for_testing"
        
        try:
            response = self.make_request("POST", "/auth/google", 
                                       json={"token": mock_token},
                                       headers={"Content-Type": "application/json"})
            
            if response.status_code == 401:
                self.log_test("POST /api/auth/google", True, 
                            "Endpoint accessible, correctly rejects invalid token (expected behavior)")
            elif response.status_code == 200:
                # Unexpected success with mock token
                self.log_test("POST /api/auth/google", False, 
                            "Unexpectedly accepted mock token", response.json())
            else:
                self.log_test("POST /api/auth/google", False, 
                            f"Unexpected status: {response.status_code}", response.text)
        except Exception as e:
            self.log_test("POST /api/auth/google", False, f"Exception: {str(e)}")
        
        # Test /auth/me without token (should fail)
        try:
            response = self.make_request("GET", "/auth/me")
            if response.status_code == 401:
                self.log_test("GET /api/auth/me (no token)", True, 
                            "Correctly rejects request without authentication")
            else:
                self.log_test("GET /api/auth/me (no token)", False, 
                            f"Unexpected status: {response.status_code}", response.text)
        except Exception as e:
            self.log_test("GET /api/auth/me (no token)", False, f"Exception: {str(e)}")
    
    def test_spotify_integration(self):
        """Test Spotify API integration"""
        print("=== Testing Spotify Integration ===")
        
        # Test without authentication (should fail)
        try:
            response = self.make_request("GET", "/spotify/search?q=taylor swift")
            if response.status_code == 401:
                self.log_test("GET /api/spotify/search (no auth)", True, 
                            "Correctly requires authentication")
            else:
                self.log_test("GET /api/spotify/search (no auth)", False, 
                            f"Should require auth, got status: {response.status_code}", response.text)
        except Exception as e:
            self.log_test("GET /api/spotify/search (no auth)", False, f"Exception: {str(e)}")
        
        # Test with mock auth token
        if self.auth_token:
            test_queries = ["taylor swift", "billie eilish", "the weeknd"]
            for query in test_queries:
                try:
                    response = self.make_request("GET", f"/spotify/search?q={query}")
                    if response.status_code == 200:
                        data = response.json()
                        self.log_test(f"Spotify search: '{query}'", True, 
                                    f"Found {len(data)} tracks")
                    else:
                        self.log_test(f"Spotify search: '{query}'", False, 
                                    f"Status: {response.status_code}", response.text)
                except Exception as e:
                    self.log_test(f"Spotify search: '{query}'", False, f"Exception: {str(e)}")
    
    def test_youtube_integration(self):
        """Test YouTube API integration"""
        print("=== Testing YouTube Integration ===")
        
        # Test without authentication (should fail)
        try:
            response = self.make_request("GET", "/youtube/search?q=taylor swift")
            if response.status_code == 401:
                self.log_test("GET /api/youtube/search (no auth)", True, 
                            "Correctly requires authentication")
            else:
                self.log_test("GET /api/youtube/search (no auth)", False, 
                            f"Should require auth, got status: {response.status_code}", response.text)
        except Exception as e:
            self.log_test("GET /api/youtube/search (no auth)", False, f"Exception: {str(e)}")
        
        # Test with mock auth token
        if self.auth_token:
            test_queries = ["taylor swift", "billie eilish", "the weeknd"]
            for query in test_queries:
                try:
                    response = self.make_request("GET", f"/youtube/search?q={query}")
                    if response.status_code == 200:
                        data = response.json()
                        self.log_test(f"YouTube search: '{query}'", True, 
                                    f"Found {len(data)} videos")
                    else:
                        self.log_test(f"YouTube search: '{query}'", False, 
                                    f"Status: {response.status_code}", response.text)
                except Exception as e:
                    self.log_test(f"YouTube search: '{query}'", False, f"Exception: {str(e)}")
    
    def test_user_apis(self):
        """Test User management APIs"""
        print("=== Testing User Management APIs ===")
        
        # Test user search without auth
        try:
            response = self.make_request("GET", "/users/search?q=test")
            if response.status_code == 401:
                self.log_test("GET /api/users/search (no auth)", True, 
                            "Correctly requires authentication")
            else:
                self.log_test("GET /api/users/search (no auth)", False, 
                            f"Should require auth, got status: {response.status_code}", response.text)
        except Exception as e:
            self.log_test("GET /api/users/search (no auth)", False, f"Exception: {str(e)}")
        
        if self.auth_token:
            # Test user search
            try:
                response = self.make_request("GET", "/users/search?q=test")
                if response.status_code == 200:
                    data = response.json()
                    self.log_test("User search", True, f"Search returned {len(data)} users")
                else:
                    self.log_test("User search", False, 
                                f"Status: {response.status_code}", response.text)
            except Exception as e:
                self.log_test("User search", False, f"Exception: {str(e)}")
            
            # Test get user profile (using mock user ID)
            mock_user_id = "507f1f77bcf86cd799439011"  # Valid ObjectId format
            try:
                response = self.make_request("GET", f"/users/{mock_user_id}")
                if response.status_code in [200, 404]:  # Both are acceptable
                    if response.status_code == 404:
                        self.log_test("GET user profile", True, "Correctly returns 404 for non-existent user")
                    else:
                        self.log_test("GET user profile", True, "Successfully retrieved user profile")
                else:
                    self.log_test("GET user profile", False, 
                                f"Status: {response.status_code}", response.text)
            except Exception as e:
                self.log_test("GET user profile", False, f"Exception: {str(e)}")
            
            # Test profile update
            try:
                update_data = {
                    "name": "Test User Updated",
                    "bio": "Updated bio for testing"
                }
                response = self.make_request("PUT", "/users/profile", 
                                           json=update_data,
                                           headers={"Content-Type": "application/json"})
                if response.status_code == 200:
                    self.log_test("Update user profile", True, "Profile updated successfully")
                else:
                    self.log_test("Update user profile", False, 
                                f"Status: {response.status_code}", response.text)
            except Exception as e:
                self.log_test("Update user profile", False, f"Exception: {str(e)}")
    
    def test_post_apis(self):
        """Test Post management APIs"""
        print("=== Testing Post Management APIs ===")
        
        if not self.auth_token:
            print("Skipping post tests - no auth token available")
            return
        
        # Test create post
        test_post_data = {
            "content": "Testing post creation with a great song!",
            "song_data": {
                "title": "Test Song",
                "artist": "Test Artist",
                "album": "Test Album",
                "image_url": "https://example.com/image.jpg",
                "preview_url": "https://example.com/preview.mp3",
                "source": "spotify",
                "track_id": "test_track_123"
            }
        }
        
        created_post_id = None
        try:
            response = self.make_request("POST", "/posts", 
                                       json=test_post_data,
                                       headers={"Content-Type": "application/json"})
            if response.status_code == 200:
                data = response.json()
                created_post_id = data.get("id")
                self.log_test("Create post", True, f"Post created with ID: {created_post_id}")
            else:
                self.log_test("Create post", False, 
                            f"Status: {response.status_code}", response.text)
        except Exception as e:
            self.log_test("Create post", False, f"Exception: {str(e)}")
        
        # Test get all feed
        try:
            response = self.make_request("GET", "/posts/feed")
            if response.status_code == 200:
                data = response.json()
                self.log_test("Get all feed", True, f"Feed returned {len(data)} posts")
            else:
                self.log_test("Get all feed", False, 
                            f"Status: {response.status_code}", response.text)
        except Exception as e:
            self.log_test("Get all feed", False, f"Exception: {str(e)}")
        
        # Test get following feed
        try:
            response = self.make_request("GET", "/posts/following")
            if response.status_code == 200:
                data = response.json()
                self.log_test("Get following feed", True, f"Following feed returned {len(data)} posts")
            else:
                self.log_test("Get following feed", False, 
                            f"Status: {response.status_code}", response.text)
        except Exception as e:
            self.log_test("Get following feed", False, f"Exception: {str(e)}")
        
        # Test like/unlike post (if we have a post ID)
        if created_post_id:
            # Test like post
            try:
                response = self.make_request("POST", f"/posts/{created_post_id}/like")
                if response.status_code == 200:
                    self.log_test("Like post", True, "Post liked successfully")
                    
                    # Test unlike post
                    response = self.make_request("DELETE", f"/posts/{created_post_id}/like")
                    if response.status_code == 200:
                        self.log_test("Unlike post", True, "Post unliked successfully")
                    else:
                        self.log_test("Unlike post", False, 
                                    f"Status: {response.status_code}", response.text)
                else:
                    self.log_test("Like post", False, 
                                f"Status: {response.status_code}", response.text)
            except Exception as e:
                self.log_test("Like/Unlike post", False, f"Exception: {str(e)}")
    
    def test_comment_apis(self):
        """Test Comment APIs"""
        print("=== Testing Comment APIs ===")
        
        if not self.auth_token:
            print("Skipping comment tests - no auth token available")
            return
        
        # Use a mock post ID for testing
        mock_post_id = "507f1f77bcf86cd799439011"  # Valid ObjectId format
        
        # Test create comment
        comment_data = {
            "content": "This is a test comment!"
        }
        
        try:
            response = self.make_request("POST", f"/posts/{mock_post_id}/comments", 
                                       json=comment_data,
                                       headers={"Content-Type": "application/json"})
            if response.status_code == 200:
                self.log_test("Create comment", True, "Comment created successfully")
            else:
                self.log_test("Create comment", False, 
                            f"Status: {response.status_code}", response.text)
        except Exception as e:
            self.log_test("Create comment", False, f"Exception: {str(e)}")
        
        # Test get comments
        try:
            response = self.make_request("GET", f"/posts/{mock_post_id}/comments")
            if response.status_code == 200:
                data = response.json()
                self.log_test("Get comments", True, f"Retrieved {len(data)} comments")
            else:
                self.log_test("Get comments", False, 
                            f"Status: {response.status_code}", response.text)
        except Exception as e:
            self.log_test("Get comments", False, f"Exception: {str(e)}")
    
    def create_mock_auth_token(self):
        """Create a mock JWT token for testing authenticated endpoints"""
        # For testing purposes, we'll create a simple mock token
        # In a real scenario, this would come from successful Google OAuth
        import jwt
        from datetime import datetime, timedelta
        
        # Mock payload
        payload = {
            "user_id": "507f1f77bcf86cd799439011",  # Mock user ID
            "exp": datetime.utcnow() + timedelta(hours=1)
        }
        
        # Use the same secret as in the backend
        secret = "songsnap_secret_key_2024_secure_random_string"
        
        try:
            token = jwt.encode(payload, secret, algorithm="HS256")
            self.auth_token = token
            self.test_user_id = payload["user_id"]
            print(f"Created mock auth token for testing authenticated endpoints")
            return True
        except Exception as e:
            print(f"Failed to create mock token: {e}")
            return False
    
    def run_all_tests(self):
        """Run all API tests"""
        print("🚀 Starting SongSnap Backend API Tests")
        print(f"Backend URL: {self.base_url}")
        print("=" * 60)
        
        # Test health endpoints first
        self.test_health_endpoints()
        
        # Test authentication
        self.test_google_auth()
        
        # Create mock token for authenticated tests
        if self.create_mock_auth_token():
            print("✅ Mock authentication token created for testing")
            print()
            
            # Test all authenticated endpoints
            self.test_spotify_integration()
            self.test_youtube_integration()
            self.test_user_apis()
            self.test_post_apis()
            self.test_comment_apis()
        else:
            print("❌ Failed to create mock token - skipping authenticated tests")
        
        # Print summary
        self.print_summary()
    
    def print_summary(self):
        """Print test summary"""
        print("=" * 60)
        print("📊 TEST SUMMARY")
        print("=" * 60)
        
        total_tests = len(self.test_results)
        passed_tests = sum(1 for result in self.test_results if result["success"])
        failed_tests = total_tests - passed_tests
        
        print(f"Total Tests: {total_tests}")
        print(f"✅ Passed: {passed_tests}")
        print(f"❌ Failed: {failed_tests}")
        print(f"Success Rate: {(passed_tests/total_tests)*100:.1f}%" if total_tests > 0 else "No tests run")
        
        if failed_tests > 0:
            print("\n🔍 FAILED TESTS:")
            for result in self.test_results:
                if not result["success"]:
                    print(f"  ❌ {result['test']}: {result['details']}")
        
        print("\n" + "=" * 60)

def main():
    """Main function to run tests"""
    tester = APITester(BACKEND_URL)
    tester.run_all_tests()
    
    # Return exit code based on test results
    failed_tests = sum(1 for result in tester.test_results if not result["success"])
    return 1 if failed_tests > 0 else 0

if __name__ == "__main__":
    exit_code = main()
    sys.exit(exit_code)