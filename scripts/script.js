var map = L.map("map").setView([37.7749, -122.4194], 13);

L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  attribution: "&copy; OpenStreetMap contributors",
}).addTo(map);

map.createPane("pane_crimeHeatmap");
map.getPane("pane_crimeHeatmap").style.zIndex = 300;
map.createPane("pane_income");
map.getPane("pane_income").style.zIndex = 400;
map.createPane("pane_crashData");
map.getPane("pane_crashData").style.zIndex = 500;

var overlayMaps = {};
var controlLayers = L.control
  .layers(null, overlayMaps, {
    collapsed: false,
  })
  .addTo(map);

function accidentMarkerStyle(feature) {
  return {
    pane: "pane_crashData",
    radius: 4,
    fillColor: "#FF0000",
    color: "#FFFFFF",
    weight: 1,
    opacity: 1,
    fillOpacity: 0.8,
  };
}

fetch("../data/accidentData.geojson")
  .then((response) => response.json())
  .then((data) => {
    var accidentLayer = L.geoJSON(data, {
      pane: "pane_crashData",
      pointToLayer: function (feature, latlng) {
        return L.circleMarker(latlng, accidentMarkerStyle(feature));
      },
      onEachFeature: function (feature, layer) {
        var popupContent =
          "<strong>Collision Date:</strong> " +
          feature.properties.collision_date +
          "<br><strong>Severity:</strong> " +
          feature.properties.collision_severity +
          "<br><strong>Primary Road:</strong> " +
          feature.properties.primary_rd;
        layer.bindTooltip(popupContent);
      },
    });
    overlayMaps["Traffic Accidents"] = accidentLayer;
    controlLayers.addOverlay(accidentLayer, "Traffic Accidents");
  });

function getIncomeColor(d) {
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

function incomeStyle(feature) {
  return {
    pane: "pane_income",
    fillColor: getIncomeColor(feature.properties.income),
    weight: 2,
    opacity: 1,
    color: "white",
    dashArray: "3",
    fillOpacity: 0.6,
  };
}

fetch("../data/incomeData.geojson")
  .then((response) => response.json())
  .then((data) => {
    var incomeLayer = L.geoJSON(data, {
      style: incomeStyle,
      onEachFeature: function (feature, layer) {
        layer.bindTooltip(
          "ZIP: " +
            feature.properties.zip +
            "<br>Median Income: $" +
            feature.properties.income
        );
      },
    });
  });

fetch("../data/crimeData.geojson")
  .then((response) => response.json())
  .then((data) => {
    var crimePoints = data.features.map(function (feature) {
      var count = feature.properties.count || 1;
      var intensity = Math.log(count + 1);
      return [
        feature.geometry.coordinates[1],
        feature.geometry.coordinates[0],
        intensity,
      ];
    });

    var crimeHeatLayer = L.heatLayer(crimePoints, {
      pane: "pane_crimeHeatmap",
      radius: 10,
      blur: 15,
      maxZoom: 17,
      max: 5,
      gradient: {
        0.0: "blue",
        0.2: "cyan",
        0.4: "lime",
        0.6: "yellow",
        0.8: "orange",
        1.0: "red",
      },
    });

    overlayMaps["Crime Heatmap"] = crimeHeatLayer;
    controlLayers.addOverlay(crimeHeatLayer, "Crime Heatmap");
  });

var incomeLegend = L.control({ position: "bottomright" });

incomeLegend.onAdd = function (map) {
  var div = L.DomUtil.create("div", "info legend");

  div.innerHTML += "<strong>Median Income</strong><br>";

  var incomeThresholds = [40000, 250000];
  var incomeColors = [
    "#FFFFCC",
    "#FFEDA0",
    "#FED976",
    "#FD8D3C",
    "#FC4E2A",
    "#E31A1C",
    "#BD0026",
    "#800026",
  ];

  var gradientBar =
    '<div style="width: 200px; height: 20px; background: linear-gradient(to right, ';

  for (var i = 0; i < incomeColors.length; i++) {
    var color = incomeColors[i];
    var percent = (i / (incomeColors.length - 1)) * 100;
    gradientBar += color + " " + percent + "%, ";
  }
  gradientBar = gradientBar.slice(0, -2);
  gradientBar += ');"></div>';

  div.innerHTML += gradientBar;

  // Add labels below the gradient
  var labels = '<div style="display: flex; justify-content: space-between;">';
  for (var i = 0; i < incomeThresholds.length; i++) {
    labels += "<span>" + "$" + incomeThresholds[i].toLocaleString() + "</span>";
  }
  labels += "</div>";

  div.innerHTML += labels;

  return div;
};

var heatmapLegend = L.control({ position: "bottomleft" });

heatmapLegend.onAdd = function (map) {
  var div = L.DomUtil.create("div", "info legend");

  div.innerHTML += "<strong>Crime Density</strong><br>";

  var crimeColors = ["cyan", "lime", "yellow", "orange", "red"];

  var gradientBar =
    '<div style="width: 200px; height: 20px; background: linear-gradient(to right, ';

  for (var i = 0; i < crimeColors.length; i++) {
    var color = crimeColors[i];
    var percent = (i / (crimeColors.length - 1)) * 100;
    gradientBar += color + " " + percent + "%, ";
  }
  gradientBar = gradientBar.slice(0, -2);
  gradientBar += ');"></div>';

  div.innerHTML += gradientBar;

  var labels = '<div style="display: flex; justify-content: space-between;">';
  var densityLabels = ["Low", "", "", "", "", "High"];
  for (var i = 0; i < densityLabels.length; i++) {
    labels += "<span>" + densityLabels[i] + "</span>";
  }
  labels += "</div>";

  div.innerHTML += labels;

  return div;
};

var incomeLegendAdded = false;
var heatmapLegendAdded = false;

map.on("overlayadd", function (e) {
  if (e.name === "Income by ZIP Code") {
    if (!incomeLegendAdded) {
      incomeLegend.addTo(map);
      incomeLegendAdded = true;
    }
  }
  if (e.name === "Crime Heatmap") {
    if (!heatmapLegendAdded) {
      heatmapLegend.addTo(map);
      heatmapLegendAdded = true;
    }
  }
});

map.on("overlayremove", function (e) {
  if (e.name === "Income by ZIP Code") {
    map.removeControl(incomeLegend);
    incomeLegendAdded = false;
  }
  if (e.name === "Crime Heatmap") {
    map.removeControl(heatmapLegend);
    heatmapLegendAdded = false;
  }
});
