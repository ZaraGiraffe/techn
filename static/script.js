document.addEventListener('DOMContentLoaded', function() {
    const databaseSelect = document.getElementById('databaseSelect');
    const loadDatabaseButton = document.getElementById('loadDatabase');
    const createDatabaseButton = document.getElementById('createDatabase');
    const newDatabaseNameInput = document.getElementById('newDatabaseName');
    const tableSection = document.getElementById('tableSection');
    const tableNameInput = document.getElementById('tableName');
    const addTableButton = document.getElementById('addTable');
    const tableList = document.getElementById('tableList');
    const rowSection = document.getElementById('rowSection');
    const currentTableNameSpan = document.getElementById('currentTableName');
    const rowFormContainer = document.getElementById('rowFormContainer');
    const addRowButton = document.getElementById('addRow');
    const dataTable = document.getElementById('dataTable');

    const addTableForm = document.getElementById('addTableForm');
    const schemaBuilder = document.getElementById('schemaBuilder');
    const addFieldButton = document.getElementById('addFieldButton');

    const tableOperationsSection = document.getElementById('tableOperationsSection');
    const intersectTable1Select = document.getElementById('intersectTable1');
    const intersectTable2Select = document.getElementById('intersectTable2');
    const intersectButton = document.getElementById('intersectButton');
    const intersectResultDiv = document.getElementById('intersectResult');

    let currentDatabase = '';
    let currentTable = '';
    let currentSchema = {};

    const dataTypes = ['integer', 'real', 'char', 'string', 'date', 'date_interval'];

    const placeholderExamples = {
        'integer': 'e.g., 123',
        'real': 'e.g., 123.45',
        'char': 'e.g., a',
        'string': 'e.g., Hello World',
        'date': 'YYYY-MM-DD',
        'date_interval': 'YYYY-MM-DD/YYYY-MM-DD'
    };

    let fieldCount = 0;

    async function loadDatabases() {
        const response = await fetch('/databases');
        const databases = await response.json();
        databaseSelect.innerHTML = '';
        databases.forEach(db => {
            const option = document.createElement('option');
            option.value = db;
            option.textContent = db;
            databaseSelect.appendChild(option);
        });
    }

    loadDatabaseButton.addEventListener('click', () => {
        currentDatabase = databaseSelect.value;
        if (currentDatabase) {
            tableSection.style.display = 'block';
            tableOperationsSection.style.display = 'block';
            loadTables();
        }
    });

    createDatabaseButton.addEventListener('click', async () => {
        const dbName = newDatabaseNameInput.value.trim();
        if (dbName) {
            const response = await fetch(`/create_database/${dbName}`, { method: 'POST' });
            const result = await response.json();
            if (response.ok) {
                showAlert(result.message, 'success');
                await loadDatabases();
                newDatabaseNameInput.value = '';
            } else {
                showAlert(result.error, 'danger');
            }
        } else {
            showAlert('Please enter a database name.', 'warning');
        }
    });

    async function loadTables() {
        const response = await fetch(`/${currentDatabase}/tables_list`);
        const tables = await response.json();
        tableList.innerHTML = '';
        intersectTable1Select.innerHTML = '';
        intersectTable2Select.innerHTML = '';
        tables.forEach(table => {
            const li = document.createElement('li');
            li.textContent = table;
            li.className = 'list-group-item d-flex justify-content-between align-items-center';
            li.addEventListener('click', () => {
                currentTable = table;
                currentTableNameSpan.textContent = currentTable;
                rowSection.style.display = 'block';
                loadSchema();
                loadTableData();
            });

            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'btn btn-sm btn-danger';
            deleteBtn.innerHTML = '<i class="bi bi-trash-fill"></i>';
            deleteBtn.addEventListener('click', async (e) => {
                e.stopPropagation();
                if (confirm(`Are you sure you want to delete the table "${table}"?`)) {
                    const response = await fetch(`/${currentDatabase}/tables/${table}`, { method: 'DELETE' });
                    const result = await response.json();
                    if (response.ok) {
                        showAlert(result.message, 'success');
                        loadTables();
                        rowSection.style.display = 'none';
                    } else {
                        showAlert(result.error, 'danger');
                    }
                }
            });

            li.appendChild(deleteBtn);
            tableList.appendChild(li);

            const option1 = document.createElement('option');
            option1.value = table;
            option1.textContent = table;
            intersectTable1Select.appendChild(option1);

            const option2 = document.createElement('option');
            option2.value = table;
            option2.textContent = table;
            intersectTable2Select.appendChild(option2);
        });
    }

    addFieldButton.addEventListener('click', () => {
        addSchemaField();
    });

    function addSchemaField(fieldName = '', fieldType = '') {
        fieldCount++;

        const fieldRow = document.createElement('div');
        fieldRow.className = 'form-row align-items-center';
        fieldRow.id = `fieldRow-${fieldCount}`;

        const colFieldName = document.createElement('div');
        colFieldName.className = 'col-md-5';

        const fieldNameInput = document.createElement('input');
        fieldNameInput.type = 'text';
        fieldNameInput.className = 'form-control mb-2';
        fieldNameInput.placeholder = 'Field Name';
        fieldNameInput.name = 'fieldName';
        fieldNameInput.value = fieldName;
        fieldNameInput.required = true;

        colFieldName.appendChild(fieldNameInput);

        const colFieldType = document.createElement('div');
        colFieldType.className = 'col-md-5';

        const fieldTypeSelect = document.createElement('select');
        fieldTypeSelect.className = 'form-control mb-2';
        fieldTypeSelect.name = 'fieldType';
        fieldTypeSelect.required = true;

        dataTypes.forEach(type => {
            const option = document.createElement('option');
            option.value = type;
            option.textContent = type;
            if (type === fieldType) {
                option.selected = true;
            }
            fieldTypeSelect.appendChild(option);
        });

        colFieldType.appendChild(fieldTypeSelect);

        const colRemoveButton = document.createElement('div');
        colRemoveButton.className = 'col-md-2 text-right';

        const removeButton = document.createElement('button');
        removeButton.type = 'button';
        removeButton.className = 'btn btn-danger mb-2';
        removeButton.innerHTML = '<i class="bi bi-trash-fill"></i>';
        removeButton.addEventListener('click', () => {
            schemaBuilder.removeChild(fieldRow);
        });

        colRemoveButton.appendChild(removeButton);

        fieldRow.appendChild(colFieldName);
        fieldRow.appendChild(colFieldType);
        fieldRow.appendChild(colRemoveButton);

        schemaBuilder.appendChild(fieldRow);
    }

    addTableButton.addEventListener('click', async () => {
        const tableName = tableNameInput.value.trim();

        if (tableName) {
            const schemaInputs = schemaBuilder.querySelectorAll('.form-row');
            const schema = {};

            let isValid = true;
            const fieldNamesSet = new Set();

            schemaInputs.forEach(row => {
                const fieldName = row.querySelector('input[name="fieldName"]').value.trim();
                const fieldType = row.querySelector('select[name="fieldType"]').value;

                if (!fieldName || !fieldType) {
                    isValid = false;
                    showAlert('All fields must have a name and type.', 'warning');
                    return;
                }

                if (fieldNamesSet.has(fieldName)) {
                    isValid = false;
                    showAlert(`Field name "${fieldName}" is duplicated.`, 'warning');
                    return;
                }

                fieldNamesSet.add(fieldName);
                schema[fieldName] = fieldType;
            });

            if (isValid) {
                const response = await fetch(`/${currentDatabase}/tables`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ table_name: tableName, schema })
                });
                const result = await response.json();
                if (response.ok) {
                    showAlert(result.message, 'success');
                    tableNameInput.value = '';
                    schemaBuilder.innerHTML = '';
                    loadTables();
                } else {
                    showAlert(result.error, 'danger');
                }
            }
        } else {
            showAlert('Please enter a table name.', 'warning');
        }
    });

    async function loadSchema() {
        const response = await fetch(`/${currentDatabase}/tables/${currentTable}/schema`);
        currentSchema = await response.json();
        generateRowForm();
    }

    function generateRowForm() {
        rowFormContainer.innerHTML = '';
        for (let field in currentSchema) {
            const colDiv = document.createElement('div');
            colDiv.className = 'col-md-6';
    
            const formGroup = document.createElement('div');
            formGroup.className = 'form-group';
    
            const label = document.createElement('label');
            label.textContent = `${field} (${currentSchema[field]}):`;
            label.setAttribute('for', `input-${field}`);
    
            const input = document.createElement('input');
            input.name = field;
            input.id = `input-${field}`;
            input.dataset.type = currentSchema[field];
            input.required = true;
            input.className = 'form-control';
    
            const dataType = currentSchema[field];
            const placeholderText = placeholderExamples[dataType] || '';
            input.placeholder = placeholderText;
    
            formGroup.appendChild(label);
            formGroup.appendChild(input);
            colDiv.appendChild(formGroup);
            rowFormContainer.appendChild(colDiv);
        }
    }
    

    addRowButton.addEventListener('click', async () => {
        const inputs = rowFormContainer.querySelectorAll('input');
        const rowData = {};
        let isValid = true;
        inputs.forEach(input => {
            const value = input.value.trim();
            const type = input.dataset.type;
            if (!validateField(value, type)) {
                isValid = false;
                showAlert(`Invalid value for field ${input.name} (expected ${type}).`, 'danger');
            } else {
                rowData[input.name] = value;
            }
        });
        if (isValid) {
            const response = await fetch(`/${currentDatabase}/tables/${currentTable}/rows`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(rowData)
            });
            const result = await response.json();
            if (response.ok) {
                showAlert(result.message, 'success');
                loadTableData();
                inputs.forEach(input => input.value = '');
            } else {
                showAlert(result.error, 'danger');
            }
        }
    });

    async function loadTableData() {
        const response = await fetch(`/${currentDatabase}/tables/${currentTable}/rows`);
        const data = await response.json();
        dataTable.innerHTML = '';
        if (data.length > 0) {
            const thead = document.createElement('thead');
            const headerRow = document.createElement('tr');
            for (let field in data[0]) {
                const th = document.createElement('th');
                th.textContent = field;
                headerRow.appendChild(th);
            }
            const actionTh = document.createElement('th');
            actionTh.textContent = 'Actions';
            headerRow.appendChild(actionTh);
            thead.appendChild(headerRow);
            dataTable.appendChild(thead);

            const tbody = document.createElement('tbody');
            data.forEach((row, index) => {
                const tr = document.createElement('tr');
                for (let field in row) {
                    const td = document.createElement('td');
                    td.textContent = row[field];
                    tr.appendChild(td);
                }
                const actionTd = document.createElement('td');
                const deleteButton = document.createElement('button');
                deleteButton.className = 'btn btn-sm btn-danger';
                deleteButton.innerHTML = '<i class="bi bi-trash-fill"></i>';
                deleteButton.addEventListener('click', async () => {
                    if (confirm('Are you sure you want to delete this row?')) {
                        const response = await fetch(`/${currentDatabase}/tables/${currentTable}/rows/${index}`, { method: 'DELETE' });
                        const result = await response.json();
                        if (response.ok) {
                            showAlert(result.message, 'success');
                            loadTableData();
                        } else {
                            showAlert(result.error, 'danger');
                        }
                    }
                });
                actionTd.appendChild(deleteButton);
                tr.appendChild(actionTd);

                tbody.appendChild(tr);
            });
            dataTable.appendChild(tbody);
        } else {
            dataTable.innerHTML = '<tr><td colspan="100%">No data available.</td></tr>';
        }
    }

    function validateField(value, type) {
        switch (type) {
            case 'integer':
                return /^\d+$/.test(value);
            case 'real':
                return /^\d+(\.\d+)?$/.test(value);
            case 'char':
                return value.length === 1;
            case 'string':
                return true;
            case 'date':
                return /^\d{4}-\d{2}-\d{2}$/.test(value);
            case 'date_interval':
                return /^\d{4}-\d{2}-\d{2}\/\d{4}-\d{2}-\d{2}$/.test(value);
            default:
                return false;
        }
    }

    function showAlert(message, type = 'success') {
        const alertContainer = document.getElementById('alertContainer');
        alertContainer.innerHTML = `
            <div class="alert alert-${type} alert-dismissible fade show" role="alert">
                ${message}
                <button type="button" class="close" data-dismiss="alert" aria-label="Close">
                    <span aria-hidden="true">&times;</span>
                </button>
            </div>
        `;
        setTimeout(() => {
            $('.alert').alert('close');
        }, 5000);
    }

    intersectButton.addEventListener('click', async () => {
        const table1 = intersectTable1Select.value;
        const table2 = intersectTable2Select.value;

        if (table1 && table2) {
            const response = await fetch(`/${currentDatabase}/tables/${table1}/intersect/${table2}`);
            const result = await response.json();
            if (response.ok) {
                displayIntersectionResult(result);
            } else {
                showAlert(result.error, 'danger');
                intersectResultDiv.innerHTML = '';
            }
        } else {
            showAlert('Please select both tables for intersection.', 'warning');
            intersectResultDiv.innerHTML = '';
        }
    });

    function displayIntersectionResult(data) {
        if (data.length > 0) {
            const table = document.createElement('table');
            table.className = 'table table-bordered';

            const thead = document.createElement('thead');
            const headerRow = document.createElement('tr');
            for (let field in data[0]) {
                const th = document.createElement('th');
                th.textContent = field;
                headerRow.appendChild(th);
            }
            thead.appendChild(headerRow);
            table.appendChild(thead);

            const tbody = document.createElement('tbody');
            data.forEach(row => {
                const tr = document.createElement('tr');
                for (let field in row) {
                    const td = document.createElement('td');
                    td.textContent = row[field];
                    tr.appendChild(td);
                }
                tbody.appendChild(tr);
            });
            table.appendChild(tbody);

            intersectResultDiv.innerHTML = '';
            intersectResultDiv.appendChild(table);
        } else {
            intersectResultDiv.innerHTML = '<p>No common rows found in the intersection.</p>';
        }
    }

    loadDatabases();
});
