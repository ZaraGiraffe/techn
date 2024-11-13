document.addEventListener('DOMContentLoaded', function() {
    const databaseSelect = document.getElementById('databaseSelect');
    const loadDatabaseButton = document.getElementById('loadDatabase');
    const createDatabaseButton = document.getElementById('createDatabase');
    const newDatabaseNameInput = document.getElementById('newDatabaseName');
    const tableSection = document.getElementById('tableSection');
    const tableNameInput = document.getElementById('tableName');
    const tableSchemaInput = document.getElementById('tableSchema');
    const addTableButton = document.getElementById('addTable');
    const tableList = document.getElementById('tableList');
    const rowSection = document.getElementById('rowSection');
    const currentTableNameSpan = document.getElementById('currentTableName');
    const rowFormContainer = document.getElementById('rowFormContainer');
    const addRowButton = document.getElementById('addRow');
    const dataTable = document.getElementById('dataTable');

    let currentDatabase = '';
    let currentTable = '';
    let currentSchema = {};

    // Load existing databases
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

    // Event listener for loading a database
    loadDatabaseButton.addEventListener('click', () => {
        currentDatabase = databaseSelect.value;
        if (currentDatabase) {
            tableSection.style.display = 'block';
            loadTables();
        }
    });

    // Event listener for creating a new database
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

    // Load tables in the current database
    async function loadTables() {
        const response = await fetch(`/${currentDatabase}/tables_list`);
        const tables = await response.json();
        tableList.innerHTML = '';
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

            // Add delete button for the table
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
        });
    }

    // Event listener for adding a new table
    addTableButton.addEventListener('click', async () => {
        const tableName = tableNameInput.value.trim();
        const schemaText = tableSchemaInput.value.trim();
        if (tableName && schemaText) {
            try {
                const schema = JSON.parse(schemaText);
                const response = await fetch(`/${currentDatabase}/tables`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ table_name: tableName, schema })
                });
                const result = await response.json();
                if (response.ok) {
                    showAlert(result.message, 'success');
                    tableNameInput.value = '';
                    tableSchemaInput.value = '';
                    loadTables();
                } else {
                    showAlert(result.error, 'danger');
                }
            } catch (e) {
                showAlert('Invalid schema JSON format.', 'danger');
            }
        } else {
            showAlert('Please enter table name and schema.', 'warning');
        }
    });

    // Load schema of the current table
    async function loadSchema() {
        const response = await fetch(`/${currentDatabase}/tables/${currentTable}/schema`);
        currentSchema = await response.json();
        generateRowForm();
    }

    // Generate form to add a new row based on the schema
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

            formGroup.appendChild(label);
            formGroup.appendChild(input);
            colDiv.appendChild(formGroup);
            rowFormContainer.appendChild(colDiv);
        }
    }

    // Event listener for adding a new row
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
                // Clear inputs
                inputs.forEach(input => input.value = '');
            } else {
                showAlert(result.error, 'danger');
            }
        }
    });

    // Load data of the current table and display it
    async function loadTableData() {
        const response = await fetch(`/${currentDatabase}/tables/${currentTable}/rows`);
        const data = await response.json();
        dataTable.innerHTML = '';
        if (data.length > 0) {
            // Create table header
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

            // Create table body
            const tbody = document.createElement('tbody');
            data.forEach((row, index) => {
                const tr = document.createElement('tr');
                for (let field in row) {
                    const td = document.createElement('td');
                    td.textContent = row[field];
                    tr.appendChild(td);
                }
                // Add delete button
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

    // Validate field value based on its type
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

    // Show alert messages
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
        // Automatically dismiss after 5 seconds
        setTimeout(() => {
            $('.alert').alert('close');
        }, 5000);
    }

    // Initial load of databases
    loadDatabases();
});
