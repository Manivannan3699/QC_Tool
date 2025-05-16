chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
    if (request.searchRegex) {
        function createFlexibleRegex(input) {
            const escapedInput = input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            return escapedInput.replace(/\s+/g, '\\s*');
        }

        const searchPhrases = request.searchRegex
            .split('|')
            .map(phrase => createFlexibleRegex(phrase.trim()));
        const regex = new RegExp(`(${searchPhrases.join('|')})`, 'gi');

        const foundMatches = {};
        const allMatches = [];

        const nodeMap = [];
        let fullText = '';

        function walk(node) {
            if (node.nodeType === Node.TEXT_NODE) {
                nodeMap.push({
                    node,
                    start: fullText.length,
                    length: node.nodeValue.length
                });
                fullText += node.nodeValue;
            } else if (
                node.nodeType === Node.ELEMENT_NODE &&
                window.getComputedStyle(node).display !== 'none' &&
                !['SCRIPT', 'STYLE', 'TEXTAREA', 'INPUT', 'SELECT', 'BUTTON'].includes(node.tagName)
            ) {
                for (let child of node.childNodes) {
                    walk(child);
                }
            }
        }

        walk(document.body);

        let match;
        const matches = [];
        while ((match = regex.exec(fullText)) !== null) {
            const matchText = match[0];
            const trimmed = matchText.trim();
            allMatches.push(trimmed);
            foundMatches[trimmed] = (foundMatches[trimmed] || 0) + 1;
            matches.push({ start: match.index, end: regex.lastIndex, text: matchText });
        }

        matches.reverse().forEach(({ start, end, text }) => {
            const trimmedText = text.trim();
            const isDuplicate = foundMatches[trimmedText] > 1;

            let i = 0;
            while (i < nodeMap.length && nodeMap[i].start + nodeMap[i].length <= start) i++;

            while (i < nodeMap.length && nodeMap[i].start < end) {
                const { node, start: nodeStart, length } = nodeMap[i];
                const nodeEnd = nodeStart + length;

                const relativeStart = Math.max(0, start - nodeStart);
                const relativeEnd = Math.min(length, end - nodeStart);

                const original = node.nodeValue;
                const before = original.slice(0, relativeStart);
                const middle = original.slice(relativeStart, relativeEnd);
                const after = original.slice(relativeEnd);

                const span = document.createElement('span');
                span.className = 'highlight';
                
                // Detect formatting from parent
                const parentStyle = window.getComputedStyle(node.parentNode);
                let bgColor = 'yellow';

                if (isDuplicate) {
                    bgColor = 'orange';
                } else if (parentStyle.fontWeight === '700' || parentStyle.fontWeight >= 600) {
                    bgColor = 'lightgreen';
                } else if (parentStyle.fontStyle === 'italic') {
                    bgColor = 'lightblue';
                } else if (parentStyle.textDecorationLine.includes('underline')) {
                    bgColor = 'plum';
                }

                span.style.backgroundColor = bgColor;
                span.textContent = middle;

                const fragment = document.createDocumentFragment();
                if (before) fragment.appendChild(document.createTextNode(before));
                fragment.appendChild(span);
                if (after) fragment.appendChild(document.createTextNode(after));

                node.parentNode.replaceChild(fragment, node);

                i++;
            }
        });

        const foundMatchesArray = Object.keys(foundMatches).map(key => ({
            phrase: key,
            count: foundMatches[key]
        }));

        sendResponse({ matches: foundMatchesArray });

    } else if (request.action === 'reset') {
        const highlighted = document.querySelectorAll('.highlight');
        highlighted.forEach(el => {
            const text = document.createTextNode(el.textContent);
            el.parentNode.replaceChild(text, el);
        });
        sendResponse({ message: 'Highlights removed.' });
    }
});
