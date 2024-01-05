# Measuring Custom Handlers

## Introduction

The purpose of this document is to describe challenges related to measuring the time taken by custom message handlers in Shiny and decide on an approach.

The reason why we are considering this is because Shiny apps might be using proxy like objects e.g. `leafletProxy` in their apps and calculations related to proxy objects won't be shown without tracking the `shiny:message` events.

## Challenges

### 1. Custom Message handler events are run before the `shiny:idle` event is triggered

This can be observed by running the following app:

<details>
<summary> App Code </summary>

```r
library(shiny)

ui <- fluidPage(
  tags$script(HTML("
      function sleep(ms) {
            var start = new Date().getTime(), expire = start + ms;
            while (new Date().getTime() < expire) { }
            return;
      }

      const shinyMessageTypes = [
            'shiny:busy',
            'shiny:idle',
            'shiny:inputchanged',
            'shiny:message',
            'shiny:value',
            'shiny:error',
            'shiny:outputinvalidated',
            'shiny:recalculating',
            'shiny:recalculated',
      ]

      function debugEvent(event) {
            let context;

            if (event.message !== undefined && event.message.custom !== undefined) {
                  context = Object.keys(event.message.custom)[0];
            } else if (event.target.id !== undefined) {
                  context = event.target.id
            } else {
                  context = 'document';
            }

            console.log(`${event.type} (${context})`);
      }

      $(document).ready(function () {
            Shiny.addCustomMessageHandler('custom_handler', (message) => {
                  const element = document.getElementById(message.id);

                  console.log('Sleeping...');
                  sleep(2000)
                  console.log('Done sleeping...');

                  element.textContent = `Handler result: Hello ${message.text}!`;
            });

            // Add debug messages
            shinyMessageTypes.forEach((messageType) => {
                  $(document).on(messageType, debugEvent);
            });
      })

  ")),
  textInput(inputId = "name", label = "", placeholder = "Type in your name!"),
  br(),
  actionButton(inputId = "custom_handler_trigger", label = "Run slow custom handler"),
  span(id = "custom_handler_output")
)

server <- function(input, output, session) {
  observe({
    session$sendCustomMessage("custom_handler", list(
      id = "custom_handler_output",
      text = input$name
    ))
  }) |> bindEvent(input$custom_handler_trigger)

}

shinyApp(ui, server)
```

</details>

Here are the logs that appear after clicking the _Run slow custom handler_ button:

```
shiny:inputchanged (custom_handler_trigger)
shiny:message (document)
shiny:busy (document)
shiny:message (custom_handler)
Sleeping...
Done sleeping...
shiny:message (document)
shiny:idle (document)
```

Which shows that the code of the custom handler is run while processing the `shiny:message` and only after it finishes the `shiny:idle` event is triggered.

As a result `shiny.tictoc` would show that there was prolonged server activity when processing the message - which is not the case in our example. 


### 2. Custom Message handlers might schedule [macrotasks or microtasks](https://javascript.info/event-loop) potentially leading to unintuitive results

<details>
<summary> App Code </summary>

```r
library(shiny)

ui <- fluidPage(
  tags$script(HTML("
      function sleep(ms) {
            var start = new Date().getTime(), expire = start + ms;
            while (new Date().getTime() < expire) { }
            return;
      }

      const shinyMessageTypes = [
            'shiny:busy',
            'shiny:idle',
            'shiny:inputchanged',
            'shiny:message',
            'shiny:value',
            'shiny:error',
            'shiny:outputinvalidated',
            'shiny:recalculating',
            'shiny:recalculated',
      ]

      function debugEvent(event) {
            let context;

            if (event.message !== undefined && event.message.custom !== undefined) {
                  context = Object.keys(event.message.custom)[0];
            } else if (event.target.id !== undefined) {
                  context = event.target.id
            } else {
                  context = 'document';
            }

            console.log(`${event.type} (${context})`);
      }

      $(document).ready(function () {
            Shiny.addCustomMessageHandler('custom_handler', (message) => {
                  console.log('custom_handler started!');

                  setTimeout(() => {
                        const element = document.getElementById(message.id);
                        console.log('Sleeping...');
                        sleep(2000)
                        console.log('Done sleeping...');
                        element.textContent = `Handler result: Hello ${message.text}!`;
                  }, 5000);
                  console.log('custom_handler ended!');
            });

            // Add debug messages
            shinyMessageTypes.forEach((messageType) => {
                  $(document).on(messageType, debugEvent);
            });
      })

  ")),
  textInput(inputId = "name", label = "", placeholder = "Type in your name!"),
  br(),
  actionButton(inputId = "custom_handler_trigger", label = "Run slow custom handler"),
  span(id = "custom_handler_output")
)

server <- function(input, output, session) {
  observe({
    session$sendCustomMessage("custom_handler", list(
      id = "custom_handler_output",
      text = input$name
    ))
  }) |> bindEvent(input$custom_handler_trigger)

}

shinyApp(ui, server)
```

</details>

In this case we get the following logs:

```
shiny:inputchanged (custom_handler_trigger)
shiny:message (document)
shiny:busy (document)
shiny:message (custom_handler)
custom_handler started!
custom_handler ended!
shiny:message (document)
shiny:idle (document)
Sleeping...
Done sleeping...
```

In that case measuring how long processing the `shiny:message` event takes would only take into account the task scheduling and not running the actual task.

## Considered Solutions

### 1. Measuring Custom handlers by measuring how long it takes to process the `shiny:message` event
Pros:
(+) Users get more context on what is happening in their apps - if they see a short running custom message handler, then there is a high chance it just scheduled a task
(+) A long server computation in the graph might actually be caused by a slow custom message handler and by including custom message handler measurements, that would be visible in `shiny.tictoc` reports

Cons:
(-) Users might interpret that while running a custom handler, there was server activity happening

### 2. Not measuring custom handlers at all
Pros:
(+) The graph doesn't show that there was server activity happening while running a custom handler
(+) We won't show small measurements in case a custom handler just schedules tasks

Cons:
(-) A long server computation might be caused by a slow custom handler and it won't be showed in the graph and users might be looking for bottlenecks in the wrong place
(-) Users won't be aware of custom handlers running in their apps

## Selected Solution
Measuring custom handlers by measuring how long it takes to process the `shiny:message` event, because showing such information gives additional context. By not showing information we take away from the users the possibility to analyse the measurements on their own, and as potential app developers they know their apps the best.
