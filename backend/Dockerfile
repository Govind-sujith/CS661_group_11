FROM python:3.11-slim
WORKDIR /app
RUN apt-get update && apt-get install -y libgomp1
COPY ./requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY ./app ./app
COPY ./ml_models ./ml_models
COPY ./run_data.py .
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
