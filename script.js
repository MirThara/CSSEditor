// load Monaco editor
require.config({
    paths: { vs: "https://cdn.jsdelivr.net/npm/monaco-editor@latest/min/vs" }
});

require(["vs/editor/editor.main"], () => {
    let highlightLayer = document.getElementById('highlightLayer'); // holds highlight DIV
    monaco.editor.setTheme("vs-dark"); // set Editor theme to VisualStudio Dark

    // create Models for HTML & CSS Editors
    const htmlModel = monaco.editor.createModel(exampleHTML, "html");
    const cssModel = monaco.editor.createModel("h1 { color: red; }", "css");

    // init HTML-Editor
    const htmlEditor = monaco.editor.create(document.getElementById('htmlEditor'), {
        model: htmlModel,
        language: "html",
        // suggestions and IntelliSense setup
        automaticLayout: true,
        suggestOnTriggerCharacters: true,
        quickSuggestions: {
            other: true,
            comments: false,
            strings: true
        },
        wordBasedSuggestions: true,
        parameterHintes: {
            enabled: true
        }
    });

    // init CSS-Editor
    const cssEditor = monaco.editor.create(document.getElementById('cssEditor'), {
        model: cssModel,
        language: "css",
        // suggestions and IntelliSense setup
        automaticLayout: true,
        suggestOnTriggerCharacters: true,
        quickSuggestions: {
            other: true,
            comments: false,
            strings: true,
        },
        wordBasedSuggestions: true,
        parameterHints: {
            enabled: true
        }
    });

    // load HTML-autocomplete-Snippets from JSON-File
    fetch('html-snippets.json')
        .then(res => res.json())
        .then(snippets => {
            // add IntelliSense
            monaco.languages.registerCompletionItemProvider('html', {
                provideCompletionItems: () => {
                    const suggestions = snippets.map(snippet => ({
                        label: snippet.label,
                        kind: monaco.languages.CompletionItemKind[snippet.kind],
                        insertText: snippet.insertText,
                        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                        documentation: snippet.documentation
                    }));
                    return { suggestions };
                }
            });
        });

    // update-Function
    function updatePreview() {
        const doc = preview.contentDocument; // initialize iFrame-Preview-Area as the HTML-Render-Preview
        
        // write base structure of the HTML-Document
        doc.open();
        doc.write(`\<!DOCTYPE html\>\<html\><head><style>${cssModel.getValue()}</style></head> <body>${htmlModel.getValue()}</body></html>`);
        doc.close();
        highlightActiveSelector();
    }

    // Highlight-Function
    function highlightActiveSelector() {
        // get some variables about cursorPosition etc. from MonacoEditor-API
        const pos = cssEditor.getPosition();
        const offset = cssModel.getOffsetAt(pos);
        const cssBefore = cssModel.getValue().slice(0, offset);
        const openIndex = cssBefore.lastIndexOf("{");
        const closeIndex = cssBefore.lastIndexOf("}");

        let selector; // holds selector the user typed in the CSS-Editor

        // check if the user is "in" the css-rule or outside
        if (openIndex < closeIndex || openIndex === -1) {
            const line = cssModel.getLineContent(pos.lineNumber); // get text content from the line where the user currently is
            const trimmed = line.trim();

            const m = trimmed.match(/^[^{}]+/)
            if (m) selector = m[0].trim(); // set the selector
        } else {
            const selectorText = cssModel.getValue().slice(0, openIndex).split("}").pop().trim();
            selector = selectorText.split(/\s*,\s*/).pop();
        }

        let elements; // holds elements

        if (!selector) {
            highlightLayer.innerHTML = "";
            return;
        }

        // try to find elements with the specified selector
        try {
            elements = preview.contentDocument.querySelectorAll(selector); // querySelector; means element name, class name and id can be found
        } 
        // in case of errors:
        catch (e) {
            // reset and stop the code to prevent
            elements = [];
            // console.log(e);
            return;
        }

        if (!elements.length) return; // if no element with specified selector was found return

        // scroll on website preview to element targeted
        const target = elements[0];
        const iframeWindow = preview.contentWindow;
        const iframeRect = preview.getBoundingClientRect(); // Position & Size of the HTML-Preview
        const elementRect = target.getBoundingClientRect(); // Position & Size of the target element

        highlightLayer.innerHTML = ""; // remove all previous highlights

        // calculate where to scroll to make the specified element visible in the preview
        const scrollY = elementRect.top + iframeWindow.scrollY - iframeRect.top - 50;
        const scrollX = elementRect.left + iframeWindow.scrollX - iframeRect.left - 20;
        iframeWindow.scrollTo({top: scrollY, left: scrollX, behaviour: "smooth"});

        // add highlighting for every element found with specified selector
        elements.forEach(el => {
            const r = el.getBoundingClientRect(); // el's position
            const style = preview.contentWindow.getComputedStyle(el);

            // calculate width and height of the highlight box
            const width = r.width || el.offsetWidth || parseFloat(style.width);
            const height = r.height || el.offsetHeight || parseFloat(style.height);

            // calculate the position of the highlight box
            const left = r.left + iframeRect.left;
            const top = r.top - iframeRect.top;

            // highlight-Box
            const box = document.createElement("div");
            box.className = "highlightbox";
            box.style.position = "absolute";
            box.style.left = left + "px";
            box.style.top = top + "px";
            box.style.width = width + "px";
            box.style.height = height + "px";

            // highlight-Label
            const label = document.createElement("div");
            label.style.position = "absolute";
            label.style.top = "-20px";
            label.style.left = "0";
            label.style.background = "rgba(0, 122, 255, 0.9)";
            label.style.color = "white";
            label.style.padding = "2px 6px";
            label.style.fontSize = "12px";
            label.style.borderRadius = "3px";
            label.textContent = selector;

            // add Box & Label to View
            box.appendChild(label);
            highlightLayer.appendChild(box);
        });


    }
    // update if the user changed something in the editor
    htmlModel.onDidChangeContent(updatePreview);
    cssModel.onDidChangeContent(updatePreview);
    updatePreview();

    window.addEventListener('resize', updatePreview);
});