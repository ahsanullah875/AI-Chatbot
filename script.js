const apikeys = "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"

const chatBox = document.getElementById("chatBox");
const userInput = document.getElementById("userInput");
const sendBtn = document.getElementById("sendBtn");

function addMessage(text, sender) {
  const msg = document.createElement("div");
  msg.classList.add("message", sender);
  msg.innerText = text;
  chatBox.appendChild(msg);
  chatBox.scrollTop = chatBox.scrollHeight;
}

async function sendMessage() {
  const userText = userInput.value.trim();
  if (!userText) return;

  addMessage(userText, "user");
  userInput.value = "";

  addMessage("Typing...", "bot");

  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apikeys}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "openai/gpt-4o-mini",
      messages: [
        { role: "user", content: userText }
      ]
    })
  });

  const data = await response.json();

  // Remove "Typing..."
  chatBox.removeChild(chatBox.lastChild);

  addMessage(data.choices[0].message.content, "bot");
}

sendBtn.addEventListener("click", sendMessage);

userInput.addEventListener("keypress", (e) => {
  if (e.key === "Enter") sendMessage();
});
