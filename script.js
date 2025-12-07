
// Init CodeMirror
const htmlEditor = CodeMirror.fromTextArea(document.getElementById("htmlEditor"), {
    mode: "htmlmixed",
    theme: "material-darker",
    lineNumbers: true,
});

const cssEditor = CodeMirror.fromTextArea(document.getElementById("cssEditor"), {
    mode: "css",
    theme: "material-darker",
    lineNumbers: true,
});

const iframe = document.getElementById("previewIframe");
const highlightLayer = document.getElementById("highlightLayer");

function updatePreview() {
    const doc = iframe.contentDocument;
    doc.open();
    doc.write(`\<!DOCTYPE html\>\<html>\<head\>\<style\>${cssEditor.getValue()}\<\/style\>\<\/head\>\<body\>${htmlEditor.getValue()}\<\/body\>\<\/html\>`);
    doc.close();
    highlightActiveSelector();
}

function highlightActiveSelector() {
    const css = cssEditor.getValue();
    const cursor = cssEditor.getCursor();
    const index = cssEditor.indexFromPos(cursor);
    const before = css.slice(0, index);

    const open = before.lastIndexOf("{");
    const close = before.lastIndexOf("}");

    let selector;

    if (open < close || open === -1) {
        const line = cssEditor.getLine(cursor.line);
        const trimmed = line.trim();

        const m = trimmed.match(/^[^{}]+/);
        if (m) selector = m[0].trim();
    } else {
        const selectorText = css.slice(0, open).split("}").pop().trim();
        selector = selectorText.split(/\s*,\s*/).pop();
    }

    if (!selector) {
        highlightLayer.innerHTML = "";
        return;
    }

    highlightLayer.innerHTML = "";

    const doc = iframe.contentDocument;
    let elements;
    try {
        elements = doc.querySelectorAll(selector);
    } catch {
        return;
    }

    const iframeRect = iframe.getBoundingClientRect();

    elements.forEach(el => {
        const r = el.getBoundingClientRect();
        const box = document.createElement("div");
        box.className = "highlight-box";
        box.style.left = (r.left) + "px";
        box.style.top = (r.top - iframeRect.top) + "px";
        box.style.width = r.width + "px";
        box.style.height = r.height + "px";

        // Label wie DevTools
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

htmlEditor.on("change", updatePreview);
cssEditor.on("change", updatePreview);
updatePreview();