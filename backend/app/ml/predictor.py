# /backend/app/ml/predictor.py
import joblib
import pandas as pd
import numpy as np
from datetime import datetime
import os
from typing import List, Dict

# --- Constants & Model Loading ---

# Let's find the model file. It's stored in the `ml_models` directory.
MODEL_PATH = os.path.join(os.path.dirname(__file__), '..', '..', 'ml_models', 'wildfire_cause_model_focused.joblib')

# Heads up: These columns have to be in the exact same order as the data used to train the model.
TRAINING_COLUMNS = [
    'FIRE_YEAR', 'FIRE_SIZE', 'LATITUDE', 'LONGITUDE', 'OWNER_CODE', 'STATE',
    'NWCG_REPORTING_AGENCY', 'doy_sin', 'doy_cos', 'lat_lon_interaction'
]

# And here are the possible fire causes, again, in the same order the model expects.
CAUSE_LABELS = [
    "Lightning", "Equipment Use", "Smoking", "Campfire", "Debris Burning",
    "Railroad", "Arson", "Children", "Miscellaneous", "Fireworks", "Powerline"
]

# We need a way to turn state abbreviations (like 'CA') into numbers for the model.
SORTED_STATES = sorted(['AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA', 'HI', 'ID',
                        'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD', 'MA', 'MI', 'MN', 'MS',
                        'MO', 'MT', 'NE', 'NV', 'NH', 'NJ', 'NM', 'NY', 'NC', 'ND', 'OH', 'OK',
                        'OR', 'PA', 'RI', 'SC', 'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY'])
STATE_CODE_MAP = {abbr: i for i, abbr in enumerate(SORTED_STATES)}

# We'll load the model into memory just once when the app starts up.
model = None

def load_model():
    """This function handles loading the machine learning model from the file."""
    global model
    try:
        model = joblib.load(MODEL_PATH)
        print("Machine learning model loaded successfully.")
    except Exception as e:
        print(f"Error loading model file: {e}")
        model = None

# --- Prediction Logic ---

def preprocess_and_predict(input_data: Dict) -> List[Dict]:
    """
    Takes raw user input, gets it ready for the model,
    and then returns a list of ranked predictions.
    """
    # If the model isn't loaded for some reason, we'll send back an error message.
    if not model:
        return [{"cause": "Model Not Loaded", "probability": 1.0}]

    # --- Getting the data ready ---
    # First, we'll process the date to get the year and the day of the year.
    try:
        dt = datetime.strptime(input_data["date"], "%Y-%m-%d")
        input_data["DISCOVERY_DOY"] = dt.timetuple().tm_yday
        input_data["FIRE_YEAR"] = dt.year
    except (ValueError, TypeError):
        # If the date is funky, we'll just use some default values.
        input_data["DISCOVERY_DOY"] = 180
        input_data["FIRE_YEAR"] = datetime.now().year

    # Here, we convert the state's abbreviation to its assigned number.
    input_data["STATE"] = STATE_CODE_MAP.get(input_data["STATE"].upper(), 4) # Defaulting to California if not found.

    # The model needs numbers for these fields, so we'll add some defaults if they're missing.
    input_data.setdefault('OWNER_CODE', 1)
    input_data.setdefault('NWCG_REPORTING_AGENCY', 7)

    # Now for a bit of feature engineering. We create the same special features the model was trained on.
    input_data["doy_sin"] = np.sin(2 * np.pi * input_data["DISCOVERY_DOY"] / 365.0)
    input_data["doy_cos"] = np.cos(2 * np.pi * input_data["DISCOVERY_DOY"] / 365.0)
    input_data["lat_lon_interaction"] = input_data["LATITUDE"] * input_data["LONGITUDE"]

    # Let's put all this processed data into a pandas DataFrame.
    df = pd.DataFrame([input_data])
    # This is super important: we make sure the columns are in the exact order the model is expecting.
    df = df.reindex(columns=TRAINING_COLUMNS, fill_value=0)

    # --- Making the prediction ---
    probabilities = model.predict_proba(df)[0]
    
    # Finally, we'll match up the probabilities with their cause labels and sort them from most to least likely.
    results = sorted(
        [{"cause": CAUSE_LABELS[i], "probability": round(prob, 4)}
         for i, prob in enumerate(probabilities)],
        key=lambda x: x["probability"],
        reverse=True
    )
    
    return results
