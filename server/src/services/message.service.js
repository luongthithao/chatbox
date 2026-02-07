let messages = [];
let id = 1;

export const getMessages = async () => {
  return messages;
};

export const createMessage = async (username, content) => {
  const msg = {
    id: id++,
    username,
    content,
    created_at: new Date(),
  };
  messages.push(msg);
  return msg;
};
