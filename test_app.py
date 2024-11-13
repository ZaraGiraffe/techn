import os
import pytest
import json
from unittest.mock import patch, mock_open
from app import (
    validate_value,
    schemas_equal,
    load_database,
    save_database,
    create_database_logic,
    list_databases_logic,
    add_table_logic,
    delete_table_logic,
    add_row_logic,
    delete_row_logic,
    get_all_rows_logic,
    get_table_schema_logic,
    list_tables_logic,
    intersect_tables_logic,
    DATABASE_DIR
)


@pytest.fixture
def mock_database_dir(tmp_path, monkeypatch):
    # Use a temporary directory for databases
    temp_database_dir = tmp_path / 'databases'
    os.makedirs(temp_database_dir, exist_ok=True)
    # Monkeypatch the DATABASE_DIR in the app module
    monkeypatch.setattr('app.DATABASE_DIR', str(temp_database_dir))
    return temp_database_dir

def test_validate_value_integer():
    assert validate_value('123', 'integer')
    assert not validate_value('abc', 'integer')
    assert validate_value('-123', 'integer')  # Modify if negatives are invalid
    assert not validate_value('12.3', 'integer')


def test_validate_value_real():
    assert validate_value('123.45', 'real')
    assert validate_value('123', 'real')
    assert not validate_value('abc', 'real')


def test_validate_value_char():
    assert validate_value('a', 'char')
    assert not validate_value('', 'char')
    assert not validate_value('ab', 'char')


def test_validate_value_string():
    assert validate_value('hello', 'string')
    assert validate_value('', 'string')


def test_validate_value_date():
    assert validate_value('2023-10-12', 'date')
    assert not validate_value('2023-13-12', 'date')
    assert not validate_value('2023-02-30', 'date')  # Invalid date
    assert not validate_value('12-10-2023', 'date')


def test_validate_value_date_interval():
    assert validate_value('2023-10-01/2023-10-31', 'date_interval')
    assert not validate_value('2023-10-01', 'date_interval')
    assert not validate_value('2023-10-01/invalid', 'date_interval')


def test_validate_value_invalid_type():
    assert not validate_value('123', 'unsupported_type')


def test_schemas_equal_same():
    schema1 = {'id': 'integer', 'name': 'string'}
    schema2 = {'id': 'integer', 'name': 'string'}
    assert schemas_equal(schema1, schema2)


def test_schemas_equal_different_keys():
    schema1 = {'id': 'integer', 'name': 'string'}
    schema2 = {'id': 'integer', 'email': 'string'}
    assert not schemas_equal(schema1, schema2)


def test_schemas_equal_different_types():
    schema1 = {'id': 'integer', 'name': 'string'}
    schema2 = {'id': 'real', 'name': 'string'}
    assert not schemas_equal(schema1, schema2)


def test_load_and_save_database(mock_database_dir):
    db_name = 'testdb'
    data = {'tables': {'users': {'schema': {'id': 'integer'}, 'rows': []}}}
    save_database(db_name, data)
    loaded_data = load_database(db_name)
    assert loaded_data == data


def test_create_database_logic(mock_database_dir):
    db_name = 'testdb'
    success, message = create_database_logic(db_name)
    assert success
    assert message == f'Database {db_name} created successfully'
    # Try creating the same database again
    success, message = create_database_logic(db_name)
    assert not success
    assert message == 'Database already exists'

def test_list_databases_logic(mock_database_dir):
    db_name1 = 'testdb1'
    db_name2 = 'testdb2'
    create_database_logic(db_name1)
    create_database_logic(db_name2)
    db_list = list_databases_logic()
    assert set(db_list) == {db_name1, db_name2}

def test_add_table_logic(mock_database_dir):
    db_name = 'testdb'
    create_database_logic(db_name)
    table_name = 'users'
    schema = {'id': 'integer', 'name': 'string'}
    success, message = add_table_logic(db_name, table_name, schema)
    assert success
    assert message == f'Table {table_name} added successfully'
    # Try adding the same table again
    success, message = add_table_logic(db_name, table_name, schema)
    assert not success
    assert message == 'Table already exists'

def test_delete_table_logic(mock_database_dir):
    db_name = 'testdb'
    create_database_logic(db_name)
    table_name = 'users'
    schema = {'id': 'integer'}
    add_table_logic(db_name, table_name, schema)
    success, message = delete_table_logic(db_name, table_name)
    assert success
    assert message == f'Table {table_name} deleted successfully'
    # Try deleting again
    success, message = delete_table_logic(db_name, table_name)
    assert not success
    assert message == 'Table does not exist'

def test_add_row_logic(mock_database_dir):
    db_name = 'testdb'
    create_database_logic(db_name)
    table_name = 'users'
    schema = {'id': 'integer', 'name': 'string'}
    add_table_logic(db_name, table_name, schema)
    row_data = {'id': '1', 'name': 'Alice'}
    success, message = add_row_logic(db_name, table_name, row_data)
    assert success
    assert message == 'Row added successfully'
    # Add invalid row
    invalid_row_data = {'id': 'abc', 'name': 'Bob'}
    success, message = add_row_logic(db_name, table_name, invalid_row_data)
    assert not success
    assert message == 'Invalid value for field id'

def test_delete_row_logic(mock_database_dir):
    db_name = 'testdb'
    create_database_logic(db_name)
    table_name = 'users'
    schema = {'id': 'integer'}
    add_table_logic(db_name, table_name, schema)
    add_row_logic(db_name, table_name, {'id': '1'})
    # Delete the row
    success, message = delete_row_logic(db_name, table_name, 0)
    assert success
    assert message == 'Row deleted successfully'
    # Try deleting again
    success, message = delete_row_logic(db_name, table_name, 0)
    assert not success
    assert message == 'Row ID out of range'

def test_get_all_rows_logic(mock_database_dir):
    db_name = 'testdb'
    create_database_logic(db_name)
    table_name = 'users'
    schema = {'id': 'integer', 'name': 'string'}
    add_table_logic(db_name, table_name, schema)
    add_row_logic(db_name, table_name, {'id': '1', 'name': 'Alice'})
    add_row_logic(db_name, table_name, {'id': '2', 'name': 'Bob'})
    rows, error = get_all_rows_logic(db_name, table_name)
    assert error is None
    assert rows == [{'id': '1', 'name': 'Alice'}, {'id': '2', 'name': 'Bob'}]

def test_get_table_schema_logic(mock_database_dir):
    db_name = 'testdb'
    create_database_logic(db_name)
    table_name = 'users'
    schema = {'id': 'integer'}
    add_table_logic(db_name, table_name, schema)
    fetched_schema, error = get_table_schema_logic(db_name, table_name)
    assert error is None
    assert fetched_schema == schema
    # Try fetching schema for non-existent table
    fetched_schema, error = get_table_schema_logic(db_name, 'nonexistent')
    assert error == 'Table does not exist'
    assert fetched_schema is None

def test_list_tables_logic(mock_database_dir):
    db_name = 'testdb'
    create_database_logic(db_name)
    add_table_logic(db_name, 'users', {'id': 'integer'})
    add_table_logic(db_name, 'orders', {'order_id': 'integer'})
    tables = list_tables_logic(db_name)
    assert set(tables) == {'users', 'orders'}

def test_intersect_tables_logic(mock_database_dir):
    db_name = 'testdb'
    create_database_logic(db_name)
    schema = {'id': 'integer', 'name': 'string'}
    add_table_logic(db_name, 'table1', schema)
    add_table_logic(db_name, 'table2', schema)
    add_row_logic(db_name, 'table1', {'id': '1', 'name': 'Alice'})
    add_row_logic(db_name, 'table1', {'id': '2', 'name': 'Bob'})
    add_row_logic(db_name, 'table2', {'id': '2', 'name': 'Bob'})
    add_row_logic(db_name, 'table2', {'id': '3', 'name': 'Charlie'})
    success, error, result = intersect_tables_logic(db_name, 'table1', 'table2')
    assert success
    assert error is None
    assert result == [{'id': '2', 'name': 'Bob'}]
    # Test with non-existent table
    success, error, result = intersect_tables_logic(db_name, 'table1', 'nonexistent')
    assert not success
    assert error == 'One or both tables do not exist'
    assert result is None
    # Test with mismatched schemas
    add_table_logic(db_name, 'table3', {'id': 'integer', 'email': 'string'})
    success, error, result = intersect_tables_logic(db_name, 'table1', 'table3')
    assert not success
    assert error == 'Table schemas are not equal'
    assert result is None