# run_data_pipeline.py (The One and Only, Final, Correct Script)
import pandas as pd
import sqlite3
from sqlalchemy import create_engine
import numpy as np
import time
import os
import sys

# The script is run from /app inside the container, which is the WORKDIR.
# The 'app' folder containing models.py is copied directly into /app.
# Therefore, we can import directly from 'app'.
from app.database import Base
from app.models import db_models

print("--- Starting Final, Corrected Data Engineering & Loading Pipeline ---")

# --- Configuration ---
# These paths are for running inside the Docker container
SQLITE_PATH = '/project_root/FPA_FOD_20170508.sqlite'
DB_USER = "user"
DB_PASSWORD = "password"
DB_HOST = "db" # The name of the database service in docker-compose
DB_PORT = "5432"
DB_NAME = "wildfiredb"

if not os.path.exists(SQLITE_PATH):
    print(f"FATAL: SQLite database not found at {SQLITE_PATH}")
    exit()

db_url = f"postgresql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}"
engine = create_engine(db_url)

# --- Create Table ---
print("Step 1: Dropping and recreating the 'wildfires' table...")
try:
    with engine.begin() as conn:
        Base.metadata.drop_all(conn, tables=[db_models.Wildfire.__table__])
        Base.metadata.create_all(conn, tables=[db_models.Wildfire.__table__])
    print("Table schema created successfully.")
except Exception as e:
    print(f"ERROR creating table: {e}")
    exit()

# --- ETL Process ---
print("Step 2: Loading NCWG lookup table...")
sqlite_conn = sqlite3.connect(SQLITE_PATH)
nwcg = pd.read_sql_query("SELECT UnitId, GeographicArea, UnitType, Agency, Name FROM NWCG_UnitIDActive_20170109", sqlite_conn)

fires_query = """
SELECT 
    FOD_ID, FIRE_NAME, FIRE_YEAR, STAT_CAUSE_DESCR, LATITUDE, LONGITUDE, STATE, 
    OWNER_DESCR, OWNER_CODE, FIRE_SIZE, FIRE_SIZE_CLASS, DISCOVERY_DOY, 
    DISCOVERY_DATE, DISCOVERY_TIME, CONT_DATE, CONT_TIME,
    NWCG_REPORTING_AGENCY, NWCG_REPORTING_UNIT_ID, COMPLEX_NAME,
    COUNTY, FIPS_CODE, FIPS_NAME
FROM Fires
"""
chunk_size = 50000
start_time = time.time()
print("Step 3: Processing and loading main fires table in chunks...")

total_rows = 0
for i, chunk in enumerate(pd.read_sql_query(fires_query, sqlite_conn, chunksize=chunk_size)):
    print(f"  - Processing chunk {i+1}...")
    
    chunk = chunk.merge(nwcg, left_on='NWCG_REPORTING_UNIT_ID', right_on='UnitId', how='left')
    
    # --- The Final, Bulletproof Date Handling Logic ---
    # 1. Sanitize the date columns, turning all non-numeric and bad values into NaT
    # This is the most direct and robust way to handle the raw Julian dates.
    chunk['DISCOVERY_DATETIME'] = pd.to_datetime(chunk['DISCOVERY_DATE'], origin='julian', unit='D', errors='coerce')
    chunk['CONT_DATETIME'] = pd.to_datetime(chunk['CONT_DATE'], origin='julian', unit='D', errors='coerce')
    
    # 2. Engineer the features. The .dt accessor will correctly produce NaN for any NaT rows.
    chunk['FIRE_DURATION_DAYS'] = (chunk['CONT_DATETIME'] - chunk['DISCOVERY_DATETIME']).dt.total_seconds() / (24 * 60 * 60)
    chunk['DISCOVERY_MONTH'] = chunk['DISCOVERY_DATETIME'].dt.month
    chunk['DISCOVERY_DAY_OF_WEEK'] = chunk['DISCOVERY_DATETIME'].dt.day_name()
    chunk['DISCOVERY_HOUR'] = chunk['DISCOVERY_DATETIME'].dt.hour
    
    # Select the final columns we need to insert
    final_columns = [
        'FOD_ID', 'FIRE_NAME', 'FIRE_YEAR', 'STAT_CAUSE_DESCR', 'LATITUDE', 'LONGITUDE', 
        'STATE', 'OWNER_DESCR', 'OWNER_CODE', 'FIRE_SIZE', 'FIRE_SIZE_CLASS', 
        'COMPLEX_NAME', 'DISCOVERY_DOY', 'NWCG_REPORTING_AGENCY', 'NWCG_REPORTING_UNIT_ID',
        'GeographicArea', 'UnitType', 'Agency', 'Name', 'COUNTY', 'FIPS_CODE', 'FIPS_NAME',
        'DISCOVERY_DATETIME', 'CONT_DATETIME', 'DISCOVERY_MONTH', 
        'DISCOVERY_DAY_OF_WEEK', 'DISCOVERY_HOUR', 'FIRE_DURATION_DAYS'
    ]
    chunk_final = chunk[final_columns]
    
    # 3. Replace all forms of "empty" (NaN, NaT) with Python's None for the database.
    chunk_final = chunk_final.replace({pd.NaT: None, np.nan: None})
    
    data_to_insert = chunk_final.to_dict(orient='records')
    
    with engine.begin() as conn:
        if data_to_insert:
            conn.execute(db_models.Wildfire.__table__.insert(), data_to_insert)
    
    total_rows += len(chunk_final)

sqlite_conn.close()
end_time = time.time()
print(f"✅ Data loading complete. Processed {total_rows} rows. Total time: {end_time - start_time:.2f} seconds.")
