from fastapi import FastAPI, APIRouter, HTTPException, Depends, Header
from fastapi.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional
from datetime import datetime, timedelta
from pathlib import Path
import os
import logging
import jwt
import requests
import base64
from bson import ObjectId

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# Environment variables
MONGO_URL = os.environ['MONGO_URL']
DB_NAME = os.environ['DB_NAME']
GOOGLE_CLIENT_ID = os.environ['GOOGLE_CLIENT_ID']
GOOGLE_CLIENT_SECRET = os.environ['GOOGLE_CLIENT_SECRET']
SPOTIFY_CLIENT_ID = os.environ['SPOTIFY_CLIENT_ID']
SPOTIFY_CLIENT_SECRET = os.environ['SPOTIFY_CLIENT_SECRET']
YOUTUBE_API_KEY = os.environ['YOUTUBE_API_KEY']
JWT_SECRET = os.environ['JWT_SECRET']

# MongoDB connection
client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]

# Create the main app
app = FastAPI(title="SongSnap API")
api_router = APIRouter(prefix="/api")

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# ========== MODELS ==========

class SongData(BaseModel):
    title: str
    artist: str
    album: Optional[str] = None
    image_url: Optional[str] = None
    preview_url: Optional[str] = None
    source: str  # "spotify" or "youtube"
    track_id: str

class UserBase(BaseModel):
    email: EmailStr
    name: str
    username: str
    profile_pic: Optional[str] = None
    bio: Optional[str] = None

class User(UserBase):
    id: str
    google_id: str
    followers_count: int = 0
    following_count: int = 0
    posts_count: int = 0
    created_at: datetime

class PostCreate(BaseModel):
    content: str
    song_data: SongData

class Post(BaseModel):
    id: str
    user_id: str
    user: Optional[User] = None
    content: str
    song_data: SongData
    likes_count: int = 0
    comments_count: int = 0
    is_liked: bool = False
    created_at: datetime

class CommentCreate(BaseModel):
    content: str

class Comment(BaseModel):
    id: str
    post_id: str
    user_id: str
    user: Optional[User] = None
    content: str
    created_at: datetime

class GoogleAuthRequest(BaseModel):
    token: str

class UpdateProfileRequest(BaseModel):
    name: Optional[str] = None
    username: Optional[str] = None
    bio: Optional[str] = None
    profile_pic: Optional[str] = None

# ========== HELPER FUNCTIONS ==========

def create_token(user_id: str) -> str:
    """Create JWT token"""
    payload = {
        "user_id": user_id,
        "exp": datetime.utcnow() + timedelta(days=30)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm="HS256")

def verify_token(token: str) -> str:
    """Verify JWT token and return user_id"""
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
        return payload["user_id"]
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

async def get_current_user(authorization: str = Header(None)) -> str:
    """Dependency to get current user from token"""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Not authenticated")
    token = authorization.replace("Bearer ", "")
    return verify_token(token)

def serialize_doc(doc) -> dict:
    """Convert MongoDB document to dict with string _id"""
    if doc is None:
        return None
    doc["id"] = str(doc["_id"])
    del doc["_id"]
    return doc

async def get_user_by_id(user_id: str) -> Optional[dict]:
    """Get user by ID"""
    try:
        user = await db.users.find_one({"_id": ObjectId(user_id)})
        if user:
            return serialize_doc(user)
    except:
        return None
    return None

# ========== AUTH ROUTES ==========

@api_router.post("/auth/google")
async def google_auth(auth_request: GoogleAuthRequest):
    """Authenticate with Google OAuth token"""
    try:
        # Verify Google token
        google_response = requests.get(
            "https://www.googleapis.com/oauth2/v3/userinfo",
            headers={"Authorization": f"Bearer {auth_request.token}"}
        )
        
        if google_response.status_code != 200:
            raise HTTPException(status_code=401, detail="Invalid Google token")
        
        google_user = google_response.json()
        google_id = google_user.get("sub")
        email = google_user.get("email")
        name = google_user.get("name")
        picture = google_user.get("picture")
        
        # Check if user exists
        user = await db.users.find_one({"google_id": google_id})
        
        if not user:
            # Create new user
            username = email.split("@")[0]
            # Ensure unique username
            existing = await db.users.find_one({"username": username})
            if existing:
                username = f"{username}_{google_id[:6]}"
            
            user_doc = {
                "google_id": google_id,
                "email": email,
                "name": name,
                "username": username,
                "profile_pic": picture,
                "bio": "",
                "followers_count": 0,
                "following_count": 0,
                "posts_count": 0,
                "created_at": datetime.utcnow()
            }
            result = await db.users.insert_one(user_doc)
            user_doc["_id"] = result.inserted_id
            user = user_doc
        
        # Create JWT token
        token = create_token(str(user["_id"]))
        user_data = serialize_doc(user)
        
        return {
            "token": token,
            "user": user_data
        }
    
    except Exception as e:
        logger.error(f"Google auth error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/auth/me")
async def get_current_user_profile(user_id: str = Depends(get_current_user)):
    """Get current user profile"""
    user = await get_user_by_id(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user

# ========== USER ROUTES ==========

@api_router.get("/users/search")
async def search_users(q: str, user_id: str = Depends(get_current_user)):
    """Search users by name, username, or email"""
    users = await db.users.find({
        "$or": [
            {"name": {"$regex": q, "$options": "i"}},
            {"username": {"$regex": q, "$options": "i"}},
            {"email": {"$regex": q, "$options": "i"}}
        ]
    }).limit(20).to_list(20)
    
    return [serialize_doc(user) for user in users]

@api_router.get("/users/{target_user_id}")
async def get_user_profile(target_user_id: str, user_id: str = Depends(get_current_user)):
    """Get user profile by ID"""
    user = await get_user_by_id(target_user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Check if current user follows this user
    follow = await db.follows.find_one({
        "follower_id": user_id,
        "following_id": target_user_id
    })
    user["is_following"] = follow is not None
    
    return user

@api_router.post("/users/follow/{target_user_id}")
async def follow_user(target_user_id: str, user_id: str = Depends(get_current_user)):
    """Follow a user"""
    if user_id == target_user_id:
        raise HTTPException(status_code=400, detail="Cannot follow yourself")
    
    # Check if already following
    existing = await db.follows.find_one({
        "follower_id": user_id,
        "following_id": target_user_id
    })
    
    if existing:
        raise HTTPException(status_code=400, detail="Already following")
    
    # Create follow relationship
    await db.follows.insert_one({
        "follower_id": user_id,
        "following_id": target_user_id,
        "created_at": datetime.utcnow()
    })
    
    # Update counts
    await db.users.update_one(
        {"_id": ObjectId(user_id)},
        {"$inc": {"following_count": 1}}
    )
    await db.users.update_one(
        {"_id": ObjectId(target_user_id)},
        {"$inc": {"followers_count": 1}}
    )
    
    return {"message": "Followed successfully"}

@api_router.delete("/users/follow/{target_user_id}")
async def unfollow_user(target_user_id: str, user_id: str = Depends(get_current_user)):
    """Unfollow a user"""
    result = await db.follows.delete_one({
        "follower_id": user_id,
        "following_id": target_user_id
    })
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=400, detail="Not following")
    
    # Update counts
    await db.users.update_one(
        {"_id": ObjectId(user_id)},
        {"$inc": {"following_count": -1}}
    )
    await db.users.update_one(
        {"_id": ObjectId(target_user_id)},
        {"$inc": {"followers_count": -1}}
    )
    
    return {"message": "Unfollowed successfully"}

@api_router.put("/users/profile")
async def update_profile(profile: UpdateProfileRequest, user_id: str = Depends(get_current_user)):
    """Update user profile"""
    update_data = {k: v for k, v in profile.dict().items() if v is not None}
    
    if "username" in update_data:
        # Check if username is taken
        existing = await db.users.find_one({
            "username": update_data["username"],
            "_id": {"$ne": ObjectId(user_id)}
        })
        if existing:
            raise HTTPException(status_code=400, detail="Username already taken")
    
    if update_data:
        await db.users.update_one(
            {"_id": ObjectId(user_id)},
            {"$set": update_data}
        )
    
    user = await get_user_by_id(user_id)
    return user

# ========== POST ROUTES ==========

@api_router.post("/posts")
async def create_post(post: PostCreate, user_id: str = Depends(get_current_user)):
    """Create a new post"""
    post_doc = {
        "user_id": user_id,
        "content": post.content,
        "song_data": post.song_data.dict(),
        "likes_count": 0,
        "comments_count": 0,
        "created_at": datetime.utcnow()
    }
    
    result = await db.posts.insert_one(post_doc)
    
    # Increment user posts count
    await db.users.update_one(
        {"_id": ObjectId(user_id)},
        {"$inc": {"posts_count": 1}}
    )
    
    post_doc["_id"] = result.inserted_id
    return serialize_doc(post_doc)

@api_router.get("/posts/feed")
async def get_all_feed(skip: int = 0, limit: int = 20, user_id: str = Depends(get_current_user)):
    """Get all posts feed"""
    posts = await db.posts.find().sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    
    # Get user data and likes for each post
    result = []
    for post in posts:
        post_data = serialize_doc(post)
        post_user = await get_user_by_id(post["user_id"])
        post_data["user"] = post_user
        
        # Check if current user liked this post
        like = await db.likes.find_one({
            "user_id": user_id,
            "post_id": post_data["id"]
        })
        post_data["is_liked"] = like is not None
        
        result.append(post_data)
    
    return result

@api_router.get("/posts/following")
async def get_following_feed(skip: int = 0, limit: int = 20, user_id: str = Depends(get_current_user)):
    """Get posts from followed users"""
    # Get users that current user follows
    follows = await db.follows.find({"follower_id": user_id}).to_list(1000)
    following_ids = [f["following_id"] for f in follows]
    
    if not following_ids:
        return []
    
    # Get posts from followed users
    posts = await db.posts.find({
        "user_id": {"$in": following_ids}
    }).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    
    # Get user data and likes for each post
    result = []
    for post in posts:
        post_data = serialize_doc(post)
        post_user = await get_user_by_id(post["user_id"])
        post_data["user"] = post_user
        
        # Check if current user liked this post
        like = await db.likes.find_one({
            "user_id": user_id,
            "post_id": post_data["id"]
        })
        post_data["is_liked"] = like is not None
        
        result.append(post_data)
    
    return result

@api_router.post("/posts/{post_id}/like")
async def like_post(post_id: str, user_id: str = Depends(get_current_user)):
    """Like a post"""
    # Check if already liked
    existing = await db.likes.find_one({
        "user_id": user_id,
        "post_id": post_id
    })
    
    if existing:
        raise HTTPException(status_code=400, detail="Already liked")
    
    # Create like
    await db.likes.insert_one({
        "user_id": user_id,
        "post_id": post_id,
        "created_at": datetime.utcnow()
    })
    
    # Increment likes count
    await db.posts.update_one(
        {"_id": ObjectId(post_id)},
        {"$inc": {"likes_count": 1}}
    )
    
    return {"message": "Liked successfully"}

@api_router.delete("/posts/{post_id}/like")
async def unlike_post(post_id: str, user_id: str = Depends(get_current_user)):
    """Unlike a post"""
    result = await db.likes.delete_one({
        "user_id": user_id,
        "post_id": post_id
    })
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=400, detail="Not liked")
    
    # Decrement likes count
    await db.posts.update_one(
        {"_id": ObjectId(post_id)},
        {"$inc": {"likes_count": -1}}
    )
    
    return {"message": "Unliked successfully"}

# ========== COMMENT ROUTES ==========

@api_router.post("/posts/{post_id}/comments")
async def create_comment(post_id: str, comment: CommentCreate, user_id: str = Depends(get_current_user)):
    """Add a comment to a post"""
    comment_doc = {
        "post_id": post_id,
        "user_id": user_id,
        "content": comment.content,
        "created_at": datetime.utcnow()
    }
    
    result = await db.comments.insert_one(comment_doc)
    
    # Increment comments count
    await db.posts.update_one(
        {"_id": ObjectId(post_id)},
        {"$inc": {"comments_count": 1}}
    )
    
    comment_doc["_id"] = result.inserted_id
    return serialize_doc(comment_doc)

@api_router.get("/posts/{post_id}/comments")
async def get_comments(post_id: str, user_id: str = Depends(get_current_user)):
    """Get comments for a post"""
    comments = await db.comments.find({"post_id": post_id}).sort("created_at", -1).to_list(100)
    
    # Get user data for each comment
    result = []
    for comment in comments:
        comment_data = serialize_doc(comment)
        comment_user = await get_user_by_id(comment["user_id"])
        comment_data["user"] = comment_user
        result.append(comment_data)
    
    return result

# ========== SPOTIFY ROUTES ==========

@api_router.get("/spotify/search")
async def search_spotify_tracks(q: str, user_id: str = Depends(get_current_user)):
    """Search Spotify tracks"""
    # Get Spotify access token
    auth_str = f"{SPOTIFY_CLIENT_ID}:{SPOTIFY_CLIENT_SECRET}"
    auth_bytes = auth_str.encode("utf-8")
    auth_base64 = base64.b64encode(auth_bytes).decode("utf-8")
    
    token_response = requests.post(
        "https://accounts.spotify.com/api/token",
        headers={"Authorization": f"Basic {auth_base64}"},
        data={"grant_type": "client_credentials"}
    )
    
    if token_response.status_code != 200:
        raise HTTPException(status_code=500, detail="Failed to get Spotify token")
    
    access_token = token_response.json()["access_token"]
    
    # Search tracks
    search_response = requests.get(
        "https://api.spotify.com/v1/search",
        headers={"Authorization": f"Bearer {access_token}"},
        params={"q": q, "type": "track", "limit": 20}
    )
    
    if search_response.status_code != 200:
        raise HTTPException(status_code=500, detail="Failed to search Spotify")
    
    data = search_response.json()
    tracks = []
    
    for item in data.get("tracks", {}).get("items", []):
        track = {
            "id": item["id"],
            "title": item["name"],
            "artist": ", ".join([artist["name"] for artist in item["artists"]]),
            "album": item["album"]["name"],
            "image_url": item["album"]["images"][0]["url"] if item["album"]["images"] else None,
            "preview_url": item["preview_url"],
            "source": "spotify"
        }
        tracks.append(track)
    
    return tracks

# ========== YOUTUBE ROUTES ==========

@api_router.get("/youtube/search")
async def search_youtube_videos(q: str, user_id: str = Depends(get_current_user)):
    """Search YouTube Music videos"""
    search_response = requests.get(
        "https://www.googleapis.com/youtube/v3/search",
        params={
            "part": "snippet",
            "q": f"{q} music",
            "type": "video",
            "videoCategoryId": "10",  # Music category
            "maxResults": 20,
            "key": YOUTUBE_API_KEY
        }
    )
    
    if search_response.status_code != 200:
        raise HTTPException(status_code=500, detail="Failed to search YouTube")
    
    data = search_response.json()
    videos = []
    
    for item in data.get("items", []):
        video = {
            "id": item["id"]["videoId"],
            "title": item["snippet"]["title"],
            "artist": item["snippet"]["channelTitle"],
            "album": "",
            "image_url": item["snippet"]["thumbnails"]["high"]["url"],
            "preview_url": f"https://www.youtube.com/watch?v={item['id']['videoId']}",
            "source": "youtube"
        }
        videos.append(video)
    
    return videos

# ========== HEALTH CHECK ==========

@api_router.get("/")
async def root():
    return {"message": "SongSnap API is running"}

@api_router.get("/health")
async def health_check():
    return {"status": "healthy"}

# Include router
app.include_router(api_router)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
