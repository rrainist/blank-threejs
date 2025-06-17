import * as THREE from 'three'

let isMouseDown = false
let mouseX = 0
let mouseY = 0
let targetRotationX = 0
let targetRotationY = 0

export function setupControls(camera: THREE.PerspectiveCamera, canvas: HTMLCanvasElement): void {
  canvas.addEventListener('mousedown', onMouseDown)
  canvas.addEventListener('mousemove', onMouseMove)
  canvas.addEventListener('mouseup', onMouseUp)
  canvas.addEventListener('wheel', onWheel)
  
  // Touch events for mobile
  canvas.addEventListener('touchstart', onTouchStart)
  canvas.addEventListener('touchmove', onTouchMove)
  canvas.addEventListener('touchend', onTouchEnd)
}

function onMouseDown(event: MouseEvent): void {
  isMouseDown = true
  mouseX = event.clientX
  mouseY = event.clientY
}

function onMouseMove(event: MouseEvent): void {
  if (!isMouseDown) return
  
  const deltaX = event.clientX - mouseX
  const deltaY = event.clientY - mouseY
  
  targetRotationX += deltaY * 0.01
  targetRotationY += deltaX * 0.01
  
  mouseX = event.clientX
  mouseY = event.clientY
}

function onMouseUp(): void {
  isMouseDown = false
}

function onWheel(event: WheelEvent): void {
  // Zoom functionality can be added here
  event.preventDefault()
}

function onTouchStart(event: TouchEvent): void {
  if (event.touches.length === 1) {
    const touch = event.touches[0]
    mouseX = touch.clientX
    mouseY = touch.clientY
    isMouseDown = true
  }
}

function onTouchMove(event: TouchEvent): void {
  if (event.touches.length === 1 && isMouseDown) {
    const touch = event.touches[0]
    const deltaX = touch.clientX - mouseX
    const deltaY = touch.clientY - mouseY
    
    targetRotationX += deltaY * 0.01
    targetRotationY += deltaX * 0.01
    
    mouseX = touch.clientX
    mouseY = touch.clientY
  }
  event.preventDefault()
}

function onTouchEnd(): void {
  isMouseDown = false
} 