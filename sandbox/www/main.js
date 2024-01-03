function sleep(ms) {
      var start = new Date().getTime(), expire = start + ms;
      while (new Date().getTime() < expire) { }
      return;
}

const shinyMessageTypes = [
      "shiny:busy",
      "shiny:idle",
      "shiny:inputchanged",
      "shiny:message",
      "shiny:value",
      "shiny:error",
      "shiny:outputinvalidated",
      "shiny:recalculating",
      "shiny:recalculated",
]

function debugEvent(event) {
      let context;

      if (event.message !== undefined && event.message.custom !== undefined) {
            context = Object.keys(event.message.custom)[0];
      } else if (event.target.id !== undefined) {
            context = event.target.id
      } else {
            context = "document";
      }

      console.log(`${event.type} (${context})`);
}

$(document).ready(function () {
      Shiny.addCustomMessageHandler('custom_handler', (message) => {
            const element = document.getElementById(message.id);
            element.textContent = 'Running handler...'

            console.log("Sleeping...");
            sleep(2000)
            console.log("Done sleeping...");

            element.textContent = `Handler result: Hello ${message.text}!`;
      });

      // Add debug messages
      shinyMessageTypes.forEach((messageType) => {
            $(document).on(messageType, debugEvent);
      });
})
