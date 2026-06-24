// Helpful House Sprites — demo site interactions
// (1) mobile nav toggle  (2) fake inquiry-form submission

document.addEventListener("DOMContentLoaded", () => {
  /* --------------------------- Theme switcher ------------------------- */
  // Demo only: each row picks one seed color. We write it onto <body> as an
  // inline custom property; style.css derives the rest. Picks are live-only —
  // nothing is persisted, so a reload always returns to the HTML defaults.
  //
  // The panel is hidden unless the page is loaded with ?admin=1. Hiding the
  // panel does not affect the colors: the checked defaults are still applied.
  const GROUPS = [
    { name: "bg", prop: "--bg" },
    { name: "primary", prop: "--primary" },
    { name: "accent", prop: "--accent" },
    { name: "footer", prop: "--footer-bg" },
  ]

  const adminOn = new URLSearchParams(location.search).get("admin") === "1"
  const panel = document.querySelector(".theme-admin")
  if (panel && !adminOn) panel.hidden = true

  GROUPS.forEach((group) => {
    const radios = document.querySelectorAll(`input[name="${group.name}"]`)

    radios.forEach((radio) => {
      radio.addEventListener("change", () => {
        if (!radio.checked) return
        document.body.style.setProperty(group.prop, radio.value)
      })
    })

    // apply whatever is checked (the HTML default)
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

  /* ----------------------- Testimonials carousel --------------------- */
  // The track scrolls natively (so touch swipe just works); the buttons
  // page through it. Controls are shown only when the content overflows —
  // if every testimonial already fits, the carousel looks static.
  const carousel = document.querySelector(".carousel")

  if (carousel) {
    const track = carousel.querySelector(".quotes")
    const prev = carousel.querySelector(".carousel__btn--prev")
    const next = carousel.querySelector(".carousel__btn--next")

    const update = () => {
      // a small tolerance avoids sub-pixel rounding showing phantom overflow
      const maxScroll = track.scrollWidth - track.clientWidth
      carousel.classList.toggle("is-scrollable", maxScroll > 1)
      if (prev) prev.disabled = track.scrollLeft <= 1
      if (next) next.disabled = track.scrollLeft >= maxScroll - 1
    }

    const page = (dir) => {
      // advance by exactly one card (card width + the flex gap)
      const card = track.querySelector(".quote")
      const gap = parseFloat(getComputedStyle(track).columnGap) || 0
      const step = card ? card.offsetWidth + gap : track.clientWidth
      track.scrollBy({ left: dir * step, behavior: "smooth" })
    }

    if (prev) prev.addEventListener("click", () => page(-1))
    if (next) next.addEventListener("click", () => page(1))

    track.addEventListener("scroll", update, { passive: true })
    window.addEventListener("resize", update)
    update()
  }

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
