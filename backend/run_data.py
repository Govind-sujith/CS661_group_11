import pandas as pd
import sqlite3
from sqlalchemy import create_engine
import numpy as np
import time
import os
import sys

# Allows this script to find the 'backend' module when run from the project root
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), 'backend')))
from app.database import Base
from app.models import db_models

print("--- SStarting Final, Proven Data Engineering & Loading Pipeline ---")

# --- Configuration ---
SQLITE_PATH = '/project_root/FPA_FOD_20170508.sqlite'
DB_USER = "user"
DB_PASSWORD = "password"
DB_HOST = "db"
DB_PORT = "5432"
DB_NAME = "wildfiredb"

if not os.path.exists(SQLITE_PATH):
    print(f"FATAL: SQLite database not found at {SQLITE_PATH}")
    exit()

db_url = f"postgresql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}"
engine = create_engine(db_url)

# --- Drop and Recreate Table ---
print("Step 1: Dropping and recreating the 'wildfires' table...")
try:
    with engine.begin() as conn:
        Base.metadata.drop_all(conn, tables=[db_models.Wildfire.__table__])
        Base.metadata.create_all(conn, tables=[db_models.Wildfire.__table__])
    print(" Table schema created successfully.")
except Exception as e:
    print(f" ERROR creating table: {e}")
    exit()

# --- ETL ---
print("Step 2: Loading NCWG lookup table...")
sqlite_conn = sqlite3.connect(SQLITE_PATH)
nwcg = pd.read_sql_query(
    "SELECT UnitId, GeographicArea, UnitType, Agency, Name FROM NWCG_UnitIDActive_20170109",
    sqlite_conn
)

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
print("Step 3: Processing and loading fires table in chunks...")

# --- Helper for time formatting ---
def clean_time(val):
    val_str = str(val).split('.')[0].zfill(4)
    if val_str.isdigit() and len(val_str) == 4:
        hour = int(val_str[:2])
        minute = int(val_str[2:])
        if 0 <= hour <= 23 and 0 <= minute <= 59:
            return f"{hour:02d}:{minute:02d}"
    return "00:00"

total_rows = 0
for i, chunk in enumerate(pd.read_sql_query(fires_query, sqlite_conn, chunksize=chunk_size)):
    print(f"   Processing chunk {i+1}...")

    chunk = chunk.merge(nwcg, left_on='NWCG_REPORTING_UNIT_ID', right_on='UnitId', how='left')

    # --- Proven Date and Time Logic from Debug Script ---
    chunk['DISCOVERY_TIME_FORMATTED'] = chunk['DISCOVERY_TIME'].fillna('0000').apply(clean_time)
    chunk['CONT_TIME_FORMATTED'] = chunk['CONT_TIME'].fillna('0000').apply(clean_time)

    chunk['DISCOVERY_DATETIME'] = pd.to_datetime(chunk['DISCOVERY_DATE'], origin='julian', unit='D', errors='coerce')
    chunk['CONT_DATETIME'] = pd.to_datetime(chunk['CONT_DATE'], origin='julian', unit='D', errors='coerce')

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
    chunk['FIRE_DURATION_DAYS'] = ((chunk['CONT_DATETIME'] - chunk['DISCOVERY_DATETIME']).dt.total_seconds() / (24 * 60 * 60))
    chunk['DISCOVERY_MONTH'] = chunk['DISCOVERY_DATETIME'].dt.month
    chunk['DISCOVERY_DAY_OF_WEEK'] = chunk['DISCOVERY_DATETIME'].dt.day_name()
    chunk['DISCOVERY_HOUR'] = chunk['DISCOVERY_DATETIME'].dt.hour

    # --- Final Column Selection ---
    final_columns = [
        'FOD_ID', 'FIRE_NAME', 'FIRE_YEAR', 'STAT_CAUSE_DESCR', 'LATITUDE', 'LONGITUDE',
        'STATE', 'OWNER_DESCR', 'OWNER_CODE', 'FIRE_SIZE', 'FIRE_SIZE_CLASS',
        'COMPLEX_NAME', 'DISCOVERY_DOY', 'NWCG_REPORTING_AGENCY', 'NWCG_REPORTING_UNIT_ID',
        'GeographicArea', 'UnitType', 'Agency', 'Name', 'COUNTY', 'FIPS_CODE', 'FIPS_NAME',
        'DISCOVERY_DATETIME', 'CONT_DATETIME', 'DISCOVERY_MONTH',
        'DISCOVERY_DAY_OF_WEEK', 'DISCOVERY_HOUR', 'FIRE_DURATION_DAYS'
    ]
    chunk_final = chunk[final_columns]

    # Replace NaNs with None for database compatibility
    chunk_final = chunk_final.replace({pd.NaT: None, np.nan: None})

    # Insert into DB
    with engine.begin() as conn:
        if not chunk_final.empty:
            conn.execute(db_models.Wildfire.__table__.insert(), chunk_final.to_dict(orient='records'))

    total_rows += len(chunk_final)

sqlite_conn.close()
end_time = time.time()
print(f" Data load complete. Inserted {total_rows} rows in {end_time - start_time:.2f} seconds.")
