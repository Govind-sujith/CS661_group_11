# backend/app/api/endpoints.py (THE DEFINITIVE, CLEANED, FINAL VERSION)

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import case, func, desc, cast, Text
from typing import List, Optional

from app.database import get_db
from app.models import db_models, schemas
from app.ml import predictor
import pandas as pd

router = APIRouter()

# --- Response Models ---
class PaginatedFiresResponse(BaseModel):
    total_fires: int
    page: int
    limit: int
    fires: List[schemas.FirePoint]

class SummaryStats(BaseModel):
    total_incidents: int
    total_acres: float
    avg_acres: float

class WeeklyCadence(BaseModel):
    day_of_week: str
    cause: str
    count: int    

class CorrelationResponse(BaseModel):
    sample_size: int
    data: List[schemas.CorrelationDataPoint]    

# --- State to FIPS Mapping (Your excellent solution) ---
STATE_TO_FIPS = {
    'AL': '01', 'AK': '02', 'AZ': '04', 'AR': '05', 'CA': '06', 'CO': '08', 'CT': '09',
    'DE': '10', 'FL': '12', 'GA': '13', 'HI': '15', 'ID': '16', 'IL': '17', 'IN': '18',
    'IA': '19', 'KS': '20', 'KY': '21', 'LA': '22', 'ME': '23', 'MD': '24', 'MA': '25',
    'MI': '26', 'MN': '27', 'MS': '28', 'MO': '29', 'MT': '30', 'NE': '31', 'NV': '32',
    'NH': '33', 'NJ': '34', 'NM': '35', 'NY': '36', 'NC': '37', 'ND': '38', 'OH': '39',
    'OK': '40', 'OR': '41', 'PA': '42', 'RI': '44', 'SC': '45', 'SD': '46', 'TN': '47',
    'TX': '48', 'UT': '49', 'VT': '50', 'VA': '51', 'WA': '53', 'WV': '54', 'WI': '55', 'WY': '56'
}


# --- Endpoint 1: The Main Fires Map (Paginated) ---
@router.get("/fires", response_model=PaginatedFiresResponse)
def get_paginated_fires(db: Session = Depends(get_db), year: Optional[int] = None, state: Optional[str] = None, cause: Optional[str] = None, page: int = 1, limit: int = 2000):
    query = db.query(db_models.Wildfire)
    if year: query = query.filter(db_models.Wildfire.FIRE_YEAR == year)
    if state: query = query.filter(db_models.Wildfire.STATE == state)
    if cause and cause != 'All': query = query.filter(db_models.Wildfire.STAT_CAUSE_DESCR == cause)
    
    total_fires = query.count()
    offset = (page - 1) * limit
    fires_page_db = query.order_by(db_models.Wildfire.FIRE_SIZE.desc()).offset(offset).limit(limit).all()
    
    fires_response = [schemas.FirePoint(fod_id=f.FOD_ID, lat=f.LATITUDE, lon=f.LONGITUDE, cause=f.STAT_CAUSE_DESCR, agency=f.NWCG_REPORTING_AGENCY, fire_size=f.FIRE_SIZE, fire_year=f.FIRE_YEAR, state=f.STATE, fire_name=f.FIRE_NAME, county=f.COUNTY) for f in fires_page_db if f.LATITUDE is not None and f.LONGITUDE is not None]
    return {"total_fires": total_fires, "page": page, "limit": limit, "fires": fires_response}


# --- Endpoint 2: Temporal Analysis (24-Hour Cycle) ---
@router.get("/temporal/diurnal", response_model=List[schemas.DiurnalDataPoint])
def get_filtered_diurnal_data(db: Session = Depends(get_db), year: Optional[int] = None, state: Optional[str] = None, cause: Optional[str] = None):
    query = db.query(db_models.Wildfire.DISCOVERY_HOUR.label("hour"), func.count(db_models.Wildfire.FOD_ID).label("fire_count"), func.avg(db_models.Wildfire.FIRE_SIZE).label("avg_size")).filter(db_models.Wildfire.DISCOVERY_HOUR.isnot(None))
    if year: query = query.filter(db_models.Wildfire.FIRE_YEAR == year)
    if state: query = query.filter(db_models.Wildfire.STATE == state)
    if cause and cause != 'All': query = query.filter(db_models.Wildfire.STAT_CAUSE_DESCR == cause)
    results = query.group_by("hour").order_by("hour").all()
    return [schemas.DiurnalDataPoint(hour=e.hour, fire_count=e.fire_count, avg_size=round(e.avg_size, 2) if e.avg_size else 0) for e in results]

@router.get("/temporal/weekly", response_model=List[WeeklyCadence])
def get_weekly_cadence(
    db: Session = Depends(get_db),
    year: Optional[int] = None,
    state: Optional[str] = None
):
    """
    Returns the count of fires for each day of the week, segmented by cause.
    This reveals the weekly pattern of human-caused vs. natural fires.
    """
    query = db.query(
        db_models.Wildfire.DISCOVERY_DAY_OF_WEEK.label("day_of_week"),
        db_models.Wildfire.STAT_CAUSE_DESCR.label("cause"),
        func.count(db_models.Wildfire.FOD_ID).label("count")
    ).filter(
        db_models.Wildfire.DISCOVERY_DAY_OF_WEEK.isnot(None),
        db_models.Wildfire.STAT_CAUSE_DESCR.isnot(None)
    )

    if year: query = query.filter(db_models.Wildfire.FIRE_YEAR == year)
    if state: query = query.filter(db_models.Wildfire.STATE == state)
    
    # We only care about the most illustrative causes for this chart
    causes_to_include = ['Lightning', 'Arson', 'Campfire', 'Debris Burning']
    query = query.filter(db_models.Wildfire.STAT_CAUSE_DESCR.in_(causes_to_include))

    results = query.group_by(
        db_models.Wildfire.DISCOVERY_DAY_OF_WEEK,
        db_models.Wildfire.STAT_CAUSE_DESCR
    ).all()

    return results

# --- Endpoint 3: Agency Performance ---
@router.get("/performance/agencies", response_model=List[schemas.AgencyPerformance])
def get_filtered_agency_performance(db: Session = Depends(get_db), year: Optional[int] = None, state: Optional[str] = None, cause: Optional[str] = None, limit: int = 10):
    query = db.query(
        db_models.Wildfire.NWCG_REPORTING_AGENCY.label("agency_name"),
        func.count(db_models.Wildfire.FOD_ID).label("fire_count"),
        func.avg(db_models.Wildfire.FIRE_SIZE).label("avg_fire_size"),
        func.avg(db_models.Wildfire.FIRE_DURATION_DAYS).label("avg_duration"),
        func.count(case((db_models.Wildfire.COMPLEX_NAME.isnot(None), 1))).label("complex_fire_count")
    ).filter(
        db_models.Wildfire.NWCG_REPORTING_AGENCY.isnot(None)
    )
    
    if year: query = query.filter(db_models.Wildfire.FIRE_YEAR == year)
    if state: query = query.filter(db_models.Wildfire.STATE == state)
    if cause and cause != 'All': query = query.filter(db_models.Wildfire.STAT_CAUSE_DESCR == cause)
    
    # --- FIXED: Group by the actual column, not the string alias ---
    results = query.group_by(db_models.Wildfire.NWCG_REPORTING_AGENCY).order_by(func.count(db_models.Wildfire.FOD_ID).desc()).limit(limit).all()
    
    return results

# --- Endpoint 4: Machine Learning Forecaster ---
@router.post("/predict/cause", response_model=List[schemas.PredictionResult])
def predict_real_cause(input_data: schemas.PredictionInput):
    input_df = pd.DataFrame([input_data.dict()])
    prediction_results = predictor.predict_fire_cause(input_df)
    return [schemas.PredictionResult(**p) for p in prediction_results]


# --- Endpoint 5: Universal Aggregation (for dropdowns) ---
@router.get("/aggregate", response_model=List[schemas.AggregateResult])
def get_aggregate_data(group_by: str, db: Session = Depends(get_db)):
    allowed_group_by_cols = {"STATE": db_models.Wildfire.STATE, "FIRE_YEAR": db_models.Wildfire.FIRE_YEAR, "STAT_CAUSE_DESCR": db_models.Wildfire.STAT_CAUSE_DESCR}
    if group_by not in allowed_group_by_cols: raise HTTPException(status_code=400, detail="Invalid group_by column.")
    column_to_group = allowed_group_by_cols[group_by]
    query = db.query(column_to_group.label("group"), func.count(db_models.Wildfire.FOD_ID).label("count")).filter(column_to_group.isnot(None)).group_by(column_to_group).order_by(column_to_group.asc()).all()
    return [{"group": str(row.group), "count": row.count} for row in query]


# --- Endpoint 6: County Heatmap Data (The final, user-architected version) ---
@router.get("/aggregate/county", response_model=List[schemas.AggregateResult])
def get_filtered_county_aggregates(db: Session = Depends(get_db), year: Optional[int] = None, state: Optional[str] = None, cause: Optional[str] = None):
    query = db.query(db_models.Wildfire.STATE, db_models.Wildfire.FIPS_CODE, func.count(db_models.Wildfire.FOD_ID).label("count")).filter(db_models.Wildfire.FIPS_CODE.isnot(None))
    if year: query = query.filter(db_models.Wildfire.FIRE_YEAR == year)
    if state: query = query.filter(db_models.Wildfire.STATE == state)
    if cause and cause != 'All': query = query.filter(db_models.Wildfire.STAT_CAUSE_DESCR == cause)
    raw_results = query.group_by(db_models.Wildfire.STATE, db_models.Wildfire.FIPS_CODE).all()
    response = []
    for state_abbr, county_code, count in raw_results:
        state_fips = STATE_TO_FIPS.get(state_abbr)
        if state_fips and county_code is not None:
            full_fips = state_fips + str(int(county_code)).zfill(3)
            response.append({"group": full_fips, "count": count})
    return response


# --- Endpoint 7: Summary Statistics Card ---
@router.get("/statistics/summary", response_model=SummaryStats)
def get_summary_statistics(db: Session = Depends(get_db), year: Optional[int] = None, state: Optional[str] = None, cause: Optional[str] = None):
    query = db.query(func.count(db_models.Wildfire.FOD_ID).label("incident_count"), func.sum(db_models.Wildfire.FIRE_SIZE).label("total_acres_burned"))
    if year: query = query.filter(db_models.Wildfire.FIRE_YEAR == year)
    if state: query = query.filter(db_models.Wildfire.STATE == state)
    if cause and cause != 'All': query = query.filter(db_models.Wildfire.STAT_CAUSE_DESCR == cause)
    stats = query.one()
    total_incidents = stats.incident_count or 0
    total_acres = stats.total_acres_burned or 0
    return {"total_incidents": total_incidents, "total_acres": total_acres, "avg_acres": (total_acres / total_incidents) if total_incidents > 0 else 0}




@router.get("/statistics/correlation", response_model=CorrelationResponse) # <-- Change the response model
def get_correlation_data(
    db: Session = Depends(get_db),
    year: Optional[int] = None,
    state: Optional[str] = None,
    cause: Optional[str] = None
):
    """
    Returns a random sample of 5000 fires for multivariate analysis,
    honoring all global filters.
    """
    query = db.query(
        db_models.Wildfire.FIRE_SIZE.label("fire_size"),
        db_models.Wildfire.DISCOVERY_DOY.label("discovery_doy"),
        db_models.Wildfire.FIRE_DURATION_DAYS.label("fire_duration_days"),
        db_models.Wildfire.STAT_CAUSE_DESCR.label("cause")
    ).filter(
        # Pre-filter for data quality, as we did before
        db_models.Wildfire.FIRE_SIZE < 5000,
        db_models.Wildfire.FIRE_DURATION_DAYS < 30,
        db_models.Wildfire.FIRE_SIZE.isnot(None),
        db_models.Wildfire.DISCOVERY_DOY.isnot(None),
        db_models.Wildfire.FIRE_DURATION_DAYS.isnot(None),
        db_models.Wildfire.STAT_CAUSE_DESCR.isnot(None)
    )

    # Apply all global filters
    if year: query = query.filter(db_models.Wildfire.FIRE_YEAR == year)
    if state: query = query.filter(db_models.Wildfire.STATE == state)
    if cause and cause != 'All': query = query.filter(db_models.Wildfire.STAT_CAUSE_DESCR == cause)

    # Order by random and take a sample
    results = query.order_by(func.random()).limit(5000).all()

    # --- THE UPGRADE ---
    return {
        "sample_size": len(results), # The actual number of rows being returned
        "data": results
    }