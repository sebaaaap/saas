from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from app.core.config import settings
from app.api import (
    auth, pos, inventory, purchases, customers,
    sessions, products, locations, suppliers,
    categories, reports, users, quotes, reception,
    printing, branches, expenses, payment_methods,
    superadmin, companies
)
import os

app = FastAPI(
    title=settings.PROJECT_NAME,
    version="1.0.0",
    description="Sistema POS Híbrido - Local y Web"
)

# CORS
origins = [str(origin) for origin in settings.CORS_ORIGINS]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins if origins else ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Servir archivos estáticos (imágenes de productos)
UPLOAD_DIR = "uploads"
if not os.path.exists(UPLOAD_DIR):
    os.makedirs(UPLOAD_DIR)
app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")

# Registrar Routers
app.include_router(auth.router, prefix="/api/v1/auth", tags=["Authentication"])
app.include_router(pos.router, prefix="/api/v1/pos", tags=["Point of Sale"])
app.include_router(inventory.router, prefix="/api/v1/inventory", tags=["Inventory"])
app.include_router(purchases.router, prefix="/api/v1/purchases", tags=["Purchases"])
app.include_router(customers.router, prefix="/api/v1/customers", tags=["Customers"])
app.include_router(sessions.router, prefix="/api/v1/sessions", tags=["Cash Sessions"])
app.include_router(products.router, prefix="/api/v1/products", tags=["Products"])
app.include_router(locations.router, prefix="/api/v1/locations", tags=["Locations"])
app.include_router(suppliers.router, prefix="/api/v1/suppliers", tags=["Suppliers"])
app.include_router(categories.router, prefix="/api/v1/categories", tags=["Categories"])
app.include_router(reports.router, prefix="/api/v1/reports", tags=["Reports"])
app.include_router(users.router, prefix="/api/v1/users", tags=["Users"])
app.include_router(quotes.router, prefix="/api/v1", tags=["Quotes"])
app.include_router(reception.router, prefix="/api/v1/ot", tags=["Reception"])
app.include_router(printing.router, prefix="/api/v1/printing", tags=["Printing"])
app.include_router(branches.router, prefix="/api/v1/branches", tags=["Branches"])
app.include_router(companies.router, prefix="/api/v1/companies", tags=["Companies"])
app.include_router(expenses.router, prefix="/api/v1/expenses", tags=["Expenses"])
app.include_router(payment_methods.router, prefix="/api/v1/payment-methods", tags=["Payment Methods"])
app.include_router(superadmin.router, prefix="/api/v1/superadmin", tags=["Super Admin"])

@app.get("/")
def root():
    return {
        "status": "online",
        "mode": settings.DEPLOYMENT_MODE,
        "database": "SQLite (Local)" if "sqlite" in settings.DATABASE_URL else "PostgreSQL (VPS)"
    }

from app.database import engine
from sqlalchemy import text
import time

@app.on_event("startup")
def startup_event():
    retries = 3
    while retries > 0:
        try:
            with engine.connect() as conn:
                conn.execute(text("SELECT 1"))
            print("Database connected successfully!")
            break
        except Exception as e:
            retries -= 1
            print(f"Database connection failed. Retries left: {retries}. Error: {e}")
            if retries == 0:
                raise RuntimeError("Critical Error: Cannot connect to PostgreSQL")
            time.sleep(2)

@app.get("/api/health")
def health_check():
    return {"status": "ok"}
