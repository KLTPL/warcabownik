/**
 * Render PR previews start as a copy of the production service, including its
 * DATABASE_URL. The preview workflow (.github/workflows/preview.yml) points the
 * preview at its own Neon branch and then sets PREVIEW_ENV_READY. Until that
 * happens the preview must not boot, or PR code would run against production.
 */
export function assertPreviewEnvReady(env: NodeJS.ProcessEnv): void {
  if (env.IS_PULL_REQUEST !== "true") return;
  if (env.PREVIEW_ENV_READY === "true") return;
  throw new Error(
    "PR preview started with the production environment. " +
      "Refusing to boot until the preview workflow sets PREVIEW_ENV_READY=true.",
  );
}
