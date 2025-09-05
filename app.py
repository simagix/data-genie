"""
app.py
@ken.chen
"""
import dotenv
import os
import json

from flask import Flask, logging, request, jsonify, send_file
from flask_cors import CORS
from llm_utils import llm_generate
from pymongo import MongoClient

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}}, supports_credentials=True)

# Load all projects from MongoDB 'datagenie.projects'
@app.route('/api/load_configs', methods=['GET'])
def load_configs():
    mongo_uri = os.getenv('MONGO_URI', 'mongodb://localhost/datagenie')
    client = MongoClient(mongo_uri)
    db = client['datagenie']
    coll = db['projects']
    configs = list(coll.find({}, {'_id': 0, 'name': 1, 'config': 1}))
    return jsonify({'configs': configs})

@app.route('/api/validate_script', methods=['POST'])
def validate_script():
    script = request.json.get('script', '')
    try:
        compile(script, '<string>', 'exec')
        return jsonify({'valid': True})
    except Exception as e:
        return jsonify({'valid': False, 'error': str(e)})


# Fetch up to 10 sample documents from a collection using a pipeline
@app.route('/api/sample_docs', methods=['POST'])
def sample_docs():
    data = request.json
    mongo_uri = data.get('mongo_uri', 'mongodb://localhost/datagenie')
    collection = data.get('collection', 'projects')
    pipeline = data.get('pipeline', [])
    limit = data.get('limit', 10)
    try:
        client = MongoClient(mongo_uri)
        db = client.get_default_database()
        coll = db[collection]
        # Ensure pipeline is a list
        if not isinstance(pipeline, list):
            pipeline = []
        # Add limit stage if not present
        has_limit = any('$limit' in stage for stage in pipeline if isinstance(stage, dict))
        if not has_limit:
            pipeline = pipeline + [{'$limit': limit}]
        docs = list(coll.aggregate(pipeline))
        for doc in docs:
            doc.pop('_id', None)
        return jsonify({'docs': docs})
    except Exception as e:
        return jsonify({'error': str(e), 'docs': []}), 500

# Placeholder for export
@app.route('/api/export', methods=['POST'])
def export():
    # Generate HTML report from graded results
    graded = request.json.get('graded', [])
    html = '<html><body><h1>Graded Report</h1><ul>'
    for item in graded:
        html += f"<li>{json.dumps(item)}</li>"
    html += '</ul></body></html>'
    # Save to file
    filename = 'report.html'
    with open(filename, 'w') as f:
        f.write(html)
    return send_file(filename, mimetype='text/html', as_attachment=True)

# Save config to MongoDB 'datagenie.projects'
@app.route('/api/save_config', methods=['POST'])
def save_config():
    try:
        data = request.json
        if not data or 'name' not in data or 'config' not in data:
            return jsonify({'error': 'Missing name or config'}), 400
        mongo_uri = os.getenv('MONGO_URI', 'mongodb://localhost/datagenie')
        client = MongoClient(mongo_uri)
        db = client['datagenie']
        coll = db['projects']
        coll.update_one({'name': data['name']}, {'$set': {'config': data['config']}}, upsert=True)
        return jsonify({'status': 'saved', 'name': data['name']})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/ping', methods=['GET'])
def ping():
    return jsonify({'message': 'pong'})

@app.route('/api/process_llm', methods=['POST'])
def process_llm():
    data = request.json
    prompt = data.get('prompt', '')
    doc = data.get('doc', '')
    llm_backend = os.getenv('LLM_BACKEND', 'ollama')
    # Optionally build a more complex prompt here
    full_prompt = f"Prompt: {prompt}\nDocument: {doc}"
    try:
        llm_result = llm_generate(full_prompt, llm_backend)
        return jsonify({'llm_result': llm_result})
    except Exception as e:
        return jsonify({'error': str(e), 'llm_result': ''}), 500

# --- Pipeline Assistant LLM endpoint ---
@app.route('/api/process_pipeline_llm', methods=['POST'])
def process_pipeline_llm():
    data = request.json
    description = data.get('description', '')
    llm_backend = os.getenv('LLM_BACKEND', 'ollama')

    # Prompt for LLM: ask for a valid MongoDB aggregation pipeline in JSON
    prompt = (
        "Translate the following description into a valid MongoDB aggregation pipeline in JSON. "
        "Only output the JSON array. All key fields must be in double quotes. "
        "Do not include any Markdown formatting, code blocks, or triple backticks. "
        f"Description: {description}"
    )

    try:
        llm_response = llm_generate(prompt, llm_backend).strip()
        import re, json
        # 1) Remove Markdown code fences if present (handles ``` and ```json)
        llm_response_clean = re.sub(r"^\s*```(?:json)?\s*|\s*```\s*$", "", llm_response, flags=re.I | re.M).strip()

        # 2) Try parsing the entire cleaned response first
        try:
            parsed = json.loads(llm_response_clean)
            if isinstance(parsed, list):
                return jsonify({'pipeline': parsed})
            # If it's a dict or something else, fall through to slicing logic
        except Exception:
            pass

        # 3) Robust slice: take from first '[' to last ']' to capture the full array (handles nested [] inside)
        start = llm_response_clean.find('[')
        end = llm_response_clean.rfind(']')
        if start != -1 and end != -1 and end > start:
            array_str = llm_response_clean[start:end + 1]
            try:
                pipeline = json.loads(array_str)
                if isinstance(pipeline, list):
                    return jsonify({'pipeline': pipeline})
                else:
                    return jsonify({
                        'error': 'Parsed JSON is not an array',
                        'llm_error': llm_response,
                        'raw_pipeline': array_str
                    }), 400
            except Exception as json_err:
                return jsonify({
                    'error': f'JSON decode error: {json_err}',
                    'llm_error': llm_response,
                    'pipeline': None,
                    'raw_pipeline': array_str
                }), 400

        # 4) If no brackets found or nothing worked
        return jsonify({
            'error': 'No pipeline array found in LLM response',
            'llm_error': llm_response,
            'pipeline': None
        }), 400

    except Exception as e:
        return jsonify({'error': str(e), 'pipeline': None}), 500

if __name__ == '__main__':
    import dotenv
    dotenv.load_dotenv()
    app.run(debug=True, host='127.0.0.1')
