// Helpful House Sprites — demo site interactions
// (1) mobile nav toggle  (2) service cards  (3) testimonials/gallery carousels
// (4) before/after gallery loader  (5) fake inquiry-form submission

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
        if (serviceSelect && service) serviceSelect.value = service
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

    const update = () => {
      // a small tolerance avoids sub-pixel rounding showing phantom overflow
      const maxScroll = track.scrollWidth - track.clientWidth
      carousel.classList.toggle("is-scrollable", maxScroll > 1)
      if (prev) prev.disabled = track.scrollLeft <= 1
      if (next) next.disabled = track.scrollLeft >= maxScroll - 1
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
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(update)
    update()
    return update
  }

  // set up every carousel once; keep each update() so async content (the
  // gallery) can trigger a re-measure without re-binding listeners
  const carouselUpdates = new Map()
  document.querySelectorAll(".carousel").forEach((carousel) => {
    carouselUpdates.set(carousel, setupCarousel(carousel))
  })

  // fade the bottom of any testimonial quote that overflows its max-height,
  // as a "there's more below" cue; clear it once scrolled to the end
  document.querySelectorAll(".quote blockquote").forEach((bq) => {
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
  })

  /* ----------------------- Before & after gallery ------------------- */
  // Fetches gallery/manifest.json and renders each before/after pair as a
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

        const caption = document.createElement("figcaption")
        caption.className = "ba__caption"
        const h3 = document.createElement("h3")
        h3.className = "ba__title"
        h3.textContent = item.title
        caption.append(h3)
        if (item.caption) {
          const p = document.createElement("p")
          p.className = "ba__text"
          p.textContent = item.caption
          caption.append(p)
        }

        fig.append(pair, caption)
        galleryGrid.append(fig)
      })
    }

    const galleryCarousel = galleryGrid.closest(".carousel")

    fetch("gallery/manifest.json")
      .then((res) => {
        if (!res.ok) throw new Error(`manifest ${res.status}`)
        return res.json()
      })
      .then((items) => {
        if (Array.isArray(items) && items.length) {
          render(items)
        } else {
          galleryGrid.textContent = "Project photos are on their way — check back soon."
        }
      })
      .catch(() => {
        galleryGrid.textContent = "Project photos are on their way — check back soon."
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
