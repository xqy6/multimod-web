import { beforeEach, describe, expect, it } from "vitest";

import {
  createRoom,
  deleteMessage,
  getUnreadCounts,
  leaveRoom,
  listMembers,
  listMessages,
  listRooms,
  markRoomRead,
  sendMessage,
} from "./chat";

describe("chat demo mode", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("creates a room, sends messages and leaves", async () => {
    const room = await createRoom("测试房间", "demo-user");
    expect(room.error).toBeNull();
    expect(room.data?.name).toBe("测试房间");

    const message = await sendMessage(room.data!.id, "demo-user", "你好");
    expect(message.error).toBeNull();
    expect(message.data?.body).toBe("你好");

    const rooms = await listRooms();
    expect(rooms.data).toHaveLength(1);
    expect(rooms.data![0].member_count).toBe(1);

    const members = await listMembers(room.data!.id);
    expect(members.data).toHaveLength(1);

    const messages = await listMessages(room.data!.id);
    expect(messages.data).toHaveLength(1);

    const removedMessage = await deleteMessage(room.data!.id, message.data!.id);
    expect(removedMessage.error).toBeNull();
    expect((await listMessages(room.data!.id)).data).toHaveLength(0);

    const removed = await leaveRoom(room.data!.id, "demo-user");
    expect(removed.error).toBeNull();
    expect((await listMembers(room.data!.id)).data).toHaveLength(0);
  });

  it("tracks unread counts until the room is marked read", async () => {
    const room = await createRoom("未读测试", "demo-user");
    await sendMessage(room.data!.id, "demo-user", "你好");
    expect((await getUnreadCounts("demo-user"))[room.data!.id]).toBe(1);
    await markRoomRead(room.data!.id, "demo-user");
    expect((await getUnreadCounts("demo-user"))[room.data!.id]).toBe(0);
  });
});
