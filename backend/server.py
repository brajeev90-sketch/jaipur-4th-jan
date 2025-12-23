from fastapi import FastAPI, APIRouter, HTTPException, UploadFile, File
from fastapi.responses import StreamingResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional
import uuid
from datetime import datetime, timezone
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

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

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

# ============ ROUTES ============

@api_router.get("/")
async def root():
    return {"message": "JAIPUR Production Sheet API"}

# --- ORDERS ---

@api_router.get("/orders", response_model=List[Order])
async def get_orders():
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
    await db.factories.insert_one(factory_doc)
    return factory_doc

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
    return [
        {"id": "chair", "name": "Chair"},
        {"id": "sofa", "name": "Sofa"},
        {"id": "bar-chair", "name": "Bar Chair"},
        {"id": "table", "name": "Table"},
        {"id": "bed", "name": "Bed"},
        {"id": "cabinet", "name": "Cabinet"},
        {"id": "shelf", "name": "Shelf"},
        {"id": "other", "name": "Other"}
    ]

# --- PDF EXPORT ---

def strip_html(text):
    """Remove HTML tags from text"""
    clean = re.compile('<.*?>')
    return re.sub(clean, '', text or '')

def generate_pdf(order: dict, settings: dict) -> bytes:
    buffer = io.BytesIO()
    c = canvas.Canvas(buffer, pagesize=A4)
    width, height = A4
    margin = settings.get('page_margin_mm', 15) * mm
    
    primary_color = HexColor(settings.get('primary_color', '#3d2c1e'))
    
    for idx, item in enumerate(order.get("items", [])):
        # Header
        c.setFillColor(primary_color)
        c.setFont("Helvetica-Bold", 24)
        c.drawString(margin, height - margin - 20, settings.get('logo_text', 'JAIPUR'))
        
        c.setFillColor(HexColor('#666666'))
        c.setFont("Helvetica", 9)
        c.drawString(margin, height - margin - 35, settings.get('company_name', ''))
        
        # Date table on right
        c.setFillColor(HexColor('#333333'))
        c.setFont("Helvetica", 8)
        right_x = width - margin - 120
        y = height - margin - 15
        
        dates = [
            ("Entry Date", order.get('entry_date', 'N/A')),
            ("Factory", order.get('factory', 'N/A')),
            ("Sales Ref", order.get('sales_order_ref', 'N/A')),
            ("Buyer PO", order.get('buyer_po_ref', 'N/A')),
        ]
        
        for label, value in dates:
            c.setFont("Helvetica-Bold", 7)
            c.drawString(right_x, y, label + ":")
            c.setFont("Helvetica", 7)
            c.drawString(right_x + 50, y, str(value))
            y -= 12
        
        # Separator line
        c.setStrokeColor(primary_color)
        c.setLineWidth(2)
        c.line(margin, height - margin - 55, width - margin, height - margin - 55)
        
        # Content area
        content_y = height - margin - 80
        
        # Image placeholder
        c.setStrokeColor(HexColor('#cccccc'))
        c.setLineWidth(1)
        c.rect(margin, content_y - 180, 200, 180)
        
        if item.get('images') and len(item['images']) > 0:
            try:
                img_data = item['images'][0]
                if img_data.startswith('data:image'):
                    img_data = img_data.split(',')[1]
                    img_bytes = base64.b64decode(img_data)
                    from reportlab.lib.utils import ImageReader
                    img = ImageReader(io.BytesIO(img_bytes))
                    c.drawImage(img, margin + 5, content_y - 175, width=190, height=170, preserveAspectRatio=True)
            except Exception as e:
                c.setFillColor(HexColor('#888888'))
                c.setFont("Helvetica", 10)
                c.drawCentredString(margin + 100, content_y - 90, "Image Error")
        else:
            c.setFillColor(HexColor('#888888'))
            c.setFont("Helvetica", 10)
            c.drawCentredString(margin + 100, content_y - 90, "No Image")
        
        # Notes section
        notes_x = margin + 220
        notes_width = width - margin - notes_x
        
        c.setStrokeColor(HexColor('#cccccc'))
        c.rect(notes_x, content_y - 180, notes_width, 180)
        
        c.setFillColor(primary_color)
        c.setFont("Helvetica-Bold", 9)
        c.drawString(notes_x + 10, content_y - 15, "NOTES")
        
        c.setFillColor(HexColor('#333333'))
        c.setFont("Helvetica", 8)
        notes_text = strip_html(item.get('notes', 'No notes'))
        
        # Wrap notes text
        notes_y = content_y - 30
        max_width = notes_width - 20
        words = notes_text.split()
        line = ""
        for word in words:
            test_line = line + " " + word if line else word
            if c.stringWidth(test_line, "Helvetica", 8) < max_width:
                line = test_line
            else:
                c.drawString(notes_x + 10, notes_y, line)
                notes_y -= 12
                line = word
                if notes_y < content_y - 100:
                    break
        if line:
            c.drawString(notes_x + 10, notes_y, line)
        
        # Material info
        material_y = content_y - 120
        c.setFont("Helvetica-Bold", 7)
        c.drawString(notes_x + 10, material_y, "Leather:")
        c.setFont("Helvetica", 7)
        c.drawString(notes_x + 60, material_y, item.get('leather_code', 'N/A'))
        
        material_y -= 12
        c.setFont("Helvetica-Bold", 7)
        c.drawString(notes_x + 10, material_y, "Finish:")
        c.setFont("Helvetica", 7)
        c.drawString(notes_x + 60, material_y, item.get('finish_code', 'N/A'))
        
        material_y -= 12
        c.setFont("Helvetica-Bold", 7)
        c.drawString(notes_x + 10, material_y, "Color Notes:")
        c.setFont("Helvetica", 7)
        c.drawString(notes_x + 60, material_y, item.get('color_notes', 'N/A'))
        
        material_y -= 12
        c.setFont("Helvetica-Bold", 7)
        c.drawString(notes_x + 10, material_y, "Wood Finish:")
        c.setFont("Helvetica", 7)
        c.drawString(notes_x + 60, material_y, item.get('wood_finish', 'N/A'))
        
        # Details table
        table_y = content_y - 220
        
        # Table header
        c.setFillColor(primary_color)
        c.rect(margin, table_y, width - 2*margin, 20, fill=True)
        
        c.setFillColor(HexColor('#ffffff'))
        c.setFont("Helvetica-Bold", 8)
        
        cols = [margin + 5, margin + 70, margin + 200, margin + 260, margin + 310, margin + 360, margin + 410]
        headers = ["Item Code", "Description", "H (cm)", "D (cm)", "W (cm)", "CBM", "Qty"]
        
        for i, header in enumerate(headers):
            c.drawString(cols[i], table_y + 6, header)
        
        # Table row
        cbm = item.get('cbm', 0)
        if item.get('cbm_auto', True):
            h = item.get('height_cm', 0) or 0
            d = item.get('depth_cm', 0) or 0
            w = item.get('width_cm', 0) or 0
            cbm = round((h * d * w) / 1000000, 4)
        
        row_y = table_y - 20
        c.setStrokeColor(HexColor('#cccccc'))
        c.rect(margin, row_y, width - 2*margin, 20)
        
        c.setFillColor(HexColor('#333333'))
        c.setFont("Courier", 8)
        c.drawString(cols[0], row_y + 6, str(item.get('product_code', '-')))
        
        c.setFont("Helvetica", 8)
        desc = item.get('description', '-')[:30]
        c.drawString(cols[1], row_y + 6, desc)
        c.drawString(cols[2], row_y + 6, str(item.get('height_cm', 0)))
        c.drawString(cols[3], row_y + 6, str(item.get('depth_cm', 0)))
        c.drawString(cols[4], row_y + 6, str(item.get('width_cm', 0)))
        c.drawString(cols[5], row_y + 6, str(cbm))
        c.drawString(cols[6], row_y + 6, str(item.get('quantity', 1)))
        
        # Footer
        c.setFillColor(HexColor('#888888'))
        c.setFont("Helvetica", 8)
        footer_text = f"Buyer: {order.get('buyer_name', 'N/A')} | Page {idx + 1} of {len(order.get('items', []))}"
        c.drawCentredString(width / 2, margin, footer_text)
        
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
    
    pdf_bytes = generate_pdf(order, settings)
    
    export_record = ExportRecord(
        order_id=order_id,
        export_type="pdf",
        filename=f"order_{order.get('sales_order_ref', order_id)}.pdf"
    )
    await db.exports.insert_one(export_record.model_dump())
    
    return StreamingResponse(
        io.BytesIO(pdf_bytes),
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=order_{order.get('sales_order_ref', order_id)}.pdf"}
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
    
    title_slide_layout = prs.slide_layouts[6]
    slide = prs.slides.add_slide(title_slide_layout)
    
    txBox = slide.shapes.add_textbox(Inches(0.5), Inches(2.5), Inches(9), Inches(1.5))
    tf = txBox.text_frame
    p = tf.paragraphs[0]
    p.text = settings.get('logo_text', 'JAIPUR')
    p.font.size = Pt(48)
    p.font.bold = True
    
    txBox = slide.shapes.add_textbox(Inches(0.5), Inches(4), Inches(9), Inches(1))
    tf = txBox.text_frame
    p = tf.paragraphs[0]
    p.text = f"Production Sheet - {order.get('sales_order_ref', '')} | Buyer: {order.get('buyer_name', '')}"
    p.font.size = Pt(24)
    
    for item in order.get("items", []):
        slide = prs.slides.add_slide(title_slide_layout)
        
        txBox = slide.shapes.add_textbox(Inches(0.5), Inches(0.3), Inches(9), Inches(0.5))
        tf = txBox.text_frame
        p = tf.paragraphs[0]
        p.text = f"{item.get('product_code', 'N/A')} - {item.get('description', '')}"
        p.font.size = Pt(24)
        p.font.bold = True
        
        details_text = f"""Category: {item.get('category', 'N/A')}
Size: H {item.get('height_cm', 0)} × D {item.get('depth_cm', 0)} × W {item.get('width_cm', 0)} cm
CBM: {item.get('cbm', 0)} | Quantity: {item.get('quantity', 1)} pcs
Leather: {item.get('leather_code', 'N/A')} | Finish: {item.get('finish_code', 'N/A')}
Color Notes: {item.get('color_notes', 'N/A')}
Wood Finish: {item.get('wood_finish', 'N/A')}"""
        
        txBox = slide.shapes.add_textbox(Inches(5), Inches(1.2), Inches(4.5), Inches(3))
        tf = txBox.text_frame
        tf.word_wrap = True
        p = tf.paragraphs[0]
        p.text = details_text
        p.font.size = Pt(14)
        
        if item.get('notes'):
            notes_plain = strip_html(item.get('notes', ''))
            txBox = slide.shapes.add_textbox(Inches(5), Inches(4.5), Inches(4.5), Inches(2.5))
            tf = txBox.text_frame
            tf.word_wrap = True
            p = tf.paragraphs[0]
            p.text = f"Notes:\n{notes_plain}"
            p.font.size = Pt(12)
    
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
async def get_products():
    products = await db.products.find({}, {"_id": 0}).to_list(1000)
    return products

@api_router.get("/products/{product_id}", response_model=Product)
async def get_product(product_id: str):
    product = await db.products.find_one({"id": product_id}, {"_id": 0})
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    return product

@api_router.post("/products", response_model=Product)
async def create_product(product_data: ProductCreate):
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
    created = []
    for product_data in products:
        product = Product(**product_data.model_dump())
        doc = product.model_dump()
        await db.products.insert_one(doc)
        created.append(product)
    return {"message": f"{len(created)} products created", "products": created}

@api_router.post("/products/upload-excel")
async def upload_products_excel(file: UploadFile = File(...)):
    """Upload products from Excel file with optional image URLs"""
    if not file.filename.endswith(('.xlsx', '.xls')):
        raise HTTPException(status_code=400, detail="File must be an Excel file (.xlsx or .xls)")
    
    try:
        # Read Excel file
        contents = await file.read()
        df = pd.read_excel(io.BytesIO(contents))
        
        # Check if first row contains actual headers (e.g., "Product Code", "Description")
        # This handles Excel files with merged header cells or wrong header detection
        first_row_values = df.iloc[0].astype(str).str.lower().tolist()
        header_keywords = ['product code', 'description', 'cbm', 'photo link', 'h', 'd', 'w']
        has_header_in_first_row = any(keyword in ' '.join(first_row_values) for keyword in header_keywords)
        
        if has_header_in_first_row or any('unnamed' in str(col).lower() for col in df.columns):
            # First row contains actual headers - use it and skip
            new_headers = df.iloc[0].astype(str).tolist()
            df = df.iloc[1:].reset_index(drop=True)
            df.columns = new_headers
        
        # Normalize column names (handle various formats)
        column_mapping = {
            'product code': 'product_code',
            'productcode': 'product_code',
            'item code': 'product_code',
            'itemcode': 'product_code',
            'code': 'product_code',
            'description': 'description',
            'desc': 'description',
            'size': 'size',
            'size ( in cm )': 'size',
            'size (cm)': 'size',
            'h': 'height_cm',
            'height': 'height_cm',
            'height_cm': 'height_cm',
            'd': 'depth_cm',
            'depth': 'depth_cm',
            'depth_cm': 'depth_cm',
            'w': 'width_cm',
            'width': 'width_cm',
            'width_cm': 'width_cm',
            'cbm': 'cbm',
            'fob india price $': 'fob_price_usd',
            'fob $': 'fob_price_usd',
            'fob_price_usd': 'fob_price_usd',
            'fob india price £': 'fob_price_gbp',
            'fob £': 'fob_price_gbp',
            'fob_price_gbp': 'fob_price_gbp',
            'warehouse price £700': 'warehouse_price_1',
            'warehouse_price_1': 'warehouse_price_1',
            'warehouse price £2000': 'warehouse_price_2',
            'warehouse_price_2': 'warehouse_price_2',
            'photo link': 'image_url',
            'photolink': 'image_url',
            'image': 'image_url',
            'image_url': 'image_url',
            'photo': 'image_url',
            'picture': 'image_url',
            'category': 'category',
        }
        
        # Rename columns
        df.columns = df.columns.str.lower().str.strip()
        df = df.rename(columns=column_mapping)
        
        created_products = []
        skipped = 0
        errors = []
        
        for idx, row in df.iterrows():
            try:
                # Skip rows without product code
                product_code = str(row.get('product_code', '')).strip()
                if not product_code or product_code == 'nan' or product_code == '':
                    skipped += 1
                    continue
                
                # Parse numeric fields safely
                def safe_float(val, default=0):
                    try:
                        if pd.isna(val) or val == '' or val == 'nan':
                            return default
                        return float(val)
                    except:
                        return default
                
                # Build product data
                product_data = {
                    'product_code': product_code.upper(),
                    'description': str(row.get('description', '')).strip() if pd.notna(row.get('description')) else '',
                    'size': str(row.get('size', '')).strip() if pd.notna(row.get('size')) else '',
                    'category': str(row.get('category', '')).strip() if pd.notna(row.get('category')) else '',
                    'height_cm': safe_float(row.get('height_cm')),
                    'depth_cm': safe_float(row.get('depth_cm')),
                    'width_cm': safe_float(row.get('width_cm')),
                    'cbm': safe_float(row.get('cbm')),
                    'fob_price_usd': safe_float(row.get('fob_price_usd')),
                    'fob_price_gbp': safe_float(row.get('fob_price_gbp')),
                    'warehouse_price_1': safe_float(row.get('warehouse_price_1')),
                    'warehouse_price_2': safe_float(row.get('warehouse_price_2')),
                    'image': '',
                    'images': []
                }
                
                # Handle image URL - try to fetch and convert to base64
                image_url = str(row.get('image_url', '')).strip() if pd.notna(row.get('image_url')) else ''
                if image_url and image_url != 'nan' and image_url != '#REF!' and image_url.startswith('http'):
                    try:
                        async with httpx.AsyncClient(timeout=10.0) as client:
                            response = await client.get(image_url)
                            if response.status_code == 200:
                                content_type = response.headers.get('content-type', 'image/jpeg')
                                if 'image' in content_type:
                                    image_base64 = base64.b64encode(response.content).decode('utf-8')
                                    product_data['image'] = f"data:{content_type};base64,{image_base64}"
                    except Exception as img_error:
                        # Log but continue without image
                        pass
                
                # Create product
                product = Product(**product_data)
                doc = product.model_dump()
                await db.products.insert_one(doc)
                created_products.append({
                    'product_code': product.product_code,
                    'description': product.description
                })
                
            except Exception as row_error:
                errors.append(f"Row {idx + 2}: {str(row_error)}")
        
        return {
            "message": f"Successfully imported {len(created_products)} products",
            "created": len(created_products),
            "skipped": skipped,
            "errors": errors[:10] if errors else [],  # Return first 10 errors only
            "products": created_products[:20]  # Return first 20 products
        }
        
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
