import { assertPreviewEnvReady } from "./preview-guard";

describe("assertPreviewEnvReady", () => {
  it("allows non-preview deploys", () => {
    expect(() => assertPreviewEnvReady({})).not.toThrow();
    expect(() =>
      assertPreviewEnvReady({ IS_PULL_REQUEST: "false" }),
    ).not.toThrow();
  });

  it("blocks a preview whose environment was not prepared", () => {
    expect(() => assertPreviewEnvReady({ IS_PULL_REQUEST: "true" })).toThrow(
      /PREVIEW_ENV_READY/,
    );
  });

  it("allows a prepared preview", () => {
    expect(() =>
      assertPreviewEnvReady({
        IS_PULL_REQUEST: "true",
        PREVIEW_ENV_READY: "true",
      }),
    ).not.toThrow();
  });
});
