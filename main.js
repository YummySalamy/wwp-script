import { CLOSE_ICON, MESSAGE_ICON, styles, aditionalStyles, chatbotWindowName, welcomeMessage, placeHolder, openChatbot } from "./assets.js";
const iconUrl = localStorage.getItem('icon_url');
function unescapeStr(str) {
  return str.replace(/\\u[\dA-F]{4}/gi, function (match) {
    return String.fromCharCode(parseInt(match.replace(/\\u/g, ''), 16));
  });
}

class MessageWidget {
  constructor(position = "bottom-right") {
    this.position = this.getPosition(position);
    this.open = !openChatbot;
    this.initialize();
    this.injectStyles();
    this.messages = [];
  }

  position = "";
  open = !openChatbot;
  widgetContainer = null;

  getPosition(position) {
    const userExists = localStorage.getItem('user_id') !== null;
    if (!userExists) {
      const userId = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
      localStorage.setItem('user_id', userId);
    }
    const [vertical, horizontal] = position.split("-");
    return {
      [vertical]: "30px",
      [horizontal]: "30px",
    };
  }

  async initialize() {
    //insert new font in the the head
    const head = document.head;
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.type = 'text/css';
    link.href = 'https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600&display=swap';
    head.appendChild(link);

    const container = document.createElement("div");
    // container.style.position = "fixed";
    container.style.zIndex = "9999";
    Object.keys(this.position).forEach(
      (key) => (container.style[key] = this.position[key])
    );
    document.body.appendChild(container);

    const buttonContainer = document.createElement("button");
    buttonContainer.classList.add("button__container");

    const widgetIconElement = document.createElement("span");
    widgetIconElement.innerHTML = MESSAGE_ICON;
    widgetIconElement.classList.add("widget__icon");
    this.widgetIcon = widgetIconElement;

    const closeIconElement = document.createElement("span");
    closeIconElement.innerHTML = CLOSE_ICON;
    closeIconElement.classList.add("widget__icon", "widget__hidden");
    this.closeIcon = closeIconElement;

    buttonContainer.appendChild(this.widgetIcon);
    buttonContainer.appendChild(this.closeIcon);
    buttonContainer.addEventListener("click", this.toggleOpen.bind(this));

    this.widgetContainer = document.createElement("div");
    this.widgetContainer.classList.add("widget__hidden", "widget__container");

    this.createWidgetContent();

    container.appendChild(this.widgetContainer);
    container.appendChild(buttonContainer);
    const sendButton = container.querySelector('.button-45');

    sendButton.addEventListener('click', async (event) => {
        console.log('phase 1');
      event.preventDefault();
      const messageInput = container.querySelector('#messageInput');
      const userMessage = messageInput.value.trim();
        console.log('phase 2');
      if (userMessage === '') return;
      console.log('phase 3');

      this.displayMessage(userMessage, 'user');
      this.sendMessage(userMessage);
      
      messageInput.value = '';
    });
    this.toggleOpen();
}

async createChatbotSession() {
  const url = "https://prd-aichain-chatbot-upload-qd5u6w2c6q-uc.a.run.app/chatbot/sessions";
  const script = document.getElementById('chatbotParameters')
  const chatbotId = script.getAttribute('cgf');
  const channel_type = "WEB";
  const userId = localStorage.getItem('user_id');

  const data = {
    chatbot_id: chatbotId,
    channel_type: channel_type,
    user_id: userId,
    session_id: userId,
  };

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error("Failed to create chatbot session");
    }

    const responseData = await response.json();
    const chatMessages = responseData.messages;

    for (const messageId in chatMessages) {
      const message = chatMessages[messageId];
      this.messages.push(message);
    }
    this.messages.sort((a, b) => {
      return new Date(a.createdAt) - new Date(b.createdAt);
    });
    for (const message of this.messages) {
      const sender = message.reaction === "NORMAL" ? "bot" : "user";
      this.displayPreviousMessages(message.question, "user");
      this.displayPreviousMessages(message.answer, "bot");
    }

    this.chatbotSessionId = responseData.session_id;
    localStorage.setItem('chatbotSessionId', this.chatbotSessionId);
  } catch (error) {
    console.error("Error creating chatbot session:", error);
  }
}

async addMessageSession(question, answer) {
  const decodedAnswer = unescapeStr(answer);
  const url = "https://aichain-chat-api-v2-qd5u6w2c6q-uc.a.run.app/add_message";
  const script = document.getElementById('chatbotParameters')
  const chatbotId = script.getAttribute('cgf');
  const channel_type = "WEB";
  const userId = script.getAttribute('thx');
  const chatbotSessionId = localStorage.getItem('chatbotSessionId');
  const secret_token = 'chatpgt-token-xkaos2z';
  const headers = {'token': secret_token};
  const sessionId = null;

  const data = {
    question: question,
    answer: decodedAnswer,
    metadata: {
      chatbotId: chatbotId,
      channelType: channel_type,
      userId: userId,
      sessionId: chatbotSessionId,
    }
  };

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        'Content-Type': 'application/json',
        ...headers, 
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error("Failed to create chatbot session");
    }

    const responseData = await response.json();

  } catch (error) {
    console.error("Error :", error);
  }
}

createWebSocketConnection() {
  this.socket = new WebSocket('https://prd-aichain-chatbot-messenger-qd5u6w2c6q-uc.a.run.app/web/webhook');

  this.socket.onopen = () => {
    console.log('WebSocket connection opened');
  };

  this.socket.onmessage = (event) => {
    const data = JSON.parse(event.data);
    if (data.status) {
      this.displayMessage(data.answer, 'bot');
    }
  };

  this.socket.onclose = () => {
    console.log('WebSocket connection closed');
  };

  this.socket.onerror = (error) => {
    console.error('WebSocket error:', error);
  };
}

async sendMessage(query) {
    console.log('send message');
  const script = document.getElementById('chatbotParameters');
  const session_id = script.getAttribute('vrx');
  const owner_id = script.getAttribute('thx');
  const user_id = localStorage.getItem('user_id');

  const data = {
    session_id: session_id,
    owner_id: owner_id,
    user_id: user_id,
    text: query,
  };

  try {
    console.log('try to send message');
    const response = await fetch('https://prd-aichain-chatbot-messenger-qd5u6w2c6q-uc.a.run.app/web/webhook', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Token': '123456',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error("Failed to send message");
    }

    const responseData = await response.json();
    if (responseData.status) {
      this.displayMessage(responseData.answer, 'bot');
    }
  } catch (error) {
    console.error('Error sending message:', error);
  }
}


displayMessage(text, sender) {
  const chatBox = document.querySelector('.chat-box');
  const chatContainer = document.querySelector('.chat-container');

  const chatMessage = document.createElement('div');
  chatMessage.classList.add('chat-message', `message-${sender}`);
  if (sender === 'bot') {
    chatMessage.style.animation = 'slideInFromLeft 0.5s';
  }
  chatMessage.innerHTML = `<div class="message-content">${unescapeStr(text)}</div>`;

  chatBox.appendChild(chatMessage);
  chatBox.scrollTop = chatBox.scrollHeight;
  chatContainer.scrollTop = chatContainer.scrollHeight;
}

displayPreviousMessages(text, sender) {
  const chatBox = document.querySelector('.chat-box');
  const chatContainer = document.querySelector('.chat-container');
  
    const chatMessage = document.createElement('div');
    chatMessage.classList.add('chat-message', `message-${sender}`);
    chatMessage.innerHTML = `<div class="message-content">${unescapeStr(text)}</div>`;
    
    chatBox.appendChild(chatMessage);
    chatBox.scrollTop = chatBox.scrollHeight
  chatContainer.scrollTop = chatContainer.scrollHeight;
  chatBox.scrollTop = chatBox.scrollHeight;
  
}

  createWidgetContent() {
    this.widgetContainer.innerHTML = `
    <header class="widget__header">
      <img class='icon-style' src=${iconUrl}></img>
      <h2>${chatbotWindowName}</h2>
    </header>

    <div class="chat-container">
      <div class="chat-box">
        <div class="chat-message message-bot">
          ${welcomeMessage}
        </div>
      </div>
    </div>

    <form class="input-container">
    <div class="inputGroup">
      <input type="text" required="" autocomplete="off" id="messageInput" class="form-input">
      <label 
        for="messageInput"
        >${placeHolder}</label>
    </div>
    <button class="button-45" role="button" type="submit">Enviar</button>
    </form>
    <footer class="poweredByContainer">
      <p class="footer__text">Powered by <a class='nubot-link' href='https://nubot.io' target='_blank'>nubot.io</a></p>
    </footer>
    `;
  }


  injectStyles() {
    const styleTag = document.createElement("style");
    const secondStyleTag = document.createElement("style");
    styleTag.innerHTML = styles.replace(/^\s+|\n/gm, "");
    secondStyleTag.innerHTML = aditionalStyles.replace(/^\s+|\n/gm, "");

    document.head.appendChild(styleTag);
    document.body.appendChild(secondStyleTag);
  }

  toggleOpen() {
    this.open = !this.open;
    if (this.open) {
      this.widgetIcon.classList.add("widget__hidden");
      this.closeIcon.classList.remove("widget__hidden");
      this.widgetContainer.classList.remove("widget__hidden");
      
      this.createChatbotSession();
    } else {
      this.createWidgetContent();
      this.widgetIcon.classList.remove("widget__hidden");
      this.closeIcon.classList.add("widget__hidden");
      this.widgetContainer.classList.add("widget__hidden");
      
    }
  }
}

function initializeWidget() {
  return new MessageWidget();
}

initializeWidget();