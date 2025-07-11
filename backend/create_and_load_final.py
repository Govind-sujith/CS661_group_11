# create_and_load_streaming.py (The Memory-Efficient Streaming Version)
import pandas as pd
import sqlite3
from sqlalchemy import create_engine
from app.database import Base      # We need these to create the table correctly
from app.models import db_models  #
import time
import os

# --- PART 1: SETUP ---

print("--- Starting MEMORY-EFFICIENT Streaming Data Load ---")

# Source database
SQLITE_PATH = 'FPA_FOD_20170508.sqlite'

# Destination database (running in Docker)
DB_USER = "user"
DB_PASSWORD = "password"
DB_HOST = "db" # Maps to the Docker container's port
DB_PORT = "5432"
DB_NAME = "wildfiredb"
TABLE_NAME = "wildfires"

if not os.path.exists(SQLITE_PATH):
    print(f"FATAL: SQLite database not found at {SQLITE_PATH}")
    exit()

db_url = f"postgresql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}"
engine = create_engine(db_url)

# --- PART 2: CREATE A PERFECT, EMPTY TABLE ---
# We do this once, before the loop, to ensure the schema is 100% correct.
print("Step 1: Dropping and recreating the 'wildfires' table for a clean start...")
with engine.begin() as conn:
    Base.metadata.drop_all(conn, tables=[db_models.Wildfire.__table__])
    Base.metadata.create_all(conn, tables=[db_models.Wildfire.__table__])
print("Table created successfully.")

# --- PART 3: STREAMING ETL PROCESS ---

# Load the small lookup table into memory. This is efficient.
print("Step 2: Loading the small NCWG agency lookup table into memory...")
sqlite_conn = sqlite3.connect(SQLITE_PATH)
nwcg = pd.read_sql_query("SELECT UnitId, GeographicArea, UnitType, Agency, Name FROM NWCG_UnitIDActive_20170109", sqlite_conn)

# Now, read the huge Fires table in chunks and process each chunk individually.
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
print("Step 3: Starting to process and load the main fires table in chunks...")

for i, chunk in enumerate(pd.read_sql_query(fires_query, sqlite_conn, chunksize=chunk_size)):
    print(f"  - Processing chunk {i+1}...")
    
    # Perform all transformations on this single, small chunk
    chunk = chunk.merge(nwcg, left_on='NWCG_REPORTING_UNIT_ID', right_on='UnitId', how='left')
    
    chunk['DISCOVERY_TIME'] = chunk['DISCOVERY_TIME'].fillna('0000').astype(str).str.zfill(4)
    chunk['CONT_TIME'] = chunk['CONT_TIME'].fillna('0000').astype(str).str.zfill(4)

    chunk['DISCOVERY_DATETIME'] = pd.to_datetime(chunk['DISCOVERY_DATE'], origin='julian', unit='D')
    chunk['DISCOVERY_DATETIME'] = pd.to_datetime(
        chunk['DISCOVERY_DATETIME'].dt.strftime('%Y-%m-%d') + ' ' + chunk['DISCOVERY_TIME'],
        errors='coerce'
    )
    chunk['CONT_DATETIME'] = pd.to_datetime(chunk['CONT_DATE'], origin='julian', unit='D')
    chunk['CONT_DATETIME'] = pd.to_datetime(
        chunk['CONT_DATETIME'].dt.strftime('%Y-%m-%d') + ' ' + chunk['CONT_TIME'],
        errors='coerce'
    )

    chunk['DISCOVERY_MONTH'] = chunk['DISCOVERY_DATETIME'].dt.month
    chunk['DISCOVERY_DAY_OF_WEEK'] = chunk['DISCOVERY_DATETIME'].dt.day_name()
    chunk['DISCOVERY_HOUR'] = chunk['DISCOVERY_DATETIME'].dt.hour
    chunk['FIRE_DURATION_DAYS'] = (chunk['CONT_DATETIME'] - chunk['DISCOVERY_DATETIME']).dt.total_seconds() / (24 * 60 * 60)
    
    # Select the final, exact set of columns
    final_columns = [
        'FOD_ID', 'FIRE_NAME', 'FIRE_YEAR', 'STAT_CAUSE_DESCR', 'LATITUDE', 'LONGITUDE', 
        'STATE', 'OWNER_DESCR', 'OWNER_CODE', 'FIRE_SIZE', 'FIRE_SIZE_CLASS', 
        'COMPLEX_NAME', 'DISCOVERY_DOY', 'NWCG_REPORTING_AGENCY', 'NWCG_REPORTING_UNIT_ID',
        'GeographicArea', 'UnitType', 'Agency', 'Name', 'COUNTY', 'FIPS_CODE', 'FIPS_NAME',
        'DISCOVERY_DATETIME', 'CONT_DATETIME', 'DISCOVERY_MONTH', 
        'DISCOVERY_DAY_OF_WEEK', 'DISCOVERY_HOUR', 'FIRE_DURATION_DAYS'
    ]
    chunk_final = chunk[final_columns]
    
    # Load this one processed chunk into the database
    chunk_final.to_sql(
        TABLE_NAME,
        con=engine,
        if_exists='append', # Always append, since we created the table at the start
        index=False,
        method='multi'
    )

sqlite_conn.close()
end_time = time.time()
print(f"✅ Data loading complete. Total time: {end_time - start_time:.2f} seconds.")