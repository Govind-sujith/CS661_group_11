# backend/app/api/endpoints.py

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import case, func, extract, or_
from typing import List, Optional
from datetime import date
import pandas as pd
import requests

from app.database import get_db
from app.models import db_models, schemas
from app.ml import predictor

router = APIRouter()

# A handy dictionary to map state abbreviations to their FIPS codes.
STATE_TO_FIPS = {
    'AL': '01', 'AK': '02', 'AZ': '04', 'AR': '05', 'CA': '06', 'CO': '08', 'CT': '09',
    'DE': '10', 'FL': '12', 'GA': '13', 'HI': '15', 'ID': '16', 'IL': '17', 'IN': '18',
    'IA': '19', 'KS': '20', 'KY': '21', 'LA': '22', 'ME': '23', 'MD': '24', 'MA': '25',
    'MI': '26', 'MN': '27', 'MS': '28', 'MO': '29', 'MT': '30', 'NE': '31', 'NV': '32',
    'NH': '33', 'NJ': '34', 'NM': '35', 'NY': '36', 'NC': '37', 'ND': '38', 'OH': '39',
    'OK': '40', 'OR': '41', 'PA': '42', 'RI': '44', 'SC': '45', 'SD': '46', 'TN': '47',
    'TX': '48', 'UT': '49', 'VT': '50', 'VA': '51', 'WA': '53', 'WV': '54', 'WI': '55', 'WY': '56'
}

# A reusable function to handle date filtering across different endpoints.
def apply_date_range_filter(query, start_date, end_date):
    """Apply date range filter to the query"""
    if start_date and end_date:
        # If we have both a start and end date, we look for fires within that range.
        query = query.filter(
            db_models.Wildfire.DISCOVERY_DATETIME >= start_date,
            db_models.Wildfire.DISCOVERY_DATETIME <= end_date
        )
    elif start_date:
        # If there's only a start date, get all fires from that point forward.
        query = query.filter(db_models.Wildfire.DISCOVERY_DATETIME >= start_date)
    elif end_date:
        # And if there's only an end date, get all fires up to that point.
        query = query.filter(db_models.Wildfire.DISCOVERY_DATETIME <= end_date)

    return query

# Endpoint for the main map view, showing fires with pagination.
@router.get("/fires", response_model=schemas.PaginatedFiresResponse)
def get_paginated_fires(
    db: Session = Depends(get_db),
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    state: Optional[str] = None,
    cause: Optional[str] = None,
    page: int = 1,
    limit: int = 2000
):
    query = db.query(db_models.Wildfire)
    query = apply_date_range_filter(query, start_date, end_date)

    if state:
        query = query.filter(db_models.Wildfire.STATE == state)
    if cause and cause != 'All':
        query = query.filter(db_models.Wildfire.STAT_CAUSE_DESCR == cause)

    total_fires = query.count()
    offset = (page - 1) * limit

    fires_page_db = query.order_by(db_models.Wildfire.FIRE_SIZE.desc()).offset(offset).limit(limit).all()

    fires_response = [
        schemas.FirePoint(
            fod_id=f.FOD_ID, lat=f.LATITUDE, lon=f.LONGITUDE, cause=f.STAT_CAUSE_DESCR,
            agency=f.NWCG_REPORTING_AGENCY, fire_size=f.FIRE_SIZE, fire_year=f.FIRE_YEAR,
            state=f.STATE, fire_name=f.FIRE_NAME, county=f.COUNTY,
            fire_size_class=f.FIRE_SIZE_CLASS # We also include the fire size class in the response.
        )
        for f in fires_page_db if f.LATITUDE is not None and f.LONGITUDE is not None
    ]

    return {
        "total_fires": total_fires, "page": page, "limit": limit, "fires": fires_response
    }

# --- Endpoints for analyzing fire data over time ---

# Provides data for the diurnal (24-hour cycle) chart.
@router.get("/temporal/diurnal", response_model=List[schemas.DiurnalDataPoint])
def get_filtered_diurnal_data(
    db: Session = Depends(get_db),
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    state: Optional[str] = None,
    cause: Optional[str] = None
):
    query = db.query(
        db_models.Wildfire.DISCOVERY_HOUR.label("hour"),
        func.count(db_models.Wildfire.FOD_ID).label("fire_count"),
        func.avg(db_models.Wildfire.FIRE_SIZE).label("avg_size")
    ).filter(db_models.Wildfire.DISCOVERY_HOUR.isnot(None))

    query = apply_date_range_filter(query, start_date, end_date)
    if state: query = query.filter(db_models.Wildfire.STATE == state)
    if cause and cause != 'All': query = query.filter(db_models.Wildfire.STAT_CAUSE_DESCR == cause)

    results = query.group_by("hour").order_by("hour").all()
    return [
        schemas.DiurnalDataPoint(hour=e.hour, fire_count=e.fire_count, avg_size=round(e.avg_size, 2) if e.avg_size else 0)
        for e in results
    ]

# Gathers data for the weekly cadence chart, showing top causes per day.
@router.get("/temporal/weekly", response_model=List[schemas.WeeklyCadence])
def get_weekly_cadence(
    db: Session = Depends(get_db),
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    state: Optional[str] = None
):
    base_query = db.query(db_models.Wildfire)
    base_query = apply_date_range_filter(base_query, start_date, end_date)
    if state: base_query = base_query.filter(db_models.Wildfire.STATE == state)

    daily_cause_counts = base_query.with_entities(
        db_models.Wildfire.DISCOVERY_DAY_OF_WEEK,
        db_models.Wildfire.STAT_CAUSE_DESCR,
        func.count(db_models.Wildfire.FOD_ID).label("fire_count")
    ).filter(
        db_models.Wildfire.DISCOVERY_DAY_OF_WEEK.isnot(None),
        db_models.Wildfire.STAT_CAUSE_DESCR.isnot(None)
    ).group_by(
        db_models.Wildfire.DISCOVERY_DAY_OF_WEEK,
        db_models.Wildfire.STAT_CAUSE_DESCR
    ).subquery('daily_cause_counts')

    ranked_causes = db.query(
        daily_cause_counts.c.DISCOVERY_DAY_OF_WEEK,
        daily_cause_counts.c.STAT_CAUSE_DESCR,
        daily_cause_counts.c.fire_count,
        func.row_number().over(
            partition_by=daily_cause_counts.c.DISCOVERY_DAY_OF_WEEK,
            order_by=daily_cause_counts.c.fire_count.desc()
        ).label('rn')
    ).subquery('ranked_causes')

    final_cause_label = case(
        (ranked_causes.c.rn <= 5, ranked_causes.c.STAT_CAUSE_DESCR),
        else_='Other'
    ).label('cause')

    final_query = db.query(
        ranked_causes.c.DISCOVERY_DAY_OF_WEEK.label("day_of_week"),
        final_cause_label,
        func.sum(ranked_causes.c.fire_count).label("count")
    ).group_by(
        "day_of_week",
        "cause"
    ).order_by(
        "day_of_week",
        func.sum(ranked_causes.c.fire_count).desc()
    )

    results = final_query.all()
    return results

# Provides a summarized weekly view, grouping causes into broader categories.
@router.get("/temporal/weekly-summary", response_model=List[schemas.WeeklyCadence])
def get_weekly_summary(
    db: Session = Depends(get_db),
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    state: Optional[str] = None
):
    cause_category = case(
        (db_models.Wildfire.STAT_CAUSE_DESCR == 'Lightning', 'Lightning'),
        (db_models.Wildfire.STAT_CAUSE_DESCR.in_(['Miscellaneous', 'Missing/Undefined']), 'Miscellaneous/Undefined'),
        (db_models.Wildfire.STAT_CAUSE_DESCR.in_(['Debris Burning', 'Arson', 'Children', 'Fireworks', 'Smoking', 'Equipment Use']), 'Direct-Human'),
        (db_models.Wildfire.STAT_CAUSE_DESCR.in_(['Powerline', 'Structure', 'Railroad', 'Campfire']), 'Indirect-Human'),
        else_='Other'
    ).label('cause')

    query = db.query(
        db_models.Wildfire.DISCOVERY_DAY_OF_WEEK.label("day_of_week"),
        cause_category,
        func.count(db_models.Wildfire.FOD_ID).label("count")
    ).filter(
        db_models.Wildfire.DISCOVERY_DAY_OF_WEEK.isnot(None),
        db_models.Wildfire.STAT_CAUSE_DESCR.isnot(None)
    )

    query = apply_date_range_filter(query, start_date, end_date)
    if state: query = query.filter(db_models.Wildfire.STATE == state)

    results = query.group_by(
        "day_of_week",
        "cause"
    ).order_by(
        "day_of_week",
        "cause"
    ).all()

    return results

# Endpoint to analyze and compare the performance of different agencies.
@router.get("/performance/agencies", response_model=List[schemas.AgencyPerformance])
def get_detailed_agency_performance(
    db: Session = Depends(get_db),
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    state: Optional[str] = None,
    cause: Optional[str] = None,
    limit: Optional[int] = 10
):
    """
    Returns detailed performance metrics for the top N agencies, including a
    breakdown of the top 3 causes for each agency.
    """
    # First, build the main query with all the user's filters.
    base_query = db.query(db_models.Wildfire)
    base_query = apply_date_range_filter(base_query, start_date, end_date)
    if state:
        base_query = base_query.filter(db_models.Wildfire.STATE == state)
    if cause and cause != 'All':
        base_query = base_query.filter(db_models.Wildfire.STAT_CAUSE_DESCR == cause)

    # Next, get the summary stats for the top N agencies based on the filtered data.
    agency_stats_query = base_query.with_entities(
        db_models.Wildfire.NWCG_REPORTING_AGENCY.label("agency_name"),
        func.count(db_models.Wildfire.FOD_ID).label("fire_count"),
        func.avg(db_models.Wildfire.FIRE_SIZE).label("avg_fire_size"),
        func.avg(db_models.Wildfire.FIRE_DURATION_DAYS).label("avg_duration"),
        func.count(case((db_models.Wildfire.COMPLEX_NAME.isnot(None), 1))).label("complex_fire_count")
    ).filter(
        db_models.Wildfire.NWCG_REPORTING_AGENCY.isnot(None)
    ).group_by(
        db_models.Wildfire.NWCG_REPORTING_AGENCY
    ).order_by(
        func.count(db_models.Wildfire.FOD_ID).desc()
    )

    if limit and limit > 0:
        agency_stats_query = agency_stats_query.limit(limit)

    top_agencies_stats = agency_stats_query.all()

    # Now, for each of those top agencies, find out their top 3 fire causes.
    response = []
    for agency_stat in top_agencies_stats:
        top_causes_query = base_query.with_entities(
            db_models.Wildfire.STAT_CAUSE_DESCR.label("cause"),
            func.count(db_models.Wildfire.FOD_ID).label("count")
        ).filter(
            db_models.Wildfire.NWCG_REPORTING_AGENCY == agency_stat.agency_name,
            db_models.Wildfire.STAT_CAUSE_DESCR.isnot(None)
        ).group_by(
            "cause"
        ).order_by(
            func.count(db_models.Wildfire.FOD_ID).desc()
        ).limit(3)

        top_causes_raw = top_causes_query.all()

        # We need to build the Pydantic model manually to match the expected output format.
        top_causes_result = [
            schemas.AgencyCauseSummary(cause=row.cause, count=row.count)
            for row in top_causes_raw
        ]

        # Finally, combine the general stats and the top causes into one object.
        response.append(
            schemas.AgencyPerformance(
                agency_name=agency_stat.agency_name,
                fire_count=agency_stat.fire_count,
                avg_fire_size=agency_stat.avg_fire_size or 0,
                avg_duration=agency_stat.avg_duration or 0,
                complex_fire_count=agency_stat.complex_fire_count,
                top_causes=top_causes_result
            )
        )

    return response


# The machine learning endpoint for predicting fire causes.
@router.post("/predict/cause", response_model=List[schemas.PredictionResult])
def predict_fire_cause_from_api(input_data: schemas.PredictionInput):
    """
    Takes user input, preprocesses it using the ML pipeline, and returns
    a real prediction from the loaded model.
    """
    # The input data is a Pydantic model, so we turn it into a dictionary for our prediction function.
    results = predictor.preprocess_and_predict(input_data.dict())
    return results

# A general-purpose endpoint to get aggregate counts for populating dropdowns.
@router.get("/aggregate", response_model=List[schemas.AggregateResult])
def get_aggregate_data(group_by: str, db: Session = Depends(get_db)):
    allowed_group_by_cols = {
        "STATE": db_models.Wildfire.STATE,
        "FIRE_YEAR": db_models.Wildfire.FIRE_YEAR,
        "STAT_CAUSE_DESCR": db_models.Wildfire.STAT_CAUSE_DESCR
    }
    if group_by not in allowed_group_by_cols:
        raise HTTPException(status_code=400, detail="Invalid group_by column.")

    column_to_group = allowed_group_by_cols[group_by]
    query = db.query(
        column_to_group.label("group"),
        func.count(db_models.Wildfire.FOD_ID).label("count")
    ).filter(column_to_group.isnot(None)).group_by(column_to_group).order_by(column_to_group.asc()).all()
    return [{"group": str(row.group), "count": row.count} for row in query]

# Provides aggregated fire counts by county for the heatmap.
@router.get("/aggregate/county", response_model=List[schemas.AggregateResult])
def get_filtered_county_aggregates(
    db: Session = Depends(get_db),
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    state: Optional[str] = None,
    cause: Optional[str] = None
):
    query = db.query(
        db_models.Wildfire.STATE,
        db_models.Wildfire.FIPS_CODE,
        func.count(db_models.Wildfire.FOD_ID).label("count")
    ).filter(db_models.Wildfire.FIPS_CODE.isnot(None))

    query = apply_date_range_filter(query, start_date, end_date)
    if state: query = query.filter(db_models.Wildfire.STATE == state)
    if cause and cause != 'All': query = query.filter(db_models.Wildfire.STAT_CAUSE_DESCR == cause)

    raw_results = query.group_by(db_models.Wildfire.STATE, db_models.Wildfire.FIPS_CODE).all()
    response = []
    for state_abbr, county_code, count in raw_results:
        state_fips = STATE_TO_FIPS.get(state_abbr)
        if state_fips and county_code is not None:
            # We combine the state and county codes to create the full FIPS id.
            full_fips = state_fips + str(int(county_code)).zfill(3)
            response.append({"group": full_fips, "count": count})
    return response

# Provides aggregated fire counts by state for the US map.
@router.get("/aggregate/state", response_model=List[schemas.AggregateResult])
def get_filtered_state_aggregates(
    db: Session = Depends(get_db),
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    cause: Optional[str] = None
):
    query = db.query(
        db_models.Wildfire.STATE.label("group"),
        func.count(db_models.Wildfire.FOD_ID).label("count")
    ).filter(db_models.Wildfire.STATE.isnot(None))

    query = apply_date_range_filter(query, start_date, end_date)
    if cause and cause != 'All':
        query = query.filter(db_models.Wildfire.STAT_CAUSE_DESCR == cause)

    results = query.group_by("group").all()
    return results

# Endpoint for the main summary statistics cards.
@router.get("/statistics/summary", response_model=schemas.SummaryStatsExtended)
def get_summary_statistics(
    db: Session = Depends(get_db),
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    state: Optional[str] = None,
    cause: Optional[str] = None,
    year: Optional[int] = None
):
    from datetime import date

    # Clean up any empty or null-like values from the filters.
    start_date = start_date if start_date not in [None, "", "null"] else None
    end_date = end_date if end_date not in [None, "", "null"] else None
    state = state if state not in [None, "", "null", "All"] else None
    cause = cause if cause not in [None, "", "null", "All"] else None
    year = year if year not in [None, "", "null", "All"] else None

    # A date range takes priority, but if it's not there, we'll use the year.
    if start_date is not None and end_date is not None:
        actual_start_date = start_date
        actual_end_date = end_date
    elif year is not None:
        actual_start_date = date(year, 1, 1)
        actual_end_date = date(year, 12, 31)
    else:
        actual_start_date = None
        actual_end_date = None

    # Start with a base query and add state/cause filters if they exist.
    base_query = db.query(db_models.Wildfire)
    if state:
        base_query = base_query.filter(db_models.Wildfire.STATE == state)
    if cause:
        base_query = base_query.filter(db_models.Wildfire.STAT_CAUSE_DESCR == cause)

    # Calculate stats for the specific date range.
    range_query = base_query
    if actual_start_date and actual_end_date:
        range_query = range_query.filter(
            db_models.Wildfire.DISCOVERY_DATETIME >= actual_start_date,
            db_models.Wildfire.DISCOVERY_DATETIME <= actual_end_date
        )

    range_stats = range_query.with_entities(
        func.count(db_models.Wildfire.FOD_ID).label("incident_count"),
        func.sum(db_models.Wildfire.FIRE_SIZE).label("total_acres_burned")
    ).one()

    # Also calculate cumulative stats up to the end of the date range.
    cumulative_query = base_query
    if actual_end_date:
        cumulative_query = cumulative_query.filter(db_models.Wildfire.DISCOVERY_DATETIME <= actual_end_date)

    cumulative_stats = cumulative_query.with_entities(
        func.count(db_models.Wildfire.FOD_ID).label("incident_count"),
        func.sum(db_models.Wildfire.FIRE_SIZE).label("total_acres_burned")
    ).one()

    return {
        "range_total_incidents": range_stats.incident_count or 0,
        "range_total_acres": range_stats.total_acres_burned or 0,
        "range_avg_acres": (range_stats.total_acres_burned / range_stats.incident_count) if range_stats.incident_count else 0,
        "cumulative_total_incidents": cumulative_stats.incident_count or 0,
        "cumulative_total_acres": cumulative_stats.total_acres_burned or 0,
        "cumulative_avg_acres": (cumulative_stats.total_acres_burned / cumulative_stats.incident_count) if cumulative_stats.incident_count else 0
    }

# Gathers data for the correlation scatter plot.
@router.get("/statistics/correlation", response_model=schemas.CorrelationResponse)
def get_correlation_data(
    db: Session = Depends(get_db),
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    state: Optional[str] = None,
    cause: Optional[str] = None
):
    query = db.query(
        db_models.Wildfire.FIRE_SIZE.label("fire_size"),
        db_models.Wildfire.DISCOVERY_DOY.label("discovery_doy"),
        db_models.Wildfire.FIRE_DURATION_DAYS.label("fire_duration_days"),
        db_models.Wildfire.STAT_CAUSE_DESCR.label("cause")
    ).filter(
        # We add some filters to remove extreme outliers for a cleaner plot.
        db_models.Wildfire.FIRE_SIZE < 5000,
        db_models.Wildfire.FIRE_DURATION_DAYS < 30,
        db_models.Wildfire.FIRE_SIZE.isnot(None),
        db_models.Wildfire.DISCOVERY_DOY.isnot(None),
        db_models.Wildfire.FIRE_DURATION_DAYS.isnot(None),
        db_models.Wildfire.STAT_CAUSE_DESCR.isnot(None)
    )

    query = apply_date_range_filter(query, start_date, end_date)
    if state: query = query.filter(db_models.Wildfire.STATE == state)
    if cause and cause != 'All': query = query.filter(db_models.Wildfire.STAT_CAUSE_DESCR == cause)

    # We take a random sample to keep the plot from getting too crowded.
    results = query.order_by(func.random()).limit(5000).all()
    return {
        "sample_size": len(results),
        "data": results
    }

# Creates a distribution of how long fires last.
@router.get("/summary/containment-duration-distribution", response_model=List[schemas.DurationDistribution])
def get_duration_distribution(
    db: Session = Depends(get_db),
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    state: Optional[str] = None
):
    query = db.query(db_models.Wildfire.FIRE_DURATION_DAYS).filter(
        db_models.Wildfire.FIRE_DURATION_DAYS.isnot(None),
        db_models.Wildfire.FIRE_DURATION_DAYS >= 0
    )

    query = apply_date_range_filter(query, start_date, end_date)
    if state: query = query.filter(db_models.Wildfire.STATE == state)

    durations = pd.Series([row[0] for row in query.all()])
    if durations.empty: return []

    # We'll group the fire durations into daily bins up to 30 days.
    bins = list(range(31)) + [float('inf')]
    labels = [f"{i}-{i+1}" for i in range(29)] + ["29-30", "30+"]
    binned_durations = pd.cut(durations, bins=bins, labels=labels, right=False)
    bin_counts = binned_durations.value_counts().sort_index()

    response = [{"duration_bin": str(index), "fire_count": value} for index, value in bin_counts.items()]
    return response

# Breaks down fire counts by size class for each major cause.
@router.get("/summary/size-class-by-cause", response_model=List[schemas.SizeClassByCause])
def get_size_class_distribution_by_cause(
    db: Session = Depends(get_db),
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    state: Optional[str] = None
):
    base_query = db.query(db_models.Wildfire)
    base_query = apply_date_range_filter(base_query, start_date, end_date)
    if state: base_query = base_query.filter(db_models.Wildfire.STATE == state)
    subquery = base_query.subquery()

    # To keep the chart clean, we only show the top 4 causes and group the rest as 'Other'.
    top_causes_query = db.query(subquery.c.STAT_CAUSE_DESCR).group_by(subquery.c.STAT_CAUSE_DESCR).order_by(func.count().desc()).limit(4)
    top_causes = [row[0] for row in top_causes_query.all()]

    cause_column = case((subquery.c.STAT_CAUSE_DESCR.in_(top_causes), subquery.c.STAT_CAUSE_DESCR), else_="Other").label("cause")

    final_query = db.query(
        subquery.c.FIRE_SIZE_CLASS.label("size_class"),
        cause_column,
        func.count(subquery.c.FOD_ID).label("fire_count")
    ).filter(
        subquery.c.FIRE_SIZE_CLASS.isnot(None),
        subquery.c.STAT_CAUSE_DESCR.isnot(None)
    ).group_by("size_class", "cause").order_by("size_class", "cause")

    results = final_query.all()
    return results

# Calculates the number of fires per month for each year.
@router.get("/summary/monthly-frequency", response_model=List[schemas.MonthlyFireFrequency])
def get_monthly_fire_frequency(
    db: Session = Depends(get_db),
    state: Optional[str] = None
):
    query = db.query(
        extract('year', db_models.Wildfire.DISCOVERY_DATETIME).label('year'),
        extract('month', db_models.Wildfire.DISCOVERY_DATETIME).label('month'),
        func.count(db_models.Wildfire.FOD_ID).label('fire_count')
    ).filter(
        db_models.Wildfire.DISCOVERY_DATETIME.isnot(None)
    )

    if state:
        query = query.filter(db_models.Wildfire.STATE == state)

    query_results = query.group_by('year', 'month').order_by('year', 'month').all()

    if not query_results:
        return []

    # Find the actual year range from the data to build a complete timeline.
    year_query = db.query(
        func.min(extract('year', db_models.Wildfire.DISCOVERY_DATETIME)),
        func.max(extract('year', db_models.Wildfire.DISCOVERY_DATETIME))
    ).filter(db_models.Wildfire.DISCOVERY_DATETIME.isnot(None))

    if state:
        year_query = year_query.filter(db_models.Wildfire.STATE == state)

    min_max_year = year_query.one_or_none()

    if not min_max_year or min_max_year[0] is None:
        return []

    min_year = int(min_max_year[0])
    max_year = int(min_max_year[1])

    # Create a map to hold the data, ensuring all months are present for all years.
    data_map = {year: [0] * 12 for year in range(min_year, max_year + 1)}

    for row in query_results:
        if row.year and row.month:
            year = int(row.year)
            month_index = int(row.month) - 1
            if year in data_map and 0 <= month_index < 12:
                data_map[year][month_index] = row.fire_count

    response = [
        schemas.MonthlyFireFrequency(
            year=year,
            monthly_counts=counts
        )
        for year, counts in data_map.items()
    ]

    return response

# Fetches all fires for a given year, used for the yearly animation.
@router.get("/fires/year/{year}", response_model=List[schemas.FirePoint])
def get_fires_by_year(
    year: int,
    db: Session = Depends(get_db),
    state: Optional[str] = None,
    cause: Optional[str] = None
):
    """
    Get all fires for a specific year with optional state and cause filters.
    Returns all fire records without pagination, excluding smaller fires.
    """
    query = db.query(db_models.Wildfire).filter(
        db_models.Wildfire.FIRE_YEAR == year,
        db_models.Wildfire.FIRE_SIZE >= 5.0  # We filter out small fires to reduce noise.
    )

    if state:
        query = query.filter(db_models.Wildfire.STATE == state)
    if cause and cause != 'All':
        query = query.filter(db_models.Wildfire.STAT_CAUSE_DESCR == cause)

    fires_db = query.order_by(db_models.Wildfire.FIRE_SIZE.desc()).all()

    fires_response = [
        schemas.FirePoint(
            fod_id=f.FOD_ID,
            lat=f.LATITUDE,
            lon=f.LONGITUDE,
            cause=f.STAT_CAUSE_DESCR,
            agency=f.NWCG_REPORTING_AGENCY,
            fire_size=f.FIRE_SIZE,
            fire_year=f.FIRE_YEAR,
            state=f.STATE,
            fire_name=f.FIRE_NAME,
            county=f.COUNTY,
            fire_size_class=f.FIRE_SIZE_CLASS
        )
        for f in fires_db if f.LATITUDE is not None and f.LONGITUDE is not None
    ]
    return fires_response

# Endpoint for the radial chart showing fire causes.
@router.get("/summary/causes", response_model=List[schemas.AggregateResult])
def get_cause_summary(
    db: Session = Depends(get_db),
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    state: Optional[str] = None
):
    """
    Returns the total fire count for each cause, applying optional filters.
    This is used to power the radial cause chart.
    """
    query = db.query(
        db_models.Wildfire.STAT_CAUSE_DESCR.label("group"),
        func.count(db_models.Wildfire.FOD_ID).label("count")
    ).filter(db_models.Wildfire.STAT_CAUSE_DESCR.isnot(None))

    query = apply_date_range_filter(query, start_date, end_date)
    if state:
        query = query.filter(db_models.Wildfire.STATE == state)

    results = query.group_by("group").order_by(func.count(db_models.Wildfire.FOD_ID).desc()).all()
    return results

# Looks up the state for a given latitude and longitude.
@router.get("/geospatial/reverse-geocode")
def reverse_geocode(lat: float, lon: float):
    """
    Takes latitude and longitude and returns the state using a public API.
    """
    # Using the free Nominatim API from OpenStreetMap.
    url = f"https://nominatim.openstreetmap.org/reverse?format=json&lat={lat}&lon={lon}"
    # Some APIs require a user agent, so we set one to be polite.
    headers = {"User-Agent": "WildfireWebApp"} 
    
    try:
        response = requests.get(url, headers=headers)
        response.raise_for_status() # This will raise an error for bad responses (e.g., 404, 500).
        data = response.json()
        
        # The state code is usually in the 'state_code' field.
        state_code = data.get('address', {}).get('state_code', '').upper()
        if not state_code:
            # If that's not found, we'll try a fallback field.
            state_code = data.get('address', {}).get('state', '').upper()

        if not state_code:
            raise HTTPException(status_code=404, detail="State not found for the given coordinates.")
            
        return {"state": state_code}
        
    except requests.RequestException as e:
        raise HTTPException(status_code=500, detail=f"Failed to connect to geocoding service: {e}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing geocoding result: {e}")

