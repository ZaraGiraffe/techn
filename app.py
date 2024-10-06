from flask import Flask, request, jsonify
import os
import json
from datetime import datetime, timedelta
from flask import send_from_directory

app = Flask(__name__)

DATABASE_DIR = 'databases'

# Ensure the databases directory exists
if not os.path.exists(DATABASE_DIR):
    os.makedirs(DATABASE_DIR)


def load_database(db_name):
    db_path = os.path.join(DATABASE_DIR, f"{db_name}.json")
    if os.path.exists(db_path):
        with open(db_path, 'r') as f:
            return json.load(f)
    else:
        return {"tables": {}}


def save_database(db_name, data):
    db_path = os.path.join(DATABASE_DIR, f"{db_name}.json")
    with open(db_path, 'w') as f:
        json.dump(data, f, indent=4)


def validate_value(value, value_type):
    try:
        if value_type == "integer":
            int(value)
        elif value_type == "real":
            float(value)
        elif value_type == "char":
            if len(value) != 1:
                return False
        elif value_type == "string":
            str(value)
        elif value_type == "date":
            datetime.strptime(value, "%Y-%m-%d")
        elif value_type == "date_interval":
            start, end = value.split('/')
            datetime.strptime(start, "%Y-%m-%d")
            datetime.strptime(end, "%Y-%m-%d")
        else:
            return False
        return True
    except:
        return False


def schemas_equal(schema1, schema2):
    return schema1 == schema2


@app.route('/<db_name>/tables', methods=['POST'])
def add_table(db_name):
    data = request.get_json()
    table_name = data.get('table_name')
    schema = data.get('schema')
    if not table_name or not schema:
        return jsonify({"error": "table_name and schema are required"}), 400
    db = load_database(db_name)
    if table_name in db['tables']:
        return jsonify({"error": "Table already exists"}), 400
    db['tables'][table_name] = {"schema": schema, "rows": []}
    save_database(db_name, db)
    return jsonify({"message": f"Table {table_name} added successfully"}), 201


@app.route('/<db_name>/tables/<table_name>', methods=['DELETE'])
def delete_table(db_name, table_name):
    db = load_database(db_name)
    if table_name not in db['tables']:
        return jsonify({"error": "Table does not exist"}), 404
    del db['tables'][table_name]
    save_database(db_name, db)
    return jsonify({"message": f"Table {table_name} deleted successfully"}), 200


@app.route('/<db_name>/tables/<table_name>/rows', methods=['POST'])
def add_row(db_name, table_name):
    data = request.get_json()
    db = load_database(db_name)
    if table_name not in db['tables']:
        return jsonify({"error": "Table does not exist"}), 404
    schema = db['tables'][table_name]['schema']
    row = {}
    for field in schema:
        if field not in data:
            return jsonify({"error": f"Field {field} is missing"}), 400
        if not validate_value(data[field], schema[field]):
            return jsonify({"error": f"Invalid value for field {field}"}), 400
        row[field] = data[field]
    db['tables'][table_name]['rows'].append(row)
    save_database(db_name, db)
    return jsonify({"message": "Row added successfully"}), 201


@app.route('/<db_name>/tables/<table_name>/rows/<int:row_id>', methods=['DELETE'])
def delete_row(db_name, table_name, row_id):
    db = load_database(db_name)
    if table_name not in db['tables']:
        return jsonify({"error": "Table does not exist"}), 404
    rows = db['tables'][table_name]['rows']
    if row_id < 0 or row_id >= len(rows):
        return jsonify({"error": "Row ID out of range"}), 404
    rows.pop(row_id)
    save_database(db_name, db)
    return jsonify({"message": "Row deleted successfully"}), 200


@app.route('/<db_name>/tables/<table_name>/rows', methods=['GET'])
def get_all_rows(db_name, table_name):
    db = load_database(db_name)
    if table_name not in db['tables']:
        return jsonify({"error": "Table does not exist"}), 404
    rows = db['tables'][table_name]['rows']
    return jsonify(rows), 200


@app.route('/<db_name>/tables/<table1_name>/intersect/<table2_name>', methods=['GET'])
def intersect_tables(db_name, table1_name, table2_name):
    db = load_database(db_name)
    print(db)
    if table1_name not in db['tables'] or table2_name not in db['tables']:
        return jsonify({"error": "One or both tables do not exist"}), 404

    schema1 = db['tables'][table1_name]['schema']
    schema2 = db['tables'][table2_name]['schema']

    if not schemas_equal(schema1, schema2):
        return jsonify({"error": "Table schemas are not equal"}), 400

    rows1 = db['tables'][table1_name]['rows']
    rows2 = db['tables'][table2_name]['rows']

    intersection_rows = [row for row in rows1 if row in rows2]

    return jsonify(intersection_rows), 200


@app.route('/')
def serve_frontend():
    return send_from_directory('static', 'index.html')


@app.route('/static/<path:path>')
def send_static(path):
    return send_from_directory('static', path)


# Endpoint to list all databases
@app.route('/databases', methods=['GET'])
def list_databases():
    db_files = [f[:-5] for f in os.listdir(DATABASE_DIR) if f.endswith('.json')]
    return jsonify(db_files), 200


# Endpoint to create a new database
@app.route('/create_database/<db_name>', methods=['POST'])
def create_database(db_name):
    db_path = os.path.join(DATABASE_DIR, f"{db_name}.json")
    if os.path.exists(db_path):
        return jsonify({"error": "Database already exists"}), 400
    with open(db_path, 'w') as f:
        json.dump({"tables": {}}, f, indent=4)
    return jsonify({"message": f"Database {db_name} created successfully"}), 201


# Endpoint to list all tables in a database
@app.route('/<db_name>/tables_list', methods=['GET'])
def list_tables(db_name):
    db = load_database(db_name)
    tables = list(db['tables'].keys())
    return jsonify(tables), 200


# Endpoint to get the schema of a table
@app.route('/<db_name>/tables/<table_name>/schema', methods=['GET'])
def get_table_schema(db_name, table_name):
    db = load_database(db_name)
    if table_name not in db['tables']:
        return jsonify({"error": "Table does not exist"}), 404
    schema = db['tables'][table_name]['schema']
    return jsonify(schema), 200


if __name__ == '__main__':
    app.run(debug=True)
