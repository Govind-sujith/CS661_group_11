# ~/backend/app/database.py
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

# This must match the docker-compose.yml and load_data.py 
# guys remember for entire project prototyping we will use this credential only untill deployment
# The new, correct line for Docker
DATABASE_URL = "postgresql://user:password@db/wildfiredb"

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# Dependency to get a DB session for each request
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()