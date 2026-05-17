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

const TROY_OUNCE_GRAMS = 31.1034768;
const SAVED_QUOTES_KEY = "jewelryPricingQuotes";
const livePriceCache = {};
let latestEstimate = {};
let isCadWeightActive = false;

const fields = Object.keys(defaults).reduce((items, key) => {
  items[key] = document.getElementById(key);
  return items;
}, {});

const livePriceButton = document.getElementById("livePriceButton");
const livePriceStatus = document.getElementById("livePriceStatus");
const cadFileInput = document.getElementById("cadFile");
const cadFileStatus = document.getElementById("cadFileStatus");
const cadWeightButton = document.getElementById("cadWeightButton");
const cadWeightStatus = document.getElementById("cadWeightStatus");
const saveQuoteButton = document.getElementById("saveQuoteButton");
const quoteSaveStatus = document.getElementById("quoteSaveStatus");
const savedQuotesCount = document.getElementById("savedQuotesCount");
const savedQuotesList = document.getElementById("savedQuotesList");

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

function numberValue(id) {
  return Number.parseFloat(fields[id].value) || 0;
}

function cadWeightValue() {
  return numberValue("volume") * numberValue("metalType") / 1000;
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

function getFormData() {
  return Object.keys(defaults).reduce((data, key) => {
    data[key] = fields[key].value;
    return data;
  }, {});
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
  const subtotal = materialsCost + laborCost + numberValue("packagingCost");
  const overheadCost = subtotal * numberValue("overheadPercent") / 100;
  const productionCost = subtotal + overheadCost;
  const wholesalePrice = productionCost * (1 + numberValue("wholesaleMarkup") / 100);
  const retailBeforeTax = productionCost * (1 + numberValue("retailMarkup") / 100);
  const retailWithTax = retailBeforeTax * (1 + numberValue("taxPercent") / 100);
  const profit = retailBeforeTax - productionCost;

  latestEstimate = {
    metalName: metal.name,
    cadWeight,
    metalCost,
    materialsCost,
    laborCost,
    overheadCost,
    productionCost,
    wholesalePrice,
    retailBeforeTax,
    retailWithTax,
    profit
  };

  output.pieceLabel.textContent = fields.pieceName.value || "Untitled piece";
  output.cadWeight.textContent = `${cadWeight.toFixed(2)} g`;
  output.metalCost.textContent = money(metalCost);
  output.materialsCost.textContent = money(materialsCost);
  output.laborCost.textContent = money(laborCost);
  output.overheadCost.textContent = money(overheadCost);
  output.productionCost.textContent = money(productionCost);
  output.wholesalePrice.textContent = money(wholesalePrice);
  output.retailBeforeTax.textContent = money(retailBeforeTax);
  output.retailWithTax.textContent = money(retailWithTax);
  output.retailPrice.textContent = money(retailBeforeTax);
  output.profitText.textContent = `${money(profit)} estimated profit before tax`;
}

function readSavedQuotes() {
  try {
    return JSON.parse(localStorage.getItem(SAVED_QUOTES_KEY)) || [];
  } catch (error) {
    return [];
  }
}

function writeSavedQuotes(quotes) {
  localStorage.setItem(SAVED_QUOTES_KEY, JSON.stringify(quotes));
}

function formatSavedDate(value) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).format(new Date(value));
}

function createQuoteId() {
  if (window.crypto && crypto.randomUUID) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function renderSavedQuotes() {
  const quotes = readSavedQuotes();

  savedQuotesCount.textContent = `${quotes.length} saved`;
  savedQuotesList.innerHTML = "";

  if (quotes.length === 0) {
    savedQuotesList.innerHTML = '<p class="empty-state">Saved quotes will appear here.</p>';
    return;
  }

  quotes.forEach((quote) => {
    const item = document.createElement("article");
    item.className = "saved-quote";

    const title = document.createElement("div");
    const name = document.createElement("strong");
    const meta = document.createElement("span");
    name.textContent = quote.pieceName;
    meta.textContent = `${quote.estimate.metalName} - ${formatSavedDate(quote.savedAt)}`;
    title.append(name, meta);

    const totals = document.createElement("dl");
    [
      ["Retail", quote.estimate.retailBeforeTax],
      ["Cost", quote.estimate.productionCost]
    ].forEach(([label, value]) => {
      const row = document.createElement("div");
      const term = document.createElement("dt");
      const amount = document.createElement("dd");
      term.textContent = label;
      amount.textContent = money(value);
      row.append(term, amount);
      totals.appendChild(row);
    });

    const actions = document.createElement("div");
    const loadButton = document.createElement("button");
    const deleteButton = document.createElement("button");
    actions.className = "saved-quote-actions";
    loadButton.type = "button";
    loadButton.dataset.action = "load";
    loadButton.dataset.id = quote.id;
    loadButton.textContent = "Load";
    deleteButton.type = "button";
    deleteButton.dataset.action = "delete";
    deleteButton.dataset.id = quote.id;
    deleteButton.textContent = "Delete";
    actions.append(loadButton, deleteButton);

    item.append(title, totals, actions);

    savedQuotesList.appendChild(item);
  });
}

function saveCurrentQuote() {
  calculate();

  const quote = {
    id: createQuoteId(),
    savedAt: new Date().toISOString(),
    pieceName: fields.pieceName.value || "Untitled piece",
    priceSource: livePriceStatus.textContent,
    inputs: getFormData(),
    estimate: latestEstimate
  };

  const quotes = readSavedQuotes();
  quotes.unshift(quote);
  writeSavedQuotes(quotes);
  renderSavedQuotes();

  quoteSaveStatus.textContent = `Saved ${quote.pieceName} at ${money(quote.estimate.retailBeforeTax)}`;
}

function loadQuote(id) {
  const quote = readSavedQuotes().find((item) => item.id === id);

  if (!quote) {
    return;
  }

  Object.entries(quote.inputs).forEach(([key, value]) => {
    fields[key].value = value;
  });

  livePriceStatus.textContent = quote.priceSource || "Loaded saved metal price";
  quoteSaveStatus.textContent = `Loaded ${quote.pieceName}`;
  calculate();
}

function deleteQuote(id) {
  const quotes = readSavedQuotes().filter((quote) => quote.id !== id);
  writeSavedQuotes(quotes);
  renderSavedQuotes();
  quoteSaveStatus.textContent = "Saved quote deleted";
}

function useCadWeightEstimate() {
  const cadWeight = cadWeightValue();

  if (!Number.isFinite(cadWeight) || cadWeight <= 0) {
    cadWeightStatus.textContent = "Enter a valid volume and metal first.";
    return;
  }

  isCadWeightActive = true;
  fields.weight.value = cadWeight.toFixed(2);
  cadWeightStatus.textContent = `Using CAD estimate: ${cadWeight.toFixed(2)} g`;
  calculate();
}

function triangleVolume(a, b, c) {
  return (
    a.x * (b.y * c.z - b.z * c.y) -
    a.y * (b.x * c.z - b.z * c.x) +
    a.z * (b.x * c.y - b.y * c.x)
  ) / 6;
}

function calculateMeshVolume(triangles) {
  const signedVolume = triangles.reduce((total, triangle) => {
    return total + triangleVolume(triangle[0], triangle[1], triangle[2]);
  }, 0);

  return Math.abs(signedVolume);
}

function parseBinaryStl(buffer) {
  const view = new DataView(buffer);
  const triangleCount = view.getUint32(80, true);
  const expectedSize = 84 + triangleCount * 50;

  if (buffer.byteLength < expectedSize) {
    throw new Error("Binary STL file looks incomplete.");
  }

  const triangles = [];
  let offset = 84;

  for (let index = 0; index < triangleCount; index += 1) {
    offset += 12;

    const triangle = [];

    for (let vertex = 0; vertex < 3; vertex += 1) {
      triangle.push({
        x: view.getFloat32(offset, true),
        y: view.getFloat32(offset + 4, true),
        z: view.getFloat32(offset + 8, true)
      });
      offset += 12;
    }

    triangles.push(triangle);
    offset += 2;
  }

  return calculateMeshVolume(triangles);
}

function parseAsciiStl(text) {
  const vertices = [...text.matchAll(/vertex\s+([+-]?\d*\.?\d+(?:e[+-]?\d+)?)\s+([+-]?\d*\.?\d+(?:e[+-]?\d+)?)\s+([+-]?\d*\.?\d+(?:e[+-]?\d+)?)/gi)]
    .map((match) => ({
      x: Number.parseFloat(match[1]),
      y: Number.parseFloat(match[2]),
      z: Number.parseFloat(match[3])
    }));

  if (vertices.length < 3 || vertices.length % 3 !== 0) {
    throw new Error("ASCII STL file does not contain valid triangle vertices.");
  }

  const triangles = [];

  for (let index = 0; index < vertices.length; index += 3) {
    triangles.push(vertices.slice(index, index + 3));
  }

  return calculateMeshVolume(triangles);
}

function isAsciiStl(buffer) {
  const header = new TextDecoder().decode(buffer.slice(0, Math.min(buffer.byteLength, 512))).trimStart();
  const view = new DataView(buffer);

  if (!header.startsWith("solid")) {
    return false;
  }

  if (buffer.byteLength < 84) {
    return true;
  }

  const triangleCount = view.getUint32(80, true);
  return 84 + triangleCount * 50 !== buffer.byteLength;
}

async function handleCadFileUpload(event) {
  const file = event.target.files[0];

  if (!file) {
    return;
  }

  const extension = file.name.split(".").pop().toLowerCase();
  cadFileStatus.textContent = `Reading ${file.name}...`;

  if (extension === "3dm") {
    cadFileStatus.textContent = "3DM uploaded, but this browser app cannot run Rhino's Volume command yet. Export the model as STL from Rhino, then upload the STL.";
    return;
  }

  if (extension !== "stl") {
    cadFileStatus.textContent = "Unsupported file type. Upload an STL file, or export your Rhino model as STL first.";
    return;
  }

  try {
    const buffer = await file.arrayBuffer();
    const volume = isAsciiStl(buffer)
      ? parseAsciiStl(new TextDecoder().decode(buffer))
      : parseBinaryStl(buffer);

    fields.volume.value = volume.toFixed(2);
    isCadWeightActive = true;
    useCadWeightEstimate();
    cadFileStatus.textContent = `${file.name}: ${volume.toFixed(2)} mm³ scanned. Weight now uses CAD volume and selected metal.`;
  } catch (error) {
    cadFileStatus.textContent = `Could not scan volume: ${error.message}`;
  }
}

async function fetchSpotPrice(symbol, forceRefresh = false) {
  if (!forceRefresh && livePriceCache[symbol]) {
    return livePriceCache[symbol];
  }

  const response = await fetch(`https://api.gold-api.com/price/${symbol}`);

  if (!response.ok) {
    throw new Error("Metal price API request failed");
  }

  const data = await response.json();

  if (!Number.isFinite(data.price)) {
    throw new Error("Metal price API returned an invalid price");
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
    livePriceStatus.textContent = "Live price unavailable. Manual price is still active.";
  } finally {
    livePriceButton.disabled = false;
  }
}

function resetForm() {
  Object.entries(defaults).forEach(([key, value]) => {
    fields[key].value = value;
  });
  cadFileInput.value = "";
  cadFileStatus.textContent = "STL files can auto-fill volume. 3DM needs Rhino export or a Rhino.Compute backend.";
  cadWeightStatus.textContent = "Uses volume × selected metal density";
  isCadWeightActive = false;
  calculate();
}

function resetFormWithLivePrice() {
  resetForm();
  fields.weight.value = defaults.weight;
  updateLiveMetalPrice();
}

document.getElementById("pricingForm").addEventListener("input", (event) => {
  if (event.target === fields.weight) {
    isCadWeightActive = false;
    cadWeightStatus.textContent = "Manual finished weight active";
  }

  if (event.target === fields.volume && isCadWeightActive) {
    useCadWeightEstimate();
    return;
  }

  calculate();
});
document.getElementById("resetButton").addEventListener("click", resetFormWithLivePrice);
fields.metalType.addEventListener("change", () => {
  updateLiveMetalPrice();

  if (isCadWeightActive) {
    useCadWeightEstimate();
  }
});
livePriceButton.addEventListener("click", () => updateLiveMetalPrice(true));
cadFileInput.addEventListener("change", handleCadFileUpload);
cadWeightButton.addEventListener("click", useCadWeightEstimate);
saveQuoteButton.addEventListener("click", saveCurrentQuote);
savedQuotesList.addEventListener("click", (event) => {
  const button = event.target.closest("button");

  if (!button) {
    return;
  }

  if (button.dataset.action === "load") {
    loadQuote(button.dataset.id);
  }

  if (button.dataset.action === "delete") {
    deleteQuote(button.dataset.id);
  }
});

resetFormWithLivePrice();
renderSavedQuotes();
