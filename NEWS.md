# shiny.tictoc 0.2.0

1. Added `exportHtmlReport()` which provides a self-contained report visualising measurements on a timeline
2. `shiny.tictoc` now measures the time it takes to run [custom message handlers](https://shiny.posit.co/r/articles/build/js-send-message/) by measuring how long it takes to process `shiny:message` events ([see doc](./adr/measuring-custom-handlers.md) for more details) 