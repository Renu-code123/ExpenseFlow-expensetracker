// Custom Cursor Trail Effect
    (function () {
      // Hide default cursor
      document.body.style.cursor = 'none';

      const container = document.getElementById('cursor-trail');
      const coords = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
      const trailCircles = [];
      const COUNT = 12; // Fewer circles for smoother trail

      // Create trail circles
      for (let i = 0; i < COUNT; i++) {
        const circle = document.createElement('div');
        circle.className = 'trail-dot';

        // Opacity decreases along the trail
        const opacity = 0.9 - (i / COUNT) * 0.8;
        circle.style.opacity = opacity.toString();

        // Size decreases along the trail
        const scale = 1 - (i / COUNT) * 0.5;
        circle.style.transform = `translate(-50%, -50%) scale(${scale})`;

        container.appendChild(circle);
        trailCircles.push({
          element: circle,
          x: coords.x,
          y: coords.y,
          targetX: coords.x,
          targetY: coords.y
        });
      }

      // Track mouse position
      let isMoving = false;
      let lastMouseX = coords.x;
      let lastMouseY = coords.y;
      let velocity = { x: 0, y: 0 };

      window.addEventListener('mousemove', e => {
        coords.x = e.clientX;
        coords.y = e.clientY;

        // Calculate velocity for smooth movement
        velocity.x = e.clientX - lastMouseX;
        velocity.y = e.clientY - lastMouseY;
        lastMouseX = e.clientX;
        lastMouseY = e.clientY;

        isMoving = true;

        // Reset movement timeout
        clearTimeout(window.movementTimeout);
        window.movementTimeout = setTimeout(() => {
          isMoving = false;
        }, 50);
      });

      // Click effect
      window.addEventListener('mousedown', () => {
        trailCircles.forEach(circle => {
          circle.element.classList.add('cursor-clicking');
        });
      });

      window.addEventListener('mouseup', () => {
        trailCircles.forEach(circle => {
          circle.element.classList.remove('cursor-clicking');
        });
      });

      // Hover effect for interactive elements
      window.addEventListener('mouseover', e => {
        const interactive = e.target.closest('a, button, input, select, textarea, [role="button"]');
        trailCircles.forEach(circle => {
          circle.element.classList.toggle('cursor-hovering', !!interactive);
        });
      });

      // Smooth animation function
      function animateTrail() {
        let targetX = coords.x;
        let targetY = coords.y;

        // Add velocity offset to first circle for more natural feel
        const velocityOffset = 0.5;
        const offsetX = velocity.x * velocityOffset;
        const offsetY = velocity.y * velocityOffset;

        trailCircles.forEach((circle, index) => {
          // First circle follows cursor exactly
          if (index === 0) {
            circle.x = targetX + offsetX;
            circle.y = targetY + offsetY;
          }
          // Other circles follow with smooth delay
          else {
            const prevCircle = trailCircles[index - 1];

            // Smooth interpolation factor (changes based on movement speed)
            const speed = Math.sqrt(velocity.x * velocity.x + velocity.y * velocity.y);
            const lerpFactor = isMoving ?
              Math.min(0.3 + (speed * 0.01), 0.5) :  // Faster movement = tighter trail
              0.1; // Slow movement = more spread

            circle.x += (prevCircle.x - circle.x) * lerpFactor;
            circle.y += (prevCircle.y - circle.y) * lerpFactor;
          }

          // Apply position with easing
          circle.element.style.left = circle.x + 'px';
          circle.element.style.top = circle.y + 'px';

          // Dynamic opacity based on speed and position
          if (index > 0) {
            const speed = Math.sqrt(velocity.x * velocity.x + velocity.y * velocity.y);
            const baseOpacity = 0.9 - (index / COUNT) * 0.8;
            const speedMultiplier = Math.min(1 + speed * 0.02, 1.5);
            circle.element.style.opacity = (baseOpacity * speedMultiplier).toString();
          }

          // Update target for next circle
          targetX = circle.x;
          targetY = circle.y;
        });

        requestAnimationFrame(animateTrail);
      }

      // Handle window resize
      window.addEventListener('resize', () => {
        // Adjust if cursor goes out of bounds
        if (coords.x > window.innerWidth) coords.x = window.innerWidth;
        if (coords.y > window.innerHeight) coords.y = window.innerHeight;
      });

      // Handle mouse leave/enter
      window.addEventListener('mouseleave', () => {
        trailCircles.forEach(circle => {
          circle.element.style.opacity = '0';
        });
      });

      window.addEventListener('mouseenter', () => {
        trailCircles.forEach((circle, index) => {
          const opacity = 0.9 - (index / COUNT) * 0.8;
          circle.element.style.opacity = opacity.toString();
        });
      });

      // Start animation
      animateTrail();
    })();
 

 //---------------------------------------- 

        // Mobile Navigation Toggle
        document.addEventListener('DOMContentLoaded', function () {
          const navToggle = document.getElementById('nav-toggle');
          const navMenu = document.getElementById('nav-menu');
          const navLinks = document.querySelectorAll('.nav-link');

          if (navToggle) {
            navToggle.addEventListener('click', function () {
              navToggle.classList.toggle('active');
              navMenu.classList.toggle('active');
            });
          }

          // Close mobile menu when clicking on a link
          navLinks.forEach(link => {
            link.addEventListener('click', () => {
              navToggle.classList.remove('active');
              navMenu.classList.remove('active');

              // Update active state
              navLinks.forEach(l => l.classList.remove('active'));
              link.classList.add('active');
            });
          });

          // Close menu when clicking outside
          document.addEventListener('click', (event) => {
            const isClickInsideNav = navMenu.contains(event.target) || navToggle.contains(event.target);
            if (!isClickInsideNav && navMenu.classList.contains('active')) {
              navToggle.classList.remove('active');
              navMenu.classList.remove('active');
            }
          });

          // Chatbot Functionality
          initializeChatbot();
        });

        function initializeChatbot() {
          const chatbotToggle = document.getElementById('chatbot-toggle');
          const chatbotWidget = document.getElementById('chatbot-widget');
          const chatbotForm = document.getElementById('chatbot-form');
          const chatbotInput = document.getElementById('chatbot-input');
          const chatbotMessages = document.getElementById('chatbot-messages');
          const chatbotClose = document.getElementById('chatbot-close');

          // Toggle chatbot window
          chatbotToggle.addEventListener('click', () => {
            chatbotWidget.classList.toggle('active');
            if (chatbotWidget.classList.contains('active')) {
              chatbotToggle.classList.add('hidden');
              chatbotInput.focus();
            } else {
              chatbotToggle.classList.remove('hidden');
            }
          });

          // Close chatbot window
          chatbotClose.addEventListener('click', () => {
            chatbotWidget.classList.remove('active');
            chatbotToggle.classList.remove('hidden');
          });

          // Handle form submission
          chatbotForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const message = chatbotInput.value.trim();

            if (message) {
              // Add user message
              addMessage(message, 'user');
              chatbotInput.value = '';

              // Simulate bot response
              setTimeout(() => {
                const response = getBotResponse(message);
                addMessage(response, 'bot');
              }, 500);
            }
          });

          function addMessage(text, sender) {
            const messageDiv = document.createElement('div');
            messageDiv.className = `chatbot-message ${sender}-message`;

            const contentDiv = document.createElement('div');
            contentDiv.className = 'message-content';

            const p = document.createElement('p');
            p.textContent = text;

            contentDiv.appendChild(p);
            messageDiv.appendChild(contentDiv);

            chatbotMessages.appendChild(messageDiv);

            // Auto scroll to bottom
            chatbotMessages.scrollTop = chatbotMessages.scrollHeight;
          }

          function getBotResponse(userMessage) {
            const lowerMessage = userMessage.toLowerCase();

            // Expense-related responses
            if (lowerMessage.includes('add') && (lowerMessage.includes('expense') || lowerMessage.includes('transaction'))) {
              return "You can add an expense by scrolling down to the 'Add New Transaction' form. Fill in the description, amount, category, and date, then click submit! 📝";
            }

            if (lowerMessage.includes('budget')) {
              return "Budget planning is a great way to manage your spending! You can set budget goals by category to track your spending limits. Would you like tips on creating an effective budget? 💰";
            }

            if (lowerMessage.includes('goal') || lowerMessage.includes('savings')) {
              return "Setting financial goals helps you stay motivated! You can create short-term and long-term goals to work towards your financial dreams. What's your goal? 🎯";
            }

            if (lowerMessage.includes('category')) {
              return "We support many categories including: Food, Transportation, Shopping, Entertainment, Bills, Healthcare, Education, Travel, Salary, Freelance, Investment, and more! Pick what works for you. 📂";
            }

            if (lowerMessage.includes('receipt')) {
              return "You can upload receipts to verify your expenses! This helps you keep accurate records and track your spending better. Perfect for important purchases! 📸";
            }

            if (lowerMessage.includes('sync') || lowerMessage.includes('offline')) {
              return "ExpenseFlow works offline and syncs your data when you're back online! Your data is always safe and accessible. No worries about losing your information! 🔄";
            }

            if (lowerMessage.includes('delete') || lowerMessage.includes('edit')) {
              return "You can edit or delete transactions from your history. Just click on any transaction to modify it or remove it. Easy management! ✏️";
            }

            if (lowerMessage.includes('help') || lowerMessage.includes('how')) {
              return "I'm here to help! You can ask me about:\n• Adding expenses\n• Creating budgets\n• Setting goals\n• Managing receipts\n• Categories\n• And more!\n\nWhat would you like to know? 🤔";
            }

            if (lowerMessage.includes('hello') || lowerMessage.includes('hi') || lowerMessage.includes('hey')) {
              return "Hey there! 👋 I'm your ExpenseFlow Assistant. How can I help you manage your finances today?";
            }

            // Default responses
            const responses = [
              "That's a great question! Feel free to explore ExpenseFlow's features or ask me more about managing your expenses. 💡",
              "I'm here to help you manage your finances better! Is there anything specific you'd like to know? 🤝",
              "Thanks for that message! I'm learning to help you even better. Check out the features above or ask me another question! 🚀",
              "Interesting! Remember, smart money management is all about tracking and planning. How can I assist you further? 📊",
              "I'm always here to help! Feel free to ask me anything about budgeting, expense tracking, or financial planning. 💸"
            ];

            return responses[Math.floor(Math.random() * responses.length)];
          }
        }
