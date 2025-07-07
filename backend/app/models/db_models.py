# app/models/db_models.py
from sqlalchemy import Column, Integer, String, Float, DateTime
from app.database import Base

class Wildfire(Base):
    __tablename__ = "wildfires"

    FOD_ID = Column(Integer, primary_key=True, index=True)
    FIRE_NAME = Column(String, nullable=True)
    FIRE_YEAR = Column(Integer, index=True)
    STAT_CAUSE_DESCR = Column(String, index=True)
    LATITUDE = Column(Float)
    LONGITUDE = Column(Float)
    STATE = Column(String, index=True)
    OWNER_DESCR = Column(String, nullable=True)
    OWNER_CODE = Column(Float, nullable=True)
    FIRE_SIZE = Column(Float)
    FIRE_SIZE_CLASS = Column(String, index=True)
    COMPLEX_NAME = Column(String, nullable=True)
    DISCOVERY_DOY = Column(Integer)
    NWCG_REPORTING_AGENCY = Column(String, nullable=True)
    NWCG_REPORTING_UNIT_ID = Column(String, nullable=True)
    GeographicArea = Column(String, nullable=True)
    UnitType = Column(String, nullable=True)
    Agency = Column(String, nullable=True)
    Name = Column(String, nullable=True)
    DISCOVERY_DATETIME = Column(DateTime)
    CONT_DATETIME = Column(DateTime, nullable=True)
    DISCOVERY_MONTH = Column(Integer)
    DISCOVERY_DAY_OF_WEEK = Column(String)
    DISCOVERY_HOUR = Column(Integer)
    FIRE_DURATION_DAYS = Column(Float, nullable=True)