require.config({
    paths: { vs: "https://cdn.jsdelivr.net/npm/monaco-editor@latest/min/vs" }
});


require(["vs/editor/editor.main"], () => {
    let highlightLayer = document.getElementById('highlightLayer');
    monaco.editor.setTheme("vs-dark")
    const htmlModel = monaco.editor.createModel("<h1>Hello World</h1>", "html");
    const cssModel = monaco.editor.createModel("h1 { color: red; }", "css");

    const htmlEditor = monaco.editor.create(document.getElementById('htmlEditor'), {
        model: htmlModel,
        language: "html",
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
    const cssEditor = monaco.editor.create(document.getElementById('cssEditor'), {
        model: cssModel,
        language: "css",
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

    fetch('html-snippets.json')
        .then(res => res.json())
        .then(snippets => {
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

    function updatePreview() {
        const doc = preview.contentDocument;

        doc.open();
        doc.write(`\<!DOCTYPE html\>\<html\><head><style>${cssModel.getValue()}</style></head> <body>${htmlModel.getValue()}</body></html>`);
        doc.close();
        highlightActiveSelector();
    }

    function highlightActiveSelector() {
        const pos = cssEditor.getPosition();
        const offset = cssModel.getOffsetAt(pos);
        const cssBefore = cssModel.getValue().slice(0, offset);
        const openIndex = cssBefore.lastIndexOf("{");
        const closeIndex = cssBefore.lastIndexOf("}");

        const selectorBlock = cssBefore.slice(0, openIndex);
        // const rawSelector = selectorBlock.split("}").pop().trim();

        let selector;

        if (openIndex < closeIndex || openIndex === -1) {
            const line = cssModel.getLineContent(pos.lineNumber);
            const trimmed = line.trim();

            const m = trimmed.match(/^[^{}]+/)
            if (m) selector = m[0].trim();
        } else {
            const selectorText = cssModel.getValue().slice(0, openIndex).split("}").pop().trim();
            selector = selectorText.split(/\s*,\s*/).pop();
        }

        if (!selector) {
            highlightLayer.innerHTML = "";
            return;
        }

        highlightLayer.innerHTML = "";
        const doc = preview.contentDocument;
        let elements;

        try {
            elements = preview.contentDocument.querySelectorAll(selector);
        } catch (e) {
            elements = [];
            console.log(e);
            return;
        }

        const iframeRect = preview.getBoundingClientRect();

        elements.forEach(element => {
            const r = element.getBoundingClientRect();

            const left = r.left - iframeRect.left;
            const top = r.top - iframeRect.top;

            const box = document.createElement("div");
            box.className = "highlightbox";
            box.style.left = -(left) + "px";
            box.style.top = (top - iframeRect.top) + "px";
            box.style.width = r.width + "px";
            box.style.height = r.height + "px";

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

            box.appendChild(label);
            highlightLayer.appendChild(box);
        });

    }
    htmlModel.onDidChangeContent(updatePreview);
    cssModel.onDidChangeContent(updatePreview);
    updatePreview();
});