import { html, render } from "https://cdn.jsdelivr.net/npm/lit-html@3/+esm";
import { unsafeHTML } from "https://cdn.jsdelivr.net/npm/lit-html@3/directives/unsafe-html.js";
import { Marked } from "https://cdn.jsdelivr.net/npm/marked@13/+esm";
import { read, utils } from "https://cdn.jsdelivr.net/npm/xlsx/+esm";
import {
  Chart,
  Colors,
  BarController,
  BarElement,
  CategoryScale,
  LinearScale,
  Tooltip,
} from "https://cdn.jsdelivr.net/npm/chart.js@4/+esm";
import { asyncSSE } from "https://cdn.jsdelivr.net/npm/asyncsse@1";

let llmContent;
const marked = new Marked();
const { token } = await fetch("https://llmfoundry.straive.com/token", { credentials: "include" }).then((r) => r.json());
if (!token) {
  const url = "https://llmfoundry.straive.com/login?" + new URLSearchParams({ next: location.href });
  render(html`<a class="btn btn-primary" href="${url}">Log into LLM Foundry</a></p>`, document.querySelector("#login"));
}

const table = (data) => {
  if (!data || data.length === 0) return null;
  const columns = Object.keys(data[0]);
  return html`
    <table class="table table-bordered">
      <thead>
        <tr>
          ${columns.map((key) => html`<th scope="col">${key}</th>`)}
        </tr>
      </thead>
      <tbody>
        ${data.map(
          (row) => html`
            <tr>
              ${columns.map((key) => html`<td>${row[key]}</td>`)}
            </tr>
          `
        )}
      </tbody>
    </table>
  `;
};

const statsTable = (data, keys) => html`
  <table class="table table-bordered">
    <tbody>
      ${keys.map(
        (key) => html`
          <tr>
            <th scope="row">${key}</th>
            <td>${data[key]}</td>
          </tr>
        `
      )}
    </tbody>
  </table>
`;

const vaptReport = ({ Summary, ...data }) => html`
  <div>
    <style scoped>
      .section-header {
        background-color: #20b2aa;
        color: white;
        padding: 10px;
        font-size: 1rem;
        margin-bottom: 0;
        margin-top: 1.5rem;
      }
    </style>


    <img class="img-fluid" src="img/vapt-straive-logo.webp" alt="VAPT - Straive Logo" />

    <h2 class="mt-4">${Summary["Client Name"]}</h2>
    <h1 class="display-4 my-4 border-bottom border-dark pb-2">Vulnerability Assessment Report</h1>
    <p>Date: ${Summary["Date"]}</p>

    <h2 class="mt-4">Submitted by:</h2>
    ${statsTable(Summary, ["Analyst", "Analyst Email ID"])}

    <h1 class="display-4 my-4 border-bottom border-dark pb-2">Vital Statistics</h1>
    <p>
      This document provides the findings of a recent analysis of your infrastructure. The document represents a summary
      of these findings and presents a set of recommendations for addressing the detected events. The analysis is based
      on data collected using the characteristics below:
    </p>

    <h2 class="section-header mt-3">Company Details</h2>
    ${statsTable(Summary, ["Company Name", "Address", "Industry", "Company Size"])}

    <h2 class="section-header mt-3">Test Details</h2>
    ${statsTable(Summary, ["Test Start Date", "Test Objective", "Test Duration"])}


    <h1 class="display-4 my-4 border-bottom border-dark pb-2">Executive Summary</h2>

    <h3 class="section-header">Security and Threat Prevention</h3>

    ${table(data["Security and Threat Prevention"])}

    <p class="mt-3">
      Last year, over 780 enterprises were breached because of poor internal security practices and latent vendor
      content security. The average cost of a corporate security breach is estimated at $3.5 million USD and is rising
      at 15% year over year. Intrusions, malware/botnets and malicious applications collectively comprise a massive risk
      to your enterprise network. These attack mechanisms can give attackers access to your most sensitive files and
      database information. We mitigates these risks by providing award-winning security solutions and is consistently
      rated among the best by objective third parties such as NSS Labs, VB 100 and AV Comparatives.
    </p>

    <h2 class="section-header mb-3">Deployment & Methodology</h2>
    <p>
      The internal network was monitored with a XYZ-500D (transparent mode using port pairs). This is a non-invasive way
      to intercept traffic as it moves over your network. The diagram below demonstrates the assessment topology used.
    </p>
    <p class="text-center">
      <img class="img-fluid" src="img/vapt-deployment.webp" alt="VAPT - Deployment Methodology" />
    </p>
    <p>
      During this assessment, traffic was monitored as it moved over the wire and logs were recorded. These logs are
      typically categorized by their log type. While traffic logs record much of the session information flowing across
      your network, We can also monitor more in-depth security logging, such as IPS, anti-virus, web and application
      control. This assessment was created based on telemetry from all log types and is meant to provide a big picture
      view of your network's activity. Used in conjunction with ABC, DEF can provide additional functions such as event
      management (e.g. alerts when malicious activity is detected), FGH analytics and filtering (e.g. investigating
      specific user activity) and advanced reporting (e.g. detailed reports on security, user and even wireless
      activity).
    </p>


    <h1 class="display-4 my-4 border-bottom border-dark pb-2">Security and Threat Prevention</h1>

    <h2 class="mt-4">High Risk Applications</h2>
    <p>Our research team assigns a risk rating of 1 to 5 to an application based on the application behavioral characteristics. The risk rating can help administrators to identify the high risk applications quickly and make a better decision on the application control policy.</p>
    <h2 class="section-head
    er">High Risk Applications Crossing the Network</h2>
    ${table(data["HighRiskApps"])}

    <h2 class="mt-4">Application Vulnerability Exploits</h2>
    <p>An application vulnerability could be exploited to compromise the security of the network. Our research team analyses application traffic patterns and application vulnerabilities and then develops signatures to prevent the vulnerability exploits. Our Intrusion Prevention Service (IPS) provides our customers with the latest defenses against stealthy network-level threats. It uses a customizable database of more than 5,800 known threats to stop attacks that evade traditional firewall systems.</p>
    <h2 class="section-header">Top Application Vulnerability Exploits Detected</h2>
    ${table(data["AppExploits"])}

    <h2 class="mt-4">Malware Detected</h2>
    <p>There are numerous channels that cybercriminals use to distribute malware. Most common methods motivate users to open an infected file in an email attachment, download an infected file, or click on a link leading to a malicious site. During the security assessment, We identified a number of Malware-related events which indicate malicious file downloads or connections to malware-infested sites.</p>
    <h2 class="section-header">Top Viruses, Spyware and Adware Detected</h2>
    ${table(data["Malware"])}

    <h2 class="mt-4">At-Risk Devices and Hosts</h2>
    <p>Based on the types of activity exhibited by an individual host, we can approximate the trustworthiness of each individual client. This client reputation is based on key factors such as websites browsed, applications used and inbound/outbound destinations utilized. Ultimately, we can create an overall threat score by looking at the aggregated activity used by each individual host.</p>
    <h2 class="section-header">Most At-Risk Devices and Hosts</h2>
    ${table(data["AtRiskDevices"])}


    <h1 class="display-4 my-4 border-bottom border-dark pb-2">Network Utilization</h1>

    <h2 class="mt-4">Bandwidth and Sessions</h2>
    <p>Bandwidth usage is the primary indicator for throughput and capacity planning. We can analyze bandwidth by application usage or by host. In addition, looking at daily usage trends can assist with peak capacity planning.</p>
    <h2 class="section-header">Average Bandwidth Usage by Hour</h2>
    <canvas id="bandwidth-usage"></canvas>

    <p>Session averages on a a daily basis are useful for calculating throughput and proper sizing. It can help when determining peak planning as a typical enterprise will see more sessions being generated in the morning when the network is at its most active.</p>
    <h2 class="section-header">Average Session Usage by Hour</h2>
    <canvas id="session-usage"></canvas>

    <h1 class="display-4 my-4 border-bottom border-dark pb-2">Recommended Actions</h1>

    <form id="recommendations-form">
      <div class="mb-3">
        <label for="recommendations-prompt" class="form-label">Re-generate AI summary</label>
        <input type="text" class="form-control" id="recommendations-prompt" placeholder="Enter a prompt to generate recommendations" value="Using provided data, generate recommendations to improve VAPT score. Group into logical sections. Provide specific reasons for recommendations from data.">
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

async function renderWorkbook(workbook) {
  const oldOutput = document.querySelector("#output");
  oldOutput.insertAdjacentHTML("afterend", '<div id="output"></div>');
  oldOutput.remove();

  const summarySheet = workbook.SheetNames.includes("Summary")
    ? workbook.Sheets["Summary"]
    : workbook.Sheets[workbook.SheetNames[0]];
  const Summary = Object.fromEntries(utils.sheet_to_json(summarySheet, { header: 1 }));

  // Get the data from the other sheets as an array of objects, with the first row (header) as keys
  const otherSheets = workbook.SheetNames.filter((name) => name !== "Summary");
  const data = Object.fromEntries(otherSheets.map((name) => [name, utils.sheet_to_json(workbook.Sheets[name])]));

  try {
    render(vaptReport({ Summary, ...data }), document.querySelector("#output"));
    Chart.register(Colors, BarController, BarElement, CategoryScale, LinearScale, Tooltip);

    new Chart(document.getElementById("bandwidth-usage"), {
      type: "bar",
      options: { animation: true, plugins: { tooltip: { enabled: true } } },
      data: {
        labels: data.Bandwidth.map((row) => row.Time),
        datasets: [
          {
            label: "Bandwidth Utilization",
            backgroundColor: "rgba(25, 135, 84, 0.8)",
            data: data.Bandwidth.map((row) => row["Bandwidth Utilization"]),
          },
        ],
      },
    });
    new Chart(document.getElementById("session-usage"), {
      type: "bar",
      options: { animation: true, plugins: { tooltip: { enabled: true } } },
      data: {
        labels: data.Sessions.map((row) => row.Time),
        datasets: [
          {
            label: "Number of Sessions",
            backgroundColor: "rgba(25, 135, 84, 0.8)",
            data: data.Sessions.map((row) => row["Sessions"]),
          },
        ],
      },
    });

    llmContent = Object.entries(data)
      .map(([name, rows]) => {
        if (rows.length === 0) return "";
        const headers = Object.keys(rows[0]).join("\t");
        const values = rows.map((row) => Object.values(row).join("\t")).join("\n");
        return `<DATA name="${name}">\n${headers}\n${values}\n</DATA>`;
      })
      .join("\n\n");

    document.querySelector("#recommendations-form").dispatchEvent(new Event("submit", { bubbles: true }));
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
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}:reportgen` },
    stream: true,
    stream_options: { include_usage: true },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      stream: true,
      messages: [
        { role: "system", content: document.querySelector("#recommendations-prompt").value },
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
});

function notify(message) {
  render(html`<div class="alert alert-danger">${message}</div>`, document.querySelector("#output"));
}
