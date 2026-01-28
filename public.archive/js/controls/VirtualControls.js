// Virtual Controls Module - Handles joystick and button inputs

class VirtualControls {
    constructor() {
        this.joystickContainer = document.querySelector('.joystick-container');
        this.joystickKnob = document.querySelector('.joystick-knob');
        this.joystickActive = false;
        this.maxDistance = 35;

        // Initialize global state
        window.virtualJoystick = {
            x: 0,
            y: 0,
            jumpPressed: false
        };

        this.init();
    }

    init() {
        this.bindJoystickEvents();
    }

    bindJoystickEvents() {
        // Mouse events
        this.joystickContainer.addEventListener('mousedown', (e) => this.handleJoystickStart(e));
        document.addEventListener('mousemove', (e) => this.handleJoystickMove(e));
        document.addEventListener('mouseup', () => this.handleJoystickEnd());

        // Touch events
        this.joystickContainer.addEventListener('touchstart', (e) => this.handleJoystickStart(e));
        document.addEventListener('touchmove', (e) => this.handleJoystickMove(e), { passive: false });
        document.addEventListener('touchend', () => this.handleJoystickEnd());
    }

    handleJoystickStart(e) {
        this.joystickActive = true;
        this.updateJoystick(e);
    }

    handleJoystickMove(e) {
        if (!this.joystickActive) return;
        e.preventDefault();
        this.updateJoystick(e);
    }

    handleJoystickEnd() {
        this.joystickActive = false;
        window.virtualJoystick.x = 0;
        window.virtualJoystick.y = 0;
        this.joystickKnob.style.transform = 'translate(-50%, -50%)';
    }

    updateJoystick(e) {
        const rect = this.joystickContainer.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;

        let clientX, clientY;
        if (e.type.includes('touch')) {
            clientX = e.touches[0].clientX;
            clientY = e.touches[0].clientY;
        } else {
            clientX = e.clientX;
            clientY = e.clientY;
        }

        let deltaX = clientX - centerX;
        let deltaY = clientY - centerY;
        const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

        if (distance > this.maxDistance) {
            const angle = Math.atan2(deltaY, deltaX);
            deltaX = Math.cos(angle) * this.maxDistance;
            deltaY = Math.sin(angle) * this.maxDistance;
        }

        window.virtualJoystick.x = deltaX / this.maxDistance;
        window.virtualJoystick.y = deltaY / this.maxDistance;

        this.joystickKnob.style.transform = `translate(calc(-50% + ${deltaX}px), calc(-50% + ${deltaY}px))`;
    }

    getState() {
        return window.virtualJoystick;
    }
}
