

### **Project Technical Report: Wildfire Analytics Platform**

#### **1. System Architecture Overview**

The platform is architected as a modern, decoupled **Single Page Application (SPA)** with a containerized backend REST API. This design pattern ensures a clean separation of concerns, enhances scalability, and simplifies development and deployment.

*   **Frontend:** A dynamic, client-side rendered application built with **React.js**. It is responsible for all user interface rendering, state management, and visualization.
*   **Backend:** A high-performance, asynchronous REST API built with **Python** and **FastAPI**. It is responsible for data serving, complex database queries, and machine learning inference.
*   **Database:** A robust **PostgreSQL** relational database, chosen for its stability and powerful querying capabilities.
*   **Containerization:** The entire backend, including the Python application and the PostgreSQL database, is fully containerized using **Docker** and orchestrated with **Docker Compose**. This guarantees a consistent, portable, and isolated environment for both development and production.
*   **Communication:** The frontend and backend communicate exclusively via a stateless RESTful API, exchanging data in **JSON** format.

---

#### **2. Backend Deep Dive: FastAPI & PostgreSQL Engine**

The backend is the data-processing and analytical core of the platform.

**2.1. Core Technologies:**

*   **FastAPI Framework:** Chosen for its high performance (built on Starlette and Pydantic), asynchronous capabilities, automatic data validation, and interactive OpenAPI documentation generation (`/docs`).
*   **SQLAlchemy ORM:** Used as the primary interface to the PostgreSQL database. This allows for writing complex, safe, and Pythonic database queries without writing raw SQL, thus preventing SQL injection vulnerabilities.
*   **Pydantic:** Used for rigorous data validation and serialization. It defines the "shape" of the API's request and response bodies, ensuring data integrity across the stack.

**2.2. API Endpoint Analysis:**

The API exposes a suite of powerful, RESTful endpoints under the `/api/v1/` prefix.

| Method | Endpoint                    | Description                                                                                                                                                                             | Key Features & Technical Details                                                                                                                            |
| :----- | :-------------------------- | :-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **GET**  | `/fires`                    | The main data-serving endpoint for fire points.                                                                                                                                           | **Pagination:** Accepts `page` and `limit` parameters to serve large datasets in manageable chunks. **Filtering:** Dynamically filters by `year`, `state`, and `cause` by building a chained SQLAlchemy query. **Rich Data:** Returns a comprehensive `FirePoint` object, including fire name and county.                                            |
| **GET**  | `/temporal/diurnal`         | Provides data for the 24-hour cycle chart.                                                                                                                                              | **On-the-fly Aggregation:** Performs a `GROUP BY` on the `DISCOVERY_HOUR` column and calculates `COUNT` and `AVG` for each hour. Fully filterable.                                           |
| **GET**  | `/temporal/weekly`          | Provides data for the weekly cadence chart.                                                                                                                                             | **Multi-column Aggregation:** Performs a `GROUP BY` on both `DISCOVERY_DAY_OF_WEEK` and `STAT_CAUSE_DESCR` to reveal human vs. natural fire patterns.                             |
| **GET**  | `/performance/agencies`     | Provides data for the agency analysis view.                                                                                                                                             | **Advanced Aggregation:** Calculates multiple metrics (`COUNT`, `AVG(size)`, `AVG(duration)`) and uses a `CASE` statement to conditionally count complex fires (`COUNT(CASE WHEN COMPLEX_NAME IS NOT NULL...`)).                                 |
| **GET**  | `/aggregate`                | A universal, flexible endpoint for populating UI dropdowns.                                                                                                                               | **Dynamic Column Selection:** Safely accepts a `group_by` parameter to aggregate on different columns like `STATE`, `FIRE_YEAR`, etc. This makes the frontend data-driven.            |
| **GET**  | `/aggregate/county`         | Provides the core data for the county heatmap.                                                                                                                                          | **Data Engineering on the Fly:** Performs a `GROUP BY` on both `STATE` and county `FIPS_CODE`, then uses a Python dictionary (`STATE_TO_FIPS`) to construct a fully-compliant 5-digit FIPS code string, solving a key data inconsistency issue. |
| **GET**  | `/statistics/summary`       | Provides at-a-glance summary statistics.                                                                                                                                                | Calculates `COUNT` and `SUM` across the entire filtered dataset to power the "Summary" card on the frontend.                                                         |
| **GET**  | `/statistics/correlation`   | Provides a random data sample for the SPLOM chart.                                                                                                                                      | **Statistical Sampling:** Uses `order_by(func.random()).limit(5000)` to efficiently select a statistically significant random sample directly from the database, demonstrating a key Big Data technique.                               |
| **POST** | `/predict/cause`            | Provides real-time inference from a machine learning model.                                                                                                                               | Accepts user input, formats it into a pandas DataFrame, and uses a pre-loaded `joblib` model to return cause predictions.                                    |

---

#### **3. Frontend Deep Dive: The Interactive React & Deck.gl Platform**

The frontend is a sophisticated client-side application designed for high-performance, interactive data visualization.

**3.1. Core Technologies:**

*   **React.js:** The foundational UI library, utilizing a component-based architecture and hooks for state management.
*   **Deck.gl:** The core high-performance visualization library. It leverages WebGL for rendering massive datasets (up to 1M+ points), allowing for smooth panning and zooming where traditional libraries would fail.
*   **react-map-gl:** Works in tandem with Deck.gl to provide the underlying map tiles (basemaps) from providers like Maptiler.
*   **Plotly.js:** A versatile charting library used for all non-geographic visualizations (SPLOM, polar chart, bubble chart, bar charts).
*   **Material-UI (MUI) & Tailwind CSS:** A hybrid styling approach. MUI is used for complex, pre-built components like dropdowns and buttons, while Tailwind is used for rapid, utility-first layout and styling.

**3.2. Architectural Highlights & Features:**

*   **Unified Map Controller (`NationalOverview.js`):** A single, robust component manages the state for all three primary map visualizations. This "single source of truth" architecture prevents WebGL context conflicts and ensures smooth transitions between views.
*   **Global State Management (`FilterContext`):** A simple yet powerful implementation of React's Context API manages the global filter state. This makes the filters available to any component in the application without complex "prop drilling," ensuring that all views react instantly and consistently to user selections.
*   **3-in-1 Geospatial View:** The main overview page is a powerful demonstration of multiple visualization techniques for the same data:
    1.  **Scatterplot Layer:** For visualizing individual fire points. Radius is scaled using `d3-scale.scaleSqrt` to ensure the circle's *area* is proportional to the fire's acreage, a key principle of honest data representation.
    2.  **GeoJson Layer (Chloropleth):** For the county heatmap. This demonstrates the powerful technique of joining analytical data (fire counts) with geographic shape data (GeoJSON) on the client side.
    3.  **Supercluster Integration:** A high-performance solution to the "too many dots" problem. The `use-supercluster` hook dynamically groups points into clusters on the client side, allowing for the visualization of hundreds of thousands of points without lag.
*   **Advanced Analytical Views:**
    *   **Agency Bubble Chart:** Moves beyond simple charts to show a four-dimensional story: `x` (fire count), `y` (avg. size), `color` (complexity), and `size` (complexity).
    *   **Weekly Cadence Stacked Bar Chart:** Designed specifically to uncover and tell the story of human vs. natural fire patterns.
    *   **SPLOM Chart:** A direct implementation of a high-dimensional analysis technique from the course syllabus.
*   **Defensive Frontend:** A custom `cleanDataForCharts` utility function is used to sanitize all data coming from the API *before* it is passed to a charting library. This makes the UI robust and prevents crashes from unexpected `null` or `undefined` data.
*   **Rich Interactivity:** The application goes beyond simple filtering, offering tooltips (with Markdown formatting), on-click information panels, and dynamic "Load More" functionality, creating a rich and intuitive user experience.

---


### **CS 661 Project Report: A Demonstration of Core Visual Analytics Concepts**

**Project Title:** The Wildfire Analytics Platform

This report details how our project successfully implements the key theoretical and practical concepts outlined in the CS 661 syllabus. Our platform is a web-based visual analytics system designed from the ground up to allow users to explore a complex, real-world dataset of 1.88 million wildfire incidents and derive non-obvious insights.

#### **1. Foundations of Data & Visual Analytics**

*   **Course Concept:** "Big data and its characteristics," "explore such large data sets in a scalable manner."
*   **Our Implementation:** The entire architecture was designed to handle a dataset too large to load into a browser at once. We implemented **backend-driven pagination** on the main `/fires` endpoint and **client-side statistical sampling** (`ANALYTICS_DATA_LIMIT`) for our analytical views. This demonstrates a core strategy for handling large datasets by intelligently loading only the necessary subsets of data for visualization, ensuring a scalable and performant user experience.

*   **Course Concept:** "Data and task abstraction," "telling a story about the dataset and the application domain."
*   **Our Implementation:** Our platform abstracts the raw data into seven distinct analytical views, each designed to answer a specific question. For example, the **Weekly Cadence chart** was designed specifically to abstract the raw `DISCOVERY_DAY_OF_WEEK` data and tell a story about the "human" vs. "natural" causes of fires by revealing the weekend spike in human-related incidents. The final "guided analytics" concept would take this storytelling to its peak.

*   **Course Concept:** "Visual perception," "Information analysis and visual variables."
*   **Our Implementation:** We made conscious design decisions based on visual principles.
    *   **The "No Lie Factor" Radius:** We used a `d3-scale.scaleSqrt` function to ensure the **area**, not the radius, of the fire points is proportional to the acres burned. This is a direct application of correctly mapping a quantitative variable to the most perceptually accurate visual variable.
    *   **Color as a Categorical Variable:** In the SPLOM chart, we used color to represent the `STAT_CAUSE_DESCR`, correctly using the "color hue" visual variable for categorical data.
    *   **Color as a Quantitative Variable:** In the County Heatmap, we use a sequential color scheme (from blue/yellow to dark red) to represent the `fire_count`, correctly using "color luminance/saturation" for quantitative data.

#### **2. Visualization Software and Libraries**

*   **Course Concept:** "Overview of available visualization software," "Bokeh/Plotly... JavaScript-based libraries such as D3."
*   **Our Implementation:** We demonstrated mastery of a modern, JavaScript-based visualization stack as an alternative to Python-centric libraries.
    *   **Plotly.js:** Used extensively for all non-geographic charts (`Temporal`, `Agency`, `SPLOM`), proving its versatility in creating a wide range of scientific and information visualizations, from polar charts to bubble charts and stacked bar charts.
    *   **Deck.gl:** Chosen specifically for its high-performance, WebGL-based rendering engine capable of handling hundreds of thousands of data points, a key requirement for big data geospatial visualization.
    *   **D3.js (via `d3-scale`):** We used the `d3-scale` module, a core part of the D3 ecosystem, to implement the data-accurate scaling for our fire point radii, showing an understanding of D3's role in data-to-visual mapping.

#### **3. Scientific and Information Visualization Techniques**

*   **Course Concept:** "Basic visualization techniques," "Techniques such as Clustering, Dimension reduction, PCP, MDS, SPLOM etc.," "High dimensional... data visualization."
*   **Our Implementation:** The project is a direct showcase of these techniques.
    *   **Information Visualization:** The **Agency Bubble Chart** is a classic multivariate information visualization, plotting three dimensions of data (`fire_count`, `avg_fire_size`, `complex_fire_count`) simultaneously.
    *   **High-Dimensional Visualization:** The **Multivariate Analysis (SPLOM)** view is a direct, literal implementation of a core technique mentioned in the syllabus for exploring correlations in high-dimensional data.
    *   **Clustering:** The **Clustered View** on the main map is a direct implementation of a visual clustering algorithm (`use-supercluster`). This is a key technique for reducing visual clutter and abstracting dense data.
    *   **Chloropleth Maps:** The **County Heatmap** is a standard and powerful information visualization technique that aggregates spatial data into predefined polygonal regions.

#### **4. Techniques for Big Data Visual Analytics**

*   **Course Concept:** "Data compression," "Statistical methods," "High performance algorithms for visualization."
*   **Our Implementation:**
    *   **Visual Data Compression:** The **Clustered View** is our primary example of visual compression. Instead of drawing 50,000 dots, we draw a few hundred interactive cluster symbols, compressing the visual information into a manageable form.
    *   **Statistical Methods:** We used **Random Sampling** on the backend (`/statistics/correlation`) to generate a representative subset for the SPLOM chart. Our frontend **`cleanDataForCharts` utility** is a practical application of data filtering, a core statistical method.
    *   **High-Performance Algorithms:** Our choice of **Deck.gl** and our implementation of **memoization (`useMemo`)** to prevent re-renders are direct answers to the challenge of high-performance visualization in a web environment.

