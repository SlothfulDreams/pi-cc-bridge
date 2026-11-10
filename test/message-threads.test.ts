import { describe, expect, it, vi } from "vitest";
import {
	createClaudeCodeFetch,
	patchClaudeCodeCch,
} from "../src/claude-code-protocol.ts";

const continuation = {
	model: "claude-opus-5-5",
	max_tokens: 64,
	messages: [{ role: "user", content: "Next turn: cch=00000" }],
	thread: { type: "continue", previous_message_id: "msg_previous" },
};

describe("message-thread checksums", () => {
	it("preserves a systemless continuation byte-for-byte", () => {
		const body = JSON.stringify(continuation, null, 2);
		expect(patchClaudeCodeCch(body)).toBe(body);
	});

	it("allows empty messages when continuing a paused turn", () => {
		const body = JSON.stringify({ ...continuation, messages: [] });
		expect(patchClaudeCodeCch(body)).toBe(body);
	});

	it.each([
		["a stateless request", { thread: undefined }],
		["thread creation", { thread: { type: "create" } }],
		["an unknown thread type", { thread: { type: "unknown" } }],
		["a non-object thread", { thread: [] }],
		["a missing response ID", { thread: { type: "continue" } }],
		[
			"an empty response ID",
			{ thread: { type: "continue", previous_message_id: "" } },
		],
		[
			"a non-string response ID",
			{ thread: { type: "continue", previous_message_id: 42 } },
		],
		["an explicit null system", { system: null }],
		["an empty system", { system: [] }],
		["an invalid billing block", { system: [{ type: "text", text: "bad" }] }],
		["explicit tools", { tools: [] }],
		["a missing model", { model: undefined }],
		["a non-string model", { model: 42 }],
		["missing max_tokens", { max_tokens: undefined }],
		["non-numeric max_tokens", { max_tokens: "64" }],
		["missing messages", { messages: undefined }],
		["non-array messages", { messages: null }],
	])("still rejects missing or invalid billing for %s", (_label, overrides) => {
		const body = JSON.stringify({ ...continuation, ...overrides });
		expect(() => patchClaudeCodeCch(body)).toThrow(/billing/u);
	});

	it.each(["create", undefined])(
		"still patches full requests with thread type %s",
		(type) => {
			const body = {
				...continuation,
				thread: type ? { type } : undefined,
				system: [
					{
						type: "text",
						text: "x-anthropic-billing-header: cc_version=2.1.280.022; cc_entrypoint=sdk-cli; cch=00000;",
					},
				],
			};
			const patched = JSON.parse(patchClaudeCodeCch(JSON.stringify(body)));
			expect(patched.system[0].text).toMatch(/; cch=[0-9a-f]{5};$/u);
			expect(patched.system[0].text).not.toContain("cch=00000");
			expect(patched.messages).toEqual(body.messages);
			expect(patched.thread).toEqual(body.thread);
		},
	);
});

describe("message-thread fetch transport", () => {
	it("forwards a continuation body with authentication and a request ID", async () => {
		const body = JSON.stringify(continuation);
		const transport = vi.fn<typeof fetch>(async () => new Response(null));
		await createClaudeCodeFetch(transport)(
			"https://api.anthropic.com/v1/messages",
			{
				method: "POST",
				headers: { authorization: "Bearer fake-token" },
				body,
			},
		);

		expect(transport).toHaveBeenCalledOnce();
		const [url, init] = transport.mock.calls[0];
		expect(url).toBe("https://api.anthropic.com/v1/messages");
		expect(init?.body).toBe(body);
		const headers = new Headers(init?.headers);
		expect(headers.get("authorization")).toBe("Bearer fake-token");
		expect(headers.get("x-client-request-id")).toMatch(/^[0-9a-f-]{36}$/u);
	});

	it("preserves a Request continuation and an existing request ID", async () => {
		const body = JSON.stringify(continuation);
		const requestId = "11111111-2222-4333-8444-555555555555";
		const transport = vi.fn<typeof fetch>(async () => new Response(null));
		await createClaudeCodeFetch(transport)(
			new Request("https://api.anthropic.com/v1/messages", {
				method: "POST",
				headers: {
					authorization: "Bearer fake-token",
					"x-client-request-id": requestId,
				},
				body,
			}),
		);

		expect(transport).toHaveBeenCalledOnce();
		const [request] = transport.mock.calls[0];
		if (!(request instanceof Request)) throw new Error("Expected a Request");
		expect(await request.text()).toBe(body);
		expect(request.headers.get("authorization")).toBe("Bearer fake-token");
		expect(request.headers.get("x-client-request-id")).toBe(requestId);
	});
});
