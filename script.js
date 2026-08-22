// Helpful House Sprites — demo site interactions
// (1) mobile nav toggle  (2) service cards  (3) testimonials/gallery carousels
// (4) content loaders (testimonials, form lists, gallery)  (5) inquiry form

document.addEventListener("DOMContentLoaded", () => {
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
        if (serviceSelect && service) {
          serviceSelect.value = service
          // fire change so the form reveals the matching service section
          serviceSelect.dispatchEvent(new Event("change", { bubbles: true }))
        }
        if (contact) contact.scrollIntoView({ behavior: "smooth" })
      })
    }
  })

  /* ---------------------------- Carousels ---------------------------- */
  // Shared behavior for any .carousel: the track scrolls natively (so touch
  // swipe just works); the buttons page through it one item at a time.
  // Controls are shown only when the content overflows — if everything fits,
  // the carousel looks static. Returns update() so callers can re-measure
  // after async content (e.g. the gallery) is rendered in.
  const setupCarousel = (carousel) => {
    const track = carousel.querySelector("[data-carousel-track]")
    if (!track) return () => {}
    const prev = carousel.querySelector(".carousel__btn--prev")
    const next = carousel.querySelector(".carousel__btn--next")

    // scroll-snap parks the track a few px in when the container has padding
    // (the track rests at scrollLeft ≈ padding, not 0), so derive the end
    // tolerance from that padding instead of assuming 0/max exactly.
    const cs = getComputedStyle(track)
    const padStart = (parseFloat(cs.paddingLeft) || 0) + 2
    const padEnd = (parseFloat(cs.paddingRight) || 0) + 2

    const update = () => {
      const maxScroll = track.scrollWidth - track.clientWidth
      carousel.classList.toggle("is-scrollable", maxScroll > 1)
      if (prev) prev.disabled = track.scrollLeft <= padStart
      if (next) next.disabled = track.scrollLeft >= maxScroll - padEnd
    }

    const page = (dir) => {
      // advance by exactly one item (item width + the flex gap)
      const item = track.firstElementChild
      const gap = parseFloat(getComputedStyle(track).columnGap) || 0
      const step = item ? item.offsetWidth + gap : track.clientWidth
      track.scrollBy({ left: dir * step, behavior: "smooth" })
    }

    if (prev) prev.addEventListener("click", () => page(-1))
    if (next) next.addEventListener("click", () => page(1))

    track.addEventListener("scroll", update, { passive: true })
    window.addEventListener("resize", update)
    // re-measure after late layout shifts (web fonts, images) that change the
    // track's scrollWidth — otherwise is-scrollable can be left stale
    window.addEventListener("load", update)
    if (document.fonts && document.fonts.ready)
      document.fonts.ready.then(update)
    update()
    return update
  }

  // set up every carousel once; keep each update() so async content (the
  // gallery) can trigger a re-measure without re-binding listeners
  const carouselUpdates = new Map()
  document.querySelectorAll(".carousel").forEach((carousel) => {
    carouselUpdates.set(carousel, setupCarousel(carousel))
  })

  const fetchJson = (url) =>
    fetch(url).then((res) => {
      if (!res.ok) throw new Error(`${url} ${res.status}`)
      return res.json()
    })

  // fade the bottom of any testimonial quote that overflows its max-height,
  // as a "there's more below" cue; clear it once scrolled to the end
  const setupQuoteClip = (bq) => {
    const sync = () => {
      const overflowing = bq.scrollHeight > bq.clientHeight + 1
      const atBottom = bq.scrollTop + bq.clientHeight >= bq.scrollHeight - 1
      bq.classList.toggle("is-clipped", overflowing && !atBottom)
    }
    bq.addEventListener("scroll", sync, { passive: true })
    window.addEventListener("resize", sync)
    window.addEventListener("load", sync)
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(sync)
    sync()
  }

  /* ------------------------- Testimonials ----------------------------- */
  // Quotes come from content/testimonials.json so they can be edited
  // without touching the HTML.
  const quotesTrack = document.querySelector(".quotes[data-carousel-track]")

  if (quotesTrack) {
    const quotesCarousel = quotesTrack.closest(".carousel")

    fetchJson("content/testimonials.json")
      .then((items) => {
        if (!Array.isArray(items)) return
        quotesTrack.replaceChildren(
          ...items
            .filter((item) => item && item.quote && item.name)
            .map((item) => {
              const figure = document.createElement("figure")
              figure.className = "quote"

              const bq = document.createElement("blockquote")
              bq.textContent = `\u201c${item.quote}\u201d`

              const cap = document.createElement("figcaption")
              cap.textContent = `\u2014 ${item.name}`

              figure.append(bq, cap)
              setupQuoteClip(bq)
              return figure
            })
        )
      })
      .catch(() => {})
      .finally(() => {
        const update = quotesCarousel && carouselUpdates.get(quotesCarousel)
        if (update) update()
      })
  }

  /* ----------------------- Before & after gallery ------------------- */
  // Fetches content/gallery/manifest.json and renders each before/after pair as a
  // side-by-side block. The manifest is the single source of truth — adding
  // pairs is a content task (see notes.md), not a code change.
  const galleryGrid = document.getElementById("gallery-grid")

  if (galleryGrid) {
    const buildPhoto = (src, label, title) => {
      const fig = document.createElement("div")
      fig.className = "ba__photo"

      const tag = document.createElement("span")
      tag.className = "ba__tag"
      tag.textContent = label

      const img = document.createElement("img")
      img.src = src
      img.alt = `${title} — ${label.toLowerCase()}`
      img.loading = "lazy"

      fig.append(tag, img)
      return fig
    }

    const render = (items) => {
      galleryGrid.innerHTML = ""
      items.forEach((item) => {
        const fig = document.createElement("figure")
        fig.className = "ba"

        const pair = document.createElement("div")
        pair.className = "ba__pair"
        pair.append(
          buildPhoto(item.before, "Before", item.title),
          buildPhoto(item.after, "After", item.title)
        )

        fig.append(pair)
        galleryGrid.append(fig)
      })
    }

    const galleryCarousel = galleryGrid.closest(".carousel")

    fetchJson("content/gallery/manifest.json")
      .then((items) => {
        if (Array.isArray(items) && items.length) {
          render(items)
        } else {
          galleryGrid.textContent =
            "Project photos are on their way — check back soon."
        }
      })
      .catch(() => {
        galleryGrid.textContent =
          "Project photos are on their way — check back soon."
      })
      .finally(() => {
        // re-measure now that the gallery content is in the DOM (listeners
        // were already bound above; just re-run this carousel's update)
        const update = galleryCarousel && carouselUpdates.get(galleryCarousel)
        if (update) update()
      })
  }

  /* ------------------------- Inquiry form ----------------------------- */
  // This is a dummy site: nothing is sent anywhere. We validate with the
  // browser's built-in constraints and show a friendly confirmation.
  //
  // To make this real, point a backend at it — e.g. set the <form> action
  // to a Formspree URL and POST these fields. No library required.
  const form = document.getElementById("inquiry-form")
  const status = document.getElementById("form-status")

  /* -------------------- Service-dependent questions ------------------- */
  // The dropdown reveals a matching <fieldset data-service-section>. Every
  // other section is hidden AND disabled — a disabled fieldset's fields are
  // skipped by constraint validation and left out of submission, so the
  // required questions in hidden sections never block the form. Some choices
  // reveal a follow-up field (data-reveal="targetId"); those targets start
  // hidden with their input disabled and are switched on when chosen.
  let applyDynamic = () => {}

  if (form && serviceSelect) {
    const sections = [...form.querySelectorAll("[data-service-section]")]

    // collect on each run so checkboxes injected from form-lists.json
    // (with data-reveal) are included
    const collectReveals = () =>
      [...form.querySelectorAll("[data-reveal]")]
        .map((trigger) => ({
          trigger,
          target: document.getElementById(trigger.dataset.reveal),
        }))
        .filter((r) => r.target)

    // show/enable a reveal target only when its section is active and its
    // trigger is checked; mirror that onto the target's fields
    const syncReveal = ({ trigger, target }) => {
      const section = target.closest("[data-service-section]")
      const sectionOn = !section || (!section.hidden && !section.disabled)
      const on = sectionOn && trigger.checked
      target.hidden = !on
      target.querySelectorAll("input, textarea, select").forEach((field) => {
        field.disabled = !on
        if ("revealRequired" in field.dataset) field.required = on
      })
    }

    applyDynamic = () => {
      const value = serviceSelect.value
      sections.forEach((section) => {
        const active = section.dataset.serviceSection === value
        section.hidden = !active
        // disabling the fieldset cascades to every control inside it
        section.disabled = !active
      })
      // run after sections so conditional fields re-settle correctly
      collectReveals().forEach(syncReveal)
    }

    serviceSelect.addEventListener("change", applyDynamic)

    // delegate so statically declared reveals (radios) and JSON-built
    // checkboxes both work; a radio only fires "change" on the newly-checked
    // input, so re-sync the whole set
    form.addEventListener("change", () => collectReveals().forEach(syncReveal))

    applyDynamic()
  }

  /* ---------------------- Form checkbox lists ------------------------- */
  // Tools/tasks come from content/form-lists.json. A string is the label
  // and value; an object can set a different value and/or open a follow-up
  // field via { "label", "value", "reveal" }.
  const checkboxOption = (name, item) => {
    const isObject = item && typeof item === "object"
    const labelText = isObject ? item.label : item
    const value = isObject ? item.value || item.label : item
    const reveal = isObject ? item.reveal : undefined

    const label = document.createElement("label")
    label.className = "option"

    const input = document.createElement("input")
    input.type = "checkbox"
    input.name = name
    input.value = value
    if (reveal) input.dataset.reveal = reveal

    const span = document.createElement("span")
    span.textContent = labelText

    label.append(input, span)
    return label
  }

  if (form) {
    fetchJson("content/form-lists.json")
      .then((lists) => {
        form.querySelectorAll("[data-list]").forEach((container) => {
          const key = container.dataset.list
          const items = lists[key]
          if (!Array.isArray(items)) return
          container.replaceChildren(
            ...items
              .filter((item) => item && (typeof item === "string" || item.label))
              .map((item) => checkboxOption(key, item))
          )
        })
      })
      .catch(() => {})
      .finally(() => applyDynamic())
  }

  /* 1–10 scales: chip radios on larger screens, a range slider on mobile.
     The radios stay the submitted/required control; the slider just checks
     the matching radio so validation and FormData stay the same. */
  const paintSlider = (slider) => {
    const min = Number(slider.min) || 1
    const max = Number(slider.max) || 10
    const pct = ((Number(slider.value) - min) / (max - min)) * 100
    slider.style.setProperty("--scale-pct", `${pct}%`)
  }

  document.querySelectorAll(".scale").forEach((scale) => {
    const slider = scale.querySelector(".scale__slider input")
    const output = scale.querySelector(".scale__value")
    const radios = [...scale.querySelectorAll('.chips input[type="radio"]')]
    if (!slider || !radios.length) return

    const fromRadios = () => {
      const checked = radios.find((radio) => radio.checked)
      if (!checked) return
      slider.value = checked.value
      if (output) output.textContent = checked.value
      paintSlider(slider)
    }

    const fromSlider = () => {
      if (output) output.textContent = slider.value
      paintSlider(slider)
      const radio = radios.find((r) => r.value === slider.value)
      if (radio && !radio.checked) {
        radio.checked = true
        radio.dispatchEvent(new Event("change", { bubbles: true }))
      }
    }

    slider.addEventListener("input", fromSlider)
    slider.addEventListener("click", fromSlider)
    radios.forEach((radio) => radio.addEventListener("change", fromRadios))
    paintSlider(slider)
    fromRadios()
  })

  if (form) {
    form.addEventListener("reset", () => {
      form.querySelectorAll(".scale__slider input").forEach((slider) => {
        slider.value = slider.defaultValue
        const output = slider.parentElement.querySelector(".scale__value")
        if (output) output.textContent = slider.value
        paintSlider(slider)
      })
    })
  }

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
      // reset() clears the dropdown back to the placeholder but fires no
      // "change" event — re-collapse the service sections manually
      applyDynamic()

      status.hidden = false
      status.textContent = `Thanks${
        name ? ", " + name : ""
      }! This is a demo, so nothing was actually sent — but in the real site a sprite would flutter back to you within one business day.`
      status.scrollIntoView({ behavior: "smooth", block: "center" })
    })
  }
})
