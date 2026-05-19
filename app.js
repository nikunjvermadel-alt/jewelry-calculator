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
const forgotPasswordForm = document.getElementById('forgotPasswordForm');
const resetPasswordForm = document.getElementById('resetPasswordForm');
const loginButton = document.getElementById('loginButton');
const signupButton = document.getElementById('signupButton');
const forgotPasswordButton = document.getElementById('forgotPasswordButton');
const resetPasswordButton = document.getElementById('resetPasswordButton');
const logoutButton = document.getElementById('logoutButton');
const loginError = document.getElementById('loginError');
const signupError = document.getElementById('signupError');
const forgotError = document.getElementById('forgotError');
const forgotSuccess = document.getElementById('forgotSuccess');
const resetError = document.getElementById('resetError');
const resetSuccess = document.getElementById('resetSuccess');
const currentUsername = document.getElementById('currentUsername');
const projectSelector = document.getElementById('projectSelector');
const newProjectButton = document.getElementById('newProjectButton');
const deleteProjectButton = document.getElementById('deleteProjectButton');
const saveProjectButton = document.getElementById('saveProjectButton');

// Calculator fields
const defaults = {
  pieceName: "Custom ring",
  metalType: "13.50",
  volume: '',
  weight: 0,
  metalPrice: 0,
  metalBuffer: 0,
  stoneCost: 0,
  partsCost: 0,
  cadCost: 0,
  benchCost: 0,
  packagingCost: 0,
  overheadPercent: 0,
  wholesaleMarkup: 0,
  retailMarkup: 0,
  taxPercent: 0
};

const moneyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD"
});

const fields = Object.keys(defaults).reduce((items, key) => {
  items[key] = document.getElementById(key);
  return items;
}, {});

const cadFileInput = document.getElementById('cadFile');
const cadFileStatus = document.getElementById('cadFileStatus');
const cadWeightButton = document.getElementById('cadWeightButton');
const livePriceButton = document.getElementById('livePriceButton');
const livePriceStatus = document.getElementById('livePriceStatus');
const TROY_OUNCE_GRAMS = 31.1034768;
const livePriceCache = {};
let rhino3dmModulePromise = null;

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
  setupEventListeners();
  checkAuth();
});

function setupEventListeners() {
  // Auth
  loginButton.addEventListener('click', handleLogin);
  signupButton.addEventListener('click', handleSignup);
  forgotPasswordButton.addEventListener('click', handleForgotPassword);
  resetPasswordButton.addEventListener('click', handleResetPassword);
  logoutButton.addEventListener('click', handleLogout);
  newProjectButton.addEventListener('click', createNewProject);
  deleteProjectButton.addEventListener('click', deleteCurrentProject);
  saveProjectButton.addEventListener('click', saveProject);
  projectSelector.addEventListener('change', loadProject);
  cadFileInput.addEventListener('change', handleCadFileUpload);
  cadWeightButton.addEventListener('click', useCadWeightEstimate);
  livePriceButton.addEventListener('click', () => updateLiveMetalPrice(true));

  // Calculator
  document.getElementById('resetButton').addEventListener('click', resetForm);
  document.getElementById('pricingForm').addEventListener('change', calculate);
  document.getElementById('metalType').addEventListener('change', calculate);
}

// Auth Functions
async function handleLogin() {
  const email = document.getElementById('loginEmail').value.trim().toLowerCase();
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
  const username = document.getElementById('signupUsername').value.trim();
  const email = document.getElementById('signupEmail').value.trim().toLowerCase();
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
      const message = error.error === 'Email or username already exists'
        ? 'Account already exists. Please log in or use Forgot password.'
        : error.error;
      throw new Error(message);
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
  currentUsername.textContent = '';
  showAuth();
  clearForm();
}

async function checkAuth() {
  const token = localStorage.getItem('token');
  const username = localStorage.getItem('username');

  if (token && username) {
    try {
      const response = await fetch(`${API_URL}/auth/profile`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) {
        throw new Error('Session expired');
      }

      const user = await response.json();
      currentUser = { id: user.id, username: user.username };
      localStorage.setItem('userId', user.id);
      localStorage.setItem('username', user.username);
      showApp();
      await loadProjects();
    } catch (error) {
      localStorage.removeItem('token');
      localStorage.removeItem('userId');
      localStorage.removeItem('username');
      currentUser = null;
      showAuth();
      checkResetQuery();
    }
  } else {
    showAuth();
    checkResetQuery();
  }
}

// UI Functions
function showAuth() {
  authScreen.style.display = 'flex';
  appScreen.classList.add('hidden');
  loginForm.classList.add('active');
  signupForm.classList.remove('active');
  forgotPasswordForm.classList.remove('active');
  resetPasswordForm.classList.remove('active');
}

function showApp() {
  authScreen.style.display = 'none';
  appScreen.classList.remove('hidden');
  currentUsername.textContent = currentUser.username;
  clearForm();
  projectSelector.value = 'new';
  deleteProjectButton.style.display = 'none';
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

async function handleCadFileUpload() {
  const file = cadFileInput.files[0];

  if (!file) {
    fields.volume.disabled = true;
    cadFileStatus.textContent = 'Upload an STL or mesh-based 3DM file to auto-fill volume, or enter Rhino volume manually.';
    fields.volume.value = '';
    calculate();
    return;
  }

  fields.volume.disabled = false;
  fields.volume.value = '';
  cadFileStatus.textContent = 'Scanning CAD file volume...';

  const fileName = file.name.toLowerCase();
  if (!fileName.endsWith('.stl') && !fileName.endsWith('.3dm')) {
    cadFileStatus.textContent = 'Use an STL or 3DM file, or enter Rhino volume manually.';
    calculate();
    return;
  }

  try {
    const volume = fileName.endsWith('.stl')
      ? await readStlVolume(file)
      : await read3dmVolume(file);

    if (!Number.isFinite(volume) || volume <= 0) {
      throw new Error('No closed mesh volume found');
    }

    fields.volume.value = volume.toFixed(2);
    cadFileStatus.textContent = `Volume scanned from ${fileName.endsWith('.stl') ? 'STL' : '3DM'}: ${volume.toFixed(2)} mm³`;
    calculate();
  } catch (error) {
    cadFileStatus.textContent = `Could not scan file volume. Enter Rhino volume manually. ${error.message}`;
    calculate();
  }
}

async function readStlVolume(file) {
  const buffer = await file.arrayBuffer();

  if (isLikelyBinaryStl(buffer)) {
    try {
      return binaryStlVolume(buffer);
    } catch (error) {
      return asciiStlVolume(await file.text());
    }
  }

  return asciiStlVolume(await file.text());
}

function isLikelyBinaryStl(buffer) {
  if (buffer.byteLength < 84) return false;

  const view = new DataView(buffer);
  const triangleCount = view.getUint32(80, true);
  const expectedSize = 84 + triangleCount * 50;
  return triangleCount > 0 && expectedSize <= buffer.byteLength;
}

function binaryStlVolume(buffer) {
  const view = new DataView(buffer);
  const triangleCount = view.getUint32(80, true);
  const expectedSize = 84 + triangleCount * 50;

  if (triangleCount <= 0 || expectedSize > buffer.byteLength) {
    throw new Error('Invalid binary STL mesh');
  }

  let offset = 84;
  let signedVolume = 0;

  for (let index = 0; index < triangleCount; index += 1) {
    offset += 12;
    const a = readStlVertex(view, offset);
    const b = readStlVertex(view, offset + 12);
    const c = readStlVertex(view, offset + 24);
    signedVolume += tetrahedronVolume(a, b, c);
    offset += 38;
  }

  return Math.abs(signedVolume);
}

async function read3dmVolume(file) {
  const rhino = await loadRhino3dm();
  const buffer = await file.arrayBuffer();
  const model = rhino.File3dm.fromByteArray(new Uint8Array(buffer));

  if (!model) {
    throw new Error('Invalid 3DM file');
  }

  const meshes = collectRhinoMeshes(rhino, model);
  if (meshes.length === 0) {
    throw new Error('No mesh data found in this 3DM. Export from Rhino as STL, or save the 3DM with render meshes.');
  }

  const signedVolume = meshes.reduce((total, mesh) => total + rhinoMeshSignedVolume(mesh), 0);
  return Math.abs(signedVolume);
}

function loadRhino3dm() {
  if (window.rhino3dm) {
    return window.rhino3dm();
  }

  if (!rhino3dmModulePromise) {
    rhino3dmModulePromise = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/rhino3dm@8.17.0/rhino3dm.min.js';
      script.async = true;
      script.onload = () => {
        if (!window.rhino3dm) {
          reject(new Error('Rhino 3DM scanner failed to load'));
          return;
        }

        window.rhino3dm().then(resolve).catch(reject);
      };
      script.onerror = () => reject(new Error('Rhino 3DM scanner failed to load'));
      document.head.appendChild(script);
    });
  }

  return rhino3dmModulePromise;
}

function collectRhinoMeshes(rhino, model) {
  const meshes = [];
  const objects = model.objects();

  for (let index = 0; index < objects.count; index += 1) {
    const item = objects.get(index);
    const geometry = item.geometry();

    if (!geometry) continue;

    if (geometry.objectType === rhino.ObjectType.Mesh) {
      meshes.push(geometry);
    } else if (geometry.objectType === rhino.ObjectType.Brep) {
      const faces = geometry.faces();
      for (let faceIndex = 0; faceIndex < faces.count; faceIndex += 1) {
        const face = faces.get(faceIndex);
        const mesh = face.getMesh(rhino.MeshType.Render) || face.getMesh(rhino.MeshType.Any);
        if (mesh) meshes.push(mesh);
      }
    } else if (geometry.objectType === rhino.ObjectType.Extrusion) {
      const mesh = geometry.getMesh(rhino.MeshType.Render) || geometry.getMesh(rhino.MeshType.Any);
      if (mesh) meshes.push(mesh);
    }
  }

  return meshes;
}

function rhinoMeshSignedVolume(mesh) {
  const vertices = mesh.vertices();
  const faces = mesh.faces();
  let signedVolume = 0;

  for (let index = 0; index < faces.count; index += 1) {
    const face = faces.get(index);
    const a = rhinoPoint(vertices.get(face[0]));
    const b = rhinoPoint(vertices.get(face[1]));
    const c = rhinoPoint(vertices.get(face[2]));
    signedVolume += tetrahedronVolume(a, b, c);

    if (face[3] !== face[2]) {
      const d = rhinoPoint(vertices.get(face[3]));
      signedVolume += tetrahedronVolume(a, c, d);
    }
  }

  return signedVolume;
}

function rhinoPoint(point) {
  return {
    x: point[0],
    y: point[1],
    z: point[2]
  };
}

function readStlVertex(view, offset) {
  return {
    x: view.getFloat32(offset, true),
    y: view.getFloat32(offset + 4, true),
    z: view.getFloat32(offset + 8, true)
  };
}

function asciiStlVolume(text) {
  const vertexPattern = /vertex\s+([-+]?(?:\d+\.?\d*|\.\d+)(?:e[-+]?\d+)?)\s+([-+]?(?:\d+\.?\d*|\.\d+)(?:e[-+]?\d+)?)\s+([-+]?(?:\d+\.?\d*|\.\d+)(?:e[-+]?\d+)?)/gi;
  const vertices = [];
  let match;

  while ((match = vertexPattern.exec(text)) !== null) {
    vertices.push({
      x: Number.parseFloat(match[1]),
      y: Number.parseFloat(match[2]),
      z: Number.parseFloat(match[3])
    });
  }

  if (vertices.length < 3 || vertices.length % 3 !== 0) {
    throw new Error('Invalid ASCII STL mesh');
  }

  let signedVolume = 0;
  for (let index = 0; index < vertices.length; index += 3) {
    signedVolume += tetrahedronVolume(vertices[index], vertices[index + 1], vertices[index + 2]);
  }

  return Math.abs(signedVolume);
}

function tetrahedronVolume(a, b, c) {
  return (
    a.x * (b.y * c.z - b.z * c.y) -
    a.y * (b.x * c.z - b.z * c.x) +
    a.z * (b.x * c.y - b.y * c.x)
  ) / 6;
}

function useCadWeightEstimate() {
  const volume = numberValue('volume');
  if (volume <= 0) {
    cadFileStatus.textContent = 'Enter a valid volume from your CAD file first.';
    return;
  }

  const estimated = cadWeightValue();
  fields.weight.value = estimated.toFixed(2);
  cadFileStatus.textContent = 'Finished weight estimated from CAD volume.';
  calculate();
}

function money(value) {
  return moneyFormatter.format(value);
}

async function fetchSpotPrice(symbol, forceRefresh = false) {
  if (!forceRefresh && livePriceCache[symbol]) {
    return livePriceCache[symbol];
  }

  const response = await fetch(`${API_URL}/metal-price/${symbol}`);
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Metal price API request failed');
  }

  if (!Number.isFinite(data.price)) {
    throw new Error('Metal price API returned an invalid price');
  }

  livePriceCache[symbol] = data;
  return data;
}

async function updateLiveMetalPrice(forceRefresh = false) {
  const metal = selectedMetal();

  livePriceButton.disabled = true;
  livePriceStatus.textContent = `Loading ${metal.name} spot price...`;

  try {
    const spot = await fetchSpotPrice(metal.symbol, forceRefresh);
    const pricePerGram = spot.price / TROY_OUNCE_GRAMS * metal.purity;

    fields.metalPrice.value = pricePerGram.toFixed(2);
    livePriceStatus.textContent = `${metal.name}: ${money(pricePerGram)}/g from ${money(spot.price)}/oz spot`;
    calculate();
  } catch (error) {
    livePriceStatus.textContent = 'Live price unavailable. Manual price is still active.';
  } finally {
    livePriceButton.disabled = false;
  }
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

  cadFileInput.value = '';
  cadFileStatus.textContent = 'Upload an STL or mesh-based 3DM file to auto-fill volume, or enter Rhino volume manually.';
  fields.volume.value = '';
  fields.volume.disabled = true;

  calculate();
}

function clearForm() {
  resetForm();
  projectSelector.value = 'new';
  currentProjectId = null;
  deleteProjectButton.style.display = 'none';
}

// Helper for switching auth forms
function switchToSignup() {
  loginForm.classList.remove('active');
  forgotPasswordForm.classList.remove('active');
  resetPasswordForm.classList.remove('active');
  signupForm.classList.add('active');
  loginError.textContent = '';
  forgotError.textContent = '';
  forgotSuccess.textContent = '';
  resetError.textContent = '';
  resetSuccess.textContent = '';
}

function switchToLogin() {
  signupForm.classList.remove('active');
  forgotPasswordForm.classList.remove('active');
  resetPasswordForm.classList.remove('active');
  loginForm.classList.add('active');
  signupError.textContent = '';
  forgotError.textContent = '';
  forgotSuccess.textContent = '';
  resetError.textContent = '';
  resetSuccess.textContent = '';
}

function showForgotPassword() {
  loginForm.classList.remove('active');
  signupForm.classList.remove('active');
  resetPasswordForm.classList.remove('active');
  forgotPasswordForm.classList.add('active');
  loginError.textContent = '';
  signupError.textContent = '';
  resetError.textContent = '';
  resetSuccess.textContent = '';
}

function showResetForm() {
  loginForm.classList.remove('active');
  signupForm.classList.remove('active');
  forgotPasswordForm.classList.remove('active');
  resetPasswordForm.classList.add('active');
  loginError.textContent = '';
  signupError.textContent = '';
  forgotError.textContent = '';
  forgotSuccess.textContent = '';
}

async function handleForgotPassword() {
  const email = document.getElementById('forgotEmail').value.trim().toLowerCase();
  forgotError.textContent = '';
  forgotSuccess.textContent = '';

  if (!email) {
    forgotError.textContent = 'Please enter your email';
    return;
  }

  try {
    const response = await fetch(`${API_URL}/auth/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || 'Unable to send reset link');
    }

    forgotSuccess.textContent = data.message || 'Reset instructions sent if the email exists.';
    if (data.resetUrl) {
      const lineBreak = document.createElement('br');
      const resetLink = document.createElement('a');
      resetLink.href = data.resetUrl;
      resetLink.textContent = 'Open reset link';
      forgotSuccess.appendChild(lineBreak);
      forgotSuccess.appendChild(resetLink);
    }
  } catch (error) {
    forgotError.textContent = error.message;
  }
}

async function handleResetPassword() {
  const token = getQueryParam('resetToken');
  const password = document.getElementById('resetPassword').value;
  const confirmPassword = document.getElementById('resetConfirmPassword').value;

  resetError.textContent = '';
  resetSuccess.textContent = '';

  if (!token) {
    resetError.textContent = 'Reset token is missing. Please use the link sent to your email.';
    return;
  }

  if (!password || !confirmPassword) {
    resetError.textContent = 'Please enter and confirm your new password.';
    return;
  }

  if (password !== confirmPassword) {
    resetError.textContent = 'Passwords do not match.';
    return;
  }

  try {
    const response = await fetch(`${API_URL}/auth/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, password })
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || 'Unable to reset password');
    }

    resetSuccess.textContent = data.message || 'Password reset successfully. You can now log in.';
    setTimeout(() => {
      switchToLogin();
      window.history.replaceState({}, document.title, window.location.pathname);
    }, 1500);
  } catch (error) {
    resetError.textContent = error.message;
  }
}

function getQueryParam(name) {
  return new URLSearchParams(window.location.search).get(name);
}

function checkResetQuery() {
  const token = getQueryParam('resetToken');
  if (token) {
    showResetForm();
  }
}

// Initial calculation
calculate();
