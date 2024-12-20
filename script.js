import { html, render } from "https://cdn.jsdelivr.net/npm/lit-html@3/+esm";
import { unsafeHTML } from "https://cdn.jsdelivr.net/npm/lit-html@3/directives/unsafe-html.js";
import { Marked } from "https://cdn.jsdelivr.net/npm/marked@13/+esm";
import { read, utils } from "https://cdn.jsdelivr.net/npm/xlsx/+esm";
import { asyncSSE } from "https://cdn.jsdelivr.net/npm/asyncsse@1";

let llmContent,
  content = "";

let instructions = "";
const demosDiv = document.getElementById("demos");
const marked = new Marked();
const { token } = await fetch("https://llmfoundry.straive.com/token", { credentials: "include" }).then((r) => r.json());
if (!token) {
  const url = "https://llmfoundry.straive.com/login?" + new URLSearchParams({ next: location.href });
  render(html`<a class="btn btn-primary" href="${url}">Log into LLM Foundry</a></p>`, document.querySelector("#login"));
}

//Fetch Demos
let demosArray = [];
let indexVal = -1;

const fetchAndRenderDemos = async () => {
  try {
    const { demos } = await (await fetch("config.json")).json();
    demosArray = demos;
    render(
      demos.map(
        (demo, index) => html`
          <div class="col-lg-6">
            <div class="demo card h-100 text-decoration-none" data-index="${index}">
              <div class="card-body">
                <h5 class="card-title">${demo.title}</h5>
                <p class="card-text">${demo.description}</p>
                <button class="btn btn-primary mb-3 generate" data-src="${demo.src}">
                  <i class="bi bi-gear"></i> Generate
                </button>
              </div>
            </div>
          </div>
        `
      ),
      demosDiv
    );
  } catch (error) {
    console.error("Error fetching config.json:", error);
  }
};

const qualityReport = () => html`
  <div class="mx-auto w-50">
  <form id="recommendations-form">
  <h1 class="display-4 my-4 border-bottom border-dark pb-2">Generated Report</h1>
      <div class="mb-3">
        <label for="user-prompt" class="form-label">Instructions</label>
        <input
          type="text"
          class="form-control"
          id="user-prompt"
          placeholder="Optional : Enter Instructions or Leave blank and submit"
          value=""
        />
      </div>
      <button type="submit" class="btn btn-primary">Generate</button>
      <button type="button" id="download-button" class="btn btn-primary d-none">Download Report</button>
    </form>

    <div id="recommendations" class="mt-4"></div>
  </div>
`;

const sampleUploadBox = () => html`
  <div class="mx-auto w-75">
    <div class="row">
      <div class="col-lg-6 py-2">
        <div class="demo card">
          <label class="card-body">
            <h5 class="card-title">Sample Report</h5>
            <p class="card-text">
Leverage pre-existing data to produce the report.</p>
            <div class="d-flex align-items-center">
            <button id="sample-button" type="submit" class="btn btn-primary mx-2"><i class="bi bi-gear"></i> Generate</button>
            <a class="btn btn-primary" href="${demosArray[indexVal].src}"><i class="bi bi-download"></i> Download XLSX</a>
            </div>
        </div>
      </div>

      <div class="col-lg-6 py-2">
        <div class="demo card">
          <label class="card-body">
            <h5 class="card-title">Custom Report</h5>
            <p class="card-text">Use your own Excel File to generate report.</p>
            <div class="d-flex justify-content-between align-items-center">
              <label for="file-upload" class="btn btn-primary flex-fill me-2">
                <i class="bi bi-cloud-upload"></i> Upload your Excel file
              </label>
            </div>
            <input id="file-upload" type="file" accept=".xlsx" class="d-none">
        </div>
      </div>
    </div>
  </div>
`;

document.querySelector("#demos").addEventListener("click", (event) => {
  const $demo = event.target.closest(".demo");
  indexVal = $demo.getAttribute("data-index");
  if ($demo) {
    instructions = demosArray[indexVal].prompt;
    event.preventDefault();
    try {
      render(sampleUploadBox(), document.getElementById("sample-upload"));
    } catch (error) {
      return notify(`Error Rendering Sample Upload Box: ${error.message}`);
    }
  }
});

document.querySelector("#sample-upload").addEventListener("click", async (event) => {
  const $sampleButton = event.target.closest("#sample-button");
  if ($sampleButton) {
    event.preventDefault();
    let workbook;
    try {
      render(sampleUploadBox(), document.getElementById("sample-upload"));
      workbook = read(await fetch(demosArray[indexVal].src).then((r) => r.arrayBuffer()), { cellDates: true });
    } catch (error) {
      return notify(`Error loading or parsing XLSX file: ${error.message}`);
    }
    renderWorkbook(workbook);
  }
});

document.querySelector("#sample-upload").addEventListener("change", (event) => {
  const $uploadFileInput = event.target; // This should be the <input type="file"> element.
  if ($uploadFileInput && $uploadFileInput.files.length > 0) {
    const file = $uploadFileInput.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const workbook = XLSX.read(event.target.result, { cellDates: true });
        renderWorkbook(workbook); // Your custom function to handle the workbook
      };
      reader.readAsArrayBuffer(file);
    }
  }
});

//This is the function which processes data from excel sheet
async function renderWorkbook(workbook) {
  const oldOutput = document.querySelector("#output");
  oldOutput.insertAdjacentHTML("afterend", '<div id="output"></div>');
  oldOutput.remove();
  const Sheets = workbook.SheetNames;
  const data = Object.fromEntries(Sheets.map((name) => [name, utils.sheet_to_json(workbook.Sheets[name])]));
  try {
    render(qualityReport(), document.querySelector("#output"));
    llmContent = Object.entries(data)
      .map(([name, rows]) => {
        if (rows.length === 0) return "";
        const headers = Object.keys(rows[0]).join("\t");
        const values = rows.map((row) => Object.values(row).join("\t")).join("\n");
        return `<DATA name="${name}">\n${headers}\n${values}\n</DATA>`;
      })
      .join("\n\n");
  } catch (error) {
    return notify(`Error rendering report: ${error.message}`);
  }
}

document.querySelector("body").addEventListener("submit", async (event) => {
  if (event.target.id !== "recommendations-form") return;
  let finalInstructions = instructions;
  if (document.getElementById("user-prompt").value.length > 0) {
    finalInstructions = instructions + "\n" + document.getElementById("user-prompt").value;
  }
  content = "";
  event.preventDefault();
  render(html`<div class="spinner-border"></div>`, document.querySelector("#recommendations"));
  for await (const event of asyncSSE("https://llmfoundry.straive.com/openai/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}:clinicalgen` },
    stream: true,
    stream_options: { include_usage: true },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      stream: true,
      messages: [
        { role: "system", content: finalInstructions },
        { role: "user", content: llmContent },
      ],
    }),
  })) {
    if (event.data == "[DONE]") break;
    const message = JSON.parse(event.data);
    const content_delta = message.choices?.[0]?.delta?.content;
    if (content_delta) content += content_delta;
    render(unsafeHTML(marked.parse(content)), document.querySelector("#recommendations"));
  }
  document.querySelector("#recommendations-form").querySelector("#download-button").classList.remove("d-none");
});

document.addEventListener("click", (e) => {
  if (e.target.id === "download-button") {
    window.print();  }
});

function notify(message) {
  render(html`<div class="alert alert-danger">${message}</div>`, document.querySelector("#output"));
}

fetchAndRenderDemos();
