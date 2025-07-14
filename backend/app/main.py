# /backend/app/main.py
from fastapi import FastAPI
from app.api import endpoints
from fastapi.middleware.cors import CORSMiddleware
from app.database import engine
from app.models import db_models
from app.ml import predictor

# This is the main entry point for our backend application.

# When the application starts, we load the machine learning model into memory.
predictor.load_model()

# This line checks our database and creates the 'wildfires' table if it doesn't already exist.
db_models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="Wildfire Analytics API", version="1.0.0")

# We need to set up CORS (Cross-Origin Resource Sharing) rules.
# This is important because our frontend and backend are running on different addresses,
# and this allows them to communicate securely.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# This brings in all the API routes (like /fires, /predict, etc.) from our endpoints file.
app.include_router(endpoints.router, prefix="/api/v1")

# A simple root endpoint to confirm the API is running.
@app.get("/", tags=["Root"])
def read_root():
    return {"message": "Welcome to the Wildfire Analytics upgraded API!(if u see this,that means api working)"}
