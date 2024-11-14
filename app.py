from flask import Flask, request, jsonify
import os
import json
from datetime import datetime
from flask import send_from_directory

app = Flask(__name__)

DATABASE_DIR = 'databases'

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
            start_date = datetime.strptime(start, "%Y-%m-%d")
            end_date = datetime.strptime(end, "%Y-%m-%d")
            if start_date > end_date:
                return False
        else:
            return False
        return True
    except:
        return False


def schemas_equal(schema1, schema2):
    return schema1 == schema2


def create_database_logic(db_name):
    db_path = os.path.join(DATABASE_DIR, f"{db_name}.json")
    if os.path.exists(db_path):
        return False, "Database already exists"
    with open(db_path, 'w') as f:
        json.dump({"tables": {}}, f, indent=4)
    return True, f"Database {db_name} created successfully"


def list_databases_logic():
    db_files = [f[:-5] for f in os.listdir(DATABASE_DIR) if f.endswith('.json')]
    return db_files


def add_table_logic(db_name, table_name, schema):
    if not table_name or not schema:
        return False, "table_name and schema are required"
    db = load_database(db_name)
    if table_name in db['tables']:
        return False, "Table already exists"
    db['tables'][table_name] = {"schema": schema, "rows": []}
    save_database(db_name, db)
    return True, f"Table {table_name} added successfully"


def delete_table_logic(db_name, table_name):
    db = load_database(db_name)
    if table_name not in db['tables']:
        return False, "Table does not exist"
    del db['tables'][table_name]
    save_database(db_name, db)
    return True, f"Table {table_name} deleted successfully"


def add_row_logic(db_name, table_name, row_data):
    db = load_database(db_name)
    if table_name not in db['tables']:
        return False, "Table does not exist"
    schema = db['tables'][table_name]['schema']
    for field in schema:
        if field not in row_data:
            return False, f"Field {field} is missing"
        if not validate_value(row_data[field], schema[field]):
            return False, f"Invalid value for field {field}"
    db['tables'][table_name]['rows'].append(row_data)
    save_database(db_name, db)
    return True, "Row added successfully"


def delete_row_logic(db_name, table_name, row_id):
    db = load_database(db_name)
    if table_name not in db['tables']:
        return False, "Table does not exist"
    rows = db['tables'][table_name]['rows']
    if row_id < 0 or row_id >= len(rows):
        return False, "Row ID out of range"
    rows.pop(row_id)
    save_database(db_name, db)
    return True, "Row deleted successfully"


def get_all_rows_logic(db_name, table_name):
    db = load_database(db_name)
    if table_name not in db['tables']:
        return None, "Table does not exist"
    rows = db['tables'][table_name]['rows']
    return rows, None


def get_table_schema_logic(db_name, table_name):
    db = load_database(db_name)
    if table_name not in db['tables']:
        return None, "Table does not exist"
    schema = db['tables'][table_name]['schema']
    return schema, None


def list_tables_logic(db_name):
    db = load_database(db_name)
    tables = list(db['tables'].keys())
    return tables


def intersect_tables_logic(db_name, table1_name, table2_name):
    db = load_database(db_name)
    if table1_name not in db['tables'] or table2_name not in db['tables']:
        return False, "One or both tables do not exist", None

    schema1 = db['tables'][table1_name]['schema']
    schema2 = db['tables'][table2_name]['schema']

    if not schemas_equal(schema1, schema2):
        return False, "Table schemas are not equal", None

    rows1 = db['tables'][table1_name]['rows']
    rows2 = db['tables'][table2_name]['rows']

    intersection_rows = [row for row in rows1 if row in rows2]

    return True, None, intersection_rows


@app.route('/databases', methods=['GET'])
def list_databases():
    db_list = list_databases_logic()
    return jsonify(db_list), 200


@app.route('/create_database/<db_name>', methods=['POST'])
def create_database(db_name):
    success, message = create_database_logic(db_name)
    if success:
        return jsonify({"message": message}), 201
    else:
        return jsonify({"error": message}), 400


@app.route('/<db_name>/tables', methods=['POST'])
def add_table(db_name):
    data = request.get_json()
    table_name = data.get('table_name')
    schema = data.get('schema')
    success, message = add_table_logic(db_name, table_name, schema)
    if success:
        return jsonify({"message": message}), 201
    else:
        return jsonify({"error": message}), 400


@app.route('/<db_name>/tables/<table_name>', methods=['DELETE'])
def delete_table(db_name, table_name):
    success, message = delete_table_logic(db_name, table_name)
    if success:
        return jsonify({"message": message}), 200
    else:
        return jsonify({"error": message}), 404


@app.route('/<db_name>/tables/<table_name>/rows', methods=['POST'])
def add_row(db_name, table_name):
    data = request.get_json()
    success, message = add_row_logic(db_name, table_name, data)
    if success:
        return jsonify({"message": message}), 201
    else:
        return jsonify({"error": message}), 400


@app.route('/<db_name>/tables/<table_name>/rows/<int:row_id>', methods=['DELETE'])
def delete_row(db_name, table_name, row_id):
    success, message = delete_row_logic(db_name, table_name, row_id)
    if success:
        return jsonify({"message": message}), 200
    else:
        return jsonify({"error": message}), 404


@app.route('/<db_name>/tables/<table_name>/rows', methods=['GET'])
def get_all_rows(db_name, table_name):
    rows, error = get_all_rows_logic(db_name, table_name)
    if error:
        return jsonify({"error": error}), 404
    else:
        return jsonify(rows), 200


@app.route('/<db_name>/tables_list', methods=['GET'])
def list_tables(db_name):
    tables = list_tables_logic(db_name)
    return jsonify(tables), 200


@app.route('/<db_name>/tables/<table_name>/schema', methods=['GET'])
def get_table_schema(db_name, table_name):
    schema, error = get_table_schema_logic(db_name, table_name)
    if error:
        return jsonify({"error": error}), 404
    else:
        return jsonify(schema), 200


@app.route('/<db_name>/tables/<table1_name>/intersect/<table2_name>', methods=['GET'])
def intersect_tables(db_name, table1_name, table2_name):
    success, error, result = intersect_tables_logic(db_name, table1_name, table2_name)
    if success:
        return jsonify(result), 200
    else:
        return jsonify({"error": error}), 400 if error == "Table schemas are not equal" else 404


@app.route('/')
def serve_frontend():
    return send_from_directory('static', 'index.html')


@app.route('/static/<path:path>')
def send_static(path):
    return send_from_directory('static', path)


if __name__ == '__main__':
    app.run(debug=True)
