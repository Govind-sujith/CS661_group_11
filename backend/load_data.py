# ~/backend/load_data.py
import pandas as pd
from sqlalchemy import create_engine
import time
import os

# Configuration
DB_USER = "user"
DB_PASSWORD = "password"
DB_HOST = "db" #CRITICAL CHANGE for Docker. Not 'localhost'.
DB_PORT = "5432"
DB_NAME = "wildfiredb"
TABLE_NAME = "wildfires"

# This path works because the script is in /app/ and the data is in /app/data
CSV_PATH = os.path.join(os.path.dirname(__file__), 'data', 'master_fires_v2.csv')


print("Starting data loading process...")

if not os.path.exists(CSV_PATH):
    print(f"FATAL: CSV file not found at path: {CSV_PATH}")
    print("Please make sure the 'master_fires_v2.csv' file is inside the 'data' folder.")
    exit()

db_url = f"postgresql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}"
engine = create_engine(db_url)

print("Reading CSV in chunks...")
chunk_size = 50000
start_time = time.time()

for i, chunk in enumerate(pd.read_csv(CSV_PATH, chunksize=chunk_size, low_memory=False)):
    print(f"Processing chunk {i+1}...")
    if_exists_strategy = 'replace' if i == 0 else 'append'
    chunk.to_sql(
        TABLE_NAME,
        con=engine,
        if_exists=if_exists_strategy,
        index=False,
        method='multi'
    )

end_time = time.time()
print(f"Data loading complete. Total time: {end_time - start_time:.2f} seconds.")
print(f"Data from '{CSV_PATH}' has been loaded into the '{TABLE_NAME}' table.")