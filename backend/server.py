from fastapi import FastAPI, APIRouter, HTTPException, UploadFile, File, Depends
from fastapi.responses import StreamingResponse
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional
import uuid
from datetime import datetime, timezone, timedelta
import io
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.pdfgen import canvas
from reportlab.lib.colors import HexColor
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.platypus import Paragraph, Table, TableStyle
from pptx import Presentation
from pptx.util import Inches, Pt
import re
import base64
import pandas as pd
import httpx
import jwt
import hashlib
from pymongo.errors import DuplicateKeyError

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# JWT Configuration
JWT_SECRET = os.environ.get('JWT_SECRET', 'jaipur-furniture-secret-key-2024')
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_HOURS = 24

# Admin credentials (hardcoded for simple auth)
ADMIN_USERNAME = "admin"
ADMIN_PASSWORD_HASH = hashlib.sha256("admin123".encode()).hexdigest()

# Security
security = HTTPBearer()

def verify_token(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Verify JWT token"""
    try:
        token = credentials.credentials
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token has expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# ============ AUTH MODELS ============

class LoginRequest(BaseModel):
    username: str
    password: str

class LoginResponse(BaseModel):
    token: str
    username: str
    message: str

# ============ AUTH ENDPOINTS ============

@api_router.post("/auth/login", response_model=LoginResponse)
async def login(request: LoginRequest):
    """Admin login endpoint"""
    password_hash = hashlib.sha256(request.password.encode()).hexdigest()
    
    if request.username == ADMIN_USERNAME and password_hash == ADMIN_PASSWORD_HASH:
        # Generate JWT token
        expiration = datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRATION_HOURS)
        payload = {
            "sub": request.username,
            "exp": expiration,
            "iat": datetime.now(timezone.utc)
        }
        token = jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)
        
        return LoginResponse(
            token=token,
            username=request.username,
            message="Login successful"
        )
    else:
        raise HTTPException(status_code=401, detail="Invalid username or password")

@api_router.get("/auth/verify")
async def verify_auth(user: dict = Depends(verify_token)):
    """Verify if token is valid"""
    return {"valid": True, "username": user.get("sub")}

@api_router.post("/auth/change-password")
async def change_password(
    current_password: str,
    new_password: str,
    user: dict = Depends(verify_token)
):
    """Change admin password"""
    global ADMIN_PASSWORD_HASH
    current_hash = hashlib.sha256(current_password.encode()).hexdigest()
    
    if current_hash != ADMIN_PASSWORD_HASH:
        raise HTTPException(status_code=401, detail="Current password is incorrect")
    
    ADMIN_PASSWORD_HASH = hashlib.sha256(new_password.encode()).hexdigest()
    return {"message": "Password changed successfully"}

# ============ MODELS ============

class OrderItem(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    product_code: str = ""
    description: str = ""
    category: str = ""
    height_cm: float = 0
    depth_cm: float = 0
    width_cm: float = 0
    cbm: float = 0
    cbm_auto: bool = True
    quantity: int = 1
    in_house_production: bool = True
    machine_hall: str = ""
    leather_code: str = ""
    leather_image: str = ""
    finish_code: str = ""
    finish_image: str = ""
    color_notes: str = ""
    leg_color: str = ""
    wood_finish: str = ""
    notes: str = ""
    images: List[str] = []
    reference_images: List[str] = []

class Order(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    sales_order_ref: str = ""
    buyer_po_ref: str = ""
    buyer_name: str = ""
    entry_date: str = ""
    factory_inform_date: str = ""
    status: str = "Draft"
    factory: str = ""
    items: List[OrderItem] = []
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    updated_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class OrderCreate(BaseModel):
    sales_order_ref: str = ""
    buyer_po_ref: str = ""
    buyer_name: str = ""
    entry_date: str = ""
    factory_inform_date: str = ""
    status: str = "Draft"
    factory: str = ""
    items: List[OrderItem] = []

class OrderUpdate(BaseModel):
    sales_order_ref: Optional[str] = None
    buyer_po_ref: Optional[str] = None
    buyer_name: Optional[str] = None
    entry_date: Optional[str] = None
    factory_inform_date: Optional[str] = None
    status: Optional[str] = None
    factory: Optional[str] = None
    items: Optional[List[OrderItem]] = None

class LeatherLibraryItem(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    code: str
    name: str
    description: str = ""
    color: str = ""
    image: str = ""
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class FinishLibraryItem(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    code: str
    name: str
    description: str = ""
    color: str = ""
    image: str = ""
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class TemplateSettings(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = "default"
    company_name: str = "JAIPUR – A fine wood furniture company"
    logo_text: str = "JAIPUR"
    primary_color: str = "#3d2c1e"
    accent_color: str = "#d4622e"
    font_family: str = "Playfair Display, serif"
    body_font: str = "Manrope, sans-serif"
    page_margin_mm: int = 15
    show_borders: bool = True
    header_height_mm: int = 25
    footer_height_mm: int = 20

class ExportRecord(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    order_id: str
    export_type: str
    filename: str
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class NoteTemplate(BaseModel):
    """Model for reusable note templates"""
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    content: str  # HTML content of the note
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class NoteTemplateCreate(BaseModel):
    name: str
    content: str

class Product(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    product_code: str
    description: str = ""
    category: str = ""
    size: str = ""
    height_cm: float = 0
    depth_cm: float = 0
    width_cm: float = 0
    cbm: float = 0
    fob_price_usd: float = 0
    fob_price_gbp: float = 0
    warehouse_price_1: float = 0
    warehouse_price_2: float = 0
    image: str = ""
    images: List[str] = []
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    updated_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class ProductCreate(BaseModel):
    product_code: str
    description: str = ""
    category: str = ""
    size: str = ""
    height_cm: float = 0
    depth_cm: float = 0
    width_cm: float = 0
    cbm: float = 0
    fob_price_usd: float = 0
    fob_price_gbp: float = 0
    warehouse_price_1: float = 0
    warehouse_price_2: float = 0
    image: str = ""
    images: List[str] = []

class ProductUpdate(BaseModel):
    product_code: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None
    size: Optional[str] = None
    height_cm: Optional[float] = None
    depth_cm: Optional[float] = None
    width_cm: Optional[float] = None
    cbm: Optional[float] = None
    fob_price_usd: Optional[float] = None
    fob_price_gbp: Optional[float] = None
    warehouse_price_1: Optional[float] = None
    warehouse_price_2: Optional[float] = None
    image: Optional[str] = None
    images: Optional[List[str]] = None

# Quotation Models
class QuotationItem(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    product_id: str = ""
    product_code: str = ""
    description: str = ""
    height_cm: float = 0
    depth_cm: float = 0
    width_cm: float = 0
    cbm: float = 0
    quantity: int = 1
    fob_price: float = 0
    total: float = 0
    image: str = ""  # Product image for quotation

class Quotation(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    reference: str = ""
    customer_name: str = ""
    customer_email: str = ""
    date: str = ""
    currency: str = "USD"
    notes: str = ""
    items: List[QuotationItem] = []
    total_items: int = 0
    total_cbm: float = 0
    total_value: float = 0
    status: str = "draft"  # draft, sent, accepted, rejected
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    updated_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class QuotationCreate(BaseModel):
    reference: str = ""
    customer_name: str = ""
    customer_email: str = ""
    date: str = ""
    currency: str = "USD"
    notes: str = ""
    items: List[dict] = []
    total_items: int = 0
    total_cbm: float = 0
    total_value: float = 0
    status: str = "draft"

class QuotationUpdate(BaseModel):
    reference: Optional[str] = None
    customer_name: Optional[str] = None
    customer_email: Optional[str] = None
    date: Optional[str] = None
    currency: Optional[str] = None
    notes: Optional[str] = None
    items: Optional[List[dict]] = None
    total_items: Optional[int] = None
    total_cbm: Optional[float] = None
    total_value: Optional[float] = None
    status: Optional[str] = None

# ============ ROUTES ============

@api_router.get("/")
async def root():
    return {"message": "JAIPUR Production Sheet API"}

# --- ORDERS ---

@api_router.get("/orders", response_model=List[Order])
async def get_orders(lite: bool = True):
    """Get all orders. Use lite=true (default) for faster loading without item images"""
    if lite:
        # Exclude large image fields from items for faster loading
        orders = await db.orders.find({}, {"_id": 0}).to_list(1000)
        # Strip images from items for list view
        for order in orders:
            if order.get('items'):
                for item in order['items']:
                    item['product_image'] = ''  # Clear large base64 images
                    item['images'] = []
                    item['reference_images'] = []
                    item['leather_image'] = ''
                    item['finish_image'] = ''
        return orders
    else:
        orders = await db.orders.find({}, {"_id": 0}).to_list(1000)
        return orders

@api_router.get("/orders/{order_id}", response_model=Order)
async def get_order(order_id: str):
    order = await db.orders.find_one({"id": order_id}, {"_id": 0})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    return order

@api_router.post("/orders", response_model=Order)
async def create_order(order_data: OrderCreate):
    order = Order(**order_data.model_dump())
    doc = order.model_dump()
    await db.orders.insert_one(doc)
    return order

@api_router.put("/orders/{order_id}", response_model=Order)
async def update_order(order_id: str, order_data: OrderUpdate):
    existing = await db.orders.find_one({"id": order_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Order not found")
    
    update_data = {k: v for k, v in order_data.model_dump().items() if v is not None}
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    if "items" in update_data:
        update_data["items"] = [item.model_dump() if hasattr(item, 'model_dump') else item for item in update_data["items"]]
    
    await db.orders.update_one({"id": order_id}, {"$set": update_data})
    updated = await db.orders.find_one({"id": order_id}, {"_id": 0})
    return updated

@api_router.delete("/orders/{order_id}")
async def delete_order(order_id: str):
    result = await db.orders.delete_one({"id": order_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Order not found")
    return {"message": "Order deleted"}

# --- LEATHER LIBRARY ---

@api_router.get("/leather-library", response_model=List[LeatherLibraryItem])
async def get_leather_library():
    items = await db.leather_library.find({}, {"_id": 0}).to_list(1000)
    return items

@api_router.post("/leather-library", response_model=LeatherLibraryItem)
async def create_leather_item(item: LeatherLibraryItem):
    doc = item.model_dump()
    await db.leather_library.insert_one(doc)
    return item

@api_router.put("/leather-library/{item_id}", response_model=LeatherLibraryItem)
async def update_leather_item(item_id: str, item: LeatherLibraryItem):
    await db.leather_library.update_one({"id": item_id}, {"$set": item.model_dump()})
    return item

@api_router.delete("/leather-library/{item_id}")
async def delete_leather_item(item_id: str):
    result = await db.leather_library.delete_one({"id": item_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Item not found")
    return {"message": "Item deleted"}

@api_router.post("/leather-library/upload-excel")
async def upload_leather_excel(file: UploadFile = File(...)):
    """Upload leather items from Excel file"""
    if not file.filename.endswith(('.xlsx', '.xls')):
        raise HTTPException(status_code=400, detail="File must be an Excel file")
    
    try:
        contents = await file.read()
        df = pd.read_excel(io.BytesIO(contents))
        df.columns = df.columns.str.lower().str.strip()
        
        column_mapping = {
            'code': 'code', 'leather code': 'code', 'item code': 'code',
            'name': 'name', 'leather name': 'name',
            'description': 'description', 'desc': 'description',
            'color': 'color',
            'image': 'image_url', 'image link': 'image_url', 'photo': 'image_url', 'photo link': 'image_url'
        }
        df = df.rename(columns=column_mapping)
        
        created = []
        for idx, row in df.iterrows():
            code = str(row.get('code', '')).strip()
            if not code or code == 'nan':
                continue
                
            item_data = {
                'id': str(uuid.uuid4()),
                'code': code.upper(),
                'name': str(row.get('name', '')).strip() if pd.notna(row.get('name')) else '',
                'description': str(row.get('description', '')).strip() if pd.notna(row.get('description')) else '',
                'color': str(row.get('color', '')).strip() if pd.notna(row.get('color')) else '',
                'image': '',
                'created_at': datetime.now(timezone.utc).isoformat()
            }
            
            # Fetch image from URL if provided
            image_url = str(row.get('image_url', '')).strip() if pd.notna(row.get('image_url')) else ''
            if image_url and image_url.startswith('http'):
                try:
                    async with httpx.AsyncClient(timeout=10.0) as client:
                        response = await client.get(image_url)
                        if response.status_code == 200 and 'image' in response.headers.get('content-type', ''):
                            item_data['image'] = f"data:{response.headers['content-type']};base64,{base64.b64encode(response.content).decode()}"
                except:
                    pass
            
            await db.leather_library.insert_one(item_data)
            created.append({'code': item_data['code'], 'name': item_data['name']})
        
        return {"message": f"{len(created)} items imported", "created": len(created), "items": created[:20]}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# --- FINISH LIBRARY ---

@api_router.get("/finish-library", response_model=List[FinishLibraryItem])
async def get_finish_library():
    items = await db.finish_library.find({}, {"_id": 0}).to_list(1000)
    return items

@api_router.post("/finish-library", response_model=FinishLibraryItem)
async def create_finish_item(item: FinishLibraryItem):
    doc = item.model_dump()
    await db.finish_library.insert_one(doc)
    return item

@api_router.put("/finish-library/{item_id}", response_model=FinishLibraryItem)
async def update_finish_item(item_id: str, item: FinishLibraryItem):
    await db.finish_library.update_one({"id": item_id}, {"$set": item.model_dump()})
    return item

@api_router.delete("/finish-library/{item_id}")
async def delete_finish_item(item_id: str):
    result = await db.finish_library.delete_one({"id": item_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Item not found")
    return {"message": "Item deleted"}

@api_router.post("/finish-library/upload-excel")
async def upload_finish_excel(file: UploadFile = File(...)):
    """Upload finish items from Excel file"""
    if not file.filename.endswith(('.xlsx', '.xls')):
        raise HTTPException(status_code=400, detail="File must be an Excel file")
    
    try:
        contents = await file.read()
        df = pd.read_excel(io.BytesIO(contents))
        df.columns = df.columns.str.lower().str.strip()
        
        column_mapping = {
            'code': 'code', 'finish code': 'code', 'item code': 'code',
            'name': 'name', 'finish name': 'name',
            'description': 'description', 'desc': 'description',
            'color': 'color',
            'image': 'image_url', 'image link': 'image_url', 'photo': 'image_url', 'photo link': 'image_url'
        }
        df = df.rename(columns=column_mapping)
        
        created = []
        for idx, row in df.iterrows():
            code = str(row.get('code', '')).strip()
            if not code or code == 'nan':
                continue
                
            item_data = {
                'id': str(uuid.uuid4()),
                'code': code.upper(),
                'name': str(row.get('name', '')).strip() if pd.notna(row.get('name')) else '',
                'description': str(row.get('description', '')).strip() if pd.notna(row.get('description')) else '',
                'color': str(row.get('color', '')).strip() if pd.notna(row.get('color')) else '',
                'image': '',
                'created_at': datetime.now(timezone.utc).isoformat()
            }
            
            # Fetch image from URL if provided
            image_url = str(row.get('image_url', '')).strip() if pd.notna(row.get('image_url')) else ''
            if image_url and image_url.startswith('http'):
                try:
                    async with httpx.AsyncClient(timeout=10.0) as client:
                        response = await client.get(image_url)
                        if response.status_code == 200 and 'image' in response.headers.get('content-type', ''):
                            item_data['image'] = f"data:{response.headers['content-type']};base64,{base64.b64encode(response.content).decode()}"
                except:
                    pass
            
            await db.finish_library.insert_one(item_data)
            created.append({'code': item_data['code'], 'name': item_data['name']})
        
        return {"message": f"{len(created)} items imported", "created": len(created), "items": created[:20]}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# --- TEMPLATE SETTINGS ---

@api_router.get("/template-settings", response_model=TemplateSettings)
async def get_template_settings():
    settings = await db.template_settings.find_one({"id": "default"}, {"_id": 0})
    if not settings:
        default_settings = TemplateSettings()
        await db.template_settings.insert_one(default_settings.model_dump())
        return default_settings
    return settings

@api_router.put("/template-settings", response_model=TemplateSettings)
async def update_template_settings(settings: TemplateSettings):
    settings.id = "default"
    await db.template_settings.update_one(
        {"id": "default"}, 
        {"$set": settings.model_dump()}, 
        upsert=True
    )
    return settings

# --- FACTORIES ---

@api_router.get("/factories")
async def get_factories():
    factories = await db.factories.find({}, {"_id": 0}).to_list(100)
    if not factories:
        # Initialize with default factories
        default_factories = [
            {"id": "sae", "code": "SAE", "name": "Shekhawati Art Exports"},
            {"id": "cac", "code": "CAC", "name": "Country Art & Crafts"},
            {"id": "gae", "code": "GAE", "name": "Global Art Exports"},
        ]
        for factory in default_factories:
            await db.factories.insert_one(factory)
        return default_factories
    return factories

@api_router.post("/factories")
async def create_factory(factory: dict):
    factory_id = str(uuid.uuid4())
    factory_doc = {
        "id": factory_id,
        "code": factory.get("code", ""),
        "name": factory.get("name", ""),
    }
    # Check if factory already exists
    existing = await db.factories.find_one({"name": factory_doc["name"]}, {"_id": 0})
    if existing:
        return existing
    await db.factories.insert_one(factory_doc)
    # Return without _id
    return {"id": factory_doc["id"], "code": factory_doc["code"], "name": factory_doc["name"]}

@api_router.delete("/factories/{factory_id}")
async def delete_factory(factory_id: str):
    result = await db.factories.delete_one({"id": factory_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Factory not found")
    return {"message": "Factory deleted"}

@api_router.post("/factories/upload-excel")
async def upload_factories_excel(file: UploadFile = File(...)):
    """Upload factories from Excel file"""
    if not file.filename.endswith(('.xlsx', '.xls')):
        raise HTTPException(status_code=400, detail="File must be an Excel file")
    
    try:
        contents = await file.read()
        df = pd.read_excel(io.BytesIO(contents))
        df.columns = df.columns.str.lower().str.strip()
        
        column_mapping = {
            'code': 'code', 'factory code': 'code',
            'name': 'name', 'factory name': 'name',
        }
        df = df.rename(columns=column_mapping)
        
        created = []
        for idx, row in df.iterrows():
            code = str(row.get('code', '')).strip()
            if not code or code == 'nan':
                continue
                
            factory_doc = {
                'id': str(uuid.uuid4()),
                'code': code.upper(),
                'name': str(row.get('name', '')).strip() if pd.notna(row.get('name')) else '',
            }
            
            await db.factories.insert_one(factory_doc)
            created.append({'code': factory_doc['code'], 'name': factory_doc['name']})
        
        return {"message": f"{len(created)} factories imported", "created": len(created), "items": created[:20]}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# --- CATEGORIES ---

@api_router.get("/categories")
async def get_categories():
    """Get all categories from database, with default ones if empty"""
    categories = await db.categories.find({}, {"_id": 0}).to_list(100)
    if not categories:
        # Initialize with default categories
        default_categories = [
            {"id": "chair", "name": "Chair"},
            {"id": "sofa", "name": "Sofa"},
            {"id": "bar-chair", "name": "Bar Chair"},
            {"id": "table", "name": "Table"},
            {"id": "bed", "name": "Bed"},
            {"id": "cabinet", "name": "Cabinet"},
            {"id": "shelf", "name": "Shelf"},
            {"id": "other", "name": "Other"}
        ]
        for cat in default_categories:
            await db.categories.insert_one(cat)
        return default_categories
    return categories

@api_router.post("/categories")
async def create_category(category: dict):
    """Add a new category"""
    category_id = category.get("id") or str(uuid.uuid4())
    category_doc = {
        "id": category_id,
        "name": category.get("name", ""),
    }
    # Check if category already exists
    existing = await db.categories.find_one({"name": category_doc["name"]}, {"_id": 0})
    if existing:
        return existing
    await db.categories.insert_one(category_doc)
    # Return without _id
    return {"id": category_doc["id"], "name": category_doc["name"]}

@api_router.delete("/categories/{category_id}")
async def delete_category(category_id: str):
    """Delete a category"""
    result = await db.categories.delete_one({"id": category_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Category not found")
    return {"message": "Category deleted"}

# --- NOTE TEMPLATES ---

@api_router.get("/note-templates")
async def get_note_templates():
    """Get all saved note templates"""
    templates = await db.note_templates.find({}, {"_id": 0}).sort("created_at", -1).to_list(100)
    
    # If no templates exist, create some defaults
    if not templates:
        default_templates = [
            {"id": str(uuid.uuid4()), "name": "Make as Last Time", "content": "<ul><li>Make as Last Time</li></ul>", "created_at": datetime.now(timezone.utc).isoformat()},
            {"id": str(uuid.uuid4()), "name": "No Yellow Woods", "content": "<ul><li>No Yellow Woods</li></ul>", "created_at": datetime.now(timezone.utc).isoformat()},
            {"id": str(uuid.uuid4()), "name": "Cancellation 45 Days", "content": "<ul><li>Cancellation not done 45 Days</li></ul>", "created_at": datetime.now(timezone.utc).isoformat()},
            {"id": str(uuid.uuid4()), "name": "Handle with Care", "content": "<ul><li>Handle with Care - Fragile</li></ul>", "created_at": datetime.now(timezone.utc).isoformat()},
            {"id": str(uuid.uuid4()), "name": "Rush Order Priority", "content": "<ul><li>Rush Order - Priority</li></ul>", "created_at": datetime.now(timezone.utc).isoformat()},
            {"id": str(uuid.uuid4()), "name": "Check Quality", "content": "<ul><li>Check Quality Before Packing</li></ul>", "created_at": datetime.now(timezone.utc).isoformat()},
            {"id": str(uuid.uuid4()), "name": "Same as Sample", "content": "<ul><li>Same as Sample Approved</li></ul>", "created_at": datetime.now(timezone.utc).isoformat()},
        ]
        for t in default_templates:
            await db.note_templates.insert_one(t)
        return default_templates
    
    return templates

@api_router.post("/note-templates")
async def create_note_template(template: NoteTemplateCreate):
    """Create a new note template"""
    note_template = NoteTemplate(name=template.name, content=template.content)
    doc = note_template.model_dump()
    await db.note_templates.insert_one(doc)
    return {"id": doc["id"], "name": doc["name"], "content": doc["content"], "created_at": doc["created_at"]}

@api_router.delete("/note-templates/{template_id}")
async def delete_note_template(template_id: str):
    """Delete a note template"""
    result = await db.note_templates.delete_one({"id": template_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Note template not found")
    return {"message": "Note template deleted"}

# --- PDF EXPORT ---

def strip_html(text):
    """Remove HTML tags from text"""
    clean = re.compile('<.*?>')
    return re.sub(clean, '', text or '')

def format_date_ddmmyyyy(date_str):
    """Format date string to DD-MM-YYYY format"""
    if not date_str:
        return '-'
    try:
        # Try parsing ISO format first
        if 'T' in str(date_str):
            date_str = str(date_str).split('T')[0]
        parts = str(date_str).split('-')
        if len(parts) == 3:
            year, month, day = parts
            return f"{day}-{month}-{year}"
        return date_str
    except:
        return date_str

# JAIPUR Logo URL
JAIPUR_LOGO_URL = "https://customer-assets.emergentagent.com/job_furnipdf-maker/artifacts/mdh71t2g_WhatsApp%20Image%202025-12-22%20at%202.24.36%20PM.jpeg"

async def fetch_image_bytes(url: str) -> bytes:
    """Fetch image from URL and return bytes"""
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(url)
            if response.status_code == 200:
                return response.content
    except:
        pass
    return None

def generate_pdf(order: dict, settings: dict, logo_bytes: bytes = None) -> bytes:
    """Generate PDF that matches the Preview page layout exactly - with LARGE product images"""
    buffer = io.BytesIO()
    c = canvas.Canvas(buffer, pagesize=A4)
    width, height = A4
    margin = settings.get('page_margin_mm', 12) * mm
    
    primary_color = HexColor(settings.get('primary_color', '#3d2c1e'))
    
    for idx, item in enumerate(order.get("items", [])):
        # === HEADER SECTION (Logo LEFT, Info table RIGHT) ===
        header_top = height - margin
        
        # Logo on LEFT - larger size
        logo_width = 80
        logo_height = 50
        if logo_bytes:
            try:
                from reportlab.lib.utils import ImageReader
                logo_img = ImageReader(io.BytesIO(logo_bytes))
                c.drawImage(logo_img, margin, header_top - logo_height, width=logo_width, height=logo_height, preserveAspectRatio=True)
            except:
                c.setFillColor(primary_color)
                c.setFont("Helvetica-Bold", 24)
                c.drawString(margin, header_top - 25, "JAIPUR")
                c.setFont("Helvetica-Oblique", 7)
                c.setFillColor(HexColor('#666666'))
                c.drawString(margin, header_top - 35, "A fine wood furniture company")
        else:
            c.setFillColor(primary_color)
            c.setFont("Helvetica-Bold", 24)
            c.drawString(margin, header_top - 25, "JAIPUR")
            c.setFont("Helvetica-Oblique", 7)
            c.setFillColor(HexColor('#666666'))
            c.drawString(margin, header_top - 35, "A fine wood furniture company")
        
        # Info table on RIGHT - WIDER and BETTER ALIGNED
        table_width = 220  # Wider table for longer labels
        right_x = width - margin - table_width
        y = header_top - 5
        
        dates = [
            ("ENTRY DATE", format_date_ddmmyyyy(order.get('entry_date', 'N/A'))),
            ("INFORMED TO FACTORY", format_date_ddmmyyyy(order.get('factory_inform_date', order.get('entry_date', 'N/A')))),
            ("FACTORY", order.get('factory', 'N/A')),
            ("SALES ORDER REF", order.get('sales_order_ref', 'N/A')),
            ("BUYER PO", order.get('buyer_po_ref', 'N/A')),
        ]
        
        row_height = 14  # Row height
        table_height = len(dates) * row_height
        
        # Draw table border
        c.setStrokeColor(primary_color)
        c.setLineWidth(1.5)
        c.rect(right_x, y - table_height, table_width, table_height)
        
        # Draw table rows
        label_width = 110  # Wider label column for longer text
        for i, (label, value) in enumerate(dates):
            row_y = y - (i + 1) * row_height
            
            # Label cell with background
            c.setFillColor(HexColor('#f5f0eb'))
            c.rect(right_x, row_y, label_width, row_height, fill=True, stroke=False)
            
            # Cell borders
            c.setStrokeColor(primary_color)
            c.setLineWidth(0.5)
            c.rect(right_x, row_y, label_width, row_height, fill=False, stroke=True)
            c.rect(right_x + label_width, row_y, table_width - label_width, row_height, fill=False, stroke=True)
            
            # Label text - smaller font to fit
            c.setFillColor(primary_color)
            c.setFont("Helvetica-Bold", 8)
            c.drawString(right_x + 3, row_y + 4, label)
            
            # Value text
            c.setFillColor(HexColor('#333333'))
            c.setFont("Helvetica-Bold", 8)
            value_str = str(value)[:20] if value else '-'
            c.drawString(right_x + label_width + 3, row_y + 4, value_str)
        
        # Separator line under header - moved down to avoid overlap
        separator_y = header_top - max(logo_height + 5, table_height + 10)
        c.setStrokeColor(primary_color)
        c.setLineWidth(2)
        c.line(margin, separator_y, width - margin, separator_y)
        
        # === LARGE PRODUCT IMAGE SECTION (75% width) + Material Swatches (25%) ===
        content_y = separator_y - 8
        content_width = width - 2*margin
        img_section_width = content_width * 0.73
        material_section_width = content_width * 0.25
        material_x = margin + img_section_width + 8
        
        # LARGE Product Image Area - Reduced height by 30% (486 * 0.7 = 340)
        img_height = 340  # Reduced from 486
        c.setStrokeColor(HexColor('#dddddd'))
        c.setLineWidth(0.5)
        c.rect(margin, content_y - img_height, img_section_width, img_height)
        
        # Try to draw product image - LARGE
        product_image = item.get('product_image') or (item.get('images', [None])[0] if item.get('images') else None)
        if product_image:
            try:
                if product_image.startswith('data:image'):
                    img_data = product_image.split(',')[1]
                    img_bytes_data = base64.b64decode(img_data)
                    from reportlab.lib.utils import ImageReader
                    img = ImageReader(io.BytesIO(img_bytes_data))
                    # Draw image with padding
                    c.drawImage(img, margin + 5, content_y - img_height + 5, 
                               width=img_section_width - 10, height=img_height - 10, 
                               preserveAspectRatio=True)
            except Exception as e:
                c.setFillColor(HexColor('#888888'))
                c.setFont("Helvetica", 12)
                c.drawCentredString(margin + img_section_width/2, content_y - img_height/2, "Image Error")
        else:
            c.setFillColor(HexColor('#888888'))
            c.setFont("Helvetica", 12)
            c.drawCentredString(margin + img_section_width/2, content_y - img_height/2, "No Image Available")
        
        # === ADDITIONAL/EXTRA IMAGES (below main image) - Size increased by 80% ===
        additional_images = item.get('images', [])
        # Skip first image if it was used as product_image
        if not item.get('product_image') and additional_images:
            additional_images = additional_images[1:]  # Skip first as it's main image
        
        extra_img_size = 108  # 60px * 1.8 = 108px (80% increase)
        extra_img_y = content_y - img_height - 10
        if additional_images:
            extra_img_x = margin + 5
            for idx, extra_img in enumerate(additional_images[:4]):  # Max 4 images
                if extra_img and extra_img.startswith('data:image'):
                    try:
                        img_data = extra_img.split(',')[1]
                        img_bytes_data = base64.b64decode(img_data)
                        from reportlab.lib.utils import ImageReader
                        img = ImageReader(io.BytesIO(img_bytes_data))
                        c.drawImage(img, extra_img_x, extra_img_y - extra_img_size, 
                                   width=extra_img_size, height=extra_img_size, 
                                   preserveAspectRatio=True)
                        # Draw border around extra image
                        c.setStrokeColor(HexColor('#dddddd'))
                        c.rect(extra_img_x, extra_img_y - extra_img_size, extra_img_size, extra_img_size)
                        extra_img_x += extra_img_size + 8
                    except:
                        pass
        
        # Material Swatches (25% width) - taller to match image height
        c.setStrokeColor(HexColor('#dddddd'))
        c.rect(material_x, content_y - img_height, material_section_width, img_height)
        
        # Leather swatch - Reduced proportionally
        swatch_y = content_y - 10
        swatch_height = 100  # Reduced from 156
        if item.get('leather_code') or item.get('leather_image'):
            if item.get('leather_image'):
                try:
                    if item['leather_image'].startswith('data:image'):
                        img_data = item['leather_image'].split(',')[1]
                        img_bytes_data = base64.b64decode(img_data)
                        from reportlab.lib.utils import ImageReader
                        img = ImageReader(io.BytesIO(img_bytes_data))
                        c.drawImage(img, material_x + 8, swatch_y - swatch_height, 
                                   width=material_section_width - 16, height=swatch_height - 5, 
                                   preserveAspectRatio=True)
                except:
                    c.setFillColor(HexColor('#8B4513'))
                    c.rect(material_x + 8, swatch_y - swatch_height, material_section_width - 16, swatch_height - 5, fill=True)
            else:
                c.setFillColor(HexColor('#8B4513'))
                c.rect(material_x + 8, swatch_y - swatch_height, material_section_width - 16, swatch_height - 5, fill=True)
            
            c.setFillColor(HexColor('#666666'))
            c.setFont("Helvetica", 6)
            c.drawCentredString(material_x + material_section_width/2, swatch_y - swatch_height - 8, "LEATHER")
            c.setFont("Helvetica-Bold", 7)
            c.setFillColor(HexColor('#333333'))
            c.drawCentredString(material_x + material_section_width/2, swatch_y - swatch_height - 18, item.get('leather_code', '-'))
            swatch_y -= swatch_height + 30
        
        # Finish swatch - LARGER
        if item.get('finish_code') or item.get('finish_image'):
            if item.get('finish_image'):
                try:
                    if item['finish_image'].startswith('data:image'):
                        img_data = item['finish_image'].split(',')[1]
                        img_bytes_data = base64.b64decode(img_data)
                        from reportlab.lib.utils import ImageReader
                        img = ImageReader(io.BytesIO(img_bytes_data))
                        c.drawImage(img, material_x + 8, swatch_y - swatch_height, 
                                   width=material_section_width - 16, height=swatch_height - 5, 
                                   preserveAspectRatio=True)
                except:
                    c.setFillColor(HexColor('#D4A574'))
                    c.rect(material_x + 8, swatch_y - swatch_height, material_section_width - 16, swatch_height - 5, fill=True)
            else:
                c.setFillColor(HexColor('#D4A574'))
                c.rect(material_x + 8, swatch_y - swatch_height, material_section_width - 16, swatch_height - 5, fill=True)
            
            c.setFillColor(HexColor('#666666'))
            c.setFont("Helvetica", 6)
            c.drawCentredString(material_x + material_section_width/2, swatch_y - swatch_height - 8, "FINISH")
            c.setFont("Helvetica-Bold", 7)
            c.setFillColor(HexColor('#333333'))
            c.drawCentredString(material_x + material_section_width/2, swatch_y - swatch_height - 18, item.get('finish_code', '-'))
        
        # No materials placeholder
        if not item.get('leather_code') and not item.get('leather_image') and not item.get('finish_code') and not item.get('finish_image'):
            c.setFillColor(HexColor('#888888'))
            c.setFont("Helvetica", 8)
            c.drawCentredString(material_x + material_section_width/2, content_y - img_height/2, "No material")
            c.drawCentredString(material_x + material_section_width/2, content_y - img_height/2 - 12, "swatches")
        
        # === NOTES SECTION (100% width) - positioned below extra images ===
        # Calculate notes position based on whether extra images exist
        extra_images_height = extra_img_size + 15 if additional_images else 0
        notes_y = content_y - img_height - extra_images_height - 10
        notes_height = 120  # Increased height for larger font
        c.setStrokeColor(primary_color)
        c.setLineWidth(1)
        c.rect(margin, notes_y - notes_height, content_width, notes_height)
        
        # Notes header
        c.setFillColor(primary_color)
        c.rect(margin, notes_y - 22, content_width, 22, fill=True)
        c.setFillColor(HexColor('#ffffff'))
        c.setFont("Helvetica-Bold", 14)  # Larger header font
        c.drawString(margin + 5, notes_y - 17, "Notes:")
        
        # Notes content - FONT SIZE 29px (80% increase from 16px)
        c.setFillColor(HexColor('#333333'))
        c.setFont("Helvetica", 22)  # Large font for notes
        notes_text = strip_html(item.get('notes', ''))
        if notes_text:
            words = notes_text.split()
            line = ""
            line_y = notes_y - 45
            max_width = content_width - 20
            for word in words:
                test_line = line + " " + word if line else word
                if c.stringWidth(test_line, "Helvetica", 22) < max_width:
                    line = test_line
                else:
                    c.drawString(margin + 8, line_y, line)
                    line_y -= 28
                    line = word
                    if line_y < notes_y - notes_height + 5:
                        break
            if line and line_y >= notes_y - notes_height + 5:
                c.drawString(margin + 8, line_y, line)
        else:
            default_notes = []
            if item.get('category'): default_notes.append(f"Category: {item['category']}")
            if item.get('leather_code'): default_notes.append(f"Leather: {item['leather_code']}")
            if item.get('finish_code'): default_notes.append(f"Finish: {item['finish_code']}")
            if item.get('color_notes'): default_notes.append(f"Color: {item['color_notes']}")
            if item.get('wood_finish'): default_notes.append(f"Wood Finish: {item['wood_finish']}")
            c.setFont("Helvetica", 22)  # Large font for default notes too
            line_y = notes_y - 50
            for note in default_notes[:3]:
                c.drawString(margin + 8, line_y, f"• {note}")
                line_y -= 28
        
        # === DETAILS TABLE (Bottom) - Font size same as Notes (22px) ===
        table_y = notes_y - notes_height - 8
        
        # Table header with SIZE sub-headers - SAME SIZE AS NOTES
        header_height = 44
        c.setFillColor(primary_color)
        c.rect(margin, table_y - header_height, content_width, header_height, fill=True)
        
        c.setFillColor(HexColor('#ffffff'))
        c.setFont("Helvetica-Bold", 20)  # Same as notes size
        
        # Column positions for 7 columns - wider to accommodate larger font
        col_widths = [100, 150, 45, 45, 45, 60, 70]
        cols = [margin + 3]
        for w in col_widths[:-1]:
            cols.append(cols[-1] + w)
        
        # Draw headers
        headers = ["ITEM CODE", "DESCRIPTION", "H", "D", "W", "CBM", "Qty"]
        for i, header in enumerate(headers):
            c.drawString(cols[i], table_y - header_height + 15, header)
        
        # Table row - larger to fit bigger font (same as notes)
        cbm = item.get('cbm', 0)
        if item.get('cbm_auto', True):
            h = item.get('height_cm', 0) or 0
            d = item.get('depth_cm', 0) or 0
            w = item.get('width_cm', 0) or 0
            cbm = round((h * d * w) / 1000000, 4)
        
        row_y = table_y - header_height - 40  # Taller row for notes-size font
        c.setStrokeColor(primary_color)
        c.rect(margin, row_y, content_width, 40)
        
        c.setFillColor(HexColor('#333333'))
        c.setFont("Courier-Bold", 22)  # Same as notes
        c.drawString(cols[0], row_y + 12, str(item.get('product_code', '-')))
        
        c.setFont("Helvetica", 20)  # Same size as notes
        desc = item.get('description', '-')
        if item.get('color_notes'):
            desc = f"{desc} ({item['color_notes']})"
        if len(desc) > 28:
            desc = desc[:25] + "..."
        c.drawString(cols[1], row_y + 12, desc)
        c.drawString(cols[2], row_y + 12, str(item.get('height_cm', 0)))
        c.drawString(cols[3], row_y + 12, str(item.get('depth_cm', 0)))
        c.drawString(cols[4], row_y + 12, str(item.get('width_cm', 0)))
        c.drawString(cols[5], row_y + 12, str(cbm))
        c.setFont("Helvetica-Bold", 22)  # Large bold for quantity
        c.drawString(cols[6], row_y + 12, f"{item.get('quantity', 1)} Pcs")
        
        # Footer - INCREASED FONT
        c.setFillColor(HexColor('#666666'))
        c.setFont("Helvetica", 10)  # Increased from 8
        footer_text = f"Buyer: {order.get('buyer_name', 'N/A')} • PO: {order.get('buyer_po_ref', 'N/A')}"
        c.drawString(margin, margin + 10, footer_text)
        c.drawRightString(width - margin, margin + 10, f"Page {idx + 1} of {len(order.get('items', []))}")
        
        c.showPage()
    
    c.save()
    buffer.seek(0)
    return buffer.getvalue()

@api_router.get("/orders/{order_id}/export/pdf")
async def export_order_pdf(order_id: str):
    order = await db.orders.find_one({"id": order_id}, {"_id": 0})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    settings = await db.template_settings.find_one({"id": "default"}, {"_id": 0})
    if not settings:
        settings = TemplateSettings().model_dump()
    
    # Fetch logo image
    logo_bytes = await fetch_image_bytes(JAIPUR_LOGO_URL)
    
    pdf_bytes = generate_pdf(order, settings, logo_bytes)
    
    export_record = ExportRecord(
        order_id=order_id,
        export_type="pdf",
        filename=f"order_{order.get('sales_order_ref', order_id)}.pdf"
    )
    await db.exports.insert_one(export_record.model_dump())
    
    return StreamingResponse(
        io.BytesIO(pdf_bytes),
        media_type="application/pdf",
        headers={"Content-Disposition": f"inline; filename=order_{order.get('sales_order_ref', order_id)}.pdf"}
    )

@api_router.get("/orders/{order_id}/preview-html")
async def preview_order_html(order_id: str):
    order = await db.orders.find_one({"id": order_id}, {"_id": 0})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    return {"html": "", "order": order}

# --- PPT EXPORT ---

@api_router.get("/orders/{order_id}/export/ppt")
async def export_order_ppt(order_id: str):
    order = await db.orders.find_one({"id": order_id}, {"_id": 0})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    settings = await db.template_settings.find_one({"id": "default"}, {"_id": 0})
    if not settings:
        settings = TemplateSettings().model_dump()
    
    prs = Presentation()
    prs.slide_width = Inches(10)
    prs.slide_height = Inches(7.5)
    
    # Title slide
    title_slide_layout = prs.slide_layouts[6]  # Blank layout
    slide = prs.slides.add_slide(title_slide_layout)
    
    # Add logo image to title slide
    try:
        logo_bytes = await fetch_image_bytes(JAIPUR_LOGO_URL)
        if logo_bytes:
            logo_stream = io.BytesIO(logo_bytes)
            slide.shapes.add_picture(logo_stream, Inches(3.5), Inches(2), width=Inches(3))
    except:
        pass
    
    # Title text
    txBox = slide.shapes.add_textbox(Inches(0.5), Inches(4.5), Inches(9), Inches(1))
    tf = txBox.text_frame
    p = tf.paragraphs[0]
    p.text = f"Production Sheet - {order.get('sales_order_ref', '')}"
    p.font.size = Pt(32)
    p.font.bold = True
    
    # Subtitle
    txBox = slide.shapes.add_textbox(Inches(0.5), Inches(5.5), Inches(9), Inches(0.5))
    tf = txBox.text_frame
    p = tf.paragraphs[0]
    p.text = f"Buyer: {order.get('buyer_name', 'N/A')} | Date: {order.get('entry_date', 'N/A')}"
    p.font.size = Pt(18)
    
    # Create slide for each item
    for item in order.get("items", []):
        slide = prs.slides.add_slide(title_slide_layout)
        
        # Header with product code
        txBox = slide.shapes.add_textbox(Inches(0.3), Inches(0.2), Inches(6), Inches(0.5))
        tf = txBox.text_frame
        p = tf.paragraphs[0]
        p.text = f"{item.get('product_code', 'N/A')} - {item.get('description', '')}"
        p.font.size = Pt(20)
        p.font.bold = True
        
        # Info table on right
        info_text = f"""Entry Date: {order.get('entry_date', 'N/A')}
Factory: {order.get('factory', 'N/A')}
Sales Ref: {order.get('sales_order_ref', 'N/A')}
Buyer PO: {order.get('buyer_po_ref', 'N/A')}"""
        
        txBox = slide.shapes.add_textbox(Inches(7), Inches(0.2), Inches(2.8), Inches(1))
        tf = txBox.text_frame
        tf.word_wrap = True
        p = tf.paragraphs[0]
        p.text = info_text
        p.font.size = Pt(10)
        
        # Product image (left side, 70%)
        product_image = item.get('product_image') or (item.get('images', [None])[0] if item.get('images') else None)
        if product_image and product_image.startswith('data:image'):
            try:
                img_data = product_image.split(',')[1]
                img_bytes = base64.b64decode(img_data)
                img_stream = io.BytesIO(img_bytes)
                slide.shapes.add_picture(img_stream, Inches(0.3), Inches(1), width=Inches(6), height=Inches(4))
            except:
                # Add placeholder text
                txBox = slide.shapes.add_textbox(Inches(0.3), Inches(2.5), Inches(6), Inches(1))
                tf = txBox.text_frame
                p = tf.paragraphs[0]
                p.text = "No Image Available"
                p.font.size = Pt(14)
        else:
            txBox = slide.shapes.add_textbox(Inches(0.3), Inches(2.5), Inches(6), Inches(1))
            tf = txBox.text_frame
            p = tf.paragraphs[0]
            p.text = "No Image Available"
            p.font.size = Pt(14)
        
        # Materials section (right side)
        materials_text = f"""MATERIALS:

Leather: {item.get('leather_code', 'N/A')}
Finish: {item.get('finish_code', 'N/A')}
Color Notes: {item.get('color_notes', 'N/A')}
Wood Finish: {item.get('wood_finish', 'N/A')}"""
        
        txBox = slide.shapes.add_textbox(Inches(6.5), Inches(1.2), Inches(3.3), Inches(2.5))
        tf = txBox.text_frame
        tf.word_wrap = True
        p = tf.paragraphs[0]
        p.text = materials_text
        p.font.size = Pt(11)
        
        # Notes section (below image)
        notes_plain = strip_html(item.get('notes', ''))
        if notes_plain:
            txBox = slide.shapes.add_textbox(Inches(0.3), Inches(5.2), Inches(9.4), Inches(1))
            tf = txBox.text_frame
            tf.word_wrap = True
            p = tf.paragraphs[0]
            p.text = f"Notes: {notes_plain}"
            p.font.size = Pt(10)
        
        # Details table at bottom
        cbm = item.get('cbm', 0)
        if item.get('cbm_auto', True):
            h = item.get('height_cm', 0) or 0
            d = item.get('depth_cm', 0) or 0
            w = item.get('width_cm', 0) or 0
            cbm = round((h * d * w) / 1000000, 4)
        
        table_text = f"""ITEM CODE: {item.get('product_code', '-')}  |  SIZE: {item.get('height_cm', 0)} × {item.get('depth_cm', 0)} × {item.get('width_cm', 0)} cm  |  CBM: {cbm}  |  QTY: {item.get('quantity', 1)} Pcs"""
        
        txBox = slide.shapes.add_textbox(Inches(0.3), Inches(6.5), Inches(9.4), Inches(0.4))
        tf = txBox.text_frame
        p = tf.paragraphs[0]
        p.text = table_text
        p.font.size = Pt(11)
        p.font.bold = True
    
    ppt_bytes = io.BytesIO()
    prs.save(ppt_bytes)
    ppt_bytes.seek(0)
    
    export_record = ExportRecord(
        order_id=order_id,
        export_type="ppt",
        filename=f"order_{order.get('sales_order_ref', order_id)}.pptx"
    )
    await db.exports.insert_one(export_record.model_dump())
    
    return StreamingResponse(
        ppt_bytes,
        media_type="application/vnd.openxmlformats-officedocument.presentationml.presentation",
        headers={"Content-Disposition": f"attachment; filename=order_{order.get('sales_order_ref', order_id)}.pptx"}
    )

# --- EXPORT HISTORY ---

@api_router.get("/exports", response_model=List[ExportRecord])
async def get_exports():
    exports = await db.exports.find({}, {"_id": 0}).to_list(1000)
    return exports

@api_router.get("/exports/{order_id}", response_model=List[ExportRecord])
async def get_order_exports(order_id: str):
    exports = await db.exports.find({"order_id": order_id}, {"_id": 0}).to_list(100)
    return exports

# --- SAMPLE EXCEL TEMPLATES ---

@api_router.get("/templates/products-sample")
async def download_products_sample():
    """Download sample Excel template for products"""
    df = pd.DataFrame({
        'Product Code': ['IDR-8-180CM', 'KRL-2-180CM-LIGHT', 'BNC-4-90CM'],
        'Description': ['Induse Dining Table', 'Kerela Spider Leg Table', 'Branch Coffee Table'],
        'Size ( in Cm )': ['180*90 cm', '180 cm', '90*90 cm'],
        'H': [76, 76, 45],
        'D': [90, 90, 90],
        'W': [180, 180, 90],
        'CBM': [1.23, 1.23, 0.36],
        'FOB India Price $': [100, 120, 80],
        'FOB India Price £': [75, 90, 60],
        'Warehouse Price £700': [150, 180, 120],
        'Warehouse Price £2000': [180, 220, 150],
        'Photo Link': ['https://example.com/image1.jpg', 'https://example.com/image2.jpg', '']
    })
    
    buffer = io.BytesIO()
    df.to_excel(buffer, index=False, sheet_name='Products')
    buffer.seek(0)
    
    return StreamingResponse(
        buffer,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": "attachment; filename=products_sample.xlsx"}
    )

@api_router.get("/templates/leather-sample")
async def download_leather_sample():
    """Download sample Excel template for leather library"""
    df = pd.DataFrame({
        'Code': ['LTH-001', 'LTH-002', 'LTH-003'],
        'Name': ['Full Grain Tan', 'Nappa Black', 'Suede Brown'],
        'Description': ['Premium full grain leather', 'Soft nappa finish', 'Brushed suede texture'],
        'Color': ['#8B4513', '#000000', '#654321'],
        'Image Link': ['https://example.com/leather1.jpg', '', '']
    })
    
    buffer = io.BytesIO()
    df.to_excel(buffer, index=False, sheet_name='Leather')
    buffer.seek(0)
    
    return StreamingResponse(
        buffer,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": "attachment; filename=leather_sample.xlsx"}
    )

@api_router.get("/templates/finish-sample")
async def download_finish_sample():
    """Download sample Excel template for finish library"""
    df = pd.DataFrame({
        'Code': ['FIN-001', 'FIN-002', 'FIN-003'],
        'Name': ['Antique Brass', 'Matte Black', 'Polished Chrome'],
        'Description': ['Vintage brass finish', 'Modern matte finish', 'Shiny chrome plating'],
        'Color': ['#CD7F32', '#1C1C1C', '#C0C0C0'],
        'Image Link': ['https://example.com/finish1.jpg', '', '']
    })
    
    buffer = io.BytesIO()
    df.to_excel(buffer, index=False, sheet_name='Finish')
    buffer.seek(0)
    
    return StreamingResponse(
        buffer,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": "attachment; filename=finish_sample.xlsx"}
    )

@api_router.get("/templates/factories-sample")
async def download_factories_sample():
    """Download sample Excel template for factories"""
    df = pd.DataFrame({
        'Code': ['SAE', 'CAC', 'GAE', 'JFW'],
        'Name': ['Shekhawati Art Exports', 'Country Art & Crafts', 'Global Art Exports', 'Jaipur Fine Wood']
    })
    
    buffer = io.BytesIO()
    df.to_excel(buffer, index=False, sheet_name='Factories')
    buffer.seek(0)
    
    return StreamingResponse(
        buffer,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": "attachment; filename=factories_sample.xlsx"}
    )

# --- PRODUCTS ---

@api_router.get("/products", response_model=List[Product])
async def get_products(lite: bool = True):
    """Get all products. Use lite=true (default) for faster loading with thumbnail images only"""
    if lite:
        # Exclude large image fields for faster loading - only return essential data
        projection = {
            "_id": 0,
            "id": 1,
            "product_code": 1,
            "description": 1,
            "category": 1,
            "size": 1,
            "height_cm": 1,
            "depth_cm": 1,
            "width_cm": 1,
            "cbm": 1,
            "fob_price_usd": 1,
            "fob_price_gbp": 1,
            "warehouse_price_1": 1,
            "warehouse_price_2": 1,
            "created_at": 1,
            "updated_at": 1,
            # Include a flag if image exists
        }
        products = await db.products.find({}, projection).to_list(1000)
        
        # Get products that have main image (simple query)
        products_with_main_image = await db.products.find(
            {"image": {"$exists": True, "$ne": ""}},
            {"_id": 0, "id": 1}
        ).to_list(1000)
        main_image_ids = set(p['id'] for p in products_with_main_image)
        
        # Get products that have images array with at least one item
        products_with_images_array = await db.products.find(
            {"images.0": {"$exists": True}},
            {"_id": 0, "id": 1}
        ).to_list(1000)
        images_array_ids = set(p['id'] for p in products_with_images_array)
        
        # Add has_image flags for UI without sending actual image data
        for product in products:
            product['has_image'] = product['id'] in main_image_ids
            product['has_image_2'] = product['id'] in images_array_ids
            product['image'] = ''
            product['images'] = []
        
        return products
    else:
        products = await db.products.find({}, {"_id": 0}).to_list(1000)
        return products

@api_router.get("/products/{product_id}/images")
async def get_product_images(product_id: str):
    """Get only images for a specific product - for lazy loading"""
    product = await db.products.find_one(
        {"id": product_id}, 
        {"_id": 0, "id": 1, "image": 1, "images": 1}
    )
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    return {
        "id": product_id,
        "image": product.get("image", ""),
        "images": product.get("images", [])
    }

@api_router.get("/products/{product_id}", response_model=Product)
async def get_product(product_id: str):
    product = await db.products.find_one({"id": product_id}, {"_id": 0})
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    return product

@api_router.post("/products", response_model=Product)
async def create_product(product_data: ProductCreate):
    # Check for duplicate product code
    existing = await db.products.find_one(
        {"product_code": {"$regex": f"^{product_data.product_code}$", "$options": "i"}},
        {"_id": 0}
    )
    if existing:
        raise HTTPException(status_code=400, detail=f"Product code '{product_data.product_code}' already exists")
    
    product = Product(**product_data.model_dump())
    doc = product.model_dump()
    await db.products.insert_one(doc)
    return product

@api_router.put("/products/{product_id}", response_model=Product)
async def update_product(product_id: str, product_data: ProductUpdate):
    existing = await db.products.find_one({"id": product_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Product not found")
    
    update_data = {k: v for k, v in product_data.model_dump().items() if v is not None}
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.products.update_one({"id": product_id}, {"$set": update_data})
    updated = await db.products.find_one({"id": product_id}, {"_id": 0})
    return updated

@api_router.delete("/products/{product_id}")
async def delete_product(product_id: str):
    result = await db.products.delete_one({"id": product_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Product not found")
    return {"message": "Product deleted"}

@api_router.post("/products/bulk")
async def bulk_create_products(products: List[ProductCreate]):
    """Bulk create products with duplicate check"""
    created = []
    duplicates = []
    
    for product_data in products:
        # Check for duplicate product code
        existing = await db.products.find_one(
            {"product_code": {"$regex": f"^{product_data.product_code}$", "$options": "i"}},
            {"_id": 0, "id": 1}
        )
        
        if existing:
            duplicates.append(product_data.product_code)
            continue
            
        product = Product(**product_data.model_dump())
        doc = product.model_dump()
        await db.products.insert_one(doc)
        created.append(product)
    
    result = {"message": f"{len(created)} products created", "products": created}
    if duplicates:
        result["duplicates"] = duplicates
        result["message"] += f", {len(duplicates)} duplicates skipped"
    return result

# --- Excel Upload Helper Functions ---
HEADER_KEYWORDS = {
    "productcode", "product code", "itemcode", "item code", "code",
    "description", "desc",
    "size", "h", "d", "w", "cbm",
    "photo link", "photolink", "image", "image url", "image_url",
    "fob", "warehouse", "category"
}

def _norm_col(s: str) -> str:
    s = str(s or "").strip().lower()
    s = re.sub(r"\s+", " ", s)
    s = re.sub(r"[^a-z0-9 ]+", "", s)
    return s.strip()

def _canon_col(s: str) -> str:
    return _norm_col(s).replace(" ", "")

def _find_header_row(df_raw: pd.DataFrame, max_rows: int = 20) -> int:
    best_idx = 0
    best_score = -1

    rows_to_check = min(max_rows, len(df_raw))
    for i in range(rows_to_check):
        row_vals = df_raw.iloc[i].tolist()
        joined = " ".join(_norm_col(v) for v in row_vals if str(v).strip().lower() != "nan")

        score = 0
        for kw in HEADER_KEYWORDS:
            if kw in joined:
                score += 1

        if "product code" in joined or "productcode" in joined:
            score += 3
        if "description" in joined:
            score += 2

        if score > best_score:
            best_score = score
            best_idx = i

    return best_idx

COLUMN_MAPPING_CANON = {
    "productcode": "product_code",
    "itemcode": "product_code",
    "code": "product_code",
    "description": "description",
    "desc": "description",
    "size": "size",
    "sizeincm": "size",
    "sizecm": "size",
    "h": "height_cm",
    "height": "height_cm",
    "heightcm": "height_cm",
    "d": "depth_cm",
    "depth": "depth_cm",
    "depthcm": "depth_cm",
    "w": "width_cm",
    "width": "width_cm",
    "widthcm": "width_cm",
    "cbm": "cbm",
    "fobindiaprice": "fob_price_usd",
    "fobindiapriceusd": "fob_price_usd",
    "fobusd": "fob_price_usd",
    "fob": "fob_price_usd",
    "fobindiapricegbp": "fob_price_gbp",
    "fobgbp": "fob_price_gbp",
    "warehouseprice700": "warehouse_price_1",
    "warehouseprice2000": "warehouse_price_2",
    "warehouseprice1": "warehouse_price_1",
    "warehouseprice2": "warehouse_price_2",
    "photolink": "image_url",
    "image": "image_url",
    "imageurl": "image_url",
    "picture": "image_url",
    "photo": "image_url",
    "category": "category",
}

def safe_float_excel(val, default=0.0) -> float:
    try:
        if pd.isna(val):
            return default
        s = str(val).strip()
        if s == "" or s.lower() == "nan":
            return default
        s = s.replace(",", "")
        s = re.sub(r"^[^\d\-\.]+", "", s)
        return float(s)
    except Exception:
        return default


@api_router.post("/products/upload-excel")
async def upload_products_excel(file: UploadFile = File(...)):
    """Upload products from Excel file with robust header detection"""
    if not file.filename.endswith((".xlsx", ".xls")):
        raise HTTPException(status_code=400, detail="File must be an Excel file (.xlsx or .xls)")

    try:
        contents = await file.read()
        df_raw = pd.read_excel(io.BytesIO(contents), header=None)

        if df_raw.empty:
            raise HTTPException(status_code=400, detail="Excel file is empty")

        header_row_idx = _find_header_row(df_raw, max_rows=20)

        headers = df_raw.iloc[header_row_idx].tolist()
        df = df_raw.iloc[header_row_idx + 1:].reset_index(drop=True)
        df.columns = headers

        # normalize columns
        df.columns = [_canon_col(c) for c in df.columns]

        # rename columns
        rename_map = {}
        for c in df.columns:
            mapped = COLUMN_MAPPING_CANON.get(c)
            if mapped:
                rename_map[c] = mapped
        df = df.rename(columns=rename_map)

        # fallback heuristic for product_code
        if "product_code" not in df.columns:
            for c in df.columns:
                sample = df[c].dropna().astype(str).head(10).tolist()
                if sample and sum(("-" in s) for s in sample) >= max(2, len(sample) // 2):
                    df = df.rename(columns={c: "product_code"})
                    break

        if "product_code" not in df.columns:
            raise HTTPException(status_code=400, detail="Could not detect product_code column in the Excel file")

        # Create unique index on product_code if not exists
        try:
            await db.products.create_index("product_code", unique=True)
        except Exception:
            pass

        created_products = []
        warnings = []
        errors = []

        skipped_empty = 0
        skipped_dup_file = 0
        skipped_dup_db = 0

        seen_in_file = set()

        for idx, row in df.iterrows():
            row_no = idx + 1
            try:
                raw_code = str(row.get("product_code", "")).strip()
                if not raw_code or raw_code.lower() == "nan":
                    skipped_empty += 1
                    continue

                product_code = raw_code.upper()

                # duplicate in file: save first, skip rest
                if product_code in seen_in_file:
                    skipped_dup_file += 1
                    if len(warnings) < 20:
                        warnings.append(f"Row {row_no}: Duplicate product_code in file skipped ({product_code}).")
                    continue
                seen_in_file.add(product_code)

                product_data = {
                    "product_code": product_code,
                    "description": str(row.get("description", "")).strip() if pd.notna(row.get("description")) else "",
                    "size": str(row.get("size", "")).strip() if pd.notna(row.get("size")) else "",
                    "category": str(row.get("category", "")).strip() if pd.notna(row.get("category")) else "",
                    "height_cm": safe_float_excel(row.get("height_cm")),
                    "depth_cm": safe_float_excel(row.get("depth_cm")),
                    "width_cm": safe_float_excel(row.get("width_cm")),
                    "cbm": safe_float_excel(row.get("cbm")),
                    "fob_price_usd": safe_float_excel(row.get("fob_price_usd")),
                    "fob_price_gbp": safe_float_excel(row.get("fob_price_gbp")),
                    "warehouse_price_1": safe_float_excel(row.get("warehouse_price_1")),
                    "warehouse_price_2": safe_float_excel(row.get("warehouse_price_2")),
                    "image": "",
                    "images": [],
                }

                # image optional
                image_url = str(row.get("image_url", "")).strip() if pd.notna(row.get("image_url")) else ""
                if image_url and image_url.lower() not in {"nan", "#ref!"} and image_url.startswith("http"):
                    try:
                        async with httpx.AsyncClient(timeout=15.0, follow_redirects=True) as client:
                            resp = await client.get(image_url)
                            if resp.status_code == 200:
                                ctype = resp.headers.get("content-type", "")
                                if "image" in ctype:
                                    b64 = base64.b64encode(resp.content).decode("utf-8")
                                    product_data["image"] = f"data:{ctype};base64,{b64}"
                    except Exception:
                        pass

                product = Product(**product_data)
                doc = product.model_dump()

                try:
                    await db.products.insert_one(doc)
                except DuplicateKeyError:
                    skipped_dup_db += 1
                    if len(warnings) < 20:
                        warnings.append(f"Row {row_no}: Product already exists in database, skipped ({product_code}).")
                    continue

                created_products.append({
                    "product_code": product.product_code,
                    "description": product.description
                })

            except Exception as row_error:
                errors.append(f"Row {row_no}: Failed to import row ({str(row_error)}).")

        return {
            "message": f"{len(created_products)} products imported successfully",
            "created": len(created_products),
            "skipped": {
                "empty_product_code": skipped_empty,
                "duplicate_in_file": skipped_dup_file,
                "duplicate_in_db": skipped_dup_db,
            },
            "warnings": warnings,
            "errors": errors[:10],
            "products": created_products[:20],
            "detected_header_row": header_row_idx + 1,
            "detected_columns": list(df.columns),
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing Excel file: {str(e)}")

# --- DASHBOARD STATS ---

@api_router.get("/dashboard/stats")
async def get_dashboard_stats():
    total_orders = await db.orders.count_documents({})
    draft_orders = await db.orders.count_documents({"status": "Draft"})
    in_production = await db.orders.count_documents({"status": "In Production"})
    completed = await db.orders.count_documents({"status": "Done"})
    
    recent_orders = await db.orders.find({}, {"_id": 0}).sort("created_at", -1).limit(5).to_list(5)
    
    return {
        "total_orders": total_orders,
        "draft_orders": draft_orders,
        "in_production": in_production,
        "completed": completed,
        "recent_orders": recent_orders
    }

# --- QUOTATIONS ---

@api_router.get("/quotations", response_model=List[Quotation])
async def get_quotations():
    quotations = await db.quotations.find({}, {"_id": 0}).sort("created_at", -1).to_list(1000)
    return quotations

@api_router.get("/quotations/{quotation_id}", response_model=Quotation)
async def get_quotation(quotation_id: str):
    quotation = await db.quotations.find_one({"id": quotation_id}, {"_id": 0})
    if not quotation:
        raise HTTPException(status_code=404, detail="Quotation not found")
    return quotation

@api_router.post("/quotations", response_model=Quotation)
async def create_quotation(quotation: QuotationCreate):
    doc = Quotation(**quotation.model_dump()).model_dump()
    await db.quotations.insert_one(doc)
    return doc

@api_router.put("/quotations/{quotation_id}", response_model=Quotation)
async def update_quotation(quotation_id: str, quotation: QuotationUpdate):
    existing = await db.quotations.find_one({"id": quotation_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Quotation not found")
    
    update_data = {k: v for k, v in quotation.model_dump().items() if v is not None}
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.quotations.update_one({"id": quotation_id}, {"$set": update_data})
    updated = await db.quotations.find_one({"id": quotation_id}, {"_id": 0})
    return updated

@api_router.delete("/quotations/{quotation_id}")
async def delete_quotation(quotation_id: str):
    result = await db.quotations.delete_one({"id": quotation_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Quotation not found")
    return {"message": "Quotation deleted successfully"}

@api_router.post("/quotations/{quotation_id}/duplicate", response_model=Quotation)
async def duplicate_quotation(quotation_id: str):
    """Duplicate an existing quotation for reuse"""
    existing = await db.quotations.find_one({"id": quotation_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Quotation not found")
    
    # Create new quotation based on existing one
    new_quotation = {
        **existing,
        "id": str(uuid.uuid4()),
        "reference": f"{existing.get('reference', 'QT')}-COPY",
        "date": datetime.now(timezone.utc).strftime("%Y-%m-%d"),
        "status": "draft",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.quotations.insert_one(new_quotation)
    return new_quotation

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
