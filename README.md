# CS661_group_11
THIS IS THE OFFICIAL REPOSITORY FOR CS661 GROUP PROJECT 
=======

## Backend and frontend_pk Setup (For Local Development)

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

2.  **Navigate to the Backend Directory:**
    All Docker commands must be run from the `backend` folder.
    from https://drive.google.com/file/d/146QW_T_oNxWIa1yP6tC-iRnNzqXUgcmc/view?usp=sharing downlaod and place it in backend folder
    ```bash
    cd backend
    docker-compose down
    ```

3.  **Build and Run the Services:**
    This single command will build the Python environment, start the database, and launch the API server.
    ```bash
    docker-compose up --build
    ```
    The first time you run this, it will take a few minutes to download and build everything. Subsequent runs will be much faster.

    The API will be available at `http://localhost:8000`. You can see the interactive documentation at `http://localhost:8000/docs`.

4.  **Load the Database (First-time setup only):**
    While the command above is running, open a **new, separate terminal window(if using vscode there is split terminal option check it)**. Navigate to the same project folder (`cd CS661_group_11/backend`). Run this command:
    ```bash
    docker-compose exec app python /project_root/create_and_load_final.py
    ```
5.  **frontend_pk**
    ```bash
    cd frontend_pk
    ```  
    ```bash
    npm install
    ```
    ```bash
    npm start
    ```       
## 📄 Project Report

Read the full report [here](report_pk.md).

