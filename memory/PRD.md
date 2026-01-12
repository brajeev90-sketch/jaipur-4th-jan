# JAIPUR Fine Wood Furniture - Production Sheet Generator

## Original Problem Statement
Web-based software for "JAIPUR – A fine wood furniture company" to generate A4 multi-page PDF production sheets and PPT slides.

## Core Features
- **PDF/PPT Generation**: Structured PDFs and PPTs for production teams
- **Order Management**: Multiple line items, reference fields, dates, status, factory
- **Product Catalog**: Code, description, dimensions, pricing, images
- **Quotation System**: Save, edit, view, print, export to Excel
- **Library Management**: Leather, Finish materials with images
- **Bulk Upload**: Excel import for products and library items
- **Template System**: Admin-customizable PDF/PPT layouts
- **Mobile-friendly** and **Hindi language support**

## Data Models
- **Orders**: Line items, status, factory, dates
- **Items**: Product details, material codes, notes, multiple images
- **Products**: Code, description, dimensions, pricing, up to 2 images
- **Libraries**: Leather, Finish with images

## Tech Stack
- Frontend: React + Tailwind CSS + Shadcn UI
- Backend: FastAPI (Python)
- Database: MongoDB
- Deployment: Hostinger VPS

## Admin Credentials
- Username: `admin`
- Password: `admin123`

---

## What's Been Implemented

### December 2025 - January 2026

**Completed:**
- Full authentication system (JWT-based)
- Product catalog with CRUD operations
- Order management with line items
- Quotation system (save, edit, view, print, Excel export)
- Bulk Excel upload for products (robust header detection)
- Leather and Finish library management
- Factory/Unit management
- PDF and PPT generation
- Print preview with WYSIWYG output
- WhatsApp sharing (link-based)

**January 9, 2026:**
- Fixed bulk upload Excel header detection bug (was incorrectly skipping data rows)
- Integrated improved bulk upload code with DuplicateKeyError handling
- Added `from pymongo.errors import DuplicateKeyError` import

**January 12, 2026:**
- **Products can now have 2 images** (Image 1 Main + Image 2)
- Product cards show navigation arrows when multiple images exist
- Image indicator dots show current position
- **Order creation**: When selecting a product, first image becomes main product image, second image automatically added as additional image (shown below main)

---

## Pending Issues

### P1 - Medium Priority
1. **Change Password functionality** - Backend API endpoint missing
2. **Duplicate Factory/Unit field** - Shows redundantly in Add Item dialog

### P2 - Lower Priority
1. **Email functionality** - Email button is placeholder
2. **Notes Templates** - Save and reuse common notes

---

## Future Tasks (Backlog)

### P3
- Template System for PDF/PPT customization
- Granular user roles (Sales, Production)
- Export version history
- Direct WhatsApp PDF sharing (file attachment)

---

## API Endpoints

### Products
- `GET /api/products` - List all products
- `POST /api/products` - Create product
- `PUT /api/products/{id}` - Update product
- `DELETE /api/products/{id}` - Delete product
- `POST /api/products/upload-excel` - Bulk upload from Excel

### Orders
- `GET /api/orders` - List orders
- `POST /api/orders` - Create order
- `PUT /api/orders/{id}` - Update order
- `DELETE /api/orders/{id}` - Delete order

### Quotations
- `GET /api/quotations` - List quotations
- `POST /api/quotations` - Save quotation
- `PUT /api/quotations/{id}` - Update quotation

---

## Key Files

### Frontend
- `/app/frontend/src/pages/Products.jsx` - Product management with 2-image support
- `/app/frontend/src/pages/EditOrder.jsx` - Order editing with auto-image assignment
- `/app/frontend/src/pages/OrderPreview.jsx` - Print preview
- `/app/frontend/src/pages/Quotation.jsx` - Quotation management

### Backend
- `/app/backend/server.py` - Main API server (monolith)

### Deployment
- `/app/deploy/install.sh` - VPS installation script
- `/app/DEPLOYMENT_GUIDE.md` - Deployment documentation
