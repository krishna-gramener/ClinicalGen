import { html, render } from "https://cdn.jsdelivr.net/npm/lit-html@3/+esm";
import { unsafeHTML } from "https://cdn.jsdelivr.net/npm/lit-html@3/directives/unsafe-html.js";
import { Marked } from "https://cdn.jsdelivr.net/npm/marked@13/+esm";
import { read, utils } from "https://cdn.jsdelivr.net/npm/xlsx/+esm";
import { asyncSSE } from "https://cdn.jsdelivr.net/npm/asyncsse@1";

let llmContent;
const marked = new Marked();
const { token } = await fetch("https://llmfoundry.straive.com/token", { credentials: "include" }).then((r) => r.json());
if (!token) {
  const url = "https://llmfoundry.straive.com/login?" + new URLSearchParams({ next: location.href });
  render(html`<a class="btn btn-primary" href="${url}">Log into LLM Foundry</a></p>`, document.querySelector("#login"));
}

const vaptReport = () => html`
  <div>
    <h1 class="display-4 my-4 border-bottom border-dark pb-2">Generated Report</h1>

    <form id="recommendations-form">
      <div class="mb-3">
        <label for="recommendations-prompt" class="form-label">Prompt</label>
        <input
          type="text"
          class="form-control"
          id="recommendations-prompt"
          placeholder="Enter a prompt to generate data quality report"
          value="Using provided data,generate a detailed Data Quality Report and final conclusion on quality of data and categorize it as high,good,average and poor"
        />
      </div>
      <button type="submit" class="btn btn-primary">Generate</button>
    </form>

    <div id="recommendations" class="mt-4"></div>
  </div>
`;

document.querySelector("#demos").addEventListener("click", async (event) => {
  const $generate = event.target.closest(".generate");
  if ($generate) {
    event.preventDefault();
    let workbook;
    try {
      workbook = read(await fetch($generate.dataset.src).then((r) => r.arrayBuffer()), { cellDates: true });
    } catch (error) {
      return notify(`Error loading or parsing XLSX file: ${error.message}`);
    }
    renderWorkbook(workbook);
  }
});

document.querySelector("#file-upload").addEventListener("change", (event) => {
  const file = event.target.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = (event) => {
      const workbook = read(event.target.result, { cellDates: true });
      renderWorkbook(workbook);
    };
    reader.readAsArrayBuffer(file);
  }
});

//This is the function which processes data from excel sheet
async function renderWorkbook(workbook) {
  const oldOutput = document.querySelector("#output");
  oldOutput.insertAdjacentHTML("afterend", '<div id="output"></div>');
  oldOutput.remove();
  const Sheets = workbook.SheetNames;
  const data = Object.fromEntries(Sheets.map((name) => [name, utils.sheet_to_json(workbook.Sheets[name])]));
  console.log(data);
  try {
    render(vaptReport(), document.querySelector("#output"));
    llmContent = Object.entries(data)
      .map(([name, rows]) => {
        if (rows.length === 0) return "";
        const headers = Object.keys(rows[0]).join("\t");
        const values = rows.map((row) => Object.values(row).join("\t")).join("\n");
        return `<DATA name="${name}">\n${headers}\n${values}\n</DATA>`;
      })
      .join("\n\n");
    console.log(llmContent);
    // document.querySelector("#recommendations-form").dispatchEvent(new Event("submit", { bubbles: true }));
  } catch (error) {
    return notify(`Error rendering report: ${error.message}`);
  }
}

document.querySelector("body").addEventListener("submit", async (event) => {
  if (event.target.id !== "recommendations-form") return;

  event.preventDefault();
  render(html`<div class="spinner-border"></div>`, document.querySelector("#recommendations"));
  let content = "";
  for await (const event of asyncSSE("https://llmfoundry.straive.com/openai/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}:clinicalgen` },
    stream: true,
    stream_options: { include_usage: true },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      stream: true,
      messages: [
        { role: "system", content: document.getElementById("recommendations-prompt").value },
        { role: "user", content: llmContent },
      ],
    }),
  })) {
    if (event.data == "[DONE]") break;
    const message = JSON.parse(event.data);
    const content_delta = message.choices?.[0]?.delta?.content;
    if (content_delta) content += content_delta;
    render(unsafeHTML(marked.parse(content)), document.querySelector("#recommendations"));
    // console.log(content);
  }
  console.log(content);
  // convertMarkdownToPDF(content);
});

function convertMarkdownToPDF(markdownData) {
  // Convert Markdown to HTML
  const htmlContent = marked.parse(markdownData);
  console.log(htmlContent);
  // Create a temporary element to hold the HTML content
  const element = document.createElement("div");
  element.innerHTML = htmlContent;
  element.style.color = "black"; // Set font color to black            // Ensure no additional margins
  element.style.fontSize = "12px";
  element.style.margin = "0"; // Remove external margins
  element.style.padding = "0"; // Remove internal padding
  element.style.width = "210mm"; // Full width for an A4 page width in mm

  // Generate PDF with specified settings
  html2pdf()
    .from(element)
    .set({
      filename: "data-quality-report.pdf",
      image: { type: "jpeg", quality: 0.98 },
      margin: [5, 5, 5, 5], // Set small margins for the PDF content (top, right, bottom, left)
      html2canvas: { scale: 2, scrollY: 0 }, // `scrollY: 0` prevents issues with large content
      jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
    })
    .save()
    .then(() => {
      // Clean up: Remove the temporary element after PDF generation
      document.body.removeChild(element);
    })
    .catch((err) => {
      console.error("Error generating PDF:", err);
      // Clean up the temporary element if there's an error
      document.body.removeChild(element);
    });

  // Temporarily append the element to avoid display issues
  document.body.appendChild(element);
}

function notify(message) {
  render(html`<div class="alert alert-danger">${message}</div>`, document.querySelector("#output"));
}
