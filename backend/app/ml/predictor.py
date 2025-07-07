# app/ml/predictor.py
import joblib
import pandas as pd
from typing import List, Dict
import os

MODEL_DIR = os.path.join(os.path.dirname(__file__), '..', '..', 'ml_models')
MODEL_PATH = os.path.join(MODEL_DIR, "fire_cause_model.joblib")
COLUMNS_PATH = os.path.join(MODEL_DIR, "model_columns.joblib")

model = None
model_columns = None

def load_model():
    global model, model_columns
    print("Attempting to load machine learning model...")
    if os.path.exists(MODEL_PATH) and os.path.exists(COLUMNS_PATH):
        model = joblib.load(MODEL_PATH)
        model_columns = joblib.load(COLUMNS_PATH)
        print(" Machine learning model loaded successfully.")
    else:
        print(" Warning: Model files not found. Prediction endpoint will use dummy logic.")

def predict_fire_cause(input_df: pd.DataFrame) -> List[Dict]:
    if model is None or model_columns is None:
        # Return dummy data if model isn't loaded
        return [
            {"cause": "Arson", "probability": 0.95},
            {"cause": "Model Not Loaded", "probability": 0.05},
        ]
        
    # One-hot encode the input DataFrame
    input_encoded = pd.get_dummies(input_df)
    
    # Align the columns with the model's blueprint
    input_aligned = input_encoded.reindex(columns=model_columns, fill_value=0)
    
    probabilities = model.predict_proba(input_aligned)[0]
    
    results = [
        {"cause": cause, "probability": prob}
        for cause, prob in zip(model.classes_, probabilities)
    ]
    
    results.sort(key=lambda x: x['probability'], reverse=True)
    return results[:5]