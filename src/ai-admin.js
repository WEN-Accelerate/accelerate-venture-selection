import { createClient } from '@supabase/supabase-js';
import './ai-admin.css';

// Initialize Supabase from environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// Global state
let currentTab = 'models';

// Tab switching
window.switchTab = (tabName) => {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));

    event.target.classList.add('active');
    document.getElementById(`${tabName}-tab`).classList.add('active');
    currentTab = tabName;

    loadData(tabName);
};

// Load data
const loadData = async (type) => {
    if (type === 'models') await loadModels();
    if (type === 'prompts') await loadPrompts();
    if (type === 'settings') await loadSettings();
};

// Load models
const loadModels = async () => {
    const { data, error } = await supabase.from('ai_models').select('*').order('rank', { ascending: false });

    if (error) {
        showStatus('models', 'error', 'Failed to load models: ' + error.message);
        return;
    }

    const tbody = document.getElementById('models-list');
    tbody.innerHTML = data.map(m => `
        <tr>
            <td><strong>${m.name}</strong></td>
            <td>${m.version}</td>
            <td>${m.rank}</td>
            <td><span class="badge ${m.use_case || 'general'}">${m.use_case || 'N/A'}</span></td>
            <td>${m.supports_web_search ? '✅' : '❌'}</td>
            <td><span class="badge ${m.enabled ? 'enabled' : 'disabled'}">${m.enabled ? 'Enabled' : 'Disabled'}</span></td>
            <td>
                <button class="btn-primary btn-small" onclick="window.editModel('${m.id}')">Edit</button>
                <button class="btn-danger btn-small" onclick="window.deleteModel('${m.id}')">Delete</button>
            </td>
        </tr>
    `).join('');
};

// Load prompts
const loadPrompts = async () => {
    const { data, error } = await supabase.from('ai_prompts').select('*');

    if (error) {
        showStatus('prompts', 'error', 'Failed to load prompts: ' + error.message);
        return;
    }

    const tbody = document.getElementById('prompts-list');
    tbody.innerHTML = data.map(p => `
        <tr>
            <td><code>${p.key}</code></td>
            <td><strong>${p.name}</strong></td>
            <td>${p.use_web_search ? '✅' : '❌'}</td>
            <td>${p.use_json_schema ? '✅' : '❌'}</td>
            <td>${p.temperature || 0.2}</td>
            <td><span class="badge ${p.enabled ? 'enabled' : 'disabled'}">${p.enabled ? 'Enabled' : 'Disabled'}</span></td>
            <td>
                <button class="btn-primary btn-small" onclick="window.editPrompt('${p.id}')">Edit</button>
                <button class="btn-danger btn-small" onclick="window.deletePrompt('${p.id}')">Delete</button>
            </td>
        </tr>
    `).join('');
};

// Load settings
const loadSettings = async () => {
    const { data, error } = await supabase.from('ai_settings').select('*');

    if (error) {
        showStatus('settings', 'error', 'Failed to load settings: ' + error.message);
        return;
    }

    const tbody = document.getElementById('settings-list');
    tbody.innerHTML = data.map(s => `
        <tr>
            <td><code>${s.key}</code></td>
            <td><strong>${s.value}</strong></td>
            <td>${s.description || 'N/A'}</td>
            <td>
                <button class="btn-primary btn-small">Edit</button>
            </td>
        </tr>
    `).join('');
};

// Show status message
const showStatus = (tab, type, message) => {
    const statusDiv = document.getElementById(`${tab}-status`);
    statusDiv.innerHTML = `<div class="status ${type}">${message}</div>`;
    setTimeout(() => statusDiv.innerHTML = '', 5000);
};

// Modal functions
window.closeModal = (modalId) => {
    document.getElementById(modalId).classList.remove('active');
};

window.showAddModel = () => {
    document.getElementById('model-modal-title').textContent = 'Add New Model';
    document.getElementById('model-form').reset();
    document.getElementById('model-id').value = '';
    document.getElementById('model-enabled').checked = true;
    document.getElementById('model-websearch').checked = true;
    document.getElementById('model-modal').classList.add('active');
};

window.showAddPrompt = () => {
    document.getElementById('prompt-modal-title').textContent = 'Add New Prompt';
    document.getElementById('prompt-form').reset();
    document.getElementById('prompt-id').value = '';
    document.getElementById('prompt-enabled').checked = true;
    document.getElementById('prompt-modal').classList.add('active');
};

window.editModel = async (id) => {
    const { data, error } = await supabase.from('ai_models').select('*').eq('id', id).single();
    if (error) return alert('Failed to load model');

    document.getElementById('model-modal-title').textContent = 'Edit Model';
    document.getElementById('model-id').value = data.id;
    document.getElementById('model-name').value = data.name;
    document.getElementById('model-version').value = data.version;
    document.getElementById('model-rank').value = data.rank;
    document.getElementById('model-usecase').value = data.use_case || 'general';
    document.getElementById('model-websearch').checked = data.supports_web_search;
    document.getElementById('model-enabled').checked = data.enabled;
    document.getElementById('model-description').value = data.description || '';
    document.getElementById('model-modal').classList.add('active');
};

window.editPrompt = async (id) => {
    const { data, error } = await supabase.from('ai_prompts').select('*').eq('id', id).single();
    if (error) return alert('Failed to load prompt');

    document.getElementById('prompt-modal-title').textContent = 'Edit Prompt';
    document.getElementById('prompt-id').value = data.id;
    document.getElementById('prompt-key').value = data.key;
    document.getElementById('prompt-name').value = data.name;
    document.getElementById('prompt-template').value = data.prompt_template;
    document.getElementById('prompt-temperature').value = data.temperature || 0.2;
    document.getElementById('prompt-maxtokens').value = data.max_tokens || 8192;
    document.getElementById('prompt-websearch').checked = data.use_web_search;
    document.getElementById('prompt-enabled').checked = data.enabled;
    document.getElementById('prompt-description').value = data.description || '';
    document.getElementById('prompt-modal').classList.add('active');
};

window.deleteModel = async (id) => {
    if (!confirm('Are you sure you want to delete this model?')) return;

    const { error } = await supabase.from('ai_models').delete().eq('id', id);
    if (error) {
        showStatus('models', 'error', 'Failed to delete: ' + error.message);
    } else {
        showStatus('models', 'success', 'Model deleted successfully');
        loadModels();
    }
};

window.deletePrompt = async (id) => {
    if (!confirm('Are you sure you want to delete this prompt?')) return;

    const { error } = await supabase.from('ai_prompts').delete().eq('id', id);
    if (error) {
        showStatus('prompts', 'error', 'Failed to delete: ' + error.message);
    } else {
        showStatus('prompts', 'success', 'Prompt deleted successfully');
        loadPrompts();
    }
};

// Form submissions
document.getElementById('model-form').addEventListener('submit', async (e) => {
    e.preventDefault();

    const id = document.getElementById('model-id').value;
    const modelData = {
        name: document.getElementById('model-name').value,
        version: document.getElementById('model-version').value,
        rank: parseInt(document.getElementById('model-rank').value),
        use_case: document.getElementById('model-usecase').value,
        supports_web_search: document.getElementById('model-websearch').checked,
        enabled: document.getElementById('model-enabled').checked,
        description: document.getElementById('model-description').value
    };

    let result;
    if (id) {
        result = await supabase.from('ai_models').update(modelData).eq('id', id);
    } else {
        result = await supabase.from('ai_models').insert([modelData]);
    }

    if (result.error) {
        showStatus('models', 'error', 'Failed to save: ' + result.error.message);
    } else {
        showStatus('models', 'success', 'Model saved successfully');
        window.closeModal('model-modal');
        loadModels();
    }
});

document.getElementById('prompt-form').addEventListener('submit', async (e) => {
    e.preventDefault();

    const id = document.getElementById('prompt-id').value;
    const promptData = {
        key: document.getElementById('prompt-key').value,
        name: document.getElementById('prompt-name').value,
        prompt_template: document.getElementById('prompt-template').value,
        temperature: parseFloat(document.getElementById('prompt-temperature').value),
        max_tokens: parseInt(document.getElementById('prompt-maxtokens').value),
        use_web_search: document.getElementById('prompt-websearch').checked,
        enabled: document.getElementById('prompt-enabled').checked,
        description: document.getElementById('prompt-description').value
    };

    let result;
    if (id) {
        result = await supabase.from('ai_prompts').update(promptData).eq('id', id);
    } else {
        result = await supabase.from('ai_prompts').insert([promptData]);
    }

    if (result.error) {
        showStatus('prompts', 'error', 'Failed to save: ' + result.error.message);
    } else {
        showStatus('prompts', 'success', 'Prompt saved successfully');
        window.closeModal('prompt-modal');
        loadPrompts();
    }
});

// Initial load
loadData('models');
