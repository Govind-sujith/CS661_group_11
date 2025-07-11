# backend/app/models/db_models.py (THE FINAL, CLEAN, CORRECT VERSION)
from sqlalchemy import Column, Integer, String, Float, DateTime
from app.database import Base

class Wildfire(Base):
    __tablename__ = "wildfires"

    FOD_ID = Column(Integer, primary_key=True, name="FOD_ID")
    FIRE_NAME = Column(String, name="FIRE_NAME", nullable=True)
    FIRE_YEAR = Column(Integer, name="FIRE_YEAR")
    STAT_CAUSE_DESCR = Column(String, name="STAT_CAUSE_DESCR")
    LATITUDE = Column(Float, name="LATITUDE")
    LONGITUDE = Column(Float, name="LONGITUDE")
    STATE = Column(String, name="STATE")
    OWNER_DESCR = Column(String, name="OWNER_DESCR", nullable=True)
    OWNER_CODE = Column(Float, name="OWNER_CODE", nullable=True)
    FIRE_SIZE = Column(Float, name="FIRE_SIZE")
    FIRE_SIZE_CLASS = Column(String, name="FIRE_SIZE_CLASS")
    COMPLEX_NAME = Column(String, name="COMPLEX_NAME", nullable=True)
    DISCOVERY_DOY = Column(Integer, name="DISCOVERY_DOY")
    NWCG_REPORTING_AGENCY = Column(String, name="NWCG_REPORTING_AGENCY", nullable=True)
    NWCG_REPORTING_UNIT_ID = Column(String, name="NWCG_REPORTING_UNIT_ID", nullable=True)
    GeographicArea = Column(String, name="GeographicArea", nullable=True)
    UnitType = Column(String, name="UnitType", nullable=True)
    Agency = Column(String, name="Agency", nullable=True)
    Name = Column(String, name="Name", nullable=True)
    COUNTY = Column(String, name="COUNTY", nullable=True)
    FIPS_CODE = Column(String, name="FIPS_CODE", nullable=True)
    FIPS_NAME = Column(String, name="FIPS_NAME", nullable=True)
    DISCOVERY_DATETIME = Column(DateTime, name="DISCOVERY_DATETIME", nullable=True)
    CONT_DATETIME = Column(DateTime, name="CONT_DATETIME", nullable=True)
    DISCOVERY_MONTH = Column(Float, name="DISCOVERY_MONTH", nullable=True)
    DISCOVERY_DAY_OF_WEEK = Column(String, name="DISCOVERY_DAY_OF_WEEK", nullable=True)
    DISCOVERY_HOUR = Column(Float, name="DISCOVERY_HOUR", nullable=True)
    FIRE_DURATION_DAYS = Column(Float, name="FIRE_DURATION_DAYS", nullable=True)
    
    __mapper_args__ = {'primary_key': [FOD_ID]}