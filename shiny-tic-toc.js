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

function outputRecalculatingHandler(event) {
  const outputId = event.target.id;

  const startMarkLabel = makeStartMarkLabel(outputId);

  performance.mark(startMarkLabel);
}

function outputValueHandler(event) {
  const outputId = event.target.id;

  const startMarkLabel = makeStartMarkLabel(outputId);
  const endMarkLabel = makeEndMarkLabel(outputId);
  const measurementLabel = makeMeasurementLabel(outputId);

  // setTimeout to end measuring after the output JS code is run
  // See https://github.com/rstudio/shiny/issues/2127
  setTimeout(() => {
    performance.mark(endMarkLabel);

    performance.measure(
      measurementLabel,
      startMarkLabel,
      endMarkLabel
    );
  }, 0);
}

function serverBusyHandler(event) {
  const startMarkLabel = makeStartMarkLabel("server_computation");

  performance.mark(startMarkLabel);
}

function serverIdleHandler(event) {
  const startMarkLabel = makeStartMarkLabel("server_computation");
  const endMarkLabel = makeEndMarkLabel("server_computation");
  const measurementLabel = makeMeasurementLabel("server_computation");

  performance.mark(endMarkLabel);

  performance.measure(
    measurementLabel,
    startMarkLabel,
    endMarkLabel
  );
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
    measurements
      .filter(entry => entry.name === serverComputationLabel)
      .map(entry => entry.duration)
  );

  const slowestOutputComputation = Math.max(
    measurements
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

function downloadCsvFile(data) {
  const csvContent = data.map(e => e.join(",")).join("\n");

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' })

  const filename = `${getCurrentDateTime()}-tictoc.csv`;

  const link = document.createElement('a')
  const url = window.URL.createObjectURL(blob)
  link.href = url
  link.download = filename

  link.click()
  window.URL.revokeObjectURL(url);
}

function exportMeasurements() {
  const dataHeader = ["measurement_id", "duration (ms)"];

  const measurementData = performance.getEntries()
    .filter(entry => entry.entryType === 'measure')
    .map(measurement => [measurement.name, measurement.duration]);

  const csvData = [dataHeader].concat(measurementData);

  downloadCsvFile(csvData);
}