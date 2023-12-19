library(shiny)

long_computation <- function(delay) {
  Sys.sleep(delay)
}

ui <- fluidPage(
  tags$script(
    src = "https://cdn.jsdelivr.net/gh/Appsilon/shiny.tictoc@v0.1.0/shiny-tic-toc.min.js"
  ),
  textInput(inputId = "name", label = ""),
  textOutput(outputId = "hello_message", )
)

server <- function(input, output, session) {
  output$hello_message <- renderText({
    long_computation(delay = 2)

    paste0("Hello ", input$name, "!")
  })
}

shinyApp(ui, server)
