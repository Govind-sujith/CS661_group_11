# /backend/app/models/schemas.py
from pydantic import BaseModel
from typing import List, Optional
from datetime import date

# This defines the structure for one fire point on the main map
class FirePoint(BaseModel):
    fod_id: int
    lat: float
    lon: float
    cause: str
    agency: Optional[str]
    fire_size: float
    fire_year: int
    state: str

# This defines the structure for the Agency Performance chart
class AgencyPerformance(BaseModel):
    agency_name: str
    avg_fire_size: float
    fire_count: int
    avg_duration: float

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