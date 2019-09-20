"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;
const N_MESSAGE_GROUPS_READ = 10;

var _default = async (bp, db) => {
  const router = bp.http.createRouterForBot('history');
  router.get('/conversations', async (req, res) => {
    const {
      botId
    } = req.params;
    const {
      from,
      to
    } = req.query;
    const conversations = await db.getDistinctConversations(botId, from, to);

    const buildConversationInfo = async c => ({
      id: c,
      count: await db.getConversationMessageCount(c)
    });

    const conversationsInfo = await Promise.all(conversations.map(buildConversationInfo));
    res.send(conversationsInfo);
  });
  router.get('/messages/:convId', async (req, res) => {
    const convId = req.params.convId;
    const {
      flag
    } = req.query;
    const filters = {
      flag: flag === 'true'
    };
    const messageGroups = await db.getMessagesOfConversation(convId, N_MESSAGE_GROUPS_READ, 0, filters);
    const messageCount = await db.getConversationMessageCount(convId);
    const messageGroupCount = await db.getConversationMessageGroupCount(convId, filters);
    res.send({
      messageGroups,
      messageCount,
      messageGroupCount
    });
  });
  router.get('/more-messages/:convId', async (req, res) => {
    const convId = req.params.convId;
    const {
      offset,
      clientCount,
      flag
    } = req.query;
    const filters = {
      flag: flag === 'true'
    };
    const actualCount = await db.getConversationMessageGroupCount(convId, filters);
    const unsyncOffset = Number(offset) + Math.max(actualCount - clientCount, 0);
    const messageGroups = await db.getMessagesOfConversation(convId, N_MESSAGE_GROUPS_READ, unsyncOffset, filters);
    res.send(messageGroups);
  });
  router.post('/flagged-messages', async (req, res) => {
    const messageGroups = req.body;
    const messageIds = messageGroups.map(m => m.userMessage.id);
    await db.flagMessages(messageIds);
    res.sendStatus(201);
  });
  router.delete('/flagged-messages', async (req, res) => {
    const messageGroups = req.body;
    await db.unflagMessages(messageGroups);
    res.sendStatus(201);
  });
};

exports.default = _default;
//# sourceMappingURL=api.js.map