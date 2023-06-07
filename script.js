'use strict'

const containerWorkouts = document.querySelector('.workouts')
const form = document.querySelector('.form')
const inputType = form.querySelector('.form__input--type')
const inputDistance = form.querySelector('.form__input--distance')
const inputDuration = form.querySelector('.form__input--duration')
const inputCadence = form.querySelector('.form__input--cadence')
const inputElevation = form.querySelector('.form__input--elevation')

class App {
  #map
  #mapEvent
  #workouts = []

  constructor() {
    // Get user's position
    this.#getPosition()

    // Attach event listeners
    form.addEventListener('submit', this.#newWorkout.bind(this))
    inputType.addEventListener('change', this.#toggleElevationField)
    containerWorkouts.addEventListener('click', this.#moveToPopup.bind(this))

    // Get data from localStorage
    this.#getLocalStorage()
  }

  // Private methods
  #moveToPopup(e) {
    const workoutEl = e.target.closest('.workout')
    if (!workoutEl) return

    const workout = this.#workouts.find(
      item => item.id === workoutEl.dataset.id
    )

    this.#map.setView(workout.coords, this.#map.getZoom(), {
      animate: true,
      pan: {
        duration: 1,
      },
    })
  }

  #getPosition() {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        this.#loadMap.bind(this),
        this.#failLoadMap
      )
    }
  }

  #failLoadMap() {
    alert(
      'Geolocation is not available, please allow it in your browser settings!'
    )
  }

  #loadMap(position) {
    const { latitude, longitude } = position.coords
    const cords = [latitude, longitude]
    this.#map = L.map('map').setView(cords, 13)

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(this.#map)

    // Handling map click
    this.#map.on('click', this.#showForm.bind(this))

    this.#workouts.forEach(item => {
      this.#renderWorkoutMarker(item)
    })
  }

  #showForm(mapE) {
    this.#mapEvent = mapE
    form.classList.remove('hidden')
    inputDistance.focus()
  }

  #hideForm() {
    // prettier-ignore
    inputDistance.value = inputDuration.value = inputCadence.value = inputElevation.value = ''

    form.style.display = 'none'
    form.classList.add('hidden')

    setTimeout(() => {
      form.style.display = 'grid'
    }, 100)
  }

  #toggleElevationField() {
    inputCadence.closest('.form__row').classList.toggle('form__row--hidden')
    inputElevation.closest('.form__row').classList.toggle('form__row--hidden')
  }

  #newWorkout(e) {
    const invalidInputs = (...inputs) =>
      !inputs.every(inp => Number.isFinite(inp))

    const someNegative = (...inputs) => !inputs.every(item => item > 0)

    e.preventDefault()

    // Get data from form
    const type = inputType.value
    const distance = +inputDistance.value
    const duration = +inputDuration.value
    const { lat, lng } = this.#mapEvent.latlng
    let workout

    // if workout runing = create runing object
    if (type == 'running') {
      const cadence = +inputCadence.value
      // Check if data is valid
      if (
        invalidInputs(distance, duration, cadence) &&
        someNegative(distance, duration, cadence)
      ) {
        return alert('Please enter a valid distance!')
      }

      workout = new Running([lat, lng], distance, duration, cadence)
    }

    // if workout cycling = create cycling object
    if (type == 'cycling') {
      const elevation = +inputElevation.value
      // Check if data is valid
      if (
        invalidInputs(distance, duration, elevation) &&
        someNegative(distance, duration)
      ) {
        return alert('Please enter a valid distance!')
      }
      workout = new Cycling([lat, lng], distance, duration, elevation)
    }

    // Add new object to workout array
    this.#workouts.push(workout)

    // Render workout on map as marker
    this.#renderWorkoutMarker(workout)

    // Render workout on list
    this.#renderWorkout(workout)

    // Hide form + clear input fields
    this.#hideForm()

    // Set local storage
    this.#setLocalStorage()
  }

  #renderWorkoutMarker(workout) {
    const markerContent = `${workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'} ${
      workout.description
    }`

    L.marker(workout.coords)
      .addTo(this.#map)
      .bindPopup(
        L.popup({
          minWidth: 100,
          maxWidth: 250,
          autoClose: false,
          riseOnHover: true,
          closeOnClick: false,
          className: `${workout.type}-popup`,
        })
      )
      .setPopupContent(markerContent)
      .openPopup()
  }

  #renderWorkout(workout) {
    let html = `
      <li class="workout workout--${workout.type}" data-id="${workout.id}">
        <h2 class="workout__title"> ${workout.description} </h2>
        <div class="workout__details">
          <span class="workout__icon">${
            workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'
          }</span>
          <span class="workout__value">${workout.distance}</span>
          <span class="workout__unit">km</span>
        </div>
        <div class="workout__details">
          <span class="workout__icon">⏱</span>
          <span class="workout__value">${workout.duration}</span>
          <span class="workout__unit">min</span>
        </div>
      `

    if (workout.type === 'running') {
      html += `
      <div class="workout__details">
        <span class="workout__icon">⚡️</span>
        <span class="workout__value">${workout.pace.toFixed(1)}</span>
        <span class="workout__unit">min/km</span>
      </div>
      <div class="workout__details">
        <span class="workout__icon">🦶🏼</span>
        <span class="workout__value">${workout.cadence}</span>
        <span class="workout__unit">spm</span>
      </div>
      </li>
      `
    }

    if (workout.type === 'cycling') {
      html += `
      <div class="workout__details">
        <span class="workout__icon">⚡️</span>
        <span class="workout__value">${workout.speed.toFixed(1)}</span>
        <span class="workout__unit">km/h</span>
      </div>
      <div class="workout__details">
        <span class="workout__icon">⛰</span>
        <span class="workout__value">${workout.elevationGain}</span>
        <span class="workout__unit">m</span>
      </div>
      </li>`
    }

    form.insertAdjacentHTML('afterend', html)
  }

  #setLocalStorage() {
    localStorage.setItem('workouts', JSON.stringify(this.#workouts))
  }

  #getLocalStorage() {
    const data = JSON.parse(localStorage.getItem('workouts'))
    if (!data) return
    this.#workouts = data
    this.#workouts.forEach(item => {
      this.#renderWorkout(item)
    })
  }

  reset() {
    localStorage.removeItem('workouts')
    location.reload()
  }
}

class Workout {
  date = new Date()
  id = (Date.now() + '').slice(-10)

  constructor(coords, distance, duration) {
    this.coords = coords // [lat, lng]
    this.distance = distance // in km
    this.duration = duration // in min
  }

  _setDescription() {
    // prettier-ignore
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

    this.description = `${this.type[0].toUpperCase()}${this.type.slice(1)} on 
    ${months[this.date.getMonth()]} ${this.date.getDate()}`
    return 'Running'
  }
}

class Running extends Workout {
  type = 'running'

  constructor(coords, distance, duration, cadence) {
    super(coords, distance, duration)
    this.cadence = cadence
    this.calcPace()
    this._setDescription()
  }

  calcPace() {
    this.pace = this.duration / this.distance
    return this.pace
  }
}

class Cycling extends Workout {
  type = 'cycling'

  constructor(coords, distance, duration, elevationGain) {
    super(coords, distance, duration)
    this.elevationGain = elevationGain
    this.calcSpeed()
    this._setDescription()
  }

  calcSpeed() {
    this.speed = this.distance / (this.duration / 60)
    return this.speed
  }
}

const app = new App()
