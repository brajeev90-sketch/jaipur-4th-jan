# JAIPUR - Production Sheet & Quotation System

## Original Problem Statement
Build a web-based software for "JAIPUR - A fine wood furniture company" to generate A4 multi-page PDF production sheets and PPT slides, plus a quotation management system.

## Core Requirements
- **PDF/PPT Generation**: Generate structured PDFs and PPTs for production teams
- **PDF Layout**: Header with logo, date, notes. Large product photo area and bottom table with item details
- **Quotation System**: Create, save, edit, and print quotations with product images
- **Admin Authentication**: JWT-based admin login
- **Bilingual Support**: Hindi language support

## Data Models
- **Orders**: Multiple line items, reference fields, date, status, factory
- **Items**: Product details, material codes, notes, multiple images
- **Products**: Code, description, dimensions, pricing, images
- **Quotations**: Reference, customer, items with images, totals
- **Libraries**: Leather and Finish materials with images

## Technical Stack
- **Backend**: FastAPI, Pydantic, Motor (MongoDB), ReportLab, python-pptx
- **Frontend**: React, React Router, Tailwind CSS, Shadcn/UI, Axios
- **Database**: MongoDB
- **Authentication**: JWT tokens

---

## What's Been Implemented

### Session: March 3, 2026

#### Bug Fixes (All Tested & Verified)
1. **P0: Quotation Items Not Saving Images**
   - Root cause: `QuotationItem` model was missing `image` field
   - Fix: Added `image: str = ""` to QuotationItem model in server.py (line 295)
   - Status: FIXED & VERIFIED

2. **P1: Change Password Functionality**
   - Root cause: Endpoint used query params instead of JSON body
   - Fix: Created `ChangePasswordRequest` model, updated endpoint and frontend
   - Status: FIXED & VERIFIED

3. **P2: Main Image in Edit Item Dialog**
   - Root cause: No fallback logic when `product_image` is empty
   - Fix: Added `product_image || images[0]` fallback in openItemDialog
   - Status: FIXED & VERIFIED

#### Previously Completed (from handoff)
- Print/PDF Generation using frontend `window.print()` approach
- Quotation 2-column landscape layout
- View/Edit popups for saved quotations
- Image display fallback logic in OrderPreview
- Dialog behavior (prevent close on outside click)
- Category auto-population when selecting product
- Duplicate product code validation
- Simplified Leather/Finish library forms
- Extensive CSS @media print styling

---

## Prioritized Backlog

### P0 - Critical
- None remaining

### P1 - High Priority  
- Performance optimization (database indexing, pagination)
- Finalize Quotation Layout to match reference image exactly

### P2 - Medium Priority
- Implement Email functionality for OrderPreview
- Address duplicate Factory/Unit field issue (if still present)
- Clarify unclear user requirements from handwritten notes

### P3 - Future Tasks
- Template System for admin-customizable PDF layouts
- Granular User Roles (Sales, Production)
- Store Export Version History
- WhatsApp PDF Sharing improvements

---

## Test Coverage
- Backend tests: `/app/backend/tests/test_quotation_and_auth.py`
- Test reports: `/app/test_reports/iteration_5.json`
- All critical bugs verified fixed with 100% pass rate

---

## Admin Credentials
- Username: `admin`
- Password: `admin123`

## API Base URL
- Preview: `https://wood-catalog-2.preview.emergentagent.com`
