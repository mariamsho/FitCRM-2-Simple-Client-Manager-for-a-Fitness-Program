// --- CONSTANTS AND INITIALIZATION ---
const CLIENTS_STORAGE_KEY = 'fitcrm_clients';
const WGER_API_URL = 'https://wger.de/api/v2/exercise/?language=2&limit=5&ordering=id';

document.addEventListener('DOMContentLoaded', () => {
    navigateTo('list'); // Show the client list view on page load
    // Note: The sample data from client-list.html is no longer needed, 
    // as data will now be generated and saved dynamically.
});

// --- NAVIGATION LOGIC ---

/**
 * Switches the active view/page and updates the client list if needed.
 * @param {'list' | 'form' | 'view'} pageName - The page to navigate to.
 * @param {'new' | 'edit'} [mode] - Optional mode for the form.
 */
function navigateTo(pageName, mode) {
    document.querySelectorAll('.page').forEach(page => {
        page.classList.add('hidden');
    });

    const pageElement = document.getElementById(`page-${pageName}`);
    pageElement.classList.remove('hidden');

    if (pageName === 'list') {
        renderClientList();
    } else if (pageName === 'form') {
        setupFormMode(mode);
    }
}

/**
 * Sets up the form for either 'new' client creation or 'edit' mode.
 * @param {'new' | 'edit'} mode 
 */
function setupFormMode(mode) {
    const form = document.getElementById('client-form');
    const heading = document.getElementById('form-heading');
    const button = document.getElementById('form-action-button');
    const message = document.getElementById('validation-message');

    message.textContent = ''; // Clear previous messages

    if (mode === 'new') {
        heading.textContent = 'Add New Client';
        button.textContent = 'Add Client';
        form.reset();
        document.getElementById('client-id').value = '';
    }
    // 'Edit' mode setup is handled by the handleEdit function before navigation
}


// --- LOCAL STORAGE DATA MANAGEMENT ---

function getClients() {
    const clientsJson = localStorage.getItem(CLIENTS_STORAGE_KEY);
    return clientsJson ? JSON.parse(clientsJson) : [];
}

function saveClients(clients) {
    localStorage.setItem(CLIENTS_STORAGE_KEY, JSON.stringify(clients));
}

// --- PAGE 1: NEW/EDIT CLIENT FORM LOGIC ---

function handleFormSubmit(event) {
    event.preventDefault();
    const form = event.target;
    const clientData = getFormData(form);

    if (!validateFormData(clientData)) {
        return;
    }
    
    let clients = getClients();
    const isEdit = clientData.id;

    if (isEdit) {
        // Edit existing client
        clients = clients.map(client => client.id === clientData.id ? clientData : client);
    } else {
        // Add new client (assign a unique ID)
        clientData.id = Date.now().toString(); // Simple unique ID
        clients.push(clientData);
    }

    saveClients(clients);
    alert(`Client ${clientData.fullName} ${isEdit ? 'updated' : 'added'} successfully!`);
    navigateTo('list');
}

/** Extracts data from the form inputs */
function getFormData(form) {
    const data = {};
    new FormData(form).forEach((value, key) => {
        data[key] = value;
    });
    return data;
}

/** Performs basic form validation */
function validateFormData(data) {
    const messageElement = document.getElementById('validation-message');
    
    if (!data.fullName || !data.email || !data.startDate) {
        messageElement.textContent = 'Error: Full Name, Email, and Start Date are required.';
        return false;
    }
    
    // Basic email format check
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(data.email)) {
        messageElement.textContent = 'Error: Invalid email format.';
        return false;
    }
    
    messageElement.textContent = '';
    return true;
}

// --- PAGE 2: CLIENT LIST VIEW LOGIC ---

/** Renders the client list table based on current clients in localStorage */
function renderClientList(filter = '') {
    const tbody = document.getElementById('client-table-body');
    const clients = getClients();
    const table = document.getElementById('client-table');
    const noClientsMessage = document.getElementById('no-clients-message');
    
    tbody.innerHTML = '';

    if (clients.length === 0) {
        table.classList.add('hidden');
        noClientsMessage.classList.remove('hidden');
        return;
    }
    
    noClientsMessage.classList.add('hidden');
    table.classList.remove('hidden');

    const filteredClients = clients.filter(client => 
        client.fullName.toLowerCase().includes(filter.toLowerCase())
    );

    filteredClients.forEach(client => {
        const row = tbody.insertRow();
        row.innerHTML = `
            <td onclick="handleView('${client.id}')">${client.fullName}</td>
            <td>${client.email}</td>
            <td class="hide-on-mobile">${client.phone || '-'}</td>
            <td class="hide-on-mobile">${client.fitnessGoal}</td>
            <td class="hide-on-mobile">${client.startDate}</td>
            <td>
                <button class="action-view" onclick="handleView('${client.id}')">View</button>
                <button class="action-edit" onclick="handleEdit('${client.id}')">Edit</button>
                <button class="action-delete" onclick="handleDelete('${client.id}', '${client.fullName}')">Delete</button>
            </td>
        `;
    });
}

/** Handles the search functionality (called on keyup or button click) */
function handleSearch(query) {
    // If the function is called without a query (e.g., from the button click), grab it from the input field
    if (typeof query === 'undefined') {
        query = document.getElementById('clientSearch').value;
    }
    renderClientList(query);
}

/** Repopulates the form with client data for editing */
function handleEdit(clientId) {
    const client = getClients().find(c => c.id === clientId);
    if (!client) return;

    // Repopulate form fields
    document.getElementById('client-id').value = client.id;
    document.getElementById('fullName').value = client.fullName;
    document.getElementById('age').value = client.age;
    document.getElementById('gender').value = client.gender;
    document.getElementById('startDate').value = client.startDate;
    document.getElementById('email').value = client.email;
    document.getElementById('phone').value = client.phone;
    document.getElementById('fitnessGoal').value = client.fitnessGoal;
    
    // Set form title and button text for Edit mode
    document.getElementById('form-heading').textContent = `Edit Client: ${client.fullName}`;
    document.getElementById('form-action-button').textContent = 'Save Changes';

    navigateTo('form', 'edit');
}

/** Handles client deletion */
function handleDelete(clientId, clientName) {
    // Confirmation prompt
    if (confirm(`Are you sure you want to permanently delete client: ${clientName}?`)) {
        let clients = getClients();
        // Filter out the client with the matching ID
        clients = clients.filter(client => client.id !== clientId);
        saveClients(clients);
        renderClientList();
        alert(`${clientName} has been deleted.`);
    }
}

// --- PAGE 3: CLIENT VIEW & API INTEGRATION ---

/** Displays client details and fetches exercises */
function handleView(clientId) {
    const client = getClients().find(c => c.id === clientId);
    if (!client) {
        alert('Client not found!');
        return;
    }
    
    // Display details
    document.getElementById('view-fullName').textContent = client.fullName;
    document.getElementById('view-email').textContent = client.email;
    document.getElementById('view-phone').textContent = client.phone || 'N/A';
    document.getElementById('view-goal').textContent = client.fitnessGoal;
    document.getElementById('view-startDate').textContent = client.startDate;
    document.getElementById('view-age').textContent = client.age || 'N/A';
    document.getElementById('view-gender').textContent = client.gender || 'N/A';
    
    // Fetch and display suggested exercises
    fetchSuggestedExercises();
    
    navigateTo('view');
}

/** Fetches 5 suggested exercises from the Wger API */
async function fetchSuggestedExercises() {
    const exerciseList = document.getElementById('suggested-exercises');
    exerciseList.innerHTML = '<li>Loading exercises...</li>';
    
    try {
        const response = await fetch(WGER_API_URL);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        
        exerciseList.innerHTML = '';
        
        if (data.results && data.results.length > 0) {
            data.results.forEach(exercise => {
                const li = document.createElement('li');
                li.innerHTML = `<strong>${exercise.name}</strong>: ${exercise.description.replace(/<[^>]*>?/gm, '').substring(0, 100)}...`; // Strip HTML and truncate
                exerciseList.appendChild(li);
            });
        } else {
            exerciseList.innerHTML = '<li>No exercises found.</li>';
        }

    } catch (error) {
        console.error('Error fetching exercises:', error);
        exerciseList.innerHTML = '<li>Error fetching exercises. Please try again later.</li>';
    }
}
