# CS661 Group 11 - Wildfire Analytics Platform

This is the official repository for our CS661 group project.

---

## Getting Started with Local Development

This project is set up to run inside Docker, which handles all the tricky dependencies for you. This means you don't need to install Python or PostgreSQL on your computer—just Docker Desktop.

### What You'll Need

* **Git:** For cloning the repository from GitHub.
* **Docker Desktop:** Make sure it's installed and running on your machine before you begin.

### Required Data Files

Before you start, you must download all the necessary data files and place them in the correct folders.

1.  **SQLite Database**
    * **Download:** [FPA_FOD_20170508.sqlite](https://drive.google.com/file/d/146QW_T_oNxWIa1yP6tC-iRnNzqXUgcmc/view?usp=sharing)
    * **Destination:** Place this file in the project's root folder (`CS661_group_11/`).

2.  **Machine Learning Model**
    * **Download:** [wildfire_cause_model_focused.joblib](https://drive.google.com/file/d/1WV1ZWEcjJtCSiObOJQJQ7nMZZf6iNirE/view?usp=sharing)
    * **Destination:** Place this file inside the `backend/ml_models/` folder.

---

### Step-by-Step Setup

1.  **Clone the Project**

    First, get the project files onto your computer. Open your terminal, navigate to where you want to store the project, and run:
    ```bash
    git clone https://github.com/Govind-sujith/CS661_group_11.git
    cd CS661_group_11
    ```

2.  **Place Data Files**

    Make sure you have downloaded all the files listed above and placed them in their correct destination folders before proceeding.

3.  **Start the Backend**

    All the backend commands need to be run from the `backend` directory.
    ```bash
    cd backend
    ```
    To make sure you're starting fresh, run this command first to clear out any old Docker containers or data:
    ```bash
    docker-compose down --volumes --remove-orphans
    ```
    Now, build and run everything with a single command:
    ```bash
    docker-compose up --build
    ```
    The very first time you run this, it might take a few minutes to download the necessary images. After that, it will start up much faster. Once it's running, the backend API will be available at `http://localhost:8000`.

4.  **Load the Data (One-Time Step)**

    With the backend running, you need to load the wildfire data into the database.
    * Open a **new terminal window or tab**. (In VS Code, you can use the "Split Terminal" feature).
    * Navigate back into the `backend` directory: `cd CS661_group_11/backend`
    * Run the following command to execute the data loading script inside the running container:
    ```bash
    docker-compose exec app python run_data.py
    ```
    You only need to do this once. The data will be stored in a Docker volume, so it will still be there even after you stop and restart the containers.

5.  **Start the Frontend**

    Finally, let's get the user interface running.
    * In a new terminal, navigate to the `frontend_pk` directory:
    ```bash
    cd frontend_pk
    ```
    * Install the necessary packages:
    ```bash
    npm install
    ```
    * And start the development server:
    ```bash
    npm start
    ```
    Your web browser should automatically open to `http://localhost:3000`, where you can see the live application.
