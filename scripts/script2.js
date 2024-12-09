var map2 = L.map("map2").setView([37.7749, -122.4194], 12);

L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  attribution: "&copy; OpenStreetMap contributors",
}).addTo(map2);

map2.createPane("pane_zipCodes2");
map2.getPane("pane_zipCodes2").style.zIndex = 400;

var incomeMax2 = 250000;
var accidentsMax2 = 8000;
var fatalityRateMax2 = 5;
var avgInjuredMax2 = 5;

function getIncomeColor2(d) {
  return d > 180000
    ? "#800026"
    : d > 160000
    ? "#BD0026"
    : d > 140000
    ? "#E31A1C"
    : d > 120000
    ? "#FC4E2A"
    : d > 100000
    ? "#FD8D3C"
    : d > 80000
    ? "#FEB24C"
    : d > 60000
    ? "#FED976"
    : d > 40000
    ? "#FFEDA0"
    : "#FFFFCC";
}

function zipCodeStyle2(feature) {
  var income = feature.properties.income;
  var totalAccidents = feature.properties.total_accidents;
  var fatalityRate = feature.properties.fatality_rate * 100;
  var avgInjured = feature.properties.avg_injured;

  var meetsCriteria =
    income <= incomeMax2 &&
    totalAccidents <= accidentsMax2 &&
    fatalityRate <= fatalityRateMax2 &&
    avgInjured <= avgInjuredMax2;

  return {
    pane: "pane_zipCodes2",
    fillColor: meetsCriteria ? getIncomeColor2(income) : "#cccccc",
    weight: 2,
    opacity: 1,
    color: "white",
    dashArray: "3",
    fillOpacity: 0.6,
  };
}

var zipCodeLayer2;

fetch("../data/income_accidents.geojson")
  .then((response) => response.json())
  .then((data) => {
    zipCodeLayer2 = L.geoJSON(data, {
      style: zipCodeStyle2,
      onEachFeature: function (feature, layer) {
        var fatalityRate =
          (feature.properties.fatality_rate * 100).toFixed(2) + "%";
        var avgInjured = feature.properties.avg_injured.toFixed(2);

        var tooltipContent =
          "<strong>ZIP Code:</strong> " +
          feature.properties.zip +
          "<br><strong>Median Income:</strong> $" +
          feature.properties.income.toLocaleString() +
          "<br><strong>Total Accidents:</strong> " +
          feature.properties.total_accidents +
          "<br><strong>Fatal Accidents:</strong> " +
          feature.properties.fatal_accidents +
          "<br><strong>Fatality Rate:</strong> " +
          fatalityRate +
          "<br><strong>Avg. Number of Injured People:</strong> " +
          avgInjured;

        layer.bindTooltip(tooltipContent);
      },
    });

    zipCodeLayer2.addTo(map2);
    updateFilters2();
  });

function updateFilters2() {
  incomeMax2 =
    parseInt(document.getElementById("incomeSlider2").value) || 999999;
  accidentsMax2 =
    parseInt(document.getElementById("accidentsSlider2").value) || 999999;
  fatalityRateMax2 =
    parseFloat(document.getElementById("fatalityRateSlider2").value) || 100;
  avgInjuredMax2 =
    parseFloat(document.getElementById("avgInjuredSlider2").value) || 999999;

  document.getElementById("incomeValue2").textContent =
    "≤ $" + incomeMax2.toLocaleString();
  document.getElementById("accidentsValue2").textContent = "≤ " + accidentsMax2;
  document.getElementById("fatalityRateValue2").textContent =
    "≤ " + fatalityRateMax2.toFixed(1) + "%";
  document.getElementById("avgInjuredValue2").textContent =
    "≤ " + avgInjuredMax2.toFixed(1);

  if (zipCodeLayer2) {
    zipCodeLayer2.setStyle(zipCodeStyle2);
  }
}

document
  .getElementById("incomeSlider2")
  .addEventListener("input", updateFilters2);
document
  .getElementById("accidentsSlider2")
  .addEventListener("input", updateFilters2);
document
  .getElementById("fatalityRateSlider2")
  .addEventListener("input", updateFilters2);
document
  .getElementById("avgInjuredSlider2")
  .addEventListener("input", updateFilters2);
