function makeLabel(id, suffix) {
  return `${id}_${suffix}`;
}

function makeStartMarkLabel(id) {
  return makeLabel(id, 'start');
}

function makeEndMarkLabel(id) {
  return makeLabel(id, 'end');
}

function makeMeasurementLabel(id) {
  return makeLabel(id, 'measurement')
}

function startMeasurement(id) {
  const startMarkLabel = makeStartMarkLabel(id);

  performance.mark(startMarkLabel);
}

function endMeasurement(id) {
  const startMarkLabel = makeStartMarkLabel(id);
  const endMarkLabel = makeEndMarkLabel(id);
  const measurementLabel = makeMeasurementLabel(id);

  performance.mark(endMarkLabel);

  performance.measure(
    measurementLabel,
    startMarkLabel,
    endMarkLabel
  );
}

function outputRecalculatingHandler(event) {
  const outputId = event.target.id;

  startMeasurement(outputId);
}

function outputValueHandler(event) {
  const outputId = event.target.id;

  // setTimeout to end measuring after the output JS code is run
  // See https://github.com/rstudio/shiny/issues/2127
  setTimeout(() => {
    endMeasurement(outputId);
  }, 0);
}

function serverBusyHandler(event) {
  startMeasurement("server_computation");
}

function serverIdleHandler(event) {
  endMeasurement("server_computation");
}

function customMessageEventHandler(event) {
  if (event.message.custom === undefined) {
    return;
  }

  const handlerName = Object.keys(event.message.custom)[0];
  startMeasurement(handlerName);

  setTimeout(() => {
    endMeasurement(handlerName);
  }, 0)
}



$(document).ready(function () {
  // Handler for output start marks
  $(document).on('shiny:recalculating', outputRecalculatingHandler);

  // Handler for output end marks
  $(document).on('shiny:value', outputValueHandler);

  // Handler for server calculation start marks
  $(document).on('shiny:busy', serverBusyHandler);

  // Handler for server calculation end marks
  $(document).on('shiny:idle', serverIdleHandler);

  // Handler for custom handlers
  $(document).on('shiny:message', customMessageEventHandler);
});

function showAllMeasurements() {
  const entries = performance.getEntriesByType("measure");

  entries.forEach((entry) => {
    console.log(`${entry.name}'s duration: ${entry.duration}`);
  });
}

function showSummarisedMeasurements() {
  const serverComputationLabel = makeMeasurementLabel("server_computation");
  const measurements = performance.getEntriesByType("measure");

  const slowestServerComputation = Math.max(
    ...measurements
      .filter(entry => entry.name === serverComputationLabel)
      .map(entry => entry.duration)
  );

  const slowestOutputComputation = Math.max(
    ...measurements
      .filter(entry => entry.name !== serverComputationLabel)
      .map(entry => entry.duration)
  );

  const slowestOutputLabel = measurements
    .filter(entry => entry.duration === slowestOutputComputation)
    .map(entry => entry.name)[0];

  console.log(`Slowest Server Computation: ${slowestServerComputation}`);
  console.log(`Slowest output computation: ${slowestOutputComputation} (${slowestOutputLabel})`);
}

function getCurrentDateTime() {
  const currentDate = new Date();

  const year = currentDate.getFullYear();
  const month = String(currentDate.getMonth() + 1).padStart(2, '0'); // Months are zero-based
  const day = String(currentDate.getDate()).padStart(2, '0');
  const hours = String(currentDate.getHours()).padStart(2, '0');
  const minutes = String(currentDate.getMinutes()).padStart(2, '0');
  const seconds = String(currentDate.getSeconds()).padStart(2, '0');

  const formattedDateTime = `${year}_${month}_${day}-${hours}_${minutes}_${seconds}`;

  return formattedDateTime;
}

function downloadFile(content, contentType, filename) {
  const blob = new Blob([content], { type: contentType });

  const link = document.createElement('a')
  const url = window.URL.createObjectURL(blob)
  link.href = url
  link.download = filename

  link.click()
  window.URL.revokeObjectURL(url);
}

function downloadCsvFile(data) {
  const csvContent = data.map(e => e.join(",")).join("\n");

  downloadFile(
    csvContent,
    'text/csv;charset=utf-8',
    `${getCurrentDateTime()}-tictoc.csv`
  )
}

function getMeasurements() {
  return performance.getEntries()
    .filter(entry => entry.entryType === 'measure');
}

function prepareCsvData() {
  const dataHeader = ["measurement_id", "duration (ms)", "start_time"];

  const measurementData = getMeasurements()
    .map(measurement => [measurement.name, measurement.duration, measurement.startTime]);

  const csvData = [dataHeader].concat(measurementData);

  return csvData;
}

function exportMeasurements() {
  csvData = prepareCsvData();

  downloadCsvFile(csvData);
}

// Plotting script
function plotMeasurements() {
  const chartDom = document.getElementById('measurementsTimeline');
  const myChart = echarts.init(chartDom);
  var option;


  const measurementData = JSON.parse(document.getElementById('measurementData').text);
  const measurementIds = measurementData.map(entry => entry.name);
  const uniqueMeasurementIds = [...new Set(measurementIds)];

  const plotData = measurementData.map(
    entry => {
      const measurementIdIndex = uniqueMeasurementIds.indexOf(entry.name);

      return {
        name: entry.name,
        value: [
          measurementIdIndex,
          entry.startTime,
          entry.startTime + entry.duration,
          entry.duration
        ]
      }
    }
  );

  function renderItem(params, api) {
    const categoryIndex = api.value(0);
    const start = api.coord([api.value(1), categoryIndex]);
    const end = api.coord([api.value(2), categoryIndex]);
    const height = api.size([0, 1])[1] * 0.6;
    const rectShape = echarts.graphic.clipRectByRect(
      {
        x: start[0],
        y: start[1] - height / 2,
        width: end[0] - start[0],
        height: height
      },
      {
        x: params.coordSys.x,
        y: params.coordSys.y,
        width: params.coordSys.width,
        height: params.coordSys.height
      }
    );
    return (
      rectShape && {
        type: 'rect',
        transition: ['shape'],
        shape: rectShape,
        style: api.style()
      }
    );
  }

  option = {
    tooltip: {
      formatter: function (params) {
        return params.marker + params.name + ': ' + params.value[3] + ' ms';
      }
    },
    title: {
      text: 'shiny.tictoc report',
      left: 'center'
    },
    dataZoom: [
      {
        type: 'slider',
        filterMode: 'weakFilter',
        showDataShadow: false,
        top: 400,
        labelFormatter: ''
      },
      {
        type: 'inside',
        filterMode: 'weakFilter'
      }
    ],
    grid: {
      height: 300,
      containLabel: true
    },
    xAxis: {
      min: 0,
      scale: true,
      axisLabel: {
        formatter: function (val) {
          return Math.max(0, val) + ' ms';
        }
      }
    },
    yAxis: {
      data: uniqueMeasurementIds
    },
    series: [
      {
        type: 'custom',
        renderItem: renderItem,
        itemStyle: {
          opacity: 0.8
        },
        encode: {
          x: [1, 2],
          y: 0
        },
        data: plotData
      }
    ]
  };

  myChart.setOption(option);
}

async function createHtmlReport() {
  const measurementData = getMeasurements();

  const report = document.implementation.createHTMLDocument("shiny.tictoc report");

  // Data Script
  const dataScript = document.createElement("script");
  dataScript.id = "measurementData";
  dataScript.type = type = "application/json";
  dataScript.innerText = `${JSON.stringify(measurementData)}`;

  // Plot div
  const plotDiv = document.createElement("div");
  plotDiv.id = "measurementsTimeline";
  plotDiv.style.height = "100vh";

  // Echarts script
  const echartsCDN = "https://cdn.jsdelivr.net/npm/echarts@5.4.3/dist/echarts.min.js";
  const echartsLibSourceCode = await fetch(echartsCDN).then(response => response.text());
  const echartsLibraryScriptTag = document.createElement("script");
  echartsLibraryScriptTag.text = echartsLibSourceCode;

  const plottingScript = document.createElement("script");
  plottingScript.text = `${plotMeasurements.toString()}; window.onload = plotMeasurements`;

  report.head.appendChild(echartsLibraryScriptTag);
  report.head.appendChild(dataScript);
  report.head.appendChild(plottingScript);

  report.body.appendChild(plotDiv);

  return report;
}

async function exportHtmlReport() {
  const htmlReport = await createHtmlReport();

  downloadFile(
    htmlReport.documentElement.innerHTML,
    'text/html;charset=utf-8',
    `${getCurrentDateTime()}-tictoc.html`
  )
}
