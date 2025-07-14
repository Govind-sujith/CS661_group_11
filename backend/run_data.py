import pandas as pd
import sqlite3
from sqlalchemy import create_engine
import numpy as np
import time
import os
import sys

# This script needs to find our 'app' module, so we'll add the 'backend' directory
# to the system path. This is a little trick to make imports work correctly.
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), 'backend')))
from app.database import Base
from app.models import db_models

print("--- Kicking off the data engineering and loading pipeline ---")

# --- Configuration ---
# Here we set up all the important paths and credentials.
SQLITE_PATH = '/project_root/FPA_FOD_20170508.sqlite'
DB_USER = "user"
DB_PASSWORD = "password"
DB_HOST = "db"
DB_PORT = "5432"
DB_NAME = "wildfiredb"

# A quick check to make sure the original SQLite database actually exists.
if not os.path.exists(SQLITE_PATH):
    print(f"FATAL: Can't find the SQLite database at {SQLITE_PATH}")
    exit()

# Building the connection string for our PostgreSQL database.
db_url = f"postgresql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}"
engine = create_engine(db_url)

# --- Drop and Recreate Table ---
# To ensure we have a fresh start, we'll completely wipe and rebuild the 'wildfires' table.
print("Step 1: Dropping and recreating the 'wildfires' table...")
try:
    with engine.begin() as conn:
        Base.metadata.drop_all(conn, tables=[db_models.Wildfire.__table__])
        Base.metadata.create_all(conn, tables=[db_models.Wildfire.__table__])
    print(" Table schema created successfully.")
except Exception as e:
    print(f" ERROR creating table: {e}")
    exit()

# --- ETL (Extract, Transform, Load) ---
# Now for the main event: moving and cleaning the data.
print("Step 2: Loading the NWCG agency lookup table...")
sqlite_conn = sqlite3.connect(SQLITE_PATH)
nwcg = pd.read_sql_query(
    "SELECT UnitId, GeographicArea, UnitType, Agency, Name FROM NWCG_UnitIDActive_20170109",
    sqlite_conn
)

# This is the query to pull all the fire data we need from the original SQLite database.
fires_query = """
SELECT 
    FOD_ID, FIRE_NAME, FIRE_YEAR, STAT_CAUSE_DESCR, LATITUDE, LONGITUDE, STATE, 
    OWNER_DESCR, OWNER_CODE, FIRE_SIZE, FIRE_SIZE_CLASS, DISCOVERY_DOY, 
    DISCOVERY_DATE, DISCOVERY_TIME, CONT_DATE, CONT_TIME,
    NWCG_REPORTING_AGENCY, NWCG_REPORTING_UNIT_ID, COMPLEX_NAME,
    COUNTY, FIPS_CODE, FIPS_NAME
FROM Fires
"""

# We'll process the data in chunks to avoid running out of memory.
chunk_size = 50000
start_time = time.time()
print("Step 3: Processing and loading the fires data in chunks...")

# A helper function to clean up the time values, which can be a bit messy.
def clean_time(val):
    val_str = str(val).split('.')[0].zfill(4)
    if val_str.isdigit() and len(val_str) == 4:
        hour = int(val_str[:2])
        minute = int(val_str[2:])
        if 0 <= hour <= 23 and 0 <= minute <= 59:
            return f"{hour:02d}:{minute:02d}"
    return "00:00" # If the time is invalid, we'll just default to midnight.

total_rows = 0
for i, chunk in enumerate(pd.read_sql_query(fires_query, sqlite_conn, chunksize=chunk_size)):
    print(f"   Processing chunk {i+1}...")

    # We'll merge the fire data with our agency lookup table.
    chunk = chunk.merge(nwcg, left_on='NWCG_REPORTING_UNIT_ID', right_on='UnitId', how='left')

    # --- Cleaning up the date and time columns ---
    chunk['DISCOVERY_TIME_FORMATTED'] = chunk['DISCOVERY_TIME'].fillna('0000').apply(clean_time)
    chunk['CONT_TIME_FORMATTED'] = chunk['CONT_TIME'].fillna('0000').apply(clean_time)

    # The original dates are in a Julian format, so we convert them to standard datetimes.
    chunk['DISCOVERY_DATETIME'] = pd.to_datetime(chunk['DISCOVERY_DATE'], origin='julian', unit='D', errors='coerce')
    chunk['CONT_DATETIME'] = pd.to_datetime(chunk['CONT_DATE'], origin='julian', unit='D', errors='coerce')

    # These functions safely combine the date and time parts into a single datetime object.
    def safe_combine_discovery(row):
        if pd.isna(row['DISCOVERY_DATETIME']): return pd.NaT
        try: return pd.to_datetime(f"{row['DISCOVERY_DATETIME'].date()} {row['DISCOVERY_TIME_FORMATTED']}")
        except (ValueError, TypeError): return pd.NaT

    def safe_combine_containment(row):
        if pd.isna(row['CONT_DATETIME']): return pd.NaT
        try: return pd.to_datetime(f"{row['CONT_DATETIME'].date()} {row['CONT_TIME_FORMATTED']}")
        except (ValueError, TypeError): return pd.NaT

    chunk['DISCOVERY_DATETIME'] = chunk.apply(safe_combine_discovery, axis=1)
    chunk['CONT_DATETIME'] = chunk.apply(safe_combine_containment, axis=1)
    
    # --- Feature Engineering ---
    # Now we can create some new, useful columns from the cleaned data.
    chunk['FIRE_DURATION_DAYS'] = ((chunk['CONT_DATETIME'] - chunk['DISCOVERY_DATETIME']).dt.total_seconds() / (24 * 60 * 60))
    chunk['DISCOVERY_MONTH'] = chunk['DISCOVERY_DATETIME'].dt.month
    chunk['DISCOVERY_DAY_OF_WEEK'] = chunk['DISCOVERY_DATETIME'].dt.day_name()
    chunk['DISCOVERY_HOUR'] = chunk['DISCOVERY_DATETIME'].dt.hour

    # --- Final Column Selection ---
    # We'll select only the columns we actually need for our final database table.
    final_columns = [
        'FOD_ID', 'FIRE_NAME', 'FIRE_YEAR', 'STAT_CAUSE_DESCR', 'LATITUDE', 'LONGITUDE',
        'STATE', 'OWNER_DESCR', 'OWNER_CODE', 'FIRE_SIZE', 'FIRE_SIZE_CLASS',
        'COMPLEX_NAME', 'DISCOVERY_DOY', 'NWCG_REPORTING_AGENCY', 'NWCG_REPORTING_UNIT_ID',
        'GeographicArea', 'UnitType', 'Agency', 'Name', 'COUNTY', 'FIPS_CODE', 'FIPS_NAME',
        'DISCOVERY_DATETIME', 'CONT_DATETIME', 'DISCOVERY_MONTH',
        'DISCOVERY_DAY_OF_WEEK', 'DISCOVERY_HOUR', 'FIRE_DURATION_DAYS'
    ]
    chunk_final = chunk[final_columns]

    # Pandas uses NaN for missing values, but our database prefers None (or NULL).
    chunk_final = chunk_final.replace({pd.NaT: None, np.nan: None})

    # Time to load this chunk into our PostgreSQL database.
    with engine.begin() as conn:
        if not chunk_final.empty:
            conn.execute(db_models.Wildfire.__table__.insert(), chunk_final.to_dict(orient='records'))

    total_rows += len(chunk_final)

sqlite_conn.close()
end_time = time.time()
print(f" Data load complete. Inserted {total_rows} rows in {end_time - start_time:.2f} seconds.")
