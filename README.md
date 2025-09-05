# Data Genie: Synthetic Data Generator
This project generates synthetic data for testing, prototyping, and analytics. It provides a web interface (frontend in React, backend in Flask) and supports custom data schemas, LLM-powered data generation (Ollama, OpenAI, Azure OpenAI), and export to CSV/JSON.

## Features
- Web frontend built with React (see `frontend/`)
- Flask backend for API and LLM integration
- Customizable data schemas
- LLM-powered synthetic data generation (Ollama, OpenAI, Azure OpenAI)
- Example report output (`report.html`)

## Quick Start
1. Clone this repo and enter the folder:
    ```bash
    git clone https://github.com/simagix/data-genie.git
    cd data-genie
    ```
2. Create and activate a virtual environment:
    ```bash
    python3 -m venv venv
    source venv/bin/activate
    ```
3. Install dependencies:
    ```bash
    pip install -r requirements.txt
    ```
4. (Optional) Install Ollama and pull a model for LLM-powered generation (see below).
5. Run the backend:
    ```bash
    python app.py
    ```
6. Run the frontend:
    ```bash
    cd frontend
    npm install
    npm start
    ```

    If you see dependency errors (ERESOLVE), run:
    ```bash
    npm install --legacy-peer-deps
    ```
    This will skip strict peer dependency checks and resolve most install issues with older or conflicting packages.

## LLM Backends
- **Ollama** (local):
    - Install via Homebrew (macOS):
        ```bash
        brew install ollama
        ollama pull mistral:7b-instruct
        ```
    - Set environment variables (optional):
        ```bash
        LLM_BACKEND=ollama
        OLLAMA_URL=http://localhost:11434/api/generate
        OLLAMA_MODEL=mistral:7b-instruct
        ```
- **OpenAI** (cloud):
    - Set environment variable:
        ```bash
        OPENAI_API_KEY=sk-...
        OPENAI_MODEL=gpt-4o
        ```
- **Azure OpenAI** (cloud):
    - Set environment variables:
        ```bash
        LLM_BACKEND=azure
        AZURE_OPENAI_ENDPOINT=https://<resource>.openai.azure.com/
        AZURE_OPENAI_API_KEY=...
        AZURE_OPENAI_DEPLOYMENT=gpt-4
        AZURE_OPENAI_API_VERSION=2024-12-01-preview
        ```

## Run the App
Start Flask backend:
```bash
python app.py
```
Start React frontend:
```bash
cd frontend
npm start
```
By default, frontend runs at http://localhost:3000 and backend at http://localhost:5000

## Usage
1. Open the frontend in your browser.
2. Define a data schema or use a preset.
3. Generate synthetic data (optionally using LLM).

## Notes
- LLM features require Ollama, OpenAI, or Azure OpenAI and a supported model.
