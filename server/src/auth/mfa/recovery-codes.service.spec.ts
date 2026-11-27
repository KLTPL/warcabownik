import { RecoveryCodesService } from "./recovery-codes.service";
import { buildUser, createFakeMfaPrisma } from "./fake-mfa-prisma";

describe("RecoveryCodesService", () => {
  let service: RecoveryCodesService;
  let fake: ReturnType<typeof createFakeMfaPrisma>;

  beforeEach(() => {
    fake = createFakeMfaPrisma([buildUser()]);
    service = new RecoveryCodesService(fake.prisma);
  });

  it("generates 10 distinct XXXXX-XXXXX codes and stores only hashes", async () => {
    const codes = await service.regenerate("user-1");
    expect(codes).toHaveLength(10);
    expect(new Set(codes).size).toBe(10);
    codes.forEach((c) => expect(c).toMatch(/^[0-9A-Z]{5}-[0-9A-Z]{5}$/));

    const stored = fake.codes().map((c) => c.codeHash);
    expect(stored).toHaveLength(10);
    codes.forEach((c) => expect(stored).not.toContain(c));
  });

  it("accepts a code exactly once", async () => {
    const [code] = await service.regenerate("user-1");
    expect(await service.consume("user-1", code)).toBe(true);
    expect(await service.consume("user-1", code)).toBe(false);
    expect(await service.countRemaining("user-1")).toBe(9);
  });

  it("ignores case and the hyphen", async () => {
    const [code] = await service.regenerate("user-1");
    const sloppy = code.replace("-", "").toLowerCase();
    expect(await service.consume("user-1", sloppy)).toBe(true);
  });

  it("rejects unknown codes and another user's codes", async () => {
    const [code] = await service.regenerate("user-1");
    expect(await service.consume("user-1", "AAAAA-AAAAA")).toBe(false);
    expect(await service.consume("user-2", code)).toBe(false);
  });

  it("invalidates the old set on regenerate", async () => {
    const [oldCode] = await service.regenerate("user-1");
    await service.regenerate("user-1");
    expect(await service.consume("user-1", oldCode)).toBe(false);
    expect(await service.countRemaining("user-1")).toBe(10);
  });
});
