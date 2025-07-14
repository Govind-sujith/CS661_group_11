# /backend/app/models/schemas.py
from pydantic import BaseModel
from typing import List, Optional
from datetime import date

# These Pydantic models define the shape of the data for our API.
# They ensure that the data we send and receive is in the correct format.

# --- Schemas for Core Fire Data ---

# Defines the data for a single fire point shown on the map.
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

# This is the structure for sending back a "page" of fire data,
# which is useful for the main map so we don't load all fires at once.
class PaginatedFiresResponse(BaseModel):
    total_fires: int
    page: int
    limit: int
    fires: List[FirePoint]

    class Config:
        orm_mode = True

# --- Schemas for Charts and Summaries ---

# For the main summary cards showing total incidents and acres burned.
class SummaryStats(BaseModel):
    total_incidents: int
    total_acres: float
    avg_acres: float

    class Config:
        orm_mode = True

# An extended version of the summary stats for more detailed comparisons.
class SummaryStatsExtended(BaseModel):
    range_total_incidents: int
    range_total_acres: float
    range_avg_acres: float
    cumulative_total_incidents: int
    cumulative_total_acres: float
    cumulative_avg_acres: float

# A small model to hold the top causes for a specific agency.
class AgencyCauseSummary(BaseModel):
    cause: str
    count: int

    class Config:
        orm_mode = True

# Gathers all the performance metrics for a single agency.
class AgencyPerformance(BaseModel):
    agency_name: str
    avg_fire_size: float
    fire_count: int
    avg_duration: float
    complex_fire_count: int
    top_causes: List[AgencyCauseSummary]

    class Config:
        orm_mode = True

# Represents one data point in the 24-hour (diurnal) cycle chart.
class DiurnalDataPoint(BaseModel):
    hour: int
    fire_count: int
    avg_size: float

    class Config:
        orm_mode = True

# For the weekly chart, showing fire counts by cause for each day.
class WeeklyCadence(BaseModel):
    day_of_week: str
    cause: str
    count: int

    class Config:
        orm_mode = True

# A generic structure for aggregated data, used for dropdowns and heatmaps.
class AggregateResult(BaseModel):
    group: str
    count: int

    class Config:
        orm_mode = True

# For the chart that shows the distribution of fire durations.
class DurationDistribution(BaseModel):
    duration_bin: str
    fire_count: int

    class Config:
        orm_mode = True

# Used for the chart that breaks down fire counts by size and cause.
class SizeClassByCause(BaseModel):
    size_class: str
    cause: str
    fire_count: int

    class Config:
        orm_mode = True

# --- Schemas for the Machine Learning Model ---

# Defines the input data the user sends to the ML model for a prediction.
class PredictionInput(BaseModel):
    LATITUDE: float
    LONGITUDE: float
    FIRE_SIZE: float
    STATE: str
    date: str # Expects a "YYYY-MM-DD" format
    OWNER_CODE: Optional[int] = None
    NWCG_REPORTING_AGENCY: Optional[int] = None

# This is the structure of a single prediction result from the model.
class PredictionResult(BaseModel):
    cause: str
    probability: float

# --- Schemas for Other Visualizations ---

# Represents a single point in the correlation scatter plot.
class CorrelationDataPoint(BaseModel):
    fire_size: Optional[float]
    discovery_doy: Optional[int]
    fire_duration_days: Optional[float]
    cause: Optional[str]

    class Config:
        orm_mode = True

# The full response for the correlation plot, including the sample size.
class CorrelationResponse(BaseModel):
    sample_size: int
    data: List[CorrelationDataPoint]

    class Config:
        orm_mode = True

# For the monthly frequency heatmap, holding a list of counts for each month in a year.
class MonthlyFireFrequency(BaseModel):
    year: int
    monthly_counts: List[int] # A list of 12 numbers, one for each month.

    class Config:
        orm_mode = True
