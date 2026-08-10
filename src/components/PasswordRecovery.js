```javascript
import React, { useState } from 'react';

function PasswordRecovery() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');

  const handleEmailChange = (event) => {
    setEmail(event.target.value);
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    // Assume an API function sendRecoveryEmail is imported to handle this request
    sendRecoveryEmail(email)
      .then(response => {
        setMessage('Recovery email has been sent! Please check your inbox.');
      })
      .catch(error => {
        setMessage('Error in sending recovery email. Please try again later.');
      });
  };

  return (
    <div className="password-recovery">
      <h1>Password Recovery</h1>
      <form onSubmit={handleSubmit}>
        <label htmlFor="email">Enter your email address</label>
        <input
          type="email"
          id="email"
          name="email"
          value={email}
          onChange={handleEmailChange}
          required
          aria-describedby="email-description"
        />
        <button type="submit">Send Recovery Email</button>
      </form>
      {message && <p id="message">{message}</p>}
    </div>
  );
}

async function sendRecoveryEmail(email) {
  // Implement API call to the backend service
  const response = await fetch('/api/password-recovery', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email }),
  });

  if (!response.ok) {
    throw new Error('Network response was not ok');
  }

  return response.json();
}

export default PasswordRecovery;
```