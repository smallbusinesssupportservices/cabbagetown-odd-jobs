// Cabbagetown Odd Jobs — light progressive enhancement
// 1. Mobile nav toggle
// 2. Close mobile nav on link click
// 3. Auto-update footer year
// 4. Service card → form prefill + smooth scroll
// 5. Quote form submit → POST to Google Apps Script Web App

(function () {
  "use strict";

  // 1. Mobile nav toggle
  var toggle = document.querySelector(".site-header__toggle");
  var nav = document.querySelector(".site-nav");

  if (toggle && nav) {
    toggle.addEventListener("click", function () {
      var open = toggle.getAttribute("aria-expanded") === "true";
      toggle.setAttribute("aria-expanded", String(!open));
      toggle.setAttribute("aria-label", open ? "Open menu" : "Close menu");
      nav.classList.toggle("is-open", !open);
    });

    // 2. Close mobile nav when an anchor link is clicked
    nav.addEventListener("click", function (e) {
      var target = e.target;
      if (target && target.tagName === "A" && nav.classList.contains("is-open")) {
        toggle.setAttribute("aria-expanded", "false");
        toggle.setAttribute("aria-label", "Open menu");
        nav.classList.remove("is-open");
      }
    });
  }

  // 3. Footer year
  var yearEl = document.getElementById("year");
  if (yearEl) {
    yearEl.textContent = String(new Date().getFullYear());
  }

  // 4. Service card → form prefill + smooth scroll
  var grid = document.querySelector(".services__grid");
  var serviceSelect = document.getElementById("qf-service");
  if (grid && serviceSelect) {
    grid.addEventListener("click", function (e) {
      var link = e.target.closest("a[data-service]");
      if (!link) return;
      var service = link.getAttribute("data-service");
      if (!service) return;
      var found = false;
      for (var i = 0; i < serviceSelect.options.length; i++) {
        if (serviceSelect.options[i].text === service) {
          serviceSelect.selectedIndex = i;
          found = true;
          break;
        }
      }
      if (!found) {
        for (var j = 0; j < serviceSelect.options.length; j++) {
          if (serviceSelect.options[j].text === "Custom Job") {
            serviceSelect.selectedIndex = j;
            break;
          }
        }
      }
      // Default #book navigation handles the scroll; focus first blank field after.
      setTimeout(function () {
        var nameEl = document.getElementById("qf-name");
        if (nameEl && !nameEl.value) nameEl.focus({ preventScroll: true });
      }, 350);
    });
  }

  // 5. Quote form submit → POST JSON (with base64 images) to a Google Apps Script Web App.
  //
  // Setup checklist (one-time, before launch):
  //   1. Create a Google Sheet ("Cabbagetown Odd Jobs Quotes").
  //   2. Create a Drive folder for photo uploads; copy the folder ID from its URL.
  //   3. Sheet → Extensions → Apps Script → paste the script in README.md → fill DRIVE_FOLDER_ID.
  //   4. Deploy → New deployment → Web app → Execute as: Me, Who has access: Anyone.
  //   5. Paste the Web App URL into APPS_SCRIPT_URL below.
  var APPS_SCRIPT_URL = ""; // TODO before launch: paste the deployed Apps Script Web App URL.
  var form = document.getElementById("quote-form");
  var statusEl = document.getElementById("qf-status");

  function readFileAsBase64(file) {
    return new Promise(function (resolve, reject) {
      var reader = new FileReader();
      reader.onload = function () {
        var result = String(reader.result || "");
        var comma = result.indexOf(",");
        resolve({
          name: file.name,
          type: file.type,
          data: comma >= 0 ? result.slice(comma + 1) : result
        });
      };
      reader.onerror = function () { reject(reader.error); };
      reader.readAsDataURL(file);
    });
  }

  if (form && statusEl) {
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      if (form.elements.hp && form.elements.hp.value) return; // honeypot tripped — silently drop
      if (!form.checkValidity()) { form.reportValidity(); return; }

      var submitBtn = form.querySelector(".quote-form__submit");
      var oldText = submitBtn.textContent;
      submitBtn.disabled = true;
      submitBtn.textContent = "Sending…";
      statusEl.className = "quote-form__status";
      statusEl.textContent = "";

      var files = (form.elements.images && form.elements.images.files) || [];
      var fileList = Array.prototype.slice.call(files, 0, 5); // cap at 5

      Promise.all(fileList.map(readFileAsBase64)).then(function (encoded) {
        var payload = {
          service: form.elements.service.value,
          name: form.elements.name.value,
          phone: form.elements.phone.value,
          email: form.elements.email.value,
          address: form.elements.address.value,
          when: form.elements.when.value,
          notes: form.elements.notes.value,
          images: encoded,
          userAgent: navigator.userAgent,
          submittedAt: new Date().toISOString()
        };
        if (!APPS_SCRIPT_URL) throw new Error("Form endpoint not configured");
        // text/plain to skip CORS preflight against Apps Script
        return fetch(APPS_SCRIPT_URL, {
          method: "POST",
          mode: "cors",
          headers: { "Content-Type": "text/plain;charset=utf-8" },
          body: JSON.stringify(payload)
        });
      }).then(function (res) {
        if (!res || !res.ok) throw new Error("Bad response");
        form.reset();
        statusEl.className = "quote-form__status quote-form__status--ok";
        statusEl.textContent = "Got it! We'll get back to you with a quote shortly.";
      }).catch(function () {
        statusEl.className = "quote-form__status quote-form__status--err";
        statusEl.textContent = "Something went wrong sending your request. Please try again in a moment.";
      }).then(function () {
        submitBtn.disabled = false;
        submitBtn.textContent = oldText;
      });
    });
  }
})();
