# shiny.tictoc

`{shiny.tictoc}` allows you to measure:

1. How much time your Shiny app is spending doing server side calculations
2. How long does it take to recalculate outputs in your app

and export results in form of a CSV file. All that without the need of installing additional software and setting up testing scenarios - everything happens in the browser.

## Getting Started

To start using `shiny.tictoc` in your app, just add the following line somewhere in your UI definition (see example  [here](./examples/app.R)):

```r
tags$script(
    src = "https://cdn.jsdelivr.net/gh/Appsilon/shiny.tictoc@v0.2.0/shiny-tic-toc.min.js"
)
```

Next, open your app and interact with it. 

To access the benchmarks [open the browser devtools](https://developer.mozilla.org/en-US/docs/Learn/Common_questions/Tools_and_setup/What_are_browser_developer_tools) (Windows: <kbd>F12</kbd>, macOS <kbd>⌘</kbd> + <kbd>⌥</kbd> + <kbd>I</kbd>) and in the console run:

```js
// Print out all measurements
showAllMeasurements()

// To download all measurements as a CSV file
exportMeasurements()

// To print out summarised measurements (slowest rendering output, slowest server computation)
showSummarisedMeasurements()

// To export an html file that visualizes measurements on a timeline
await exportHtmlReport()
```