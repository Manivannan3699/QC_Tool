chrome.commands.onCommand.addListener(function(command) {
    if (command === "open_multi_line_finder") {
        chrome.action.openPopup(); // Opens the popup when the shortcut is pressed
    }
});
