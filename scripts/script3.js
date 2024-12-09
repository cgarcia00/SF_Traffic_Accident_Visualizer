const margin = { top: 20, right: 30, bottom: 130, left: 80 },
  width = 800 - margin.left - margin.right,
  height = 500 - margin.top - margin.bottom;

const svg = d3
  .select("#barChart")
  .attr("width", width + margin.left + margin.right)
  .attr("height", height + margin.top + margin.bottom)
  .append("g")
  .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

const x = d3.scaleBand().range([0, width]).padding(0.1);
const y = d3.scaleLinear().range([height, 0]);

const xAxis = svg
  .append("g")
  .attr("transform", "translate(0," + height + ")")
  .attr("class", "axis");

const yAxis = svg.append("g").attr("class", "axis");

const tooltip = d3.select("body").append("div").attr("class", "tooltip");

const xAxisLabel = svg
  .append("text")
  .attr("class", "x label")
  .attr("text-anchor", "middle")
  .attr("x", width / 2)
  .attr("y", height + margin.bottom - 50)
  .text("");

const yAxisLabel = svg
  .append("text")
  .attr("class", "y label")
  .attr("text-anchor", "middle")
  .attr("transform", "rotate(-90)")
  .attr("x", -height / 2)
  .attr("y", -margin.left + 20)
  .text("Number of Incidents");

const daysOrder = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];
const monthsOrder = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

function aggregateByDay(data) {
  const dayCounts = d3.rollup(
    data,
    (v) => v.length,
    (d) => d.day_of_week
  );

  const dayData = daysOrder.map((day) => ({
    day: day,
    count: dayCounts.get(day) || 0,
  }));

  return dayData;
}

function aggregateByMonth(data) {
  const monthCounts = d3.rollup(
    data,
    (v) => v.length,
    (d) => d.month
  );

  const monthData = monthsOrder.map((month) => ({
    month: month,
    count: monthCounts.get(month) || 0,
  }));

  return monthData;
}

function aggregateByYear(data) {
  const years = Array.from(new Set(data.map((d) => d.accident_year))).sort(
    (a, b) => a - b
  );
  const yearCounts = d3.rollup(
    data,
    (v) => v.length,
    (d) => d.accident_year
  );

  const yearData = years.map((year) => ({
    year: year,
    count: yearCounts.get(year) || 0,
  }));

  return yearData;
}

function aggregateByHour(data) {
  const hourCounts = d3.rollup(
    data.filter((d) => d.hour !== null),
    (v) => v.length,
    (d) => d.hour
  );

  const hourData = [];
  for (let i = 0; i < 24; i++) {
    hourData.push({
      hour: i,
      count: hourCounts.get(i) || 0,
    });
  }

  return hourData;
}

function aggregateByWeather(data) {
  const weatherCounts = d3.rollup(
    data,
    (v) => v.length,
    (d) => d.weather_1
  );

  const weatherData = Array.from(weatherCounts, ([weather, count]) => ({
    weather: weather,
    count: count,
  }))
    .sort((a, b) => b.count - a.count)
    .filter((data) => data.count > 200);

  return weatherData;
}

function update(data, xKey) {
  x.domain(data.map((d) => d[xKey]));
  y.domain([0, d3.max(data, (d) => d.count)]);

  xAxis
    .transition()
    .duration(1000)
    .call(
      d3.axisBottom(x).tickFormat(function (d) {
        if (xKey === "hour") {
          return d + ":00";
        } else {
          return d;
        }
      })
    )
    .selectAll("text")
    .attr("transform", "rotate(-45)")
    .style("text-anchor", "end");

  let xLabel = "";
  if (xKey === "day") xLabel = "Day of Week";
  else if (xKey === "month") xLabel = "Month";
  else if (xKey === "year") xLabel = "Year";
  else if (xKey === "hour") xLabel = "Hour of Day";
  else if (xKey === "weather") xLabel = "Weather Conditions";

  xAxisLabel.text(xLabel);

  yAxis.transition().duration(1000).call(d3.axisLeft(y));

  const bars = svg.selectAll(".bar").data(data, (d) => d[xKey]);

  bars
    .exit()
    .transition()
    .duration(1000)
    .attr("y", y(0))
    .attr("height", height - y(0))
    .style("fill-opacity", 0)
    .remove();

  bars
    .transition()
    .duration(1000)
    .attr("x", (d) => x(d[xKey]))
    .attr("y", (d) => y(d.count))
    .attr("width", x.bandwidth())
    .attr("height", (d) => height - y(d.count));

  bars
    .enter()
    .append("rect")
    .attr("class", "bar")
    .attr("x", (d) => x(d[xKey]))
    .attr("width", x.bandwidth())
    .attr("y", y(0))
    .attr("height", height - y(0))
    .on("mouseover", function (event, d) {
      let keyLabel = "";
      if (xKey === "hour") {
        keyLabel = d[xKey] + ":00 - " + d[xKey] + ":59";
      } else {
        keyLabel = d[xKey];
      }
      tooltip.transition().duration(200).style("opacity", 0.9);
      tooltip
        .html("<strong>" + keyLabel + "</strong><br/>" + d.count + " incidents")
        .style("left", event.pageX + 5 + "px")
        .style("top", event.pageY - 28 + "px");
      d3.select(this).style("fill", "darkorange");
    })
    .on("mouseout", function () {
      tooltip.transition().duration(500).style("opacity", 0);
      d3.select(this).style("fill", "steelblue");
    })
    .transition()
    .duration(1000)
    .attr("y", (d) => y(d.count))
    .attr("height", (d) => height - y(d.count));
}

d3.csv("../data/SF_Traffic_Data_Full.csv").then(function (data) {
  data.forEach((d) => {
    d.accident_year = +d.accident_year;

    const date = new Date(d.collision_datetime);
    if (!isNaN(date)) {
      d.accident_year = date.getFullYear();
      d.month = monthsOrder[date.getMonth()];
      d.day_of_week = daysOrder[date.getDay()];
    } else {
      console.warn("Invalid date:", d.collision_datetime);
    }

    let time = d.collision_time.trim();
    let hour;

    if (time.includes("AM") || time.includes("PM")) {
      let dateObj = new Date("1970-01-01 " + time);
      if (!isNaN(dateObj)) {
        hour = dateObj.getHours();
      }
    } else {
      let parts = time.split(":");
      hour = parseInt(parts[0], 10);
    }

    if (!isNaN(hour)) {
      d.hour = hour;
    } else {
      console.warn("Invalid time:", d.collision_time);
      d.hour = null;
    }

    d.weather_1 = d.weather_1.trim();
    d.weather_1 =
      d.weather_1.charAt(0).toUpperCase() + d.weather_1.slice(1).toLowerCase();
  });

  let currentData = aggregateByDay(data);
  update(currentData, "day");

  d3.select("#dayButton").classed("active", true);

  d3.select("#dayButton").on("click", function () {
    currentData = aggregateByDay(data);
    update(currentData, "day");
    d3.selectAll(".buttons button").classed("active", false);
    d3.select(this).classed("active", true);
  });

  d3.select("#monthButton").on("click", function () {
    currentData = aggregateByMonth(data);
    update(currentData, "month");
    d3.selectAll(".buttons button").classed("active", false);
    d3.select(this).classed("active", true);
  });

  d3.select("#yearButton").on("click", function () {
    currentData = aggregateByYear(data);
    update(currentData, "year");
    d3.selectAll(".buttons button").classed("active", false);
    d3.select(this).classed("active", true);
  });

  d3.select("#hourButton").on("click", function () {
    currentData = aggregateByHour(data);
    update(currentData, "hour");
    d3.selectAll(".buttons button").classed("active", false);
    d3.select(this).classed("active", true);
  });

  d3.select("#weatherButton").on("click", function () {
    currentData = aggregateByWeather(data);
    update(currentData, "weather");
    d3.selectAll(".buttons button").classed("active", false);
    d3.select(this).classed("active", true);
  });
});
