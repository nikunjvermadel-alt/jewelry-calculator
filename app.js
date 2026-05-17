// Configuration - works for both localhost and deployed URLs
const API_URL = `${window.location.origin}/api`;

// State
let currentUser = null;
let currentProjectId = null;
let projects = [];
let latestEstimate = {};

// DOM Elements
const authScreen = document.getElementById('authScreen');
const appScreen = document.getElementById('appScreen');
const loginForm = document.getElementById('loginForm');
const signupForm = document.getElementById('signupForm');
const loginButton = document.getElementById('loginButton');
const signupButton = document.getElementById('signupButton');
const logoutButton = document.getElementById('logoutButton');
const loginError = document.getElementById('loginError');
const signupError = document.getElementById('signupError');
const currentUsername = document.getElementById('currentUsername');
const projectSelector = document.getElementById('projectSelector');
const newProjectButton = document.getElementById('newProjectButton');
const deleteProjectButton = document.getElementById('deleteProjectButton');
const saveProjectButton = document.getElementById('saveProjectButton');

// Calculator fields
const defaults = {
  pieceName: "Custom ring",
  metalType: "13.50",
  volume: 0,
  weight: 5.8,
  metalPrice: 48,
  metalBuffer: 8,
  stoneCost: 120,
  partsCost: 25,
  cadCost: 85,
  benchCost: 140,
  packagingCost: 18,
  overheadPercent: 12,
  wholesaleMarkup: 80,
  retailMarkup: 160,
  taxPercent: 8.875
};

const moneyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD"
});

const fields = Object.keys(defaults).reduce((items, key) => {
  items[key] = document.getElementById(key);
  return items;
}, {});

const output = {
  retailPrice: document.getElementById("retailPrice"),
  profitText: document.getElementById("profitText"),
  pieceLabel: document.getElementById("pieceLabel"),
  cadWeight: document.getElementById("cadWeight"),
  metalCost: document.getElementById("metalCost"),
  materialsCost: document.getElementById("materialsCost"),
  laborCost: document.getElementById("laborCost"),
  overheadCost: document.getElementById("overheadCost"),
  productionCost: document.getElementById("productionCost"),
  wholesalePrice: document.getElementById("wholesalePrice"),
  retailBeforeTax: document.getElementById("retailBeforeTax"),
  retailWithTax: document.getElementById("retailWithTax")
};

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  checkAuth();
  setupEventListeners();
});

function setupEventListeners() {
  // Auth
  loginButton.addEventListener('click', handleLogin);
  signupButton.addEventListener('click', handleSignup);
  logoutButton.addEventListener('click', handleLogout);
  newProjectButton.addEventListener('click', createNewProject);
  deleteProjectButton.addEventListener('click', deleteCurrentProject);
  saveProjectButton.addEventListener('click', saveProject);
  projectSelector.addEventListener('change', loadProject);

  // Calculator
  document.getElementById('resetButton').addEventListener('click', resetForm);
  document.getElementById('pricingForm').addEventListener('change', calculate);
  document.getElementById('metalType').addEventListener('change', calculate);
}

// Auth Functions
async function handleLogin() {
  const email = document.getElementById('loginEmail').value;
  const password = document.getElementById('loginPassword').value;

  if (!email || !password) {
    loginError.textContent = 'Please fill in all fields';
    return;
  }

  try {
    const response = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error);
    }

    const data = await response.json();
    localStorage.setItem('token', data.token);
    localStorage.setItem('userId', data.userId);
    localStorage.setItem('username', data.username);
    
    currentUser = { id: data.userId, username: data.username };
    showApp();
    await loadProjects();
  } catch (error) {
    loginError.textContent = error.message;
  }
}

async function handleSignup() {
  const username = document.getElementById('signupUsername').value;
  const email = document.getElementById('signupEmail').value;
  const password = document.getElementById('signupPassword').value;

  if (!username || !email || !password) {
    signupError.textContent = 'Please fill in all fields';
    return;
  }

  try {
    const response = await fetch(`${API_URL}/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, email, password })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error);
    }

    const data = await response.json();
    localStorage.setItem('token', data.token);
    localStorage.setItem('userId', data.userId);
    localStorage.setItem('username', data.username);
    
    currentUser = { id: data.userId, username: data.username };
    showApp();
    await loadProjects();
  } catch (error) {
    signupError.textContent = error.message;
  }
}

function handleLogout() {
  localStorage.removeItem('token');
  localStorage.removeItem('userId');
  localStorage.removeItem('username');
  currentUser = null;
  currentProjectId = null;
  projects = [];
  showAuth();
  clearForm();
}

async function checkAuth() {
  const token = localStorage.getItem('token');
  const username = localStorage.getItem('username');

  if (token && username) {
    currentUser = { username };
    showApp();
    await loadProjects();
  } else {
    showAuth();
  }
}

// UI Functions
function showAuth() {
  authScreen.style.display = 'flex';
  appScreen.classList.add('hidden');
}

function showApp() {
  authScreen.style.display = 'none';
  appScreen.classList.remove('hidden');
  currentUsername.textContent = currentUser.username;
}

function showNotification(message, type = 'success') {
  const notification = document.getElementById('notification');
  notification.textContent = message;
  notification.className = `notification show ${type}`;
  
  setTimeout(() => {
    notification.classList.remove('show');
  }, 3000);
}

// Project Functions
async function loadProjects() {
  try {
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_URL}/projects`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (!response.ok) throw new Error('Failed to load projects');

    projects = await response.json();
    updateProjectSelector();
  } catch (error) {
    showNotification(error.message, 'error');
  }
}

function updateProjectSelector() {
  projectSelector.innerHTML = '<option value="new">Create new project...</option>';
  
  projects.forEach(project => {
    const option = document.createElement('option');
    option.value = project.id;
    option.textContent = project.projectName;
    projectSelector.appendChild(option);
  });
}

async function createNewProject() {
  const projectName = prompt('Enter project name:');
  if (!projectName) return;

  try {
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_URL}/projects`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        projectName,
        formData: getFormData(),
        estimate: latestEstimate
      })
    });

    if (!response.ok) throw new Error('Failed to create project');

    const newProject = await response.json();
    currentProjectId = newProject.id;
    await loadProjects();
    projectSelector.value = currentProjectId;
    deleteProjectButton.style.display = 'inline-block';
    showNotification(`Project "${projectName}" created successfully`);
    resetForm();
  } catch (error) {
    showNotification(error.message, 'error');
  }
}

async function loadProject(e) {
  const projectId = e.target.value;

  if (projectId === 'new') {
    currentProjectId = null;
    deleteProjectButton.style.display = 'none';
    resetForm();
    return;
  }

  try {
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_URL}/projects/${projectId}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (!response.ok) throw new Error('Failed to load project');

    const project = await response.json();
    currentProjectId = project.id;
    deleteProjectButton.style.display = 'inline-block';

    // Load form data
    Object.entries(project.formData).forEach(([key, value]) => {
      if (fields[key]) {
        fields[key].value = value;
      }
    });

    // Load estimate if available
    if (project.estimate) {
      latestEstimate = project.estimate;
    }

    calculate();
  } catch (error) {
    showNotification(error.message, 'error');
    projectSelector.value = 'new';
  }
}

async function saveProject() {
  if (!currentProjectId) {
    showNotification('Please create or select a project first', 'error');
    return;
  }

  try {
    const token = localStorage.getItem('token');
    const formData = getFormData();
    
    const response = await fetch(`${API_URL}/projects/${currentProjectId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        projectName: projects.find(p => p.id === currentProjectId)?.projectName || 'Untitled',
        formData,
        estimate: latestEstimate
      })
    });

    if (!response.ok) throw new Error('Failed to save project');

    showNotification('Project saved successfully');
  } catch (error) {
    showNotification(error.message, 'error');
  }
}

async function deleteCurrentProject() {
  if (!currentProjectId) return;

  if (!confirm('Are you sure you want to delete this project?')) return;

  try {
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_URL}/projects/${currentProjectId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (!response.ok) throw new Error('Failed to delete project');

    currentProjectId = null;
    deleteProjectButton.style.display = 'none';
    await loadProjects();
    projectSelector.value = 'new';
    resetForm();
    showNotification('Project deleted successfully');
  } catch (error) {
    showNotification(error.message, 'error');
  }
}

// Calculator Functions
function getFormData() {
  return Object.keys(defaults).reduce((data, key) => {
    data[key] = fields[key].value;
    return data;
  }, {});
}

function numberValue(id) {
  return Number.parseFloat(fields[id].value) || 0;
}

function money(value) {
  return moneyFormatter.format(value);
}

function selectedMetal() {
  const option = fields.metalType.selectedOptions[0];
  return {
    name: option.textContent,
    symbol: option.dataset.symbol,
    purity: Number.parseFloat(option.dataset.purity) || 1
  };
}

function cadWeightValue() {
  return numberValue("volume") * numberValue("metalType") / 1000;
}

function calculate() {
  const metal = selectedMetal();
  const density = numberValue("metalType");
  const volume = numberValue("volume");
  const enteredWeight = numberValue("weight");
  const cadWeight = cadWeightValue();
  const finalWeight = enteredWeight > 0 ? enteredWeight : cadWeight;

  const metalCost = finalWeight * numberValue("metalPrice") * (1 + numberValue("metalBuffer") / 100);
  const materialsCost = metalCost + numberValue("stoneCost") + numberValue("partsCost");
  const laborCost = numberValue("cadCost") + numberValue("benchCost");
  const packagingCost = numberValue("packagingCost");
  const subtotalBeforeOverhead = materialsCost + laborCost + packagingCost;
  const overheadCost = subtotalBeforeOverhead * (numberValue("overheadPercent") / 100);
  const productionCost = subtotalBeforeOverhead + overheadCost;

  const wholesalePrice = productionCost * (1 + numberValue("wholesaleMarkup") / 100);
  const retailBeforeTax = productionCost * (1 + numberValue("retailMarkup") / 100);
  const retailWithTax = retailBeforeTax * (1 + numberValue("taxPercent") / 100);
  const estimatedProfit = retailWithTax - productionCost;

  // Update outputs
  output.pieceLabel.textContent = fields.pieceName.value;
  output.cadWeight.textContent = `${finalWeight.toFixed(2)} g`;
  output.metalCost.textContent = money(metalCost);
  output.materialsCost.textContent = money(materialsCost);
  output.laborCost.textContent = money(laborCost);
  output.overheadCost.textContent = money(overheadCost);
  output.productionCost.textContent = money(productionCost);
  output.wholesalePrice.textContent = money(wholesalePrice);
  output.retailBeforeTax.textContent = money(retailBeforeTax);
  output.retailWithTax.textContent = money(retailWithTax);
  output.retailPrice.textContent = money(retailWithTax);
  output.profitText.textContent = `${money(estimatedProfit)} estimated profit`;

  latestEstimate = {
    pieceName: fields.pieceName.value,
    metalCost,
    materialsCost,
    laborCost,
    overheadCost,
    productionCost,
    wholesalePrice,
    retailBeforeTax,
    retailWithTax,
    estimatedProfit
  };
}

function resetForm() {
  Object.entries(defaults).forEach(([key, value]) => {
    if (fields[key]) {
      fields[key].value = value;
    }
  });
  calculate();
}

function clearForm() {
  resetForm();
  projectSelector.value = 'new';
}

// Helper for switching auth forms
function switchToSignup() {
  loginForm.classList.remove('active');
  signupForm.classList.add('active');
  loginError.textContent = '';
}

function switchToLogin() {
  signupForm.classList.remove('active');
  loginForm.classList.add('active');
  signupError.textContent = '';
}

// Initial calculation
calculate();
