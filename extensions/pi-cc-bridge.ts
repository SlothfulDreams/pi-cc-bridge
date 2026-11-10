import { builtinProviders } from "@earendil-works/pi-ai/providers/all";
import { type ExtensionAPI, VERSION } from "@earendil-works/pi-coding-agent";
import { wrapAnthropicProvider } from "../src/anthropic-provider.ts";
import { discoverClaudeCodeIdentity } from "../src/claude-code-protocol.ts";
import {
	isSupportedPiVersion,
	MINIMUM_SUPPORTED_PI_VERSION,
} from "../src/compatibility.ts";

export default function piCcBridge(pi: ExtensionAPI): void {
	if (!isSupportedPiVersion(VERSION)) {
		throw new Error(
			`pi-cc-bridge requires Pi ${MINIMUM_SUPPORTED_PI_VERSION} or newer; running Pi is ${VERSION}`,
		);
	}
	const anthropic = builtinProviders().find(
		(provider) => provider.id === "anthropic",
	);
	if (!anthropic)
		throw new Error("pi-cc-bridge could not load Pi's built-in Anthropic provider");
	pi.registerProvider(
		wrapAnthropicProvider(anthropic, discoverClaudeCodeIdentity()),
	);
}
