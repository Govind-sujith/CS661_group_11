# /backend/app/main.py
from fastapi import FastAPI
from app.api import endpoints
from fastapi.middleware.cors import CORSMiddleware
from app.database import engine
from app.models import db_models
from app.ml import predictor

predictor.load_model()

db_models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="Wildfire Analytics API", version="1.0.0")

# This is CRITICAL. It allows the frontend (running on a different address)
# to make requests to this backend.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include all the routes from our endpoints file
app.include_router(endpoints.router, prefix="/api/v1")

@app.get("/", tags=["Root"])
def read_root():
    return {"message": "Welcome to the Wildfire Analytics upgraded API!"}