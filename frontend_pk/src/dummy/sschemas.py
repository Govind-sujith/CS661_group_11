# /backend/app/models/schemas.py
from pydantic import BaseModel
from typing import List, Optional
from datetime import date

# --- Core Data Structures ---

class FirePoint(BaseModel):
    fod_id: int
    lat: float
    lon: float
    cause: str
    agency: Optional[str]
    fire_size: float
    fire_year: int
    state: str
    fire_name: Optional[str] = None
    county: Optional[str] = None
    fire_size_class: Optional[str]

    class Config:
        orm_mode = True

class PaginatedFiresResponse(BaseModel):
    total_fires: int
    page: int
    limit: int
    fires: List[FirePoint]

    class Config:
        orm_mode = True

# --- Aggregation and Summary Schemas ---

class SummaryStats(BaseModel):
    total_incidents: int
    total_acres: float
    avg_acres: float

    class Config:
        orm_mode = True

class SummaryStatsExtended(BaseModel):
    range_total_incidents: int
    range_total_acres: float
    range_avg_acres: float
    cumulative_total_incidents: int
    cumulative_total_acres: float
    cumulative_avg_acres: float

# NEW: A simple model for the cause breakdown within an agency
class AgencyCauseSummary(BaseModel):
    cause: str
    count: int

    class Config:
        orm_mode = True

# MODIFIED: The AgencyPerformance schema now includes the top causes
class AgencyPerformance(BaseModel):
    agency_name: str
    avg_fire_size: float
    fire_count: int
    avg_duration: float
    complex_fire_count: int
    top_causes: List[AgencyCauseSummary] # <-- ADDED FIELD

    class Config:
        orm_mode = True

class DiurnalDataPoint(BaseModel):
    hour: int
    fire_count: int
    avg_size: float

    class Config:
        orm_mode = True

class WeeklyCadence(BaseModel):
    day_of_week: str
    cause: str
    count: int

    class Config:
        orm_mode = True

class AggregateResult(BaseModel):
    group: str
    count: int

    class Config:
        orm_mode = True

class DurationDistribution(BaseModel):
    duration_bin: str
    fire_count: int

    class Config:
        orm_mode = True

class SizeClassByCause(BaseModel):
    size_class: str
    cause: str
    fire_count: int

    class Config:
        orm_mode = True

# --- ML and Correlation Schemas ---

class PredictionInput(BaseModel):
    state: str
    owner_code: int
    discovery_doy: int
    fire_size_class: str

class PredictionResult(BaseModel):
    cause: str
    probability: float

class CorrelationDataPoint(BaseModel):
    fire_size: Optional[float]
    discovery_doy: Optional[int]
    fire_duration_days: Optional[float]
    cause: Optional[str]

    class Config:
        orm_mode = True

class CorrelationResponse(BaseModel):
    sample_size: int
    data: List[CorrelationDataPoint]

    class Config:
        orm_mode = True

class MonthlyFireFrequency(BaseModel):
    year: int
    monthly_counts: List[int] # A list of 12 integers, for Jan-Dec

    class Config:
        orm_mode = True
