document.addEventListener('DOMContentLoaded', function() {
    const findButton = document.getElementById('findText');
    const resetButton = document.getElementById('resetHighlights');
    const messageDiv = document.getElementById('message');
    const textInput = document.getElementById('textInput'); // Get the textarea element

    // Set focus to the textarea
    textInput.focus();

    findButton.addEventListener('click', function() {
        const text = textInput.value.trim(); // Use the textarea value
        if (!text) {
            messageDiv.textContent = 'Please enter text to search.';
            return;
        }

        // Create a regex that captures all phrases, joining them with '|'
        const phrases = text.split('\n').map(phrase => phrase.trim()).filter(Boolean);
        const searchRegex = phrases.join('|'); // Create a regex that captures all phrases

        // Send the search request to the content script
        chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
            chrome.tabs.sendMessage(tabs[0].id, { searchRegex: searchRegex }, function(response) {
                if (response && response.matches) {
                    // Response includes found matches
                    const foundSentences = response.matches;
                    const notFoundSentences = phrases.filter(phrase => !foundSentences.map(match => match.phrase).includes(phrase));
                    
                    // Format not found sentences for display
                    if (notFoundSentences.length > 0) {
                        messageDiv.innerHTML = '<span style="color: red;">Not found sentences:</span>' + notFoundSentences.map(sentence => sentence).join('<br>');
                    } else {
                        messageDiv.textContent = 'All sentences found!';
                    }

                    // Display duplicate sentences with counts
                    const duplicates = foundSentences.filter(match => match.count > 1);
                    if (duplicates.length > 0) {
                        messageDiv.innerHTML += '<br><span style="color: blue;"><strong>Duplicate Sentences:</span></strong>' + 
                                                duplicates.map(match => `${match.phrase} (found ${match.count} times)`).join('<br>');
                    }
                } else {
                    messageDiv.textContent = 'No matches found.';
                }
            });
        });
    });

    // Reset highlights when reset button is clicked
    resetButton.addEventListener('click', function() {
        chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
            chrome.tabs.sendMessage(tabs[0].id, { action: 'reset' }, function(response) {
                if (response && response.message) {
                    messageDiv.textContent = response.message;
                }
            });
        });
    });
});
