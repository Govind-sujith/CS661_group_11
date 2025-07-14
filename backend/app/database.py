# backend/app/database.py
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

# This file handles all the setup for our connection to the PostgreSQL database.

# This is the connection string for our database. It tells our app how to find it,
# especially when running inside Docker.
DATABASE_URL = "postgresql://user:password@db/wildfiredb"

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# This function is a handy utility that gives us a database session for each API request.
def get_db():
    db = SessionLocal()
    try:
        # We 'yield' the session to the part of the code that needs it.
        yield db
    finally:
        # And no matter what, we make sure to close the session afterward to free up resources.
        db.close()
