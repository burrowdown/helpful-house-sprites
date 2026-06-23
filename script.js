// Helpful House Sprites — demo site interactions
// (1) mobile nav toggle  (2) fake inquiry-form submission

document.addEventListener("DOMContentLoaded", () => {
  /* --------------------------- Theme switcher ------------------------- */
  // Demo only: each row picks one seed color. We write it onto <body> as an
  // inline custom property; style.css derives the rest. Each pick is
  // remembered across reloads via localStorage.
  const GROUPS = [
    { name: "bg", prop: "--bg" },
    { name: "primary", prop: "--primary" },
    { name: "accent", prop: "--accent" },
    { name: "footer", prop: "--footer-bg" },
  ]

  const read = (key) => {
    try {
      return localStorage.getItem(key)
    } catch (e) {
      return null // storage unavailable (e.g. private mode)
    }
  }
  const write = (key, value) => {
    try {
      localStorage.setItem(key, value)
    } catch (e) {
      /* ignore */
    }
  }

  GROUPS.forEach((group) => {
    const radios = document.querySelectorAll(`input[name="${group.name}"]`)
    const key = "hhs-" + group.name
    const saved = read(key)

    radios.forEach((radio) => {
      if (radio.value === saved) radio.checked = true
      radio.addEventListener("change", () => {
        if (!radio.checked) return
        document.body.style.setProperty(group.prop, radio.value)
        write(key, radio.value)
      })
    })

    // apply whatever ends up checked (saved choice, or the HTML default)
    const active = document.querySelector(`input[name="${group.name}"]:checked`)
    if (active) document.body.style.setProperty(group.prop, active.value)
  })

  /* ---------------------------- Mobile nav ---------------------------- */
  const toggle = document.querySelector(".nav__toggle")
  const menu = document.getElementById("nav-menu")

  if (toggle && menu) {
    const closeMenu = () => {
      menu.classList.remove("is-open")
      toggle.setAttribute("aria-expanded", "false")
    }

    toggle.addEventListener("click", () => {
      const open = menu.classList.toggle("is-open")
      toggle.setAttribute("aria-expanded", String(open))
    })

    // close the menu after tapping a link on mobile
    menu.querySelectorAll("a").forEach((link) => {
      link.addEventListener("click", closeMenu)
    })

    // collapse the menu when the user scrolls the page
    window.addEventListener(
      "scroll",
      () => {
        if (menu.classList.contains("is-open")) closeMenu()
      },
      { passive: true }
    )
  }

  /* -------------------------- Service cards --------------------------- */
  // Cards show a short blurb and expand on hover. Clicking a card "sticks"
  // it open; its "Request service" button preselects the matching dropdown
  // option and scrolls down to the inquiry form.
  const serviceSelect = document.getElementById("service-select")
  const contact = document.getElementById("contact")

  const cards = document.querySelectorAll(".card")

  cards.forEach((card) => {
    card.addEventListener("click", (event) => {
      // let the request button handle its own click without toggling
      if (event.target.closest(".card__cta")) return
      const willOpen = !card.classList.contains("is-stuck")
      // only one card stays stuck open at a time
      cards.forEach((other) => other.classList.remove("is-stuck"))
      card.classList.toggle("is-stuck", willOpen)
    })

    const cta = card.querySelector(".card__cta")
    if (cta) {
      cta.addEventListener("click", () => {
        const service = card.dataset.service
        if (serviceSelect && service) serviceSelect.value = service
        if (contact) contact.scrollIntoView({ behavior: "smooth" })
      })
    }
  })

  /* ------------------------- Inquiry form ----------------------------- */
  // This is a dummy site: nothing is sent anywhere. We validate with the
  // browser's built-in constraints and show a friendly confirmation.
  //
  // To make this real, point a backend at it — e.g. set the <form> action
  // to a Formspree URL and POST these fields. No library required.
  const form = document.getElementById("inquiry-form")
  const status = document.getElementById("form-status")

  if (form && status) {
    form.addEventListener("submit", (event) => {
      event.preventDefault()
      form.classList.add("was-validated")

      if (!form.checkValidity()) {
        // let the browser focus/flag the first invalid field
        form.reportValidity()
        return
      }

      const name = form.elements.name.value.trim()
      form.reset()
      form.classList.remove("was-validated")

      status.hidden = false
      status.textContent = `Thanks${
        name ? ", " + name : ""
      }! This is a demo, so nothing was actually sent — but in the real site a sprite would flutter back to you within one business day.`
      status.scrollIntoView({ behavior: "smooth", block: "center" })
    })
  }
})
