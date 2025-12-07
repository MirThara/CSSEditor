require.config({
    paths: { vs: "https://cdn.jsdelivr.net/npm/monaco-editor@latest/min/vs" }
});


require(["vs/editor/editor.main"], () => {
    let highlightLayer = document.getElementById('highlightLayer');
    monaco.editor.setTheme("vs-dark")
    const htmlModel = monaco.editor.createModel(exampleHTML, "html");
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
        let elements;

        if (!selector) {
            highlightLayer.innerHTML = "";
            return;
        }
        try {
            elements = preview.contentDocument.querySelectorAll(selector);
        } catch (e) {
            elements = [];
            console.log(e);
            return;
        }

        if (!elements.length) return;

        const target = elements[0];
        const iframeWindow = preview.contentWindow;
        const iframeRect = preview.getBoundingClientRect();
        const elementRect = target.getBoundingClientRect();

        highlightLayer.innerHTML = "";
        const doc = preview.contentDocument;

        const scrollY = elementRect.top + iframeWindow.scrollY - iframeRect.top - 50;
        const scrollX = elementRect.left + iframeWindow.scrollX - iframeRect.left - 20;
        iframeWindow.scrollTo({top: scrollY, left: scrollX, behaviour: "smooth"});

        elements.forEach(el => {
            const r = el.getBoundingClientRect();
            const style = preview.contentWindow.getComputedStyle(el);

            const width = r.width || el.offsetWidth || parseFloat(style.width);
            const height = r.height || el.offsetHeight || parseFloat(style.height);

            const left = r.left + iframeRect.left;
            const top = r.top - iframeRect.top;

            const box = document.createElement("div");
            box.className = "highlightbox";
            box.style.position = "absolute";
            box.style.left = left + "px";
            box.style.top = top + "px";
            box.style.width = width + "px";
            box.style.height = height + "px";

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