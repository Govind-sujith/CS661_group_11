# /backend/app/api/endpoints.py
from fastapi import APIRouter
from app.ml import predictor
from app.models import schemas
from typing import List
from sqlalchemy.orm import Session
from fastapi import Depends
from app.database import get_db
from app.models import db_models
from sqlalchemy import func
import pandas as pd
from typing import List, Optional
from fastapi import FastAPI, Depends, HTTPException
from sqlalchemy import func, Integer, desc, asc


router = APIRouter()

from sqlalchemy.orm import Session
from fastapi import Depends
from app.database import get_db
from app.models import db_models
# ----------------------------------------------------

@router.get("/fires", response_model=List[schemas.FirePoint])
def get_filtered_fires(
    db: Session = Depends(get_db),
    year: Optional[int] = None,
    state: Optional[str] = None,
    cause: Optional[str] = None,
    sort_by: Optional[str] = None, 
    order: Optional[str] = "desc"   
):
    """
    Returns a list of fires from the DB, with optional dynamic filters AND sorting.
    """
    query = db.query(db_models.Wildfire)

    # Filtering logic 
    if year:
        query = query.filter(db_models.Wildfire.FIRE_YEAR == year)
    if state:
        query = query.filter(db_models.Wildfire.STATE == state)
    if cause and cause != 'All':
        query = query.filter(db_models.Wildfire.STAT_CAUSE_DESCR == cause)

    # NEW: Dynamic Sorting Logic 
    if sort_by:
        # we convert to upper case to match our db_models.py file
        sort_column = getattr(db_models.Wildfire, sort_by.upper(), None)
        if sort_column:
            if order == "asc":
                query = query.order_by(asc(sort_column))
            else:
                query = query.order_by(desc(sort_column))
    #

    results = query.limit(5000).all()
    
    # Response conversion (stays the same, this is safer so far)
    response = [
        schemas.FirePoint(
            fod_id=fire.FOD_ID,
            lat=fire.LATITUDE,
            lon=fire.LONGITUDE,
            cause=fire.STAT_CAUSE_DESCR,
            agency=fire.NWCG_REPORTING_AGENCY,
            fire_size=fire.FIRE_SIZE,
            fire_year=fire.FIRE_YEAR,
            state=fire.STATE
        ) for fire in results if fire.LATITUDE is not None and fire.LONGITUDE is not None
    ]
    return response


@router.get("/temporal/diurnal", response_model=List[schemas.DiurnalDataPoint])
def get_filtered_diurnal_data(
    db: Session = Depends(get_db),
    year: Optional[int] = None,
    state: Optional[str] = None,
    cause: Optional[str] = None
):
    """
    Returns real fire data aggregated by hour, applying any optional filters.
    """
    query = db.query(
        db_models.Wildfire.DISCOVERY_HOUR.label("hour"),
        func.count(db_models.Wildfire.FOD_ID).label("fire_count"),
        func.avg(db_models.Wildfire.FIRE_SIZE).label("avg_size")
    )

    # Apply filters to the query if they are provided by the frontend
    if year:
        query = query.filter(db_models.Wildfire.FIRE_YEAR == year)
    if state:
        query = query.filter(db_models.Wildfire.STATE == state)
    if cause and cause != 'All':
        query = query.filter(db_models.Wildfire.STAT_CAUSE_DESCR == cause)

    results = query.group_by("hour").order_by("hour").all()

    response = [
        schemas.DiurnalDataPoint(
            hour=entry.hour,
            fire_count=entry.fire_count,
            avg_size=round(entry.avg_size, 2) if entry.avg_size else 0
        ) for entry in results if entry.hour is not None
    ]
    return response


@router.get("/performance/agencies", response_model=List[schemas.AgencyPerformance])
def get_filtered_agency_performance(
    db: Session = Depends(get_db),
    year: Optional[int] = None,
    state: Optional[str] = None,
    cause: Optional[str] = None
):
    """
    Returns real performance data for  top 10 agencies.... applying any optional filters.
    """
    query = db.query(
        db_models.Wildfire.NWCG_REPORTING_AGENCY,
        func.count(db_models.Wildfire.FOD_ID).label("fire_count"),
        func.avg(db_models.Wildfire.FIRE_SIZE).label("avg_fire_size"),
        func.avg(db_models.Wildfire.FIRE_DURATION_DAYS).label("avg_duration")
    )

    # Apply filters to the query if they are provided by the frontend
    if year:
        query = query.filter(db_models.Wildfire.FIRE_YEAR == year)
    if state:
        query = query.filter(db_models.Wildfire.STATE == state)
    if cause and cause != 'All':
        query = query.filter(db_models.Wildfire.STAT_CAUSE_DESCR == cause)

    results = query.group_by(db_models.Wildfire.NWCG_REPORTING_AGENCY).order_by(func.count(db_models.Wildfire.FOD_ID).desc()).limit(10).all()

    response = [
        schemas.AgencyPerformance(
            agency_name=agency.NWCG_REPORTING_AGENCY,
            fire_count=agency.fire_count,
            avg_fire_size=round(agency.avg_fire_size, 2) if agency.avg_fire_size else 0,
            avg_duration=round(agency.avg_duration, 2) if agency.avg_duration else 0
        ) for agency in results if agency.NWCG_REPORTING_AGENCY is not None
    ]
    return response

@router.get("/performance/agencies", response_model=List[schemas.AgencyPerformance])
def get_real_agency_performance(db: Session = Depends(get_db)):
    """
    Returns real performance data for all agencies, including average fire duration,
    calculated from the database.
    """
    # THE FIRST CHANGE: Add the calculation for average duration to the query
    agency_query = db.query(
        db_models.Wildfire.NWCG_REPORTING_AGENCY,
        func.count(db_models.Wildfire.FOD_ID).label("fire_count"),
        func.avg(db_models.Wildfire.FIRE_SIZE).label("avg_fire_size"),
        # --- THIS LINE IS NEW ---
        func.avg(db_models.Wildfire.FIRE_DURATION_DAYS).label("avg_duration") 
        # ----------------------
    ).group_by(
        db_models.Wildfire.NWCG_REPORTING_AGENCY
    ).order_by(
        func.count(db_models.Wildfire.FOD_ID).desc()
    ).limit(10).all()

    # THE SECOND CHANGE: Usage of the real avg_duration from the query
    response = [
        schemas.AgencyPerformance(
            agency_name=agency.NWCG_REPORTING_AGENCY,
            fire_count=agency.fire_count,
            avg_fire_size=round(agency.avg_fire_size, 2) if agency.avg_fire_size else 0,
            
            avg_duration=round(agency.avg_duration, 2) if agency.avg_duration else 0
            # --------------------------
        ) for agency in agency_query if agency.NWCG_REPORTING_AGENCY is not None
    ]

    return response


@router.post("/predict/cause", response_model=List[schemas.PredictionResult])
def predict_real_cause(input_data: schemas.PredictionInput):
    """
    Takes user input and returns a real prediction from the ML model.
    """
    # Convert the Pydantic input into a pandas DataFrame
    input_df = pd.DataFrame([input_data.dict()])

    # Calling our predictor logic
    prediction_results = predictor.predict_fire_cause(input_df)

    # Convert dicts to the Pydantic model
    return [schemas.PredictionResult(**p) for p in prediction_results]

@router.get("/complex-names", response_model=List[str])
def get_unique_complex_names(db: Session = Depends(get_db)):
    """
    Returns a list of all unique, non-null COMPLEX_NAME values from the database.
    """
    # This query selects the distinct names, filters out NULLs, and sorts them.
    query = db.query(db_models.Wildfire.COMPLEX_NAME).distinct().filter(db_models.Wildfire.COMPLEX_NAME.isnot(None)).order_by(db_models.Wildfire.COMPLEX_NAME)
    
    # The result is a list of tuples, so we extract the first element of each tuple.
    results = [row[0] for row in query.all()]
    return results


@router.get("/aggregate", response_model=List[schemas.AggregateResult])
def get_aggregate_data(
    group_by: str, # The frontend will provide the column name here!
    db: Session = Depends(get_db)
):
    """
    A universal endpoint to get aggregated fire counts for a given column.
    Example: ?group_by=STATE or ?group_by=STAT_CAUSE_DESCR
    """
    # A mapping to prevent arbitrary column lookups for security
    allowed_group_by_cols = {
        "STATE": db_models.Wildfire.STATE,
        "FIRE_YEAR": db_models.Wildfire.FIRE_YEAR,
        "STAT_CAUSE_DESCR": db_models.Wildfire.STAT_CAUSE_DESCR,
        "FIRE_SIZE_CLASS": db_models.Wildfire.FIRE_SIZE_CLASS,
        "OWNER_DESCR": db_models.Wildfire.OWNER_DESCR
    }

    if group_by not in allowed_group_by_cols:
        raise HTTPException(status_code=400, detail="Invalid group_by column specified.")

    column_to_group = allowed_group_by_cols[group_by]

    query = db.query(
        column_to_group.label("group"),
        func.count(db_models.Wildfire.FOD_ID).label("count")
    ).group_by(
        column_to_group
    ).order_by(
        func.count(db_models.Wildfire.FOD_ID).desc()
    ).limit(20).all()

    return [{"group": str(row.group), "count": row.count} for row in query if row.group]