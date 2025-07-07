# CS661_group_11
THIS IS THE OFFICIAL REPOSITORY FOR CS661 GROUP PROJECT 
=======
PS: add a folder with name "ml_models" in backend directory and keep it empty as of now

CURRENT STATUS UPDATE FROM BACKEND TEAM:

## 🚀 Backend Setup (For Local Development)

This project uses Docker to create a consistent development environment. You do not need to install Python or PostgreSQL on your machine, only Docker Desktop.

### Prerequisites

*   **Git:** To clone the project.
*   **Docker Desktop:** The only software you need to install. Make sure it is running before you start.


### Instructions

1.  **Clone the Repository:**
    ```bash
    git clone https://github.com/Govind-sujith/CS661_group_11.git
    cd CS661_group_11
    ```
    downlaod csv file from link https://drive.google.com/file/d/1f9hbHhOJvZLRhwzoC4rFdFUXYRWBE54W/view?usp=sharing
    place it in CS661_group_11/backend/data

2.  **Navigate to the Backend Directory:**
    All Docker commands must be run from the `backend` folder.
    ```bash
    cd backend
    ```

3.  **Build and Run the Services:**
    This single command will build the Python environment, start the database, and launch the API server.
    ```bash
    docker-compose up --build
    ```
    The first time you run this, it will take a few minutes to download and build everything. Subsequent runs will be much faster.

    The API will be available at `http://localhost:8000`. You can see the interactive documentation at `http://localhost:8000/docs`.Also take a look at http://localhost:8000/redoc

4.  **Load the Database (First-time setup only):**
    While the command above is running, open a **new, separate terminal window(if using vscode there is split terminal option check it)**. Navigate to the same project folder (`cd CS661_group_11/backend`). Run this command:
    ```bash
    docker-compose exec app python load_data.py
    ```
    This will load the all fire records from master_csv into the database. It will take a few minutes. Once it's done, your local backend is fully set up and ready to be used by the frontend.

