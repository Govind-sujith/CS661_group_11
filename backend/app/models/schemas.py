# /backend/app/models/schemas.py
from pydantic import BaseModel
from typing import List, Optional
from datetime import date

# This defines the structure for one fire point on the main map
# In backend/app/models/schemas.py
class FirePoint(BaseModel):
    fod_id: int
    lat: float
    lon: float
    cause: str
    agency: Optional[str]
    fire_size: float
    fire_year: int
    state: str
    # --- NEW, OPTIONAL FIELDS ---
    fire_name: Optional[str] = None
    county: Optional[str] = None

# This defines the structure for the Agency Performance chart
class AgencyPerformance(BaseModel):
    agency_name: str
    avg_fire_size: float
    fire_count: int
    avg_duration: float
    complex_fire_count: int

    
# This defines the structure for the 24-hour cycle chart
class DiurnalDataPoint(BaseModel):
    hour: int
    fire_count: int
    avg_size: float

# This defines the structure for the user's input to the model
class PredictionInput(BaseModel):
    state: str
    owner_code: int
    discovery_doy: int
    fire_size_class: str

# This defines the structure for one of the model's predictions
class PredictionResult(BaseModel):
    cause: str
    probability: float

class AggregateResult(BaseModel):
    group: str
    count: int    

# Add this to the end of schemas.py
class CorrelationDataPoint(BaseModel):
    fire_size: Optional[float]
    discovery_doy: Optional[int]
    fire_duration_days: Optional[float]
    cause: Optional[str]