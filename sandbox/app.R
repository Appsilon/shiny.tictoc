# This app is used for local testing purposes

library(shiny)

long_computation <- function(delay) {
  Sys.sleep(delay)
}

ui <- fluidPage(
  includeScript(
    path = "../shiny-tic-toc.js"
  ),
  tags$script(src = "main.js"),
  textInput(inputId = "name", label = "", placeholder = "Type in your name!"),
  br(),
  actionButton(inputId = "long_server_computation", label = "Run slow server computation"),
  textOutput(outputId = "hello_message", inline = TRUE),
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

  output$hello_message <- renderText({
    Sys.sleep(2.5)
    paste0("Server computation result: Hello ", input$name, "!")
  }) |> bindEvent(input$long_server_computation)
}

shinyApp(ui, server)
