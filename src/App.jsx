import { useState } from "react";
import axios from "axios";

export default function App() {
  const [url, setUrl] = useState("");
  const [error, setError] = useState("");
  const [generatedHtml, setGeneratedHtml] = useState("");
  const [preview, setPreview] = useState("");

  const convertForm = async () => {
    setError("");
    setGeneratedHtml("");
    setPreview("");

    if (!url.includes("docs.google.com/forms")) {
      setError("Please enter a valid Google Form URL");
      return;
    }

    try {
      const res = await axios.get(`/fetch-form?url=${encodeURIComponent(url)}`);
      const html = res.data;

      const match = html.match(/var FB_PUBLIC_LOAD_DATA_ =([^;]+);/);
      if (!match) throw new Error("Form data not found");

      const formData = JSON.parse(match[1]);
      const questions = formData[1][1];
      const submissionUrl = url.replace("/viewform", "/formResponse");

      // Generate form fields
      const formElements = questions.map((q) => {
        const title = q[1];
        const type = q[3];
        const entryId = q[4][0][0];
        const options = q[4][0][1] || [];

        switch (type) {
          case 0: // short answer
            return `<label>${title}</label><input type="text" name="entry.${entryId}" style="width:100%;padding:6px;margin:4px 0;"/>`;
          case 1: // paragraph
            return `<label>${title}</label><textarea name="entry.${entryId}" rows="4" style="width:100%;padding:6px;margin:4px 0;"></textarea>`;
          case 2: // multiple choice
            return `<p>${title}</p>${options
              .map((o, i) => `<label style="display:block;"><input type="radio" name="entry.${entryId}" value="${o[0]}"/> ${o[0]}</label>`)
              .join("")}`;
          case 4: // checkboxes
            return `<p>${title}</p>${options
              .map((o, i) => `<label style="display:block;"><input type="checkbox" name="entry.${entryId}" value="${o[0]}"/> ${o[0]}</label>`)
              .join("")}`;
          default:
            return `<label>${title}</label><input type="text" name="entry.${entryId}" style="width:100%;padding:6px;margin:4px 0;"/>`;
        }
      });

      // Full form HTML with minimal styling + async submission script
      const formHtml = `
<form id="google-form-generated" action="${submissionUrl}" method="POST" style="max-width:500px;margin:20px auto;">
  ${formElements.map(f => `<div style="margin-bottom:10px;">${f}</div>`).join("")}
  <button type="submit" style="padding:8px 16px;">Submit</button>
  <div id="form-submission-status" style="margin-top:10px;color:green;"></div>
</form>

<script>
document.getElementById('google-form-generated').addEventListener('submit', function(e) {
  e.preventDefault();
  const form = e.target;
  const statusDiv = document.getElementById('form-submission-status');
  const submitBtn = form.querySelector('button[type="submit"]');

  statusDiv.style.color = 'orange';
  statusDiv.textContent = 'Submitting...';
  submitBtn.disabled = true;

  const formData = new FormData(form);
  const params = new URLSearchParams(formData).toString();

  fetch(form.action, {
    method: 'POST',
    mode: 'no-cors',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params
  })
  .then(() => {
    statusDiv.style.color = 'green';
    statusDiv.textContent = 'Form submitted successfully!';
    form.reset();
  })
  .catch(() => {
    statusDiv.style.color = 'red';
    statusDiv.textContent = 'Submission failed. Please try again.';
  })
  .finally(() => {
    submitBtn.disabled = false;
  });
});
</script>
`;

      setGeneratedHtml(formHtml);
      setPreview(formHtml);
    } catch (err) {
      console.error(err);
      setError("Failed to fetch or parse form");
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(generatedHtml);
  };

  return (
    <div style={{ maxWidth: 800, margin: "20px auto", padding: 20 }}>
      <h2>Google Form to HTML Converter</h2>

      <input
        type="text"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        placeholder="Enter Google Form URL"
        style={{ width: "100%", padding: 10, marginTop: 10 }}
      />
      <button onClick={convertForm} style={{ marginTop: 10 }}>
        Convert
      </button>

      {error && <p style={{ color: "red" }}>{error}</p>}

      {generatedHtml && (
        <>
          <h3 style={{ marginTop: 20 }}>Generated HTML (copy below)</h3>
          <textarea
            readOnly
            value={generatedHtml}
            style={{ width: "100%", height: 300, marginTop: 10 }}
          />
          <button onClick={copyToClipboard} style={{ marginTop: 10 }}>Copy HTML</button>
        </>
      )}

      {preview && (
        <>
          <h3 style={{ marginTop: 20 }}>Preview</h3>
          <div dangerouslySetInnerHTML={{ __html: preview }} />
        </>
      )}
    </div>
  );
}

