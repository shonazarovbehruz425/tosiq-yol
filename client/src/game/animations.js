// Gameplay animations and particles

export class Confetti {
  static spawn(container, count = 100) {
    const colors = ['#7c3aed', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#ec4899'];
    
    for (let i = 0; i < count; i++) {
      const particle = document.createElement('div');
      particle.className = 'confetti-particle';
      
      const size = Math.random() * 6 + 6;
      particle.style.width = `${size}px`;
      particle.style.height = `${size}px`;
      particle.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
      
      // Random position and delay
      particle.style.left = `${Math.random() * 100}vw`;
      particle.style.animationDelay = `${Math.random() * 1.5}s`;
      particle.style.animationDuration = `${Math.random() * 2 + 1.5}s`;
      
      // Random shape
      if (Math.random() > 0.5) {
        particle.style.borderRadius = '50%';
      }
      
      container.appendChild(particle);
      
      // Clean up after animation ends
      particle.addEventListener('animationend', () => {
        particle.remove();
      });
    }
  }
}

export class FloatingEmoji {
  static spawn(emoji, container, sourceRect = null) {
    const el = document.createElement('div');
    el.className = 'floating-emoji';
    // Support both plain text emoji and custom SVG markup (starts with '<').
    if (typeof emoji === 'string' && emoji.trim().startsWith('<')) {
      el.classList.add('floating-emoji-svg');
      // Animated reactions linger longer and play their own motion.
      if (emoji.indexOf('reaction-art-anim') !== -1) {
        el.classList.add('floating-reaction');
      }
      el.innerHTML = emoji;
    } else {
      el.innerText = emoji;
    }
    
    // Position
    let left = 50; // Center percent
    let top = 80;  // Bottom percent
    
    if (sourceRect) {
      // Calculate percent relative to container
      const containerRect = container.getBoundingClientRect();
      left = ((sourceRect.left + sourceRect.width/2 - containerRect.left) / containerRect.width) * 100;
      top = ((sourceRect.top - containerRect.top) / containerRect.height) * 100;
    } else {
      // Slight random offset from center
      left = 50 + (Math.random() * 40 - 20);
    }
    
    el.style.left = `${left}%`;
    el.style.top = `${top}%`;
    
    // Random side wiggle path
    el.style.setProperty('--wiggle-x', `${Math.random() * 40 - 20}px`);
    
    container.appendChild(el);
    
    // Clean up
    el.addEventListener('animationend', () => {
      el.remove();
    });
  }
}
